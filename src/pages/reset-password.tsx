import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // If there is no token in the URL, show an error immediately
  if (!token) {
    return (
      <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md glass-panel rounded-3xl p-8">
          <h1 className="text-xl font-bold text-text mb-2">Invalid reset link</h1>
          <p className="text-text-muted text-sm mb-6">
            This password reset link is invalid or missing. Please request a new one.
          </p>
          <Link to="/auth/forgot-password" className="btn-primary-luxe w-full font-bold py-3.5 rounded-xl text-center block">
            Request a new reset link
          </Link>
          <div className="mt-4 text-sm">
            <Link to="/auth/login" className="text-primary hover:text-accent transition">Back to login</Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError("Password must include uppercase, lowercase, and a number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        password,
        confirm_password: confirmPassword,
      });
      setMessage("Password updated successfully. Redirecting to login…");
      window.setTimeout(() => {
        navigate("/auth/login", {
          replace: true,
          state: { notice: "Password reset complete. Please sign in with your new password." },
        });
      }, 1200);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not reset password. The link may have expired."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8">
        <h1 className="text-xl font-bold text-text mb-2">Create a new password</h1>
        <p className="text-text-muted text-sm mb-6">This will update your account password immediately.</p>

        {message && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 text-primary text-sm mb-4">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm mb-4">
            {error}{" "}
            {error.toLowerCase().includes("expired") && (
              <Link to="/auth/forgot-password" className="underline ml-1">
                Request a new link
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-luxe w-full rounded-xl px-4 py-3.5 text-sm pr-10"
                minLength={8}
                maxLength={128}
                required
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-luxe w-full rounded-xl px-4 py-3.5 text-sm pr-10"
                minLength={8}
                maxLength={128}
                required
              />
              <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition p-1"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !!message}
            className="btn-primary-luxe w-full font-bold py-3.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>

        <div className="mt-6 text-sm text-text-muted">
          <Link to="/auth/login" className="text-primary hover:text-accent transition">Back to login</Link>
        </div>
      </div>
    </div>
  );
}

