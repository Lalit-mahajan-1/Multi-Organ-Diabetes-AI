import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  Eye,
  ImagePlus,
  Loader2,
  Sparkles,
  Upload,
  Waves,
} from "lucide-react";
import { AppHeader, MedicalDisclaimer } from "@/components/AppHeader";
import { RiskGauge } from "@/components/RiskGauge";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { apiAnalyzeTongue, type TongueAnalysisResponse } from "@/lib/api";
import { organCatalog } from "@/lib/organCatalog";

export const Route = createFileRoute("/tongue")({
  component: TonguePage,
});

const FEATURE_ORDER = ["color", "coating", "texture", "moisture", "shape"];

function TonguePage() {
  const user = useRequireAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TongueAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const tongueCard = useMemo(() => organCatalog.find((organ) => organ.slug === "tongue"), []);
  const visualFeatures: Record<string, { observed: string; meaning: string }> =
    result?.visual_features || result?.feature_analysis || {};
  const mostAffectedRegion = result?.explainability?.most_affected_region || "center";
  const diabeticRiskScore = Math.max(
    0,
    Math.min(100, result?.estimated_diabetic_risk_percent ?? result?.risk_score ?? 0),
  );
  const gaugeRisk = mapRiskLevel(result?.risk_level);

  async function handleAnalyze() {
    if (!file) {
      setError("Please choose a tongue image first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiAnalyzeTongue(file);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tongue analysis failed");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-6 py-8 sm:py-10">
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border clinical-card-elevated p-6 sm:p-8"
        >
          <div className="absolute inset-0 gradient-mesh opacity-70 pointer-events-none" />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />

          <div className="relative grid lg:grid-cols-[1.05fr_0.95fr] gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Tongue analysis</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-display font-semibold tracking-tight text-foreground">
                Upload a tongue image for <span className="text-gradient-primary">Grad-CAM</span> review.
              </h1>
              <p className="mt-3 text-sm text-muted-foreground max-w-2xl leading-relaxed">
                This page uses your saved tongue model to produce a diabetic-risk prediction, a CLAHE-normalized view,
                and a Grad-CAM overlay showing the regions that influenced the model most.
              </p>

              <div className="mt-6 grid sm:grid-cols-3 gap-3">
                <MiniStat icon={Sparkles} label="Model" value={tongueCard?.title || "Tongue"} />
                <MiniStat icon={Waves} label="Preprocess" value="CLAHE + 224px" />
                <MiniStat icon={Brain} label="XAI" value="Grad-CAM" />
              </div>
            </div>

            <div className="clinical-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ImagePlus className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Select tongue image</div>
                  <div className="text-xs text-muted-foreground">JPG, PNG, or WEBP</div>
                </div>
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center hover:bg-muted/30 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="mt-3 text-sm font-medium text-foreground">
                  {file ? file.name : "Choose a tongue image"}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  Clear lighting and a centered tongue give the best results.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const next = e.target.files?.[0] || null;
                    setFile(next);
                    setResult(null);
                    setError(null);
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading || !file}
                className="mt-4 btn-premium w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                {loading ? "Analyzing tongue..." : "Analyze tongue image"}
              </button>

              {error && (
                <div className="mt-4 rounded-xl border border-risk-high/30 bg-risk-high/5 px-4 py-3 text-sm text-risk-high flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <section className="mt-8 grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
          <div className="space-y-6">
            <div className="clinical-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="font-semibold text-foreground">Image preview</h2>
              </div>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Tongue preview"
                  className="w-full rounded-2xl border border-border object-cover"
                />
              ) : (
                <EmptyPanel title="No image selected" text="Pick a tongue photo to preview it here before analysis." />
              )}
            </div>

            <div className="grid xl:grid-cols-[1.35fr_0.85fr] gap-4 items-start">
              <div className="grid sm:grid-cols-2 gap-4">
                <ImageTile
                  title="Highlighted focus"
                  description={`Most affected: ${formatZone(mostAffectedRegion)}`}
                  src={result?.images.overlay}
                  highlight
                  badge={`Activation peak: ${formatZone(mostAffectedRegion)}`}
                />
                <ImageTile
                  title="CLAHE Normalized"
                  description="Notebook preprocessing output"
                  src={result?.images.normalized}
                />
                <ImageTile title="Grad-CAM Heatmap" description="Attention map" src={result?.images.heatmap} />
                <ImageTile title="Original" description="Uploaded image" src={result?.images.original} />
              </div>

              <ReportCard title="Visual features" icon={Waves}>
                <div className="space-y-3">
                  {FEATURE_ORDER.map((key) => {
                    const feature = visualFeatures[key];
                    if (!feature) return null;
                    return (
                      <div key={key} className="rounded-2xl border border-border bg-muted/15 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-foreground capitalize">{key}</div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Notebook feature
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-foreground">{feature.observed}</div>
                        <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{feature.meaning}</div>
                      </div>
                    );
                  })}
                </div>
              </ReportCard>
            </div>
          </div>

          <div className="space-y-4">
            {result ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="clinical-card-elevated p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Prediction</p>
                      <h2 className="mt-1 text-2xl font-display font-semibold tracking-tight text-foreground">
                        {result.prediction}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">{result.model_description}</p>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-muted/30 px-4 py-3 text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Confidence
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-foreground">
                        {Math.round((result.confidence ?? 0) * 100)}%
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {result.confidence_category || confidenceCategory(result.confidence)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid md:grid-cols-[auto_1fr] gap-5 items-center">
                    <div className="flex justify-center">
                      <RiskGauge score={Math.round(diabeticRiskScore)} risk={gaugeRisk} size={200} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <MetricTile label="Estimated diabetic risk" value={`${diabeticRiskScore.toFixed(1)}%`} />
                      <MetricTile label="Raw class-1 score" value={formatFraction(result.raw_model_probability_for_class_index_1)} />
                      <MetricTile label="Risk level" value={result.risk_level} />
                      <MetricTile label="Severity stage" value={String(result.severity_stage)} />
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-border bg-muted/15 p-4">
                    <div className="grid sm:grid-cols-3 gap-3">
                      <MetricTile label="Model output" value={result.prediction_details?.label || "unknown"} />
                      <MetricTile
                        label="Class-1 meaning"
                        value={modelClassMeaning(
                          result.classes?.[1],
                          result.prediction_details?.raw_model_probability_for_class_index_1,
                        )}
                      />
                      <MetricTile label="Analysed size" value="224 x 224" />
                    </div>
                  </div>
                </motion.div>

                <ReportCard title="Notebook-style summary" icon={Sparkles}>
                  <div className="space-y-3">
                    {result.findings.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-border bg-muted/15 px-4 py-3 text-sm text-foreground leading-relaxed"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </ReportCard>

                <ReportCard title="Projection" icon={Brain}>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <MetricTile
                      label="Next stage"
                      value={String(result.projection?.["next_stage"] || result.current_state?.["severity_label"] || "-")}
                    />
                    <MetricTile
                      label="Progression probability"
                      value={formatFraction(result.projection?.["progression_probability"] as number | undefined)}
                    />
                    <MetricTile
                      label="Risk outlook"
                      value={String(result.projection?.["systemic_worsening_risk"] || "-")}
                    />
                    <MetricTile
                      label="Current state"
                      value={String(result.current_state?.["severity_label"] || result.severity_label)}
                    />
                  </div>
                </ReportCard>

                <ReportCard title="Organ impact" icon={AlertTriangle}>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {Object.entries(result.organ_impact || {}).map(([key, item]) => (
                      <div key={key} className="rounded-2xl border border-border bg-muted/15 p-4">
                        <div className="text-sm font-semibold text-foreground capitalize">{key.replace(/_/g, " ")}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Risk: {item.risk}
                        </div>
                        <div className="mt-2 text-sm text-foreground leading-relaxed">{item.damage}</div>
                      </div>
                    ))}
                  </div>
                </ReportCard>
              </>
            ) : (
              <div className="clinical-card p-6">
                <p className="text-sm text-muted-foreground">
                  Your tongue analysis results will appear here after the model finishes.
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="mt-10">
          <MedicalDisclaimer />
        </div>
      </main>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{label}</div>
          <div className="text-sm font-semibold text-foreground">{value}</div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/30 p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground leading-snug">{value}</div>
    </div>
  );
}

function ReportCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="clinical-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ImageTile({
  title,
  description,
  src,
  highlight = false,
  badge,
}: {
  title: string;
  description: string;
  src?: string;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div className={`clinical-card p-4 ${highlight ? "ring-1 ring-accent/30" : ""}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        {badge ? (
          <div className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            {badge}
          </div>
        ) : null}
      </div>
      {src ? (
        <img
          src={src}
          alt={title}
          className="h-44 w-full rounded-xl border border-border object-cover bg-muted"
        />
      ) : (
        <EmptyPanel title="Waiting for analysis" text="Run the model to generate this view." compact />
      )}
    </div>
  );
}

function EmptyPanel({ title, text, compact = false }: { title: string; text: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-dashed border-border bg-muted/15 ${compact ? "p-4" : "p-8"}`}>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{text}</div>
    </div>
  );
}

function confidenceCategory(confidence?: number) {
  if ((confidence ?? 0) < 0.6) return "Low confidence";
  if ((confidence ?? 0) < 0.8) return "Medium confidence";
  return "High confidence";
}

function formatFraction(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function formatZone(zone: string) {
  return zone.replace(/_/g, " ");
}

function mapRiskLevel(level?: string) {
  if (!level) return "moderate";
  const normalized = level.toLowerCase();
  if (normalized.includes("very")) return "severe";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("low")) return "low";
  return "moderate";
}

function modelClassMeaning(className?: string, rawScore?: number) {
  if (typeof rawScore !== "number") return "Diabetic likelihood unavailable";
  const base = `Diabetic likelihood | raw ${Math.round(rawScore * 100)}%`;
  return className ? `${className} - ${base}` : base;
}
