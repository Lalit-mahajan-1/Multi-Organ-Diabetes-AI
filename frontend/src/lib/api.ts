/**
 * API client for the backend.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });
}

async function apiJSON<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────────
export interface AuthUser {
  id: string; email: string; name: string;
  role: "patient" | "clinician"; createdAt: string;
}

interface TokenRes { access_token: string; token_type: string; user: AuthUser; }

export async function apiSignup(body: { email: string; password: string; name: string; role: string }): Promise<AuthUser> {
  const { user } = await apiJSON<TokenRes>("/api/auth/signup", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return user;
}

export async function apiLogin(email: string, password: string): Promise<AuthUser> {
  const { user } = await apiJSON<TokenRes>("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  return user;
}

export async function apiDemoLogin(): Promise<AuthUser> {
  const { user } = await apiJSON<TokenRes>("/api/auth/demo", { method: "POST" });
  return user;
}

export async function apiGetMe(): Promise<AuthUser | null> {
  try { return await apiJSON<AuthUser>("/api/auth/me"); } catch { return null; }
}

export async function apiLogout() { await apiFetch("/api/auth/logout", { method: "POST" }); }

// ── Tongue Analysis ────────────────────────────────────────
export interface TongueAnalysisResponse {
  model_name: string;
  model_description: string;
  classes?: string[];
  prediction: "Diabetic" | "Non-Diabetic";
  prediction_details: {
    label: "diabetic" | "non_diabetic";
    confidence: number;
    confidence_category?: "Low confidence" | "Medium confidence" | "High confidence";
    raw_model_probability_for_class_index_1?: number;
    estimated_diabetic_risk_percent?: number;
    probabilities: {
      diabetic: number;
      non_diabetic: number;
    };
  };
  probability: number;
  confidence: number;
  confidence_category?: "Low confidence" | "Medium confidence" | "High confidence";
  raw_model_probability_for_class_index_1?: number;
  estimated_diabetic_risk_percent?: number;
  risk_score: number;
  risk_level: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH";
  severity_stage: number;
  severity_label: string;
  hsv_features: { hue: number; saturation: number; value: number };
  explainability: {
    most_affected_region: string;
    zone_activation_scores: Record<string, number>;
  };
  visual_features?: Record<string, { observed: string; meaning: string }>;
  findings: string[];
  feature_analysis: Record<string, { observed: string; meaning: string }>;
  current_state: Record<string, unknown>;
  projection: Record<string, unknown>;
  organ_impact: Record<string, { risk: string; damage: string }>;
  images: {
    original: string;
    normalized: string;
    heatmap: string;
    overlay: string;
  };
  analysis_id?: string;
  stored?: boolean;
}

export async function apiAnalyzeTongue(file: File): Promise<TongueAnalysisResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch("/api/tongue/analyze", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Tongue analysis failed`);
  }
  return res.json() as Promise<TongueAnalysisResponse>;
}

// ── Upload ──────────────────────────────────────────────────
export interface UploadResponse {
  session_id: string;
  files: { file_type: string; original_filename: string }[];
  message: string;
}

export async function apiUploadFiles(files: File[], patientData: Record<string, unknown>): Promise<UploadResponse> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  form.append("patient_data", JSON.stringify(patientData));
  const res = await apiFetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Upload failed`);
  }
  return res.json() as Promise<UploadResponse>;
}

// ── Analyze (SSE) ───────────────────────────────────────────
export interface AnalysisEvent {
  step: string;
  status: "processing" | "complete" | "warning" | "error";
  label?: string; score?: number; message?: string;
  session_id?: string;
}

export function apiAnalyze(
  sessionId: string,
  onEvent: (e: AnalysisEvent) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): () => void {
  const ctrl = new AbortController();
  (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
        credentials: "include",
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data:")) {
            try {
              const ev = JSON.parse(line.slice(5).trim()) as AnalysisEvent;
              onEvent(ev);
              if (ev.step === "complete" && ev.status === "complete") { onDone(); return; }
            } catch { /* skip */ }
          }
        }
      }
      onDone();
    } catch (err) {
      if (!ctrl.signal.aborted) onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();
  return () => ctrl.abort();
}

// ── Results ─────────────────────────────────────────────────
export async function apiGetResults(sessionId: string) { return apiJSON(`/api/results/${sessionId}`); }
export async function apiListResults(limit = 20) { return apiJSON(`/api/results?limit=${limit}`); }

// ── Export PDF ──────────────────────────────────────────────
export async function apiExportReport(sessionId: string): Promise<Blob> {
  const res = await apiFetch("/api/export-report", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`Export failed`);
  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
