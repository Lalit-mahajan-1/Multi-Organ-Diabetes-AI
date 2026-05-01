import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Plus,
  Activity,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Calendar,
  ArrowRight,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { AppHeader, MedicalDisclaimer } from "@/components/AppHeader";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { history } from "@/lib/authStore";
import { riskMeta } from "@/lib/mockData";
import { useMemo } from "react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();

  const records = useMemo(() => (user ? history.list(user.id) : []), [user]);

  if (!user) return null;

  const lastRisk = records[0]?.overallRisk;
  const avgScore =
    records.length > 0
      ? Math.round(records.reduce((a, r) => a + r.overallScore, 0) / records.length)
      : null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border clinical-card-elevated p-8 sm:p-10"
        >
          <div className="absolute inset-0 gradient-mesh opacity-70 pointer-events-none" />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />

          <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                {greeting()} · {user.role === "clinician" ? "Clinician workspace" : "Patient dashboard"}
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-display font-semibold tracking-tight text-foreground">
                Welcome back, <span className="text-gradient-primary">{firstName(user.name)}</span>.
              </h1>
              <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
                Run a new multi-organ AI risk assessment, or review previous reports. Every analysis
                is explainable, auditable, and aligned with clinical reference ranges.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate({ to: "/assessment" })}
                  className="btn-premium inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                >
                  <Plus className="h-4 w-4" /> Start new assessment
                </motion.button>
                <Link
                  to="/assessment"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                >
                  Learn how it works <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={ClipboardList}
                label="Assessments"
                value={records.length.toString()}
                hint="Total reports"
              />
              <StatCard
                icon={TrendingUp}
                label="Avg risk score"
                value={avgScore !== null ? `${avgScore}` : "—"}
                hint="Across all reports"
              />
              <StatCard
                icon={HeartPulse}
                label="Latest risk"
                value={lastRisk ? riskMeta[lastRisk].label : "—"}
                hint={records[0]?.createdAt ? formatDate(records[0].createdAt) : "No reports yet"}
                tone={lastRisk}
              />
              <StatCard
                icon={ShieldCheck}
                label="Confidence"
                value="98.2%"
                hint="Model reliability"
              />
            </div>
          </div>
        </motion.section>

        {/* History */}
        <section className="mt-10">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">History</p>
              <h2 className="mt-1 text-2xl font-display font-semibold tracking-tight text-foreground">
                Past assessments
              </h2>
            </div>
            <Link
              to="/assessment"
              className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> New
            </Link>
          </div>

          {records.length === 0 ? (
            <EmptyState onStart={() => navigate({ to: "/assessment" })} />
          ) : (
            <div className="grid gap-3">
              {records.map((r) => {
                const meta = riskMeta[r.overallRisk];
                return (
                  <motion.button
                    key={r.id}
                    whileHover={{ y: -1 }}
                    onClick={() => navigate({ to: "/results" })}
                    className="text-left clinical-card p-5 flex flex-wrap items-center justify-between gap-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: `color-mix(in oklab, var(--${meta.tone}) 15%, transparent)`,
                          color: `var(--${meta.tone})`,
                        }}
                      >
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{r.patientName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {formatDate(r.createdAt)} · {r.organCount} organs
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Risk</div>
                        <div className={`text-sm font-semibold ${meta.text}`}>{meta.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Score</div>
                        <div className="text-sm font-semibold text-foreground">{r.overallScore}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-10">
          <MedicalDisclaimer />
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  tone?: "low" | "moderate" | "high" | "severe";
}) {
  const toneColor = tone ? `var(--risk-${tone})` : `var(--primary)`;
  return (
    <div className="relative rounded-xl border border-border bg-card/80 backdrop-blur p-4 overflow-hidden">
      <div
        className="absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-15 blur-2xl"
        style={{ backgroundColor: toneColor }}
      />
      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in oklab, ${toneColor} 14%, transparent)`, color: toneColor }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-display font-semibold tracking-tight text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
    </div>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="clinical-card p-10 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shadow-elevated">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-display font-semibold text-foreground">No assessments yet</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
        Upload a few medical reports or images to generate your first AI-assisted multi-organ risk profile.
      </p>
      <button
        onClick={onStart}
        className="btn-premium mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
      >
        <Plus className="h-4 w-4" /> Start new assessment
      </button>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
function firstName(name: string) {
  return name.split(" ")[0] || name;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
