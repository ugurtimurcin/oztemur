"use client";


import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5137";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  permissions: string[];
}

interface AuthValue {
  loading: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>.");
  return v;
}

export const tokenRef: { current: string | null } = { current: null };
export const userRef: { current: AuthUser | null } = { current: null };
export const authRefreshRef: { current: (() => Promise<boolean>) | null } = { current: null };

function parseJwtExpiryMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const refreshInFlight = useRef<Promise<boolean> | null>(null);

  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { userRef.current = user; }, [user]);
  const applyAuth = useCallback((nextToken: string | null, nextUser: AuthUser | null) => {
    tokenRef.current = nextToken;
    userRef.current = nextUser;
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    refreshInFlight.current = (async () => {
      try {
        const res = await fetch(`${BASE}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          applyAuth(null, null);
          return false;
        }
        const json = await res.json();
        if (json?.success && json?.data?.token && json?.data?.user) {
          applyAuth(json.data.token, json.data.user);
          return true;
        }
        applyAuth(null, null);
        return false;
      } catch {
        applyAuth(null, null);
        return false;
      } finally {
        refreshInFlight.current = null;
      }
    })();
    return refreshInFlight.current;
  }, [applyAuth]);

  useEffect(() => {
    authRefreshRef.current = refresh;
    return () => { authRefreshRef.current = null; };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  useEffect(() => {
    if (refreshTimerRef.current != null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (!token) return;
    const exp = parseJwtExpiryMs(token);
    if (exp == null) return;
    const delay = Math.max(exp - Date.now() - 60_000, 5_000);
    refreshTimerRef.current = window.setTimeout(() => { void refresh(); }, delay);
    return () => {
      if (refreshTimerRef.current != null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [token, refresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json?.success && json?.data?.token && json?.data?.user) {
        applyAuth(json.data.token, json.data.user);
        return { success: true };
      }
      return { success: false, message: json?.message || "Login failed." };
    } catch {
      return { success: false, message: "Network error." };
    }
  }, [applyAuth]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
    }
    applyAuth(null, null);
  }, [applyAuth]);

  return (
    <AuthContext.Provider value={{ loading, token, user, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function hasUserPermission(user: AuthUser | null, permission: string): boolean {
  return !!user && user.permissions.includes(permission);
}
