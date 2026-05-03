from __future__ import annotations

import base64
import json
import os
import sys
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.routes.auth import get_current_user
from app.core.database import db_manager

SYSTEM_SITE_PACKAGES = Path(sys.base_prefix) / "Lib" / "site-packages"
if SYSTEM_SITE_PACKAGES.exists():
    system_path = str(SYSTEM_SITE_PACKAGES)
    if system_path not in sys.path:
        sys.path.insert(0, system_path)

import cv2  # type: ignore
import numpy as np
import tensorflow as tf  # type: ignore
from tensorflow.keras import Model  # type: ignore
from tensorflow.keras.layers import Dense as KerasDense  # type: ignore

router = APIRouter()

MODEL_CANDIDATES = [
    Path(__file__).resolve().parents[2] / "models" / "tongue_diabetes_model_refined.h5",
    Path(__file__).resolve().parents[2] / "models" / "tongue_diabetes_model.h5",
]
PROFILE_PATH = Path(__file__).resolve().parents[2] / "data" / "disease.json"
IMG_SIZE = 224
MODEL_CLASSES = ["diabetes", "nondiabetes"]

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")


def normalize_color(image_rgb: np.ndarray) -> np.ndarray:
    """Apply CLAHE to the luminance channel to match the tongue notebook pipeline."""
    lab = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_eq = clahe.apply(l_channel)
    return cv2.cvtColor(cv2.merge([l_eq, a_channel, b_channel]), cv2.COLOR_LAB2RGB)


def to_base64_image(image_rgb: np.ndarray, ext: str = ".png") -> str:
    ok, buffer = cv2.imencode(ext, cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR))
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to encode image")
    return base64.b64encode(buffer.tobytes()).decode("utf-8")


def make_data_url(image_rgb: np.ndarray, ext: str = ".png") -> str:
    mime = "image/png" if ext.lower() == ".png" else "image/jpeg"
    return f"data:{mime};base64,{to_base64_image(image_rgb, ext=ext)}"


def json_safe(value: Any) -> Any:
    """Convert NumPy-heavy values into plain Python types for MongoDB/JSON."""
    if isinstance(value, dict):
        return {str(key): json_safe(val) for key, val in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(item) for item in value]
    if isinstance(value, (np.integer, np.floating)):
        return value.item()
    if isinstance(value, np.ndarray):
        return value.tolist()
    return value


def resolve_model_path() -> Path:
    for candidate in MODEL_CANDIDATES:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        "Tongue model not found. Expected one of: "
        + ", ".join(str(path) for path in MODEL_CANDIDATES)
    )


class CompatibleDense(KerasDense):
    """Dense layer shim for older model configs saved with newer Keras metadata."""

    def __init__(self, *args: Any, quantization_config: Any = None, **kwargs: Any):
        del quantization_config
        super().__init__(*args, **kwargs)


def _strip_unsupported_keras_keys(config: Any) -> Any:
    if isinstance(config, dict):
        return {
            key: _strip_unsupported_keras_keys(value)
            for key, value in config.items()
            if key != "quantization_config"
        }
    if isinstance(config, list):
        return [_strip_unsupported_keras_keys(item) for item in config]
    return config


def _load_legacy_h5_model(model_path: Path) -> Any:
    with tf.io.gfile.GFile(str(model_path), "rb") as handle:
        raw_bytes = handle.read()

    import h5py  # type: ignore
    import io

    with h5py.File(io.BytesIO(raw_bytes), "r") as h5_file:
        model_config = h5_file.attrs.get("model_config")
        if model_config is None:
            raise ValueError("H5 file does not contain model_config")
        if isinstance(model_config, bytes):
            model_config = model_config.decode("utf-8")
        config_json = json.loads(model_config)
        cleaned_json = json.dumps(_strip_unsupported_keras_keys(config_json))
        model = tf.keras.models.model_from_json(
            cleaned_json,
            custom_objects={"Dense": CompatibleDense},
        )
        model.load_weights(model_path)
        return model


@lru_cache(maxsize=1)
def load_model() -> Any:
    model_path = resolve_model_path()
    try:
        return tf.keras.models.load_model(
            model_path,
            compile=False,
            custom_objects={"Dense": CompatibleDense},
        )
    except Exception:
        return _load_legacy_h5_model(model_path)


@lru_cache(maxsize=1)
def load_profile() -> dict[str, Any]:
    if not PROFILE_PATH.exists():
        return {}
    try:
        return json.loads(PROFILE_PATH.read_text(encoding="utf-8")).get("tongue", {})
    except Exception:
        return {}


def preprocess_tongue_image(image_rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    resized_rgb = cv2.resize(image_rgb, (IMG_SIZE, IMG_SIZE))
    normalized_rgb = normalize_color(resized_rgb)
    img_input = normalized_rgb.astype(np.float32) / 255.0
    return resized_rgb, normalized_rgb, np.expand_dims(img_input, axis=0)


def find_last_conv_layer(model: Any) -> str:
    preferred = "conv5_block3_out"
    try:
        model.get_layer(preferred)
        return preferred
    except Exception:
        pass

    for layer in reversed(model.layers):
        try:
            if len(layer.output.shape) == 4:
                return layer.name
        except Exception:
            continue
    raise ValueError("No convolutional layer found for Grad-CAM")


def build_gradcam_heatmap(img_array: np.ndarray, model: Any) -> np.ndarray:
    last_conv_layer_name = find_last_conv_layer(model)
    grad_model = Model(
        inputs=model.inputs,
        outputs=[model.get_layer(last_conv_layer_name).output, model.output],
    )

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_array)
        if predictions.shape[-1] == 1:
            loss = predictions[:, 0]
        else:
            loss = predictions[:, 0]

    grads = tape.gradient(loss, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0)
    heatmap = heatmap / (tf.reduce_max(heatmap) + 1e-8)
    return heatmap.numpy()


def compute_zone_activation(heatmap: np.ndarray) -> tuple[str, dict[str, float]]:
    height, width = heatmap.shape
    zones = {
        "top": heatmap[: height // 3, :],
        "center": heatmap[height // 3 : 2 * height // 3, width // 3 : 2 * width // 3],
        "bottom": heatmap[2 * height // 3 :, :],
        "left": heatmap[:, : width // 3],
        "right": heatmap[:, 2 * width // 3 :],
    }
    scores = {name: float(np.mean(zone)) for name, zone in zones.items()}
    most_affected = max(scores, key=scores.get)
    return most_affected, scores


def build_response_payload(
    *,
    user: dict[str, Any],
    original_rgb: np.ndarray,
    normalized_rgb: np.ndarray,
    img_input: np.ndarray,
    profile: dict[str, Any],
) -> dict[str, Any]:
    model = load_model()
    raw_pred = model.predict(img_input, verbose=0)

    if raw_pred.shape[-1] == 1:
        class_index_1_prob = float(raw_pred[0][0])
    else:
        class_index_1_prob = float(raw_pred[0][1])

    diabetic_prob = class_index_1_prob
    non_diabetic_prob = 1.0 - diabetic_prob

    if diabetic_prob >= 0.5:
        prediction_label = "Non-Diabetic"
        confidence = diabetic_prob
    else:
        prediction_label = "Diabetic"
        confidence = non_diabetic_prob

    confidence_category = "Low confidence" if confidence < 0.60 else "Medium confidence" if confidence < 0.80 else "High confidence"

    risk_score = round(diabetic_prob * 100, 2)
    if diabetic_prob < 0.40:
        risk_level = "LOW"
        severity_stage = 1
        severity_label = "Mild Tongue Findings"
    elif diabetic_prob < 0.70:
        risk_level = "MODERATE"
        severity_stage = 2
        severity_label = "Moderate Tongue Findings"
    elif diabetic_prob < 0.85:
        risk_level = "HIGH"
        severity_stage = 3
        severity_label = "Moderate-Severe Diabetic Indicators"
    else:
        risk_level = "VERY HIGH"
        severity_stage = 4
        severity_label = "Severe Tongue Indicators"

    hsv_image = cv2.cvtColor(original_rgb, cv2.COLOR_RGB2HSV)
    mean_h = float(np.mean(hsv_image[:, :, 0]))
    mean_s = float(np.mean(hsv_image[:, :, 1]))
    mean_v = float(np.mean(hsv_image[:, :, 2]))

    heatmap = build_gradcam_heatmap(img_input, model)
    heatmap_resized = cv2.resize(heatmap, (IMG_SIZE, IMG_SIZE))
    heatmap_colored = cv2.applyColorMap(np.uint8(255 * heatmap_resized), cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
    overlay_rgb = cv2.addWeighted(original_rgb, 0.6, heatmap_rgb, 0.4, 0)

    most_affected_region, zone_activation_scores = compute_zone_activation(heatmap_resized)
    current_state = profile.get("current_state", {})
    feature_analysis = profile.get("feature_analysis", {})
    projection = profile.get("6_month_projection", {})
    organ_impact = profile.get("organ_impact", {})

    findings = [
        f"Model prediction: {prediction_label} with {confidence:.2%} confidence",
        f"Most affected region: {most_affected_region}",
        f"CLAHE-normalized tongue image analyzed at {IMG_SIZE}x{IMG_SIZE}",
        "Grad-CAM highlighted the most influential tongue regions",
    ]

    response: dict[str, Any] = {
        "model_name": "TongueDiabetesResNet50",
        "model_description": profile.get("model", "ResNet50 + CLAHE + Grad-CAM"),
        "classes": MODEL_CLASSES,
        "prediction": prediction_label,
        "prediction_details": {
            "label": prediction_label.lower().replace("-", "_"),
            "confidence": round(confidence, 4),
            "confidence_category": confidence_category,
            "raw_model_probability_for_class_index_1": round(class_index_1_prob, 4),
            "estimated_diabetic_risk_percent": round(diabetic_prob * 100, 2),
            "probabilities": {
                "diabetic": round(diabetic_prob, 4),
                "non_diabetic": round(non_diabetic_prob, 4),
            },
        },
        "probability": round(diabetic_prob, 4),
        "confidence": round(confidence, 4),
        "confidence_category": confidence_category,
        "raw_model_probability_for_class_index_1": round(class_index_1_prob, 4),
        "estimated_diabetic_risk_percent": round(diabetic_prob * 100, 2),
        "risk_score": risk_score,
        "risk_level": risk_level,
        "severity_stage": severity_stage,
        "severity_label": severity_label,
        "hsv_features": {
            "hue": round(mean_h, 2),
            "saturation": round(mean_s, 2),
            "value": round(mean_v, 2),
        },
        "explainability": {
            "most_affected_region": most_affected_region,
            "zone_activation_scores": {key: round(value, 4) for key, value in zone_activation_scores.items()},
        },
        "visual_features": feature_analysis,
        "findings": findings,
        "feature_analysis": feature_analysis,
        "current_state": current_state,
        "projection": projection,
        "organ_impact": organ_impact,
        "images": {
            "original": make_data_url(original_rgb),
            "normalized": make_data_url(normalized_rgb),
            "heatmap": make_data_url(heatmap_rgb),
            "overlay": make_data_url(overlay_rgb),
        },
    }

    return json_safe(response)


async def save_analysis_for_user(
    *,
    user: dict[str, Any],
    file: UploadFile,
    payload: dict[str, Any],
    file_size_bytes: int,
) -> str:
    db = db_manager.get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")

    analysis_document = json_safe(
        {
            "analysis_type": "tongue",
            "user_id": user.get("sub", ""),
            "user_email": user.get("email", ""),
            "user_name": user.get("name", ""),
            "file_name": file.filename or "tongue-image",
            "content_type": file.content_type or "",
            "file_size_bytes": file_size_bytes,
            "model_name": payload.get("model_name", ""),
            "model_description": payload.get("model_description", ""),
            "classes": payload.get("classes", []),
            "prediction": payload.get("prediction", ""),
            "prediction_details": payload.get("prediction_details", {}),
            "probability": payload.get("probability", 0),
            "confidence": payload.get("confidence", 0),
            "confidence_category": payload.get("confidence_category", ""),
            "raw_model_probability_for_class_index_1": payload.get("raw_model_probability_for_class_index_1", 0),
            "estimated_diabetic_risk_percent": payload.get("estimated_diabetic_risk_percent", 0),
            "risk_score": payload.get("risk_score", 0),
            "risk_level": payload.get("risk_level", ""),
            "severity_stage": payload.get("severity_stage", 0),
            "severity_label": payload.get("severity_label", ""),
            "hsv_features": payload.get("hsv_features", {}),
            "explainability": payload.get("explainability", {}),
            "visual_features": payload.get("visual_features", {}),
            "findings": payload.get("findings", []),
            "feature_analysis": payload.get("feature_analysis", {}),
            "current_state": payload.get("current_state", {}),
            "projection": payload.get("projection", {}),
            "organ_impact": payload.get("organ_impact", {}),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    result = await db.tongue_analyses.insert_one(analysis_document)
    return str(result.inserted_id)


@router.post("/tongue/analyze")
async def analyze_tongue_image(
    file: UploadFile = File(...),
    user: dict[str, Any] = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a tongue image file")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    image_array = np.frombuffer(contents, np.uint8)
    image_bgr = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise HTTPException(status_code=400, detail="Could not decode the uploaded image")

    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    original_rgb, normalized_rgb, img_input = preprocess_tongue_image(image_rgb)
    profile = load_profile()

    try:
        payload = build_response_payload(
            user=user,
            original_rgb=original_rgb,
            normalized_rgb=normalized_rgb,
            img_input=img_input,
            profile=profile,
        )
        analysis_id = await save_analysis_for_user(
            user=user,
            file=file,
            payload=payload,
            file_size_bytes=len(contents),
        )
        payload["analysis_id"] = analysis_id
        payload["stored"] = True
        payload["user"] = {
            "id": user.get("sub", ""),
            "email": user.get("email", ""),
            "name": user.get("name", ""),
            "role": user.get("role", "patient"),
        }
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Tongue analysis failed: {exc}") from exc
