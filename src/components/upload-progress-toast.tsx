import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, PartyPopper, CheckCircle2, AlertCircle, X, RotateCw } from "lucide-react";
import { useUploadQueue, type UploadJob } from "../context/upload-queue";

// ─── Single Job Card ──────────────────────────────────────────────────────────

function JobCard({ job }: { job: UploadJob }) {
  const { dismiss, retry } = useUploadQueue();
  const navigate = useNavigate();

  const isDone = job.status === "done";
  const isError = job.status === "error";
  const isActive = job.status === "processing" || job.status === "uploading";

  const Icon = job.type === "photo" ? Camera : PartyPopper;

  function handleTap() {
    if (isDone && job.resultUrl) {
      navigate(job.resultUrl);
      dismiss(job.id);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      onClick={isDone && job.resultUrl ? handleTap : undefined}
      className={`
        glass-panel rounded-2xl px-4 py-3 shadow-2xl border
        ${isDone ? "border-emerald-500/30 cursor-pointer active:scale-[0.98]" : ""}
        ${isError ? "border-error/30" : ""}
        ${isActive ? "border-primary/20" : ""}
        transition-transform
      `}
      style={{ willChange: "transform" }}
    >
      <div className="flex items-center gap-3">

        {/* Icon */}
        <div
          className={`
            w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
            ${isDone ? "bg-emerald-500/15" : ""}
            ${isError ? "bg-error/15" : ""}
            ${isActive ? "bg-primary/15" : ""}
          `}
        >
          {isDone ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5 text-error" />
          ) : (
            <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-text-muted"}`} />
          )}
        </div>

        {/* Text + bar */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text leading-tight truncate">
            {isDone
              ? `${job.label} shared!`
              : isError
              ? "Upload failed"
              : job.status === "processing"
              ? `Preparing ${job.label.toLowerCase()}…`
              : `Uploading ${job.label.toLowerCase()}…`}
          </p>
          {isError && job.error && (
            <p className="text-[11px] text-text-muted mt-0.5 truncate">{job.error}</p>
          )}
          {isDone && job.resultUrl && (
            <p className="text-[11px] text-emerald-400 mt-0.5">Tap to view</p>
          )}

          {/* Progress bar */}
          {isActive && (
            <div className="mt-2 h-1 rounded-full bg-surface-lighter overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                initial={{ width: "0%" }}
                animate={{
                  width: `${job.progress}%`,
                  // Pulse the bar while uploading
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          )}
          {isDone && (
            <div className="mt-2 h-1 rounded-full bg-emerald-500/30 overflow-hidden">
              <div className="h-full w-full rounded-full bg-emerald-500" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isError && (
            <button
              onClick={(e) => { e.stopPropagation(); retry(job.id); }}
              className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center tap-active"
              aria-label="Retry upload"
            >
              <RotateCw className="w-4 h-4 text-primary" />
            </button>
          )}
          {(isDone || isError) && (
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(job.id); }}
              className="w-8 h-8 rounded-xl bg-surface-lighter flex items-center justify-center tap-active"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

/**
 * Fixed-position toast stack that sits above the bottom tab nav on mobile
 * and in the bottom-right corner on desktop — just like Instagram.
 */
export default function UploadProgressToast() {
  const { jobs } = useUploadQueue();

  if (jobs.length === 0) return null;

  return (
    <div
      className="
        fixed z-50 flex flex-col gap-2
        bottom-[84px] left-3 right-3
        md:bottom-6 md:left-auto md:right-5 md:w-80
      "
      style={{ pointerEvents: "none" }}
    >
      <AnimatePresence mode="sync">
        {jobs.map((job) => (
          <div key={job.id} style={{ pointerEvents: "auto" }}>
            <JobCard job={job} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
