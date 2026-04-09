import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { Component, type ErrorInfo, type ReactNode } from "react";
import AdSyncDashboardPage from "./pages/AdSyncDashboardPage";
import AdSyncLoginPage from "./pages/AdSyncLoginPage";
import AdSyncRegisterPage from "./pages/AdSyncRegisterPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import AdsDashboardPage from "./pages/AdsDashboardPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import SubmitWebsitePage from "./pages/SubmitWebsitePage";

// ── Error Boundary ────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <span className="text-red-600 text-2xl">!</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Something went wrong
            </h1>
            <p className="text-sm text-gray-500">
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-32 text-gray-600">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-[#006AFF] text-white text-sm font-semibold hover:bg-[#0052CC] transition-colors"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Auth helpers ──────────────────────────────────────────────

function isLocalAdmin(): boolean {
  try {
    const raw = localStorage.getItem("aflino_auth");
    if (raw) {
      const parsed = JSON.parse(raw) as {
        isAuthenticated?: boolean;
        role?: string;
      };
      if (parsed.isAuthenticated && parsed.role === "admin") return true;
    }
    return localStorage.getItem("aflino_admin_logged_in") === "true";
  } catch {
    return false;
  }
}

function isUserAuthenticated(): boolean {
  try {
    const raw = localStorage.getItem("aflino_auth");
    if (raw) {
      const parsed = JSON.parse(raw) as { isAuthenticated?: boolean };
      return parsed.isAuthenticated === true;
    }
  } catch {
    // ignore
  }
  return false;
}

function isAdSyncAuthenticated(): boolean {
  return !!localStorage.getItem("aflino_adsync_syncId");
}

// ── Routes ────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <Outlet />
      <Toaster richColors position="top-right" />
    </ErrorBoundary>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchResultsPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const adminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin-login",
  component: AdminLoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  component: () => null,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: () => {
    if (!isUserAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: OwnerDashboardPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  beforeLoad: () => {
    if (!isLocalAdmin()) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminPanelPage,
});

const submitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/submit",
  beforeLoad: () => {
    if (!isUserAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: SubmitWebsitePage,
});

const adsDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ads-dashboard",
  beforeLoad: () => {
    if (!isUserAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AdsDashboardPage,
});

const adSyncRegisterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/adsync-register",
  component: AdSyncRegisterPage,
});

const adSyncLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/adsync-login",
  component: AdSyncLoginPage,
});

const adSyncDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/adsync-dashboard",
  beforeLoad: () => {
    if (!isAdSyncAuthenticated()) {
      throw redirect({ to: "/adsync-register" });
    }
  },
  component: AdSyncDashboardPage,
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  component: () => {
    void redirect({ to: "/" });
    return null;
  },
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  searchRoute,
  loginRoute,
  adminLoginRoute,
  registerRoute,
  dashboardRoute,
  adminRoute,
  submitRoute,
  adsDashboardRoute,
  adSyncRegisterRoute,
  adSyncLoginRoute,
  adSyncDashboardRoute,
  notFoundRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
