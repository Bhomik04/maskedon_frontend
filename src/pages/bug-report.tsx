import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Bug, Send, CheckCircle2, AlertCircle, ImagePlus, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/auth-hook";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

const CATEGORIES = [
  "UI / visual glitch",
  "Feature not working",
  "App crash or freeze",
  "Incorrect data shown",
  "Performance issue",
  "Notification problem",
  "Login / auth issue",
  "Other",
] as const;

const SEVERITY = [
  { value: "low",      label: "Low — minor annoyance",       color: "text-success" },
  { value: "medium",   label: "Medium — feature broken",     color: "text-warning" },
  { value: "high",     label: "High — can't use the app",    color: "text-error"   },
  { value: "critical", label: "Critical — data loss / crash",color: "text-error"   },
] as const;

const MAX_SCREENSHOTS = 3;

export default function BugReportPage() {
  const { user } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? (user ? "/settings" : "/");

  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [feature, setFeature] = useState("");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleScreenshotChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_SCREENSHOTS - screenshots.length;
    const toAdd = files.slice(0, remaining);
    setScreenshots((prev) => [...prev, ...toAdd]);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPreviews((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    // Reset input so same file can be re-added if removed
    e.target.value = "";
  }

  function removeScreenshot(index: number) {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("severity", severity);
      if (feature) formData.append("affected_feature", feature);
      formData.append("steps_to_reproduce", steps);
      formData.append("expected_behavior", expected);
      formData.append("actual_behavior", actual);
      screenshots.forEach((file) => formData.append("screenshots", file));

      await api.post("/bug-reports", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSent(true);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Failed to submit report. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-10 md:pt-8">

        <Link to={from} className="text-text-muted hover:text-text text-sm mb-5 inline-flex items-center gap-1.5 transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
              <Bug className="w-5 h-5 text-error" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text tracking-tight">Report a Bug</h1>
              <p className="text-text-muted text-xs">Help us squash issues — more detail = faster fixes</p>
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
              <h2 className="text-text font-bold text-lg mb-2">Report submitted!</h2>
              <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">
                We've received your bug report. Thank you for helping make MaskedOn better!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    setSent(false);
                    setCategory(CATEGORIES[0]);
                    setSeverity("medium");
                    setFeature("");
                    setSteps("");
                    setExpected("");
                    setActual("");
                    setScreenshots([]);
                    setPreviews([]);
                  }}
                  className="btn-secondary-luxe font-bold px-6 py-2.5 rounded-xl text-sm"
                >
                  Report another
                </button>
                <Link to={from} className="btn-primary-luxe font-bold px-6 py-2.5 rounded-xl text-sm">
                  Back
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

              {/* Tip */}
              <div className="flex items-start gap-3 bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-5">
                <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-text-muted text-xs leading-relaxed">
                  Include the exact steps you took so we can reproduce the bug. You can attach up to {MAX_SCREENSHOTS} screenshots directly — they'll be saved with your report.
                </p>
              </div>

              <div className="glass-panel rounded-2xl p-6">
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Category */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                      Bug Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="input-luxe w-full rounded-xl px-4 py-3 text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Severity */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                      Severity
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {SEVERITY.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setSeverity(s.value)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition text-center capitalize ${
                            severity === s.value
                              ? s.value === "low"
                                ? "bg-success/15 border-success/40 text-success"
                                : s.value === "medium"
                                ? "bg-warning/15 border-warning/40 text-warning"
                                : "bg-error/15 border-error/40 text-error"
                              : "bg-surface-light border-primary/[0.08] text-text-muted hover:border-primary/15"
                          }`}
                        >
                          {s.value}
                        </button>
                      ))}
                    </div>
                    <p className={`text-xs mt-1.5 ${SEVERITY.find(s => s.value === severity)?.color ?? "text-text-muted"}`}>
                      {SEVERITY.find(s => s.value === severity)?.label}
                    </p>
                  </div>

                  {/* Affected feature */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                      Affected Page / Feature
                    </label>
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => setFeature(e.target.value)}
                      maxLength={200}
                      placeholder="e.g. Event detail page, notifications, photo upload…"
                      className="input-luxe w-full rounded-xl px-4 py-3 text-sm"
                    />
                  </div>

                  {/* Steps */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                      Steps to Reproduce <span className="text-error">*</span>
                    </label>
                    <textarea
                      value={steps}
                      onChange={(e) => setSteps(e.target.value)}
                      required
                      rows={4}
                      maxLength={5000}
                      placeholder={"1. Open the event detail page\n2. Tap 'Request Entry'\n3. …"}
                      className="input-luxe w-full rounded-xl px-4 py-3 resize-none text-sm font-mono"
                    />
                  </div>

                  {/* Expected */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                      Expected Behaviour <span className="text-error">*</span>
                    </label>
                    <textarea
                      value={expected}
                      onChange={(e) => setExpected(e.target.value)}
                      required
                      rows={2}
                      maxLength={2000}
                      placeholder="What should have happened?"
                      className="input-luxe w-full rounded-xl px-4 py-3 resize-none text-sm"
                    />
                  </div>

                  {/* Actual */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                      Actual Behaviour <span className="text-error">*</span>
                    </label>
                    <textarea
                      value={actual}
                      onChange={(e) => setActual(e.target.value)}
                      required
                      rows={2}
                      maxLength={2000}
                      placeholder="What actually happened? Any error messages?"
                      className="input-luxe w-full rounded-xl px-4 py-3 resize-none text-sm"
                    />
                  </div>

                  {/* Screenshots */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                      Screenshots <span className="text-text-dim font-normal normal-case tracking-normal">(optional, up to {MAX_SCREENSHOTS})</span>
                    </label>

                    {/* Preview grid */}
                    {previews.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {previews.map((src, i) => (
                          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-primary/10">
                            <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeScreenshot(i)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-bg/80 backdrop-blur flex items-center justify-center text-text-muted hover:text-error transition"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {screenshots.length < MAX_SCREENSHOTS && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="hidden"
                          onChange={handleScreenshotChange}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-primary/20 text-text-muted text-xs hover:border-primary/40 hover:text-text transition"
                        >
                          <ImagePlus className="w-4 h-4" />
                          Add screenshot{screenshots.length > 0 ? ` (${MAX_SCREENSHOTS - screenshots.length} more)` : ""}
                        </button>
                      </>
                    )}
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-error shrink-0" />
                      <p className="text-error text-xs">{submitError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!steps || !expected || !actual || submitting}
                    className="btn-primary-luxe w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                    ) : (
                      <><Send className="w-4 h-4" /> Submit Bug Report</>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
