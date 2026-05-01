import { motion } from "framer-motion";
import { Activity, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface AuthShellProps {
  kicker: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({ kicker, title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background">
      {/* Left brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden text-primary-foreground p-10">
        <div className="absolute inset-0 gradient-primary" />
        <div className="absolute inset-0 grid-pattern opacity-[0.18]" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-primary-glow/50 blur-3xl" />

        <div className="relative">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <Activity className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight">Multi-Organ Diabetes AI</div>
              <div className="text-xs text-white/70 -mt-0.5">Clinical Risk Assessment Platform</div>
            </div>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-md"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-white/70 font-semibold">For clinicians & patients</p>
          <h2 className="mt-3 text-4xl font-display font-semibold leading-tight">
            Hospital-grade AI for<br />multi-organ diabetes risk.
          </h2>
          <p className="mt-4 text-sm text-white/80 leading-relaxed">
            Combine retinal imaging, blood markers, kidney panels, cardiovascular and foot data
            into one explainable risk profile — with clinical-grade confidence reporting.
          </p>

          <div className="mt-8 grid gap-3">
            <Highlight icon={ShieldCheck}>HIPAA-aligned workflow & encrypted session</Highlight>
            <Highlight icon={Stethoscope}>Explainable per-organ confidence scoring</Highlight>
            <Highlight icon={Sparkles}>Personalized monitoring & referral suggestions</Highlight>
          </div>
        </motion.div>

        <div className="relative text-xs text-white/60">
          © {new Date().getFullYear()} Multi-Organ Diabetes AI · Demo environment
        </div>
      </aside>

      {/* Right form panel */}
      <main className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="absolute inset-0 gradient-mesh opacity-60 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground">
              <Activity className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Multi-Organ Diabetes AI</div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">Clinical Risk Assessment</div>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{kicker}</p>
          <h1 className="mt-2 text-3xl font-display font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-8 clinical-card-elevated p-6 sm:p-7">
            {children}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function Highlight({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm text-white/90">
      <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <span>{children}</span>
    </div>
  );
}
