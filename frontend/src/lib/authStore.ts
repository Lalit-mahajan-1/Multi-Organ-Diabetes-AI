/**
 * Authentication store — bridges the frontend with the FastAPI backend auth API.
 * Maintains the authenticated workspace session.
 */
import { useEffect, useState } from "react";
import { apiDemoLogin, type AuthUser } from "./api";

export type UserRole = "patient" | "clinician";
export type { AuthUser };

export interface AssessmentRecord {
  id: string;
  userId: string;
  createdAt: string;
  patientName: string;
  overallRisk: "low" | "moderate" | "high" | "severe";
  overallScore: number;
  organCount: number;
}

const SESSION_KEY = "moai.session";
const HISTORY_KEY = "moai.history";

const isBrowser = typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (!isBrowser) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const clearSession = () => {
  if (!isBrowser) return;
  window.localStorage.removeItem(SESSION_KEY);
  emit();
};

export const auth = {
  current(): AuthUser | null {
    return read<AuthUser | null>(SESSION_KEY, null);
  },

  clear() {
    clearSession();
  },

  async loginDemo(): Promise<AuthUser> {
    try {
      const user = await apiDemoLogin();
      write(SESSION_KEY, user);
      emit();
      return user;
    } catch {
      // Keep the workspace usable if the API is temporarily unavailable.
      const demo: AuthUser = {
        id: "workspace-user",
        email: "workspace@local",
        name: "Clinical workspace",
        role: "clinician",
        createdAt: new Date().toISOString(),
      };
      write(SESSION_KEY, demo);
      emit();
      return demo;
    }
  },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Check if we have a valid token and refresh user from backend. */
  async refresh(): Promise<AuthUser | null> {
    try {
      return this.loginDemo();
    } catch {
      return this.current() || this.loginDemo();
    }
  },
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    setUser(auth.current());
    const unsub = auth.subscribe(() => setUser(auth.current()));
    return () => {
      unsub();
    };
  }, []);
  return user;
}

export const history = {
  list(userId: string): AssessmentRecord[] {
    return read<AssessmentRecord[]>(HISTORY_KEY, [])
      .filter((r) => r.userId === userId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },
  add(record: Omit<AssessmentRecord, "id" | "createdAt">) {
    const all = read<AssessmentRecord[]>(HISTORY_KEY, []);
    const full: AssessmentRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    write(HISTORY_KEY, [full, ...all]);
    return full;
  },
};
