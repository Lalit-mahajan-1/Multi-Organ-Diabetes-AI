import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, ArrowRight, ShieldCheck, Eye, Heart, Footprints, Droplet, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/authStore";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const user = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-20">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-elevated">
              <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-base font-display font-semibold text-foreground tracking-tight">
                Multi-Organ Diabetes AI
              </div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">Clinical Risk Assessment</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-sm font-medium text-foreground px-4 py-2 rounded-full border border-border bg-card hover:bg-muted/60 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="btn-premium text-sm font-semibold inline-flex items-center gap-1.5 rounded-full px-4 py-2"
            >
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-x-0 top-20 h-[500px] grid-pattern opacity-50" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-4xl mx-auto px-6 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-6">
            <ShieldCheck className="h-3.5 w-3.5" />
            Hospital-grade AI · HIPAA-aligned · Explainable
          </div>
          <h1 className="text-5xl sm:text-6xl font-display font-semibold tracking-tight text-foreground leading-[1.05]">
            One assessment.<br />
            <span className="text-gradient-primary">Five organ systems.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Combine retinal imaging, blood markers, kidney panels, cardiovascular and foot data into
            a single, explainable diabetes risk profile — for clinicians and patients.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/signup"
              className="btn-premium inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold"
            >
              <Sparkles className="h-4 w-4" /> Create your account
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
            >
              Sign in <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Organ chips */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {[
              { Icon: Eye, label: "Retina" },
              { Icon: Droplet, label: "Blood" },
              { Icon: Activity, label: "Kidney" },
              { Icon: Heart, label: "Heart" },
              { Icon: Footprints, label: "Foot" },
            ].map(({ Icon, label }) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 shadow-clinical"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <footer className="text-center text-xs text-muted-foreground pb-8">
        © {new Date().getFullYear()} Multi-Organ Diabetes AI · This is an AI-based risk assessment, not a medical diagnosis.
      </footer>
    </div>
  );
}
