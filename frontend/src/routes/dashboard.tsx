import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, HeartPulse, ShieldCheck, Calendar, ArrowRight, ClipboardList, TrendingUp } from "lucide-react";
import { AppHeader, MedicalDisclaimer } from "@/components/AppHeader";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { history } from "@/lib/authStore";
import { organCatalog } from "@/lib/organCatalog";
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

  return user.role === "patient" ? (
    <PatientDashboard
      userName={firstName(user.name)}
      records={records}
      onOpenResults={() => navigate({ to: "/results" })}
    />
  ) : (
    <ClinicianDashboard
      userName={firstName(user.name)}
      records={records}
      onOpenResults={() => navigate({ to: "/results" })}
    />
  );
}

function PatientDashboard({
  userName,
  records,
  onOpenResults,
}: {
  userName: string;
  records: ReturnType<typeof history.list>;
  onOpenResults: () => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Patient organ dashboard</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-display font-semibold tracking-tight text-foreground">
            Welcome back, <span className="text-gradient-primary">{userName}</span>.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Choose an organ system to review risk signals, care tips, and warning signs.
          </p>
        </div>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Organ cards</p>
              <h2 className="mt-1 text-2xl font-display font-semibold tracking-tight text-foreground">
                Pick a system to review
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Each card opens a focused guide for symptoms, checks, and questions to bring to your doctor.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {organCatalog.map((organ, index) => (
              <motion.div
                key={organ.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Link
                  to={organ.path as any}
                  params={organ.path === "/tongue" ? undefined : ({ organId: organ.slug } as any)}
                  className="group clinical-card h-full p-5 flex flex-col justify-between hover:border-primary/40 hover:shadow-elevated transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {organ.subtitle}
                        </div>
                        <h3 className="mt-1 text-lg font-semibold text-foreground">{organ.title}</h3>
                      </div>
                      <div
                        className="h-11 w-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-elevated"
                        style={{
                          background: `linear-gradient(135deg, ${organ.accent}, color-mix(in oklab, ${organ.accent} 55%, black))`,
                        }}
                      >
                        {organ.badge}
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{organ.summary}</p>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{organ.keyPoints.length} checkpoints</span>
                      <span className="group-hover:text-foreground transition-colors">Open details</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {organ.keyPoints.slice(0, 2).map((point) => (
                        <span
                          key={point}
                          className="rounded-full bg-muted/50 px-2.5 py-1 text-[11px] text-foreground"
                        >
                          {point}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">History</p>
              <h2 className="mt-1 text-2xl font-display font-semibold tracking-tight text-foreground">
                Past assessments
              </h2>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="clinical-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No assessments yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {records.map((r) => {
                const meta = riskMeta[r.overallRisk];
                return (
                  <motion.button
                    key={r.id}
                    whileHover={{ y: -1 }}
                    onClick={onOpenResults}
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

function ClinicianDashboard({
  userName,
  records,
  onOpenResults,
}: {
  userName: string;
  records: ReturnType<typeof history.list>;
  onOpenResults: () => void;
}) {
  const lastRisk = records[0]?.overallRisk;
  const avgScore =
    records.length > 0
      ? Math.round(records.reduce((a, r) => a + r.overallScore, 0) / records.length)
      : null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-6 py-10">
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
                {greeting()} · Clinician workspace
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-display font-semibold tracking-tight text-foreground">
                Welcome back, <span className="text-gradient-primary">{userName}</span>.
              </h1>
              <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
                Run a new multi-organ AI risk assessment, or review previous reports. Every analysis is explainable, auditable, and aligned with clinical reference ranges.
              </p>

            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={ClipboardList} label="Assessments" value={records.length.toString()} hint="Total reports" />
              <StatCard icon={TrendingUp} label="Avg risk score" value={avgScore !== null ? `${avgScore}` : "—"} hint="Across all reports" />
              <StatCard
                icon={HeartPulse}
                label="Latest risk"
                value={lastRisk ? riskMeta[lastRisk].label : "—"}
                hint={records[0]?.createdAt ? formatDate(records[0].createdAt) : "No reports yet"}
                tone={lastRisk}
              />
              <StatCard icon={ShieldCheck} label="Confidence" value="98.2%" hint="Model reliability" />
            </div>
          </div>
        </motion.section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">History</p>
              <h2 className="mt-1 text-2xl font-display font-semibold tracking-tight text-foreground">
                Past assessments
              </h2>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="clinical-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No assessments yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {records.map((r) => {
                const meta = riskMeta[r.overallRisk];
                return (
                  <motion.button
                    key={r.id}
                    whileHover={{ y: -1 }}
                    onClick={onOpenResults}
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
