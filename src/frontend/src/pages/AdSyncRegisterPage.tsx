import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdSyncAccountType, AdSyncCurrency, AdSyncRole } from "../backend.d";
import { useActor } from "../hooks/useActor";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function AdSyncRegisterPage() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    fullName: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    accountType: AdSyncAccountType.individual,
    role: AdSyncRole.advertiser,
    country: "",
    state: "",
    city: "",
    address: "",
    currency: AdSyncCurrency.INR,
  });

  const set = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actor) {
      toast.error("Connecting to backend…");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (
      !form.email ||
      !form.fullName ||
      !form.mobile ||
      !form.country ||
      !form.state ||
      !form.city ||
      !form.address
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const passwordHash = await hashPassword(form.password);
      const result = await actor.registerAdSyncUser(
        form.email.trim().toLowerCase(),
        form.fullName.trim(),
        form.mobile.trim(),
        passwordHash,
        form.accountType,
        form.role,
        form.country.trim(),
        form.state.trim(),
        form.city.trim(),
        form.address.trim(),
      );

      if (result.__kind__ === "err") {
        toast.error(result.err);
        return;
      }

      const user = result.ok;
      localStorage.setItem("aflino_adsync_syncId", user.syncId);
      localStorage.setItem("aflino_adsync_email", user.email);
      toast.success("Account created! Welcome to AdSync.");
      void navigate({ to: "/adsync-dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
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
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Already have an account?{" "}
            <Link
              to="/adsync-login"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {/* Row 1: Full Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                placeholder="Rahul Sharma"
                value={form.fullName}
                onChange={(e) => set("fullName")(e.target.value)}
                data-ocid="register-fullname"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                data-ocid="register-email"
                required
              />
            </div>
          </div>

          {/* Row 2: Mobile + Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mobile">
                Mobile <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mobile"
                type="tel"
                placeholder="+91 98765 43210"
                value={form.mobile}
                onChange={(e) => set("mobile")(e.target.value)}
                data-ocid="register-mobile"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) => set("password")(e.target.value)}
                data-ocid="register-password"
                required
              />
            </div>
          </div>

          {/* Row 3: Confirm Password + Account Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">
                Confirm Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword")(e.target.value)}
                data-ocid="register-confirm-password"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Account Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.accountType}
                onValueChange={set("accountType")}
              >
                <SelectTrigger data-ocid="register-account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AdSyncAccountType.individual}>
                    Individual
                  </SelectItem>
                  <SelectItem value={AdSyncAccountType.business}>
                    Business
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Role + Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Role <span className="text-destructive">*</span>
              </Label>
              <Select value={form.role} onValueChange={set("role")}>
                <SelectTrigger data-ocid="register-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AdSyncRole.advertiser}>
                    Advertiser
                  </SelectItem>
                  <SelectItem value={AdSyncRole.publisher}>
                    Publisher
                  </SelectItem>
                  <SelectItem value={AdSyncRole.both}>Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Currency <span className="text-destructive">*</span>
              </Label>
              <Select value={form.currency} onValueChange={set("currency")}>
                <SelectTrigger data-ocid="register-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AdSyncCurrency.INR}>
                    INR — Indian Rupee
                  </SelectItem>
                  <SelectItem value={AdSyncCurrency.USD}>
                    USD — US Dollar
                  </SelectItem>
                  <SelectItem value={AdSyncCurrency.EUR}>EUR — Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5: Country + State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="country">
                Country <span className="text-destructive">*</span>
              </Label>
              <Input
                id="country"
                placeholder="India"
                value={form.country}
                onChange={(e) => set("country")(e.target.value)}
                data-ocid="register-country"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">
                State <span className="text-destructive">*</span>
              </Label>
              <Input
                id="state"
                placeholder="Maharashtra"
                value={form.state}
                onChange={(e) => set("state")(e.target.value)}
                data-ocid="register-state"
                required
              />
            </div>
          </div>

          {/* Row 6: City + Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                placeholder="Mumbai"
                value={form.city}
                onChange={(e) => set("city")(e.target.value)}
                data-ocid="register-city"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">
                Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address"
                placeholder="123 Main Street"
                value={form.address}
                onChange={(e) => set("address")(e.target.value)}
                data-ocid="register-address"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 text-base"
            disabled={loading}
            data-ocid="register-submit"
          >
            {loading ? "Creating account…" : "Create Account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
