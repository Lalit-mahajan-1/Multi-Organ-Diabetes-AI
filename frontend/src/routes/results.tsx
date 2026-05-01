import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Printer,
  Share2,
  ChevronDown,
  Calendar,
  Stethoscope,
  HeartPulse,
  ClipboardList,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AppHeader, MedicalDisclaimer } from "@/components/AppHeader";
import { RiskGauge } from "@/components/RiskGauge";
import { OrganCard } from "@/components/OrganCard";
import { mockResults, recommendations as mockRecommendations, riskMeta, type OrganResult } from "@/lib/mockData";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { history } from "@/lib/authStore";
import { assessmentStore } from "@/lib/assessmentStore";
import { apiGetResults, apiExportReport, downloadBlob } from "@/lib/api";

export const Route = createFileRoute("/results")({
  component: ResultsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    session: (search.session as string) || "",
  }),
});

type RiskLevel = "low" | "moderate" | "high" | "severe";

function ResultsPage() {
  const user = useRequireAuth();
  const { session } = useSearch({ from: "/results" });
  const sessionId = session || assessmentStore.get().sessionId;

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      // No session — use mock data
      setResults(mockResults);
      setRecommendations(mockRecommendations);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await apiGetResults(sessionId) as any;
        setResults({
          overallRisk: data.overallRisk || data.overall_risk || "moderate",
          overallScore: data.overallScore || data.overall_score || 50,
          organs: (data.organs || []).map((o: any) => ({
            ...o,
            abnormalValues: o.abnormalValues || o.abnormal_values || [],
            hasImage: o.hasImage ?? o.has_image ?? false,
          })),
        });
        setRecommendations(data.recommendations || mockRecommendations);
      } catch (err) {
        console.error("Failed to load results:", err);
        setError("Failed to load results. Showing demo data.");
        setResults(mockResults);
        setRecommendations(mockRecommendations);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  // Save to local history
  useEffect(() => {
    if (!user || saved.current || !results) return;
    saved.current = true;
    const patient = assessmentStore.get().patient;
    history.add({
      userId: user.id,
      patientName: user.role === "clinician" ? `Patient · age ${patient.age || "—"}` : user.name,
      overallRisk: results.overallRisk,
      overallScore: results.overallScore,
      organCount: results.organs.length,
    });
  }, [user, results]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">Loading results…</p>
          </div>
        </main>
      </div>
    );
  }

  const { overallRisk, overallScore, organs } = results;
  const meta = riskMeta[overallRisk as RiskLevel];
  const recs = recommendations;

  async function handleExport() {
    if (!sessionId) {
      window.print();
      return;
    }
    try {
      const blob = await apiExportReport(sessionId);
      downloadBlob(blob, `risk_report_${sessionId}.pdf`);
    } catch {
      window.print();
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-6 py-8 print:py-0">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <div className="flex items-center gap-2">
            <ActionBtn icon={Printer} label="Print" onClick={() => window.print()} />
            <ActionBtn icon={Share2} label="Share with doctor" />
            <ActionBtn icon={Download} label="Download PDF" primary onClick={handleExport} />
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-risk-moderate/30 bg-risk-moderate/5 px-4 py-3 text-sm text-risk-moderate">
            {error}
          </div>
        )}

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="clinical-card-elevated p-6 sm:p-8"
        >
          <div className="grid md:grid-cols-[auto_1fr] gap-8 items-center">
            <div className="flex justify-center">
              <RiskGauge score={overallScore} risk={overallRisk} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-accent">
                Diabetes Risk Profile
              </p>
              <h1 className="mt-1 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Composite assessment indicates{" "}
                <span className={meta.text}>{meta.label.toLowerCase()}</span>
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Combined analysis across {organs.length} organ systems and clinical inputs. The score reflects
                relative risk based on uploaded data; clinical correlation is required.
              </p>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Organ systems", value: organs.length.toString() },
                  { label: "Avg confidence", value: `${Math.round(organs.reduce((a: number, o: any) => a + o.confidence, 0) / organs.length)}%` },
                  { label: "Critical findings", value: organs.filter((o: any) => o.risk === "high" || o.risk === "severe").length.toString() },
                  { label: "Generated", value: new Date().toLocaleDateString() },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-muted/40 px-3 py-2.5">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="text-base font-semibold text-foreground mt-0.5">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Organ grid */}
        <section className="mt-8">
          <SectionTitle
            kicker="Organ-by-organ"
            title="System-level risk breakdown"
            subtitle="Each card summarizes findings, confidence, and key abnormal markers."
          />
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {organs.map((o: any) => (
              <OrganCard key={o.id} organ={o} />
            ))}
          </div>
        </section>

        {/* Detailed analysis */}
        <section className="mt-10">
          <SectionTitle
            kicker="Detailed analysis"
            title="Why these risk levels?"
            subtitle="Expand each system to view explanations, abnormal values, and trend data."
          />
          <div className="mt-5 space-y-3">
            {organs.map((o: any) => (
              <OrganAccordion key={o.id} organ={o} />
            ))}
          </div>
        </section>

        {/* Recommendations */}
        <section className="mt-10">
          <SectionTitle
            kicker="Recommendations"
            title="Suggested next steps"
            subtitle="Generated based on the composite risk profile. Confirm with your physician."
          />
          <div className="mt-5 grid lg:grid-cols-2 gap-4">
            <RecommendationCard
              icon={Stethoscope}
              title="Specialist referrals"
            >
              <ul className="space-y-3">
                {(recs.referrals || []).map((r: any) => (
                  <li key={r.specialist} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                      {r.specialist.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{r.specialist}</p>
                        <span className="text-[10px] uppercase font-semibold tracking-wide bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                          {r.urgency}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </RecommendationCard>

            <RecommendationCard icon={HeartPulse} title="Lifestyle changes">
              <ul className="space-y-2">
                {(recs.lifestyle || []).map((l: string, i: number) => (
                  <li key={i} className="text-sm text-foreground flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                    <span className="leading-relaxed">{l}</span>
                  </li>
                ))}
              </ul>
            </RecommendationCard>

            <RecommendationCard icon={ClipboardList} title="Monitoring schedule">
              <div className="divide-y divide-border">
                {(recs.monitoring || []).map((m: any) => (
                  <div key={m.item} className="py-2.5 flex items-center justify-between text-sm">
                    <span className="text-foreground">{m.item}</span>
                    <span className="text-xs text-muted-foreground">{m.frequency}</span>
                  </div>
                ))}
              </div>
            </RecommendationCard>

            <RecommendationCard icon={Calendar} title="Next steps timeline">
              <ol className="relative border-l border-border pl-5 space-y-4">
                {(recs.timeline || []).map((t: any, i: number) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[26px] top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/10" />
                    <p className="text-xs font-semibold text-accent uppercase tracking-wider">
                      {t.week}
                    </p>
                    <p className="text-sm text-foreground mt-0.5">{t.action}</p>
                  </li>
                ))}
              </ol>
            </RecommendationCard>
          </div>
        </section>

        <div className="mt-10">
          <MedicalDisclaimer />
        </div>
      </main>
    </div>
  );
}

function SectionTitle({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">{kicker}</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  primary,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors
        ${
          primary
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-card text-foreground border border-border hover:bg-muted"
        }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function RecommendationCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="clinical-card p-5">
      <header className="flex items-center gap-2.5 mb-4">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </header>
      {children}
    </div>
  );
}

function OrganAccordion({ organ }: { organ: OrganResult }) {
  const [open, setOpen] = useState(false);
  const meta = riskMeta[organ.risk];

  return (
    <div className="clinical-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full`} style={{ backgroundColor: `var(--${meta.tone})` }} />
          <div>
            <h3 className="font-semibold text-foreground">{organ.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {meta.label} · {organ.confidence}% confidence
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 grid lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Why this risk level?
                </h4>
                <p className="mt-2 text-sm text-foreground leading-relaxed">{organ.explanation}</p>

                <h4 className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Highlighted insights
                </h4>
                <ul className="mt-2 space-y-1.5">
                  {organ.findings.map((f, i) => (
                    <li key={i} className="text-sm text-foreground flex gap-2.5">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: `var(--${meta.tone})` }}
                      />
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-5">
                {organ.abnormalValues && organ.abnormalValues.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Comparison with normal ranges
                    </h4>
                    <div className="mt-2 rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Marker</th>
                            <th className="text-left px-3 py-2 font-medium">Value</th>
                            <th className="text-left px-3 py-2 font-medium">Normal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {organ.abnormalValues.map((v) => (
                            <tr key={v.name} className={v.flag ? "bg-risk-high-soft/30" : ""}>
                              <td className="px-3 py-2 text-foreground">{v.name}</td>
                              <td className="px-3 py-2 font-medium flex items-center gap-1.5">
                                {v.flag && <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />}
                                <span className={v.flag ? "text-risk-high" : "text-foreground"}>
                                  {v.value}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{v.normal}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {organ.trend && organ.trend.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Trend over time
                    </h4>
                    <div className="mt-2 h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={organ.trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{
                              background: "var(--card)",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="normal"
                            stroke="var(--muted-foreground)"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={`var(--${meta.tone})`}
                            strokeWidth={2.5}
                            dot={{ r: 3, strokeWidth: 0, fill: `var(--${meta.tone})` }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
