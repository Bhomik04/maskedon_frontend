import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobStatus = "processing" | "uploading" | "done" | "error";

export interface UploadJob {
  id: string;
  type: "photo" | "event";
  label: string;
  status: JobStatus;
  /** 0–100 */
  progress: number;
  error?: string;
  /** Route to navigate to on tap-when-done */
  resultUrl?: string;
}

export interface EnqueueParams {
  type: "photo" | "event";
  label: string;
  /**
   * Runs the actual work.  Call `setProgress(0‒100)` as work advances.
   * Throw (or reject) on failure — the queue will catch it and mark the
   * job as errored.  Resolve with the result URL (or undefined) on success.
   */
  run: (setProgress: (pct: number) => void) => Promise<string | undefined>;
}

interface UploadQueueContextType {
  jobs: UploadJob[];
  enqueue: (params: EnqueueParams) => void;
  dismiss: (id: string) => void;
  retry: (id: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const UploadQueueContext = createContext<UploadQueueContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  // Keep job factories in a ref so retry can re-run them without stale closures
  const factories = useRef<Map<string, EnqueueParams>>(new Map());

  const runJob = useCallback((id: string, params: EnqueueParams) => {
    factories.current.set(id, params);

    // Reset to processing state (handles both fresh start and retry)
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, status: "processing", progress: 0, error: undefined }
          : j
      )
    );

    const setProgress = (pct: number) => {
      setJobs((prev) =>
        prev.map((j) => {
          if (j.id !== id) return j;
          const status: JobStatus =
            pct >= 100 ? "done" : pct <= 15 ? "processing" : "uploading";
          return { ...j, progress: Math.min(100, Math.max(0, pct)), status };
        })
      );
    };

    params
      .run(setProgress)
      .then((resultUrl) => {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id
              ? { ...j, status: "done", progress: 100, resultUrl }
              : j
          )
        );
        // Auto-dismiss successful jobs after 4 s
        setTimeout(() => {
          setJobs((prev) => prev.filter((j) => j.id !== id));
          factories.current.delete(id);
        }, 4000);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Upload failed. Please try again.";
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id ? { ...j, status: "error", error: message } : j
          )
        );
      });
  }, []);

  const enqueue = useCallback(
    (params: EnqueueParams) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const job: UploadJob = {
        id,
        type: params.type,
        label: params.label,
        status: "processing",
        progress: 0,
      };
      setJobs((prev) => [...prev, job]);
      runJob(id, params);
    },
    [runJob]
  );

  const dismiss = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    factories.current.delete(id);
  }, []);

  const retry = useCallback(
    (id: string) => {
      const params = factories.current.get(id);
      if (!params) return;
      runJob(id, params);
    },
    [runJob]
  );

  return (
    <UploadQueueContext.Provider value={{ jobs, enqueue, dismiss, retry }}>
      {children}
    </UploadQueueContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) throw new Error("useUploadQueue must be used within UploadQueueProvider");
  return ctx;
}
