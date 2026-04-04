import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Globe,
  LayoutDashboard,
  Loader2,
  Search,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { identity, login, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const { actor, isFetching } = useActor();
  const [selectedRole, setSelectedRole] = useState<"user" | "owner" | null>(
    null,
  );
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(false);

  const isAuthenticated = !!identity;
  const { isAuthenticated: isAdminLoggedIn, role: authRole } = useAuth();

  // If admin is already logged in, redirect immediately
  useEffect(() => {
    if (isAdminLoggedIn && authRole === "admin") {
      void navigate({ to: "/admin" });
    }
  }, [isAdminLoggedIn, authRole, navigate]);

  // After login, check role and redirect
  useEffect(() => {
    if (!isAuthenticated || !actor || isFetching) return;

    setIsCheckingRole(true);

    const checkAndRedirect = async () => {
      try {
        const role = await actor.getCallerUserRole();
        if (role === "admin") {
          void navigate({ to: "/admin" });
        } else if (role === "user") {
          void navigate({ to: "/dashboard" });
        } else {
          // guest — stay on page to choose role
          setIsCheckingRole(false);
        }
      } catch {
        // guest — stay on page to choose role
        setIsCheckingRole(false);
      }
    };

    void checkAndRedirect();
  }, [isAuthenticated, actor, isFetching, navigate]);

  const handleContinue = async () => {
    if (!actor || !selectedRole) return;
    setIsRegistering(true);
    try {
      const { UserRole } = await import("../backend.d");
      await actor.assignCallerUserRole(identity!.getPrincipal(), UserRole.user);
      toast.success("Account created successfully!");
      if (selectedRole === "owner") {
        void navigate({ to: "/dashboard" });
      } else {
        void navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  // Don't render anything if admin is logged in (redirect in progress)
  if (isAdminLoggedIn && authRole === "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.42 0.09 218), oklch(0.55 0.09 200))",
      }}
    >
      <header className="px-6 py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          data-ocid="nav.back.link"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Aflino</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-elevated w-full max-w-lg p-8"
        >
          <div className="flex items-center gap-2 mb-6">
            <Globe className="h-7 w-7 text-primary" />
            <span className="font-display text-2xl font-bold text-primary">
              aflino
            </span>
          </div>

          <h1 className="font-display text-2xl font-bold mb-1">
            Welcome to Aflino
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Sign in with Internet Identity to continue
          </p>

          {!isAuthenticated ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole("user")}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    selectedRole === "user"
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-ocid="register.user_role.button"
                >
                  <Search className="h-6 w-6 text-primary mb-2" />
                  <p className="font-medium text-sm">
                    I&apos;m searching the web
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Find and discover websites
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("owner")}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    selectedRole === "owner"
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-ocid="register.owner_role.button"
                >
                  <LayoutDashboard className="h-6 w-6 text-primary mb-2" />
                  <p className="font-medium text-sm">
                    I want to list my website
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Submit and manage your site
                  </p>
                </button>
              </div>

              <Button
                className="w-full h-11 font-medium"
                onClick={login}
                disabled={isLoggingIn || isInitializing || !selectedRole}
                data-ocid="register.login.button"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing
                    in…
                  </>
                ) : (
                  "Continue with Internet Identity"
                )}
              </Button>

              {!selectedRole && (
                <p className="text-xs text-center text-muted-foreground">
                  Select a role above to continue
                </p>
              )}
            </div>
          ) : isCheckingRole ? (
            // Show loading spinner while checking role (prevents flashing role cards for admin)
            <div
              className="flex items-center justify-center gap-2 py-6 text-muted-foreground"
              data-ocid="register.loading_state"
            >
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Checking your account…</span>
            </div>
          ) : isRegistering ? (
            <div
              className="flex items-center justify-center gap-2 py-6 text-muted-foreground"
              data-ocid="register.loading_state"
            >
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Setting up your account…</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-accent p-4">
                <p className="text-sm font-medium text-accent-foreground">
                  Connected
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {identity?.getPrincipal().toString().slice(0, 20)}…
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole("user")}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    selectedRole === "user"
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-ocid="register.user_role.button"
                >
                  <Search className="h-6 w-6 text-primary mb-2" />
                  <p className="font-medium text-sm">
                    I&apos;m searching the web
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Find and discover websites
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("owner")}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    selectedRole === "owner"
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-ocid="register.owner_role.button"
                >
                  <LayoutDashboard className="h-6 w-6 text-primary mb-2" />
                  <p className="font-medium text-sm">
                    I want to list my website
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Submit and manage your site
                  </p>
                </button>
              </div>

              <Button
                className="w-full h-11 font-medium"
                onClick={() => void handleContinue()}
                disabled={!selectedRole || isRegistering}
                data-ocid="register.submit.button"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating
                    account…
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
