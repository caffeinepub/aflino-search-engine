import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import AdminPanelPage from "./pages/AdminPanelPage";
import HomePage from "./pages/HomePage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";
import RegisterPage from "./pages/RegisterPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import SubmitWebsitePage from "./pages/SubmitWebsitePage";

// Check if user is a local admin (simple login)
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
    // Fallback: legacy key
    return localStorage.getItem("aflino_admin_logged_in") === "true";
  } catch {
    return false;
  }
}

// Helper: check if user has a stored Internet Identity
function hasStoredIdentity(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes("delegation") || key.includes("identity"))) {
        return true;
      }
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes("delegation") || key.includes("identity"))) {
        return true;
      }
    }
  } catch {
    // Storage access denied
  }
  return false;
}

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
    </>
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

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: () => {
    if (!hasStoredIdentity()) {
      throw redirect({ to: "/register" });
    }
  },
  component: OwnerDashboardPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  beforeLoad: () => {
    // Allow access if local admin session exists OR Internet Identity is present
    if (!isLocalAdmin() && !hasStoredIdentity()) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminPanelPage,
});

const submitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/submit",
  component: SubmitWebsitePage,
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
  registerRoute,
  dashboardRoute,
  adminRoute,
  submitRoute,
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
