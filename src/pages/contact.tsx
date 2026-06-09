import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Mail, Send, CheckCircle2, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/auth-hook";

const SUBJECT_OPTIONS = [
  "General inquiry",
  "Account issue",
  "Event / event question",
  "Social rating concern",
  "Feature request",
  "Partnership or press",
  "Other",
] as const;

export default function ContactPage() {
  const { user } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? (user ? "/settings" : "/");

  const [name, setName] = useState(user?.display_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [subject, setSubject] = useState<string>(SUBJECT_OPTIONS[0]);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\nSubject: ${subject}\n\n${message}`,
    );
    window.location.href = `mailto:team@maskedon.com?subject=${encodeURIComponent(`[MaskedOn] ${subject}`)}&body=${body}`;
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-10 md:pt-8">

        <Link to={from} className="text-text-muted hover:text-text text-sm mb-5 inline-flex items-center gap-1.5 transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text tracking-tight">Contact Us</h1>
              <p className="text-text-muted text-xs">We typically respond within 24–48 hours</p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-text font-bold text-lg mb-2">Email client opened!</h2>
              <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">
                Your message was pre-filled in your email client. Hit send to reach our team. We'll get back to you within 24–48 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setSent(false)}
                  className="btn-secondary-luxe font-bold px-6 py-2.5 rounded-xl text-sm"
                >
                  Send another
                </button>
                <Link to={from} className="btn-primary-luxe font-bold px-6 py-2.5 rounded-xl text-sm">
                  Back
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Contact info */}
              <div className="glass-panel rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-text font-semibold text-sm">Email us directly</p>
                    <a
                      href="mailto:team@maskedon.com"
                      className="text-primary text-sm hover:underline"
                    >
                      team@maskedon.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="glass-panel rounded-2xl p-6">
                <h2 className="text-text font-bold text-sm mb-5">Or fill in the form below</h2>
                <form onSubmit={handleSubmit} className="space-y-4">

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        maxLength={100}
                        placeholder="Display name"
                        className="input-luxe w-full rounded-xl px-4 py-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="input-luxe w-full rounded-xl px-4 py-3 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                      Subject
                    </label>
                    <select
                      id="contact-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="input-luxe w-full rounded-xl px-4 py-3 text-sm"
                    >
                      {SUBJECT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      rows={5}
                      maxLength={2000}
                      placeholder="Tell us how we can help..."
                      className="input-luxe w-full rounded-xl px-4 py-3 resize-none text-sm"
                    />
                    <p className="text-text-dim text-[10px] mt-1 text-right">{message.length}/2000</p>
                  </div>

                  <button
                    type="submit"
                    disabled={!name || !email || !message}
                    className="btn-primary-luxe w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Send via Email
                  </button>

                  <p className="text-text-dim text-xs text-center">
                    This will open your default email client with the message pre-filled.
                  </p>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
