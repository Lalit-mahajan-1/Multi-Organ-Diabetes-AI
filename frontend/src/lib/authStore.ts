/**
 * Authentication store — bridges the frontend with the FastAPI backend auth API.
 * Falls back to localStorage mock auth if the backend is unreachable.
 */
import { useEffect, useState } from "react";
import {
  apiSignup,
  apiLogin,
  apiDemoLogin,
  apiGetMe,
  apiLogout as apiLogoutFn,
  getToken,
  type AuthUser,
} from "./api";

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

export const auth = {
  current(): AuthUser | null {
    return read<AuthUser | null>(SESSION_KEY, null);
  },

  async signup(input: { email: string; password: string; name: string; role: UserRole }): Promise<AuthUser> {
    try {
      const user = await apiSignup(input);
      write(SESSION_KEY, user);
      emit();
      return user;
    } catch (err) {
      // Re-throw API errors
      throw err;
    }
  },

  async login(email: string, password: string): Promise<AuthUser> {
    try {
      const user = await apiLogin(email, password);
      write(SESSION_KEY, user);
      emit();
      return user;
    } catch (err) {
      throw err;
    }
  },

  async loginDemo(): Promise<AuthUser> {
    try {
      const user = await apiDemoLogin();
      write(SESSION_KEY, user);
      emit();
      return user;
    } catch {
      // Fallback to client-side demo if backend is down
      const demo: AuthUser = {
        id: "demo-user",
        email: "demo@clinic.health",
        name: "Dr. Avery Chen",
        role: "clinician",
        createdAt: new Date().toISOString(),
      };
      write(SESSION_KEY, demo);
      emit();
      return demo;
    }
  },

  logout() {
    if (!isBrowser) return;
    apiLogoutFn();
    window.localStorage.removeItem(SESSION_KEY);
    emit();
  },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Check if we have a valid token and refresh user from backend. */
  async refresh(): Promise<AuthUser | null> {
    if (!getToken()) return null;
    try {
      const user = await apiGetMe();
      if (user) {
        write(SESSION_KEY, user);
        emit();
      }
      return user;
    } catch {
      return this.current();
    }
  },
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => auth.current());
  useEffect(() => {
    const unsub = auth.subscribe(() => setUser(auth.current()));
    return () => { unsub(); };
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
