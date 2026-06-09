import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { getApiErrorMessage } from "../lib/errors";
import { ensureBackendAwake } from "../lib/api";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, User, AtSign, Mail, Lock, Eye, EyeOff, Calendar } from "lucide-react";
import { useTheme } from "../context/use-theme";

export default function RegisterPage() {
  const { register } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const mountedRef = useRef(true);
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

  useEffect(() => {
    void ensureBackendReady().catch(() => {});
    return () => { mountedRef.current = false; };
  }, []);

  function getClientValidationError(): string | null {
    const trimmedDisplayName = displayName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedDisplayName) return "Display name is required";
    if (!trimmedUsername) return "Username is required";
    if (trimmedUsername.length < 3) return "Username must be at least 3 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return "Username can only contain letters, numbers, and underscores";
    }
    if (!trimmedEmail) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) return "Please enter a valid email";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return "Password must include uppercase, lowercase, and a number";
    }
    if (password !== confirmPassword) return "Passwords do not match";
    if (!dateOfBirth) return "Date of birth is required";
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return "Please enter a valid date of birth";
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear()
      - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
    if (age < 18) return "You must be at least 18 years old to register";
    if (age > 120) return "Please enter a valid date of birth";
    if (!acceptedTerms) return "You must accept the Terms & Conditions";
    if (!acceptedPrivacy) return "You must accept the Privacy Policy";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const clientError = getClientValidationError();
    if (clientError) {
      setError(clientError);
      return;
    }

    setSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      await register(
        trimmedEmail,
        username.trim(),
        password,
        displayName.trim(),
        dateOfBirth,
        acceptedTerms,
        acceptedPrivacy
      );
      navigate("/auth/verify-email", {
        replace: true,
        state: {
          email: trimmedEmail,
        },
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && !error.response) {
        try {
          await ensureBackendReady();
          const trimmedEmail = email.trim();
          await register(
            trimmedEmail,
            username.trim(),
            password,
            displayName.trim(),
            dateOfBirth,
            acceptedTerms,
            acceptedPrivacy
          );
          navigate("/auth/verify-email", {
            replace: true,
            state: {
              email: trimmedEmail,
            },
          });
          return;
        } catch {
          setError("Unable to register right now. Please try again in a moment.");
        }
      } else {
        setError(getApiErrorMessage(error, "Registration failed"));
      }
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }

  const fields = [
    { id: "displayName", label: "Display Name", type: "text", value: displayName, setter: setDisplayName, placeholder: "Riya Sharma", icon: User, auto: "name", max: 100 },
    { id: "username", label: "Username", type: "text", value: username, setter: setUsername, placeholder: "riya_hosts", icon: AtSign, auto: "off", max: 50 },
    { id: "email", label: "Email", type: "email", value: email, setter: setEmail, placeholder: "you@example.com", icon: Mail, auto: "email", max: 254 },
    { id: "password", label: "Password", type: "password", value: password, setter: setPassword, placeholder: "Min 8 characters", icon: Lock, auto: "new-password", min: 8, max: 128 },
  ];

  return (
    <div className="auth-ambient min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
          >
            <img src="/symbol.png" alt="" className="w-14 h-14 object-contain" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex justify-center">
            <img src={theme === "light" ? "/name_lighttheme.png" : "/name.png"} alt="maskedOn" className="h-9 w-auto object-contain" />
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-text-dim text-sm mt-1">Create your exclusive social identity.</motion.p>
        </div>

        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }} className="glass-panel rounded-3xl p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              aria-live="polite"
              className="bg-error/10 border border-error/20 rounded-xl p-3 mb-6 text-error text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {fields.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                >
                  <label htmlFor={f.id} className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                    {f.label}
                  </label>
                  <div className="relative">
                    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                    <input
                      id={f.id}
                      type={f.id === "password" ? (showPassword ? "text" : "password") : f.type}
                      value={f.value}
                      onChange={(e) => f.setter(e.target.value)}
                      required
                      autoComplete={
                        f.id === "email" ? "email"
                        : f.id === "displayName" ? "name"
                        : f.id === "password" ? "new-password"
                        : "off"
                      }
                      minLength={'min' in f ? f.min : undefined}
                      maxLength={'max' in f ? f.max : undefined}
                      aria-describedby={f.id === "password" ? "password-requirements" : undefined}
                      className={`input-luxe w-full rounded-xl pl-10 ${f.id === "password" ? "pr-10" : "pr-4"} py-3.5 text-sm`}
                      placeholder={f.placeholder}
                    />
                    {f.id === "password" && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  {f.id === "password" && (
                    <p id="password-requirements" className="text-[11px] text-text-dim mt-2">
                      Min 8 characters, including uppercase, lowercase, and a number.
                    </p>
                  )}
                </motion.div>
              );
            })}

            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.42 }}
            >
              <label htmlFor="confirmPassword" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  className="input-luxe w-full rounded-xl pl-10 pr-10 py-3.5 text-sm"
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition p-1"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.44 }}
            >
              <label htmlFor="dateOfBirth" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
                <input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                  min="1900-01-01"
                  className="input-luxe w-full rounded-xl pl-10 pr-4 py-3.5 text-sm"
                  aria-describedby="dob-note"
                />
              </div>
              <p id="dob-note" className="text-[11px] text-text-dim mt-2">
                You must be at least 18 years old to use this platform.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.46 }}
              className="space-y-3"
            >
              <label className="flex items-start gap-2.5 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span>
                  I agree to the {" "}
                  <Link to="/terms" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">
                    Terms & Conditions
                  </Link>
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span>
                  I agree to the {" "}
                  <Link to="/privacy" target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              type="submit"
              disabled={submitting}
              className="btn-primary-luxe w-full font-bold py-4 rounded-xl transition disabled:opacity-50 mt-3 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        <p className="text-text-muted text-sm text-center mt-6">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-primary font-semibold hover:text-accent transition">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
