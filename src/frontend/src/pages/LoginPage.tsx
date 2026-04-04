import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginPage() {
  const { loginAsUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    loginAsUser(trimmed);
    void navigate({ to: "/" });
  };

  return (
    <div
      className="min-h-screen bg-white flex items-center justify-center px-4"
      data-ocid="login.page"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-8">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-2 justify-center mb-1">
          <img
            src="/assets/generated/aflino-logo-icon-transparent.dim_64x64.png"
            alt="Aflino"
            className="h-10 w-10 object-contain"
          />
          <span className="font-semibold text-2xl text-[#111827] tracking-tight">
            aflino
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold text-[#111827] mt-4 mb-1 text-center">
          Welcome to Aflino
        </h1>
        <p className="text-sm text-[#6B7280] mb-6 text-center">
          Enter your email to continue
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-[#374151] mb-1.5"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#006AFF] focus:ring-2 focus:ring-[#006AFF]/10 transition-all"
                data-ocid="login.input"
              />
              {error && (
                <p
                  className="text-xs text-red-500 mt-1.5"
                  data-ocid="login.error_state"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-[#006AFF] text-white font-semibold text-sm hover:bg-[#0052CC] transition-colors mt-1"
              data-ocid="login.submit_button"
            >
              Continue
            </button>
          </div>
        </form>

        {/* Admin link */}
        <p className="text-xs text-[#9CA3AF] text-center mt-6">
          Admin?{" "}
          <a
            href="/admin-login"
            className="text-[#006AFF] hover:underline"
            data-ocid="login.admin.link"
          >
            Sign in at /admin-login
          </a>
        </p>
      </div>
    </div>
  );
}
