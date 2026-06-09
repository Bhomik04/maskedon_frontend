import { useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "../lib/api";
import { ensureBackendAwake } from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const backendReadyRef = useRef(false);
  const wakePromiseRef = useRef<Promise<void> | null>(null);

  function ensureBackendReady(): Promise<void> {
    if (backendReadyRef.current) return Promise.resolve();
    if (!wakePromiseRef.current) {
      wakePromiseRef.current = ensureBackendAwake(45000)
        .then(() => {
          backendReadyRef.current = true;
        })
        .finally(() => {
          wakePromiseRef.current = null;
        });
    }
    return wakePromiseRef.current;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(
        "/auth/forgot-password",
        { email: email.trim() },
        { timeout: 65000 }
      );
      setMessage(res.data?.data?.message || "If this email exists, a reset link has been sent.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && !err.response) {
        try {
          await ensureBackendReady();
          const retryRes = await api.post(
            "/auth/forgot-password",
            { email: email.trim() },
            { timeout: 65000 }
          );
          setMessage(retryRes.data?.data?.message || "If this email exists, a reset link has been sent.");
          setError("");
        } catch (retryErr: unknown) {
          setError(getApiErrorMessage(retryErr, "Could not request password reset."));
        }
      } else {
        setError(getApiErrorMessage(err, "Could not request password reset."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8">
        <h1 className="text-xl font-bold text-text mb-2">Reset your password</h1>
        <p className="text-text-muted text-sm mb-6">
          Enter your account email and we will send you a secure reset link.
        </p>

        {message && <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 text-primary text-sm mb-4">{message}</div>}
        {error && <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-error text-sm mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            className="btn-primary-luxe w-full font-bold py-3.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div className="mt-6 text-sm text-text-muted">
          <Link to="/auth/login" className="text-primary hover:text-accent transition">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
