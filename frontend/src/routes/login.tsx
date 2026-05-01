import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Activity, Mail, Lock, ArrowRight, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { auth } from "@/lib/authStore";
import { AuthShell } from "@/components/AuthShell";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await auth.login(email, password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    await auth.loginDemo();
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthShell
      kicker="Welcome back"
      title="Sign in to your clinical workspace"
      subtitle="Access AI-assisted multi-organ diabetes risk assessments."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          icon={Mail}
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(v) => setEmail(v)}
          placeholder="you@clinic.health"
        />
        <Field
          icon={Lock}
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(v) => setPassword(v)}
          placeholder="••••••••"
        />

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.985 }}
          disabled={loading}
          type="submit"
          className="btn-premium w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
            </>
          ) : (
            <>
              Sign in <ArrowRight className="h-4 w-4" />
            </>
          )}
        </motion.button>

        <div className="relative my-2">
          <div className="divider-soft" />
          <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-card px-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            or
          </span>
        </div>

        <button
          type="button"
          onClick={handleDemo}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
        >
          <Sparkles className="h-4 w-4 text-accent" />
          Continue with demo clinician
        </button>

        <p className="text-center text-sm text-muted-foreground pt-2">
          New here?{" "}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </form>

      <div className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-accent" />
        Encrypted demo session — no real PHI is stored.
      </div>
    </AuthShell>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  ...rest
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <div className="mt-1.5 relative">
        <Icon className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          {...rest}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-ring focus:ring-glow transition-shadow"
        />
      </div>
    </label>
  );
}

export { Activity };
