import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";
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

// Check if any user (including regular users) is authenticated
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

// /register redirects to /login
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
