import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

function getStateEmail(location: ReturnType<typeof useLocation>): string {
  const candidate =
    typeof location.state === "object" && location.state && "email" in location.state
      ? (location.state as { email?: string }).email
      : "";
  return typeof candidate === "string" ? candidate : "";
}

export default function VerifyEmailPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Auto-verify if a token is present in the URL
  useEffect(() => {
    if (!token) return;

    api
      .get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        setMessage("Email verified! You can now sign in.");
      })
      .catch((err: unknown) => {
        setError(getApiErrorMessage(err, "This verification link is invalid or has expired."));
      });
  }, [token]);

  useEffect(() => {
    if (!token) setEmail(getStateEmail(location));
  }, [location, token]);

  async function handleResend(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/resend-verification", { email: email.trim() });
      setMessage("Verification email sent. Please check your inbox.");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not resend verification email."));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Token-verification result view ─────────────────────────────────────────
  if (token) {
    return (
      <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md glass-panel rounded-3xl p-8">
          <h1 className="text-xl font-bold text-text mb-2">Email verification</h1>

          {!message && !error && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
              <p className="text-text-muted text-sm">Verifying your email…</p>
            </div>
          )}

          {message && (
            <>
              <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 text-primary text-sm mb-6">
                {message}
              </div>
              <Link
                to="/auth/login"
                className="btn-primary-luxe w-full font-bold py-3.5 rounded-xl text-center block"
              >
                Sign in
              </Link>
            </>
          )}

          {error && (
            <>
              <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm mb-6">
                {error}
              </div>
              <Link
                to="/auth/verify-email"
                className="btn-secondary-luxe w-full font-bold py-3.5 rounded-xl text-center block mb-3"
              >
                Request a new verification link
              </Link>
              <div className="text-sm text-text-muted">
                <Link to="/auth/login" className="text-primary hover:text-accent transition">Back to login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Resend-verification view (no token in URL) ──────────────────────────────
  return (
    <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8">
        <h1 className="text-xl font-bold text-text mb-2">Verify your email</h1>
        <p className="text-text-muted text-sm mb-6">
          We sent a verification link to your email. Open that link first, then sign in.
        </p>

        {message && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 text-primary text-sm mb-4">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleResend} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-luxe w-full rounded-xl px-4 py-3.5 text-sm"
              placeholder="you@example.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-secondary-luxe w-full font-bold py-3.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Sending…" : "Resend verification email"}
          </button>
        </form>

        <div className="mt-6 text-sm text-text-muted flex justify-between">
          <Link to="/auth/login" className="text-primary hover:text-accent transition">Back to login</Link>
          <Link to="/auth/register" className="text-primary hover:text-accent transition">Create another account</Link>
        </div>
      </div>
    </div>
  );
}

