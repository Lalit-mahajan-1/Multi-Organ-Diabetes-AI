import { Activity, LogOut, LayoutDashboard, Plus, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { auth, useAuth } from "@/lib/authStore";

export function AppHeader() {
  const user = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="border-b border-border/70 bg-card/70 backdrop-blur-xl sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-6 py-3.5 flex items-center justify-between gap-6">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-3 group">
          <div className="relative h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-elevated">
            <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card" />
          </div>
          <div>
            <div className="text-base font-display font-semibold text-foreground tracking-tight">
              Multi-Organ Diabetes AI
            </div>
            <div className="text-[11px] text-muted-foreground -mt-0.5 tracking-wide">
              Clinical Risk Assessment Platform
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/60 border border-border">
            <span className="h-1.5 w-1.5 rounded-full bg-risk-low animate-pulse" />
            System operational
          </span>

          {user ? (
            <div className="relative" ref={ref}>
              <button
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border border-border bg-card hover:bg-muted/60 transition-colors"
              >
                <span className="h-7 w-7 rounded-full gradient-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">
                  {initials(user.name)}
                </span>
                <span className="hidden sm:block text-left">
                  <span className="block text-xs font-semibold text-foreground leading-tight">{user.name}</span>
                  <span className="block text-[10px] text-muted-foreground capitalize leading-tight">{user.role}</span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-56 clinical-card-elevated p-1.5 z-50">
                  <MenuItem icon={LayoutDashboard} onClick={() => { setOpen(false); navigate({ to: "/dashboard" }); }}>
                    Dashboard
                  </MenuItem>
                  <MenuItem icon={Plus} onClick={() => { setOpen(false); navigate({ to: "/assessment" }); }}>
                    New assessment
                  </MenuItem>
                  <div className="my-1 divider-soft" />
                  <MenuItem
                    icon={LogOut}
                    onClick={() => { setOpen(false); auth.logout(); navigate({ to: "/login" }); }}
                  >
                    Sign out
                  </MenuItem>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="text-sm font-medium text-foreground px-3.5 py-1.5 rounded-full border border-border bg-card hover:bg-muted/60 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-foreground hover:bg-muted/70 transition-colors"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>{children}</span>
    </button>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export function MedicalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-xs text-muted-foreground ${
        compact ? "" : "leading-relaxed"
      }`}
    >
      <span className="font-semibold text-foreground">Medical disclaimer:</span> This is an AI-based
      risk assessment, not a medical diagnosis. Please consult a qualified healthcare professional
      for medical advice.
    </div>
  );
}
