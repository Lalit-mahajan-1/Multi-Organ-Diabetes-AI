import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Activity, Heart, Footprints, Droplet, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { assessmentStore } from "@/lib/assessmentStore";
import { apiAnalyze, type AnalysisEvent } from "@/lib/api";

export const Route = createFileRoute("/processing")({
  component: ProcessingPage,
});

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  retina: Eye,
  "blood-report": Droplet,
  blood: Droplet,
  "kidney-report": Activity,
  kidney: Activity,
  heart: Heart,
  ecg: Heart,
  foot: Footprints,
};

interface StepState {
  id: string;
  label: string;
  status: "pending" | "processing" | "complete" | "warning" | "error";
  score?: number;
  message?: string;
}

function ProcessingPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const sessionId = assessmentStore.get().sessionId;
  const abortRef = useRef<(() => void) | null>(null);

  const [steps, setSteps] = useState<StepState[]>([
    { id: "loading", label: "Loading session data", status: "pending" },
    { id: "classifying", label: "Classifying uploaded files", status: "pending" },
    { id: "analyzing", label: "Running AI analysis agents", status: "pending" },
    { id: "risk_scoring", label: "Computing overall risk profile", status: "pending" },
    { id: "trends", label: "Analyzing trends", status: "pending" },
    { id: "llm_summary", label: "Generating AI medical summary", status: "pending" },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      // No session — redirect back to assessment
      navigate({ to: "/assessment" });
      return;
    }

    const abort = apiAnalyze(
      sessionId,
      // onEvent
      (event: AnalysisEvent) => {
        setSteps((prev) => {
          const existing = prev.find((s) => s.id === event.step);

          if (existing) {
            // Update existing step
            return prev.map((s) =>
              s.id === event.step
                ? {
                    ...s,
                    label: event.label || s.label,
                    status: event.status === "complete" ? "complete"
                          : event.status === "warning" ? "warning"
                          : event.status === "error" ? "error"
                          : "processing",
                    score: event.score ?? s.score,
                    message: event.message,
                  }
                : s
            );
          } else if (event.step !== "complete" && event.step !== "error") {
            // Add new step (e.g., individual organ agents)
            return [
              ...prev,
              {
                id: event.step,
                label: event.label || event.step,
                status: event.status === "complete" ? "complete" : "processing",
                score: event.score,
                message: event.message,
              },
            ];
          }
          return prev;
        });
      },
      // onDone
      () => {
        setTimeout(() => navigate({ to: "/results", search: { session: sessionId } }), 800);
      },
      // onError
      (err) => {
        setError(err.message);
      }
    );

    abortRef.current = abort;
    return () => abort();
  }, [sessionId, navigate]);

  const completedSteps = steps.filter((s) => s.status === "complete").length;
  const progress = Math.min(100, Math.round((completedSteps / Math.max(steps.length, 1)) * 100));
  const remaining = Math.max(0, (steps.length - completedSteps) * 2);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl clinical-card-elevated p-8 sm:p-10"
        >
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-accent uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Analysis in progress
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-foreground tracking-tight">
              Processing your assessment
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Estimated time remaining: <span className="font-medium text-foreground">{remaining}s</span>
            </p>
          </div>

          {/* Organ icons row */}
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            {["retina", "blood", "kidney", "heart", "foot"].map((organ) => {
              const Icon = STEP_ICONS[organ] || Activity;
              const step = steps.find((s) => s.id === organ || s.id === `${organ}-report`);
              const done = step?.status === "complete";
              const active = step?.status === "processing";
              return (
                <motion.div
                  key={organ}
                  animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={active ? { duration: 1.4, repeat: Infinity } : {}}
                  className={`h-14 w-14 rounded-xl flex items-center justify-center border transition-colors
                    ${
                      done
                        ? "bg-risk-low/10 border-risk-low/30 text-risk-low"
                        : active
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                >
                  <Icon className="h-6 w-6" />
                </motion.div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-8">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-accent"
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{progress}% complete</span>
              <span>{completedSteps} / {steps.length} stages</span>
            </div>
          </div>

          {/* Step list */}
          <ul className="mt-8 space-y-2.5">
            {steps.map((s) => (
              <li
                key={s.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                  ${s.status === "processing" ? "bg-primary/5" : "bg-transparent"}`}
              >
                <div className="h-5 w-5 flex items-center justify-center">
                  {s.status === "complete" ? (
                    <CheckCircle2 className="h-5 w-5 text-risk-low" />
                  ) : s.status === "processing" ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : s.status === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-risk-moderate" />
                  ) : s.status === "error" ? (
                    <AlertTriangle className="h-4 w-4 text-risk-high" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-border" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm ${
                      s.status === "complete"
                        ? "text-muted-foreground line-through"
                        : s.status === "processing"
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                  {s.message && (
                    <p className="text-xs text-muted-foreground mt-0.5">{s.message}</p>
                  )}
                </div>
                {s.score != null && s.status === "complete" && (
                  <span className="text-xs font-medium text-muted-foreground">
                    Score: {s.score}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Analysis failed: {error}. <button onClick={() => navigate({ to: "/assessment" })} className="underline font-medium">Try again</button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
