import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";

const ADMIN_USERNAME = "aflino_admin";
const ADMIN_PASSWORD = "Aflino@2026";

export default function AdminLoginPage() {
  const { loginAsAdmin } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        loginAsAdmin();
        setLoading(false);
        void navigate({ to: "/admin" });
      } else {
        setError("Invalid username or password.");
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div
      className="min-h-screen bg-white flex items-center justify-center px-4"
      data-ocid="admin_login.page"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-8">
        {/* Icon + heading */}
        <div className="flex flex-col items-center mb-1">
          <div className="h-12 w-12 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-3">
            <Lock className="h-6 w-6 text-[#006AFF]" />
          </div>
          <h1 className="text-xl font-bold text-[#111827] mt-3 mb-1 text-center">
            Admin Login
          </h1>
          <p className="text-sm text-[#6B7280] mb-6 text-center">
            Aflino admin access only
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="admin-login-username"
                className="block text-xs font-medium text-[#374151] mb-1.5"
              >
                Username
              </label>
              <input
                id="admin-login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter username"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#006AFF] focus:ring-2 focus:ring-[#006AFF]/10 transition-all"
                data-ocid="admin_login.input"
              />
            </div>

            <div>
              <label
                htmlFor="admin-login-password"
                className="block text-xs font-medium text-[#374151] mb-1.5"
              >
                Password
              </label>
              <input
                id="admin-login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter password"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#006AFF] focus:ring-2 focus:ring-[#006AFF]/10 transition-all"
                data-ocid="admin_login.textarea"
              />
            </div>

            {error && (
              <p
                className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg"
                data-ocid="admin_login.error_state"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full h-11 rounded-xl bg-[#006AFF] text-white font-semibold text-sm hover:bg-[#0052CC] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              data-ocid="admin_login.submit_button"
            >
              {loading ? "Verifying…" : "Login"}
            </button>
          </div>
        </form>

        {/* Back link */}
        <p className="text-xs text-[#9CA3AF] text-center mt-6">
          <a
            href="/"
            className="text-[#006AFF] hover:underline"
            data-ocid="admin_login.home.link"
          >
            ← Back to search
          </a>
        </p>
      </div>
    </div>
  );
}
