import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function AdSyncLoginPage() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actor) {
      toast.error("Connecting to backend…");
      return;
    }
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const passwordHash = await hashPassword(password);
      const result = await actor.loginAdSyncUser(
        email.trim().toLowerCase(),
        passwordHash,
      );

      if (result.__kind__ === "err") {
        toast.error(result.err);
        return;
      }

      const user = result.ok;
      localStorage.setItem("aflino_adsync_syncId", user.syncId);
      localStorage.setItem("aflino_adsync_email", user.email);
      toast.success(`Welcome back, ${user.fullName}!`);
      void navigate({ to: "/adsync-dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                A
              </span>
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              Aflino AdSync
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Sign in to your account
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Don't have an account?{" "}
            <Link
              to="/adsync-register"
              className="text-primary font-medium hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-ocid="login-email"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-ocid="login-password"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 text-base mt-2"
            disabled={loading}
            data-ocid="login-submit"
          >
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <div className="px-8 pb-6 text-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Aflino Search
          </Link>
        </div>
      </div>
    </div>
  );
}
