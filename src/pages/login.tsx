import { useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { getApiErrorMessage } from "../lib/errors";
import { ensureBackendAwake } from "../lib/api";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useTheme } from "../context/use-theme";

export default function LoginPage() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    typeof location.state === "object" && location.state && "notice" in location.state && typeof location.state.notice === "string"
      ? location.state.notice
      : ""
  );
  const [submitting, setSubmitting] = useState(false);
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && !error.response) {
        try {
          await ensureBackendReady();
          await login(email, password);
          navigate("/", { replace: true });
          return;
        } catch {
          setError("Unable to sign in right now. Please try again in a moment.");
        }
      } else {
        const errorCode = axios.isAxiosError(error)
          ? error.response?.data?.error?.code
          : undefined;

        if (errorCode === "EMAIL_NOT_VERIFIED") {
          setError("");
          setNotice("Your email isn't verified yet. Check your inbox or use the resend link below.");
        } else {
          const message = getApiErrorMessage(error, "Login failed. Please check your credentials.");
          setError(message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          >
            <img src="/symbol.png" alt="" className="w-16 h-16 object-contain" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <img src={theme === "light" ? "/name_lighttheme.png" : "/name.png"} alt="MaskedOn" className="h-10 w-auto object-contain" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-text-muted text-sm mt-2 max-w-xs mx-auto leading-relaxed"
          >
            Where curated connections meet unforgettable nightlife.
          </motion.p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="glass-panel rounded-3xl p-8"
        >
          <h2 className="text-lg font-bold text-text mb-0.5">Welcome back</h2>
          <p className="text-text-muted text-sm mb-6">Sign in to your trusted circle.</p>

          {notice && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="status"
              aria-live="polite"
              className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mb-6 text-primary text-sm"
            >
              {notice}
            </motion.div>
          )}

          {/* Error / waking-up info */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              aria-live="polite"
              className="rounded-xl px-4 py-3 mb-6 text-sm flex items-start gap-2 bg-error/10 border border-error/20 text-error"
            >
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-luxe w-full rounded-xl px-4 py-3.5 text-sm"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="input-luxe w-full rounded-xl px-4 py-3.5 pr-12 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !email.trim() || !password.trim()}
              className="btn-primary-luxe relative w-full overflow-hidden font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-3 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Register link */}
        <div className="text-text-muted text-sm text-center mt-8 space-y-3">
          <p>
            New to MaskedOn?{" "}
            <Link
              to="/auth/register"
              className="text-primary font-semibold hover:text-accent transition inline-flex items-center gap-1"
            >
              Create an account
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </p>
          <p>
            <Link to="/auth/forgot-password" className="text-primary font-semibold hover:text-accent transition">
              Forgot password?
            </Link>
            {" · "}
            <Link to="/auth/verify-email" state={{ email }} className="text-primary font-semibold hover:text-accent transition">
              Resend verification
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
