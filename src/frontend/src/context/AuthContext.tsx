import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "aflino_auth";

export type AuthRole = "admin" | "user" | "guest";

export interface AuthState {
  isAuthenticated: boolean;
  role: AuthRole;
  user: string | null;
}

interface AuthContextValue extends AuthState {
  loginAsAdmin: () => void;
  logout: () => void;
}

const defaultState: AuthState = {
  isAuthenticated: false,
  role: "guest",
  user: null,
};

function readStorage(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    if (parsed.isAuthenticated && parsed.role === "admin") {
      return {
        isAuthenticated: true,
        role: "admin",
        user: parsed.user ?? "aflino_admin",
      };
    }
  } catch {
    // ignore
  }
  return defaultState;
}

function writeStorage(state: AuthState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Also keep the legacy key in sync so existing checks still work
    if (state.isAuthenticated && state.role === "admin") {
      localStorage.setItem("aflino_admin_logged_in", "true");
    } else {
      localStorage.removeItem("aflino_admin_logged_in");
    }
  } catch {
    // ignore
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("aflino_admin_logged_in");
  } catch {
    // ignore
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(readStorage);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setAuth(readStorage());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const loginAsAdmin = useCallback(() => {
    const next: AuthState = {
      isAuthenticated: true,
      role: "admin",
      user: "aflino_admin",
    };
    writeStorage(next);
    setAuth(next);
  }, []);

  const logout = useCallback(() => {
    clearStorage();
    setAuth(defaultState);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...auth, loginAsAdmin, logout }),
    [auth, loginAsAdmin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
