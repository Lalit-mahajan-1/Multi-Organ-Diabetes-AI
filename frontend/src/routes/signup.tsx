import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Loader2, Stethoscope, HeartPulse } from "lucide-react";
import { auth, type UserRole } from "@/lib/authStore";
import { AuthShell } from "@/components/AuthShell";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("patient");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await auth.signup({ email, password, name, role });
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      kicker="Create account"
      title="Join the clinical workspace"
      subtitle="Set up your profile to begin secure AI-assisted assessments."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className="text-xs font-medium text-foreground">I am a…</span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <RoleOption
              icon={HeartPulse}
              label="Patient"
              hint="Track my own risk"
              active={role === "patient"}
              onClick={() => setRole("patient")}
            />
            <RoleOption
              icon={Stethoscope}
              label="Clinician"
              hint="Assess my patients"
              active={role === "clinician"}
              onClick={() => setRole("clinician")}
            />
          </div>
        </div>

        <Field icon={User} label="Full name" required value={name} onChange={setName} placeholder="Jane Doe" />
        <Field icon={Mail} label="Email" type="email" required value={email} onChange={setEmail} placeholder="you@clinic.health" />
        <Field icon={Lock} label="Password" type="password" required value={password} onChange={setPassword} placeholder="At least 6 characters" />

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
              <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
            </>
          ) : (
            <>
              Create account <ArrowRight className="h-4 w-4" />
            </>
          )}
        </motion.button>

        <p className="text-center text-sm text-muted-foreground pt-2">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

function RoleOption({
  icon: Icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border px-3 py-2.5 transition-all ${
        active
          ? "border-primary bg-primary/5 ring-glow"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${active ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="text-[11px] text-muted-foreground">{hint}</div>
        </div>
      </div>
    </button>
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
