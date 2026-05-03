import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, CheckCircle2, ClipboardList, ShieldCheck } from "lucide-react";
import { AppHeader, MedicalDisclaimer } from "@/components/AppHeader";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getOrganBySlug, organCatalog } from "@/lib/organCatalog";

export const Route = createFileRoute("/organs/$organId")({
  component: OrganDetailPage,
  loader: ({ params }) => {
    const organ = getOrganBySlug(params.organId);
    if (!organ) throw notFound();
    return { organ };
  },
});

function OrganDetailPage() {
  const user = useRequireAuth();
  const { organ } = Route.useLoaderData();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
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
          className="clinical-card-elevated p-6 sm:p-8"
        >
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: `${organ.accent}18`,
                  color: organ.accent,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: organ.accent }} />
                Organ focus
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl font-display font-semibold tracking-tight text-foreground">
                {organ.title}
              </h1>
              <p className="mt-2 text-sm uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                {organ.subtitle}
              </p>
              <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                {organ.overview}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-5">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white shadow-elevated"
                  style={{ background: `linear-gradient(135deg, ${organ.accent}, color-mix(in oklab, ${organ.accent} 55%, black))` }}
                >
                  {organ.badge}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                    Quick summary
                  </div>
                  <div className="text-base font-semibold text-foreground">{organ.summary}</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                {organ.keyPoints.map((point) => (
                  <div key={point} className="flex items-start gap-2 rounded-xl bg-muted/35 px-3 py-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4" style={{ color: organ.accent }} />
                    <span className="text-sm text-foreground leading-relaxed">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <section className="mt-8 grid lg:grid-cols-3 gap-4">
          <InfoCard
            icon={ClipboardList}
            title="Common checks"
            accent={organ.accent}
          >
            <ul className="space-y-2">
              {organ.commonChecks.map((item) => (
                <li key={item} className="text-sm text-foreground leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </InfoCard>

          <InfoCard
            icon={ShieldCheck}
            title="Self-care"
            accent={organ.accent}
          >
            <ul className="space-y-2">
              {organ.selfCare.map((item) => (
                <li key={item} className="text-sm text-foreground leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </InfoCard>

          <InfoCard
            icon={AlertTriangle}
            title="Seek care sooner if"
            accent={organ.accent}
          >
            <ul className="space-y-2">
              {organ.urgentSigns.map((item) => (
                <li key={item} className="text-sm text-foreground leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </InfoCard>
        </section>

        <section className="mt-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Questions for your doctor
            </p>
            <h2 className="mt-1 text-2xl font-display font-semibold tracking-tight text-foreground">
              Useful conversation starters
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Bring these to your appointment if you want to understand this organ system in more detail.
            </p>
          </div>
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            {organ.doctorQuestions.map((question) => (
              <div key={question} className="clinical-card p-4">
                <p className="text-sm text-foreground leading-relaxed">{question}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Other organs
              </p>
              <h2 className="mt-1 text-2xl font-display font-semibold tracking-tight text-foreground">
                Jump to another system
              </h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {organCatalog
              .filter((item) => item.slug !== organ.slug)
              .slice(0, 4)
              .map((item) => (
                <Link
                  key={item.slug}
                  to={item.path as any}
                  params={item.path === "/tongue" ? undefined : ({ organId: item.slug } as any)}
                  className="clinical-card p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                    </div>
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: item.accent }}
                    >
                      {item.badge}
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </section>

        <div className="mt-10">
          <MedicalDisclaimer />
        </div>
      </main>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="clinical-card p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: accent }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}
