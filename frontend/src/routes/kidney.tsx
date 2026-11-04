import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, Brain, Loader2 } from "lucide-react";
import { AppHeader, MedicalDisclaimer } from "@/components/AppHeader";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { apiAnalyzeKidney, type KidneyAnalysisResponse } from "@/lib/api";

export const Route = createFileRoute("/kidney")({ component: KidneyPage });

const numericFields = [
  ["age", "Age", "years"],
  ["bp", "Blood pressure", "mmHg"],
  ["bgr", "Random glucose", "mg/dL"],
  ["bu", "Blood urea", "mg/dL"],
  ["sc", "Serum creatinine", "mg/dL"],
  ["sod", "Sodium", "mEq/L"],
  ["pot", "Potassium", "mEq/L"],
  ["hemo", "Hemoglobin", "g/dL"],
  ["pcv", "Packed cell volume", "%"],
] as const;
const categoricalFields = [
  ["htn", "Hypertension"],
  ["dm", "Diabetes mellitus"],
  ["rbc", "Red blood cells"],
  ["pc", "Pus cell"],
  ["appet", "Appetite"],
  ["pe", "Pedal edema"],
  ["ane", "Anemia"],
] as const;
const options: Record<string, string[]> = {
  htn: ["yes", "no"],
  dm: ["yes", "no"],
  rbc: ["normal", "abnormal"],
  pc: ["normal", "abnormal"],
  appet: ["good", "poor"],
  pe: ["yes", "no"],
  ane: ["yes", "no"],
};

function KidneyPage() {
  const user = useRequireAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<KidneyAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const input = Object.fromEntries(
        Object.entries(values).map(([key, value]) => {
          const numeric = numericFields.some(([name]) => name === key);
          return [key, numeric && value !== "" ? Number(value) : value];
        }),
      );
      setResult(await apiAnalyzeKidney(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kidney analysis failed");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-8 sm:py-10">
        <Link
          to="/organs/$organId"
          params={{ organId: "kidneys" }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to kidneys
        </Link>
        <section className="mt-6 clinical-card-elevated p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Kidney / CKD analysis
          </p>
          <h1 className="mt-2 text-3xl font-display font-semibold text-foreground">
            Enter available kidney lab values.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The notebook-trained model accepts clinical and urinalysis values.
            Missing values are imputed by the saved pipeline. This is a
            screening signal, not a diagnosis.
          </p>
          <form onSubmit={submit} className="mt-7">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {numericFields.map(([name, label, unit]) => (
                <label
                  key={name}
                  className="text-sm font-medium text-foreground"
                >
                  {label}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({unit})
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={values[name] || ""}
                    onChange={(e) =>
                      setValues({ ...values, [name]: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </label>
              ))}
              {categoricalFields.map(([name, label]) => (
                <label
                  key={name}
                  className="text-sm font-medium text-foreground"
                >
                  {label}
                  <select
                    value={values[name] || ""}
                    onChange={(e) =>
                      setValues({ ...values, [name]: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    <option value="">Not provided</option>
                    {options[name].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-6 btn-premium inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              {loading ? "Analyzing..." : "Analyze CKD risk"}
            </button>
          </form>
          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-risk-high/30 bg-risk-high/5 px-4 py-3 text-sm text-risk-high">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              {error}
            </div>
          )}
        </section>
        {result && (
          <section className="mt-6 clinical-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Screening result
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  {result.prediction}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.findings[0]}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-foreground">
                  {result.risk_score}%
                </div>
                <div className="text-xs font-semibold text-muted-foreground">
                  {result.risk_level} risk band
                </div>
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${result.risk_score}%` }}
              />
            </div>
          </section>
        )}
        <div className="mt-8">
          <MedicalDisclaimer />
        </div>
      </main>
    </div>
  );
}
