/**
 * API client for the backend.
 */

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "moai.token";

export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API}${path}`, { ...init, headers });
}

async function apiJSON<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────────
export interface AuthUser {
  id: string; email: string; name: string;
  role: "patient" | "clinician"; createdAt: string;
}

interface TokenRes { access_token: string; token_type: string; user: AuthUser; }

export async function apiSignup(body: { email: string; password: string; name: string; role: string }): Promise<AuthUser> {
  const d = await apiJSON<TokenRes>("/api/auth/signup", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  setToken(d.access_token);
  return d.user;
}

export async function apiLogin(email: string, password: string): Promise<AuthUser> {
  const d = await apiJSON<TokenRes>("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  setToken(d.access_token);
  return d.user;
}

export async function apiDemoLogin(): Promise<AuthUser> {
  const d = await apiJSON<TokenRes>("/api/auth/demo", { method: "POST" });
  setToken(d.access_token);
  return d.user;
}

export async function apiGetMe(): Promise<AuthUser | null> {
  try { return await apiJSON<AuthUser>("/api/auth/me"); } catch { return null; }
}

export function apiLogout() { clearToken(); }

// ── Upload ──────────────────────────────────────────────────
export interface UploadResponse {
  session_id: string;
  files: { file_type: string; original_filename: string }[];
  message: string;
}

export async function apiUploadFiles(files: File[], patientData: Record<string, unknown>): Promise<UploadResponse> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  form.append("patient_data", JSON.stringify(patientData));
  const res = await apiFetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Upload failed`);
  }
  return res.json() as Promise<UploadResponse>;
}

// ── Analyze (SSE) ───────────────────────────────────────────
export interface AnalysisEvent {
  step: string;
  status: "processing" | "complete" | "warning" | "error";
  label?: string; score?: number; message?: string;
  session_id?: string;
}

export function apiAnalyze(
  sessionId: string,
  onEvent: (e: AnalysisEvent) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): () => void {
  const ctrl = new AbortController();
  (async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ session_id: sessionId }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data:")) {
            try {
              const ev = JSON.parse(line.slice(5).trim()) as AnalysisEvent;
              onEvent(ev);
              if (ev.step === "complete" && ev.status === "complete") { onDone(); return; }
            } catch { /* skip */ }
          }
        }
      }
      onDone();
    } catch (err) {
      if (!ctrl.signal.aborted) onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();
  return () => ctrl.abort();
}

// ── Results ─────────────────────────────────────────────────
export async function apiGetResults(sessionId: string) { return apiJSON(`/api/results/${sessionId}`); }
export async function apiListResults(limit = 20) { return apiJSON(`/api/results?limit=${limit}`); }

// ── Export PDF ──────────────────────────────────────────────
export async function apiExportReport(sessionId: string): Promise<Blob> {
  const res = await apiFetch("/api/export-report", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`Export failed`);
  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
