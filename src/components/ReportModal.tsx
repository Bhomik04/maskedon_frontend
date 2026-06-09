import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flag, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

type TargetType = "user" | "event" | "photo";

const REASONS: { value: string; label: string }[] = [
  { value: "spam",                  label: "Spam or misleading" },
  { value: "harassment",            label: "Harassment or bullying" },
  { value: "fake_event",            label: "Fake or fraudulent event" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "underage",              label: "Underage user or content" },
  { value: "other",                 label: "Other" },
];

export interface ReportModalProps {
  targetType: TargetType;
  targetId: string;
  targetName?: string;
  onClose: () => void;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function ReportModal({ targetType, targetId, targetName, onClose }: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const typeLabel = targetType === "user" ? "User" : targetType === "event" ? "Event" : "Photo";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;

    setLoading(true);
    setError("");
    try {
      await api.post("/reports", {
        target_type: targetType,
        target_id: targetId,
        reason,
        description: description.trim() || undefined,
      });
      setSuccess(true);
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to submit report");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="w-full max-w-md glass-panel rounded-2xl border border-border overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center">
              <Flag className="w-4 h-4 text-error" />
            </div>
            <div>
              <p className="text-sm font-bold text-text">Report {typeLabel}</p>
              {targetName && <p className="text-[11px] text-text-dim truncate max-w-[200px]">{targetName}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close report modal" className="p-1.5 rounded-lg text-text-dim hover:text-text hover:bg-surface-light transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
              <p className="text-text font-bold mb-1">Report submitted</p>
              <p className="text-text-dim text-sm mb-5">Our team will review this within 24 hours.</p>
              <button onClick={onClose} className="btn-primary-luxe px-6 py-2.5 rounded-xl text-sm font-bold tap-active">
                Done
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="p-5 space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Reason */}
              <div>
                <p className="text-xs font-bold text-text-dim uppercase tracking-wider mb-2">Reason</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition ${
                        reason === r.value
                          ? "border-error/40 bg-error/8 text-text"
                          : "border-border bg-surface hover:border-border-hover text-text-dim hover:text-text"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="accent-error w-3.5 h-3.5 shrink-0"
                      />
                      <span className="text-sm font-medium">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-bold text-text-dim uppercase tracking-wider mb-2">
                  Additional details <span className="normal-case font-normal">(optional)</span>
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Tell us more about the issue..."
                  className="input-luxe w-full resize-none text-sm placeholder:text-text-dim/50"
                />
                <p className="text-[10px] text-text-dim text-right mt-1">{description.length}/1000</p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-error/8 border border-error/20 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
                  <p className="text-xs text-error">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 btn-secondary-luxe py-2.5 rounded-xl text-sm font-bold tap-active"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!reason || loading}
                  className="flex-1 bg-error/90 hover:bg-error text-white py-2.5 rounded-xl text-sm font-bold tap-active disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Report
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
