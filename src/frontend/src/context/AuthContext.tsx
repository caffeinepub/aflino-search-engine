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

export type AuthRole = "admin" | "advertiser" | "user" | "guest";

export interface AuthState {
  isAuthenticated: boolean;
  role: AuthRole;
  user: string | null;
}

interface AuthContextValue extends AuthState {
  loginAsAdmin: () => void;
  loginAsUser: (email: string) => void;
  loginAsAdvertiser: (email: string) => void;
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
    const parsed = JSON.parse(raw) as Partial<AuthState> & { email?: string };
    if (parsed.isAuthenticated && parsed.role === "admin") {
      return {
        isAuthenticated: true,
        role: "admin",
        user: parsed.user ?? "aflino_admin",
      };
    }
    if (parsed.isAuthenticated && parsed.role === "advertiser" && parsed.user) {
      return {
        isAuthenticated: true,
        role: "advertiser",
        user: parsed.user,
      };
    }
    if (
      parsed.isAuthenticated &&
      parsed.role === "user" &&
      parsed.user &&
      typeof parsed.user === "string" &&
      parsed.user.length > 0
    ) {
      return {
        isAuthenticated: true,
        role: "user",
        user: parsed.user,
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
    // Keep legacy key in sync so existing admin checks still work
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

  const loginAsUser = useCallback((email: string) => {
    const next: AuthState = {
      isAuthenticated: true,
      role: "user",
      user: email,
    };
    writeStorage(next);
    setAuth(next);
  }, []);

  const loginAsAdvertiser = useCallback((email: string) => {
    const next: AuthState = {
      isAuthenticated: true,
      role: "advertiser",
      user: email,
    };
    writeStorage(next);
    setAuth(next);
  }, []);

  const logout = useCallback(() => {
    clearStorage();
    setAuth(defaultState);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...auth, loginAsAdmin, loginAsUser, loginAsAdvertiser, logout }),
    [auth, loginAsAdmin, loginAsUser, loginAsAdvertiser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
