import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import jsQR from "jsqr";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { hapticsMedium, hapticsSuccess } from "../lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Camera, CheckCircle2, XCircle, AlertTriangle,
  Star, Loader2, RotateCcw, ScanLine, Flashlight,
} from "lucide-react";
import type { Ticket as TicketType } from "../types";

type ScanResult =
  | { type: "success"; ticket: TicketType; already_checked_in: false }
  | { type: "already"; ticket: TicketType; already_checked_in: true }
  | { type: "error"; message: string };

export default function ScanTicketPage() {
  const { eventId } = useParams<{ eventId: string }>();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(true); // prevent double-scans
  const autoResumeTimerRef = useRef<number | null>(null);
  const autoResumeTickRef = useRef<number | null>(null);

  const [scanSession, setScanSession] = useState(0);

  const [cameraError, setCameraError] = useState("");
  const [scanning, setScanning] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [checkedInCount, setCheckedInCount] = useState<number | null>(null);
  const [capacity, setCapacity] = useState<number | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [autoResumeLeft, setAutoResumeLeft] = useState<number | null>(null);

  const clearAutoResumeTimers = useCallback(() => {
    if (autoResumeTimerRef.current) {
      window.clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = null;
    }
    if (autoResumeTickRef.current) {
      window.clearInterval(autoResumeTickRef.current);
      autoResumeTickRef.current = null;
    }
    setAutoResumeLeft(null);
  }, []);

  const playBeep = useCallback((kind: "success" | "already" | "error") => {
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = kind === "success" ? 880 : kind === "already" ? 540 : 320;
      gain.gain.value = 0.0001;

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.2);
      window.setTimeout(() => { void ctx.close(); }, 300);
    } catch {
      // Ignore audio failures on unsupported browsers/devices
    }
  }, []);

  const fetchEventStats = useCallback(async () => {
    if (!eventId) return;
    try {
      const [eventRes, attendeesRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/events/${eventId}/attendees`),
      ]);

      const event = eventRes.data?.data?.event;
      const attendees = attendeesRes.data?.data?.attendees ?? [];

      if (typeof event?.current_attendees === "number") setCapacity(event.current_attendees);
      if (Array.isArray(attendees)) {
        const checkedIn = attendees.filter((a: { checked_in?: number | boolean }) => Boolean(a.checked_in)).length;
        setCheckedInCount(checkedIn);
      }
    } catch {
      // Counter is best-effort and should not block scanning
    }
  }, [eventId]);

  // Start camera
  const startCamera = useCallback(async () => {
    setCameraError("");
    scanningRef.current = true;
    setResult(null);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const track = stream.getVideoTracks()[0] as MediaStreamTrack & {
        getCapabilities?: () => MediaTrackCapabilities;
      };
      const caps = track.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      setTorchSupported(Boolean(caps && "torch" in caps && caps.torch));
      setTorchOn(false);
    } catch {
      setCameraError("Camera access denied. Please allow camera permission and try again.");
      setScanning(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !torchSupported) return;
    const track = streamRef.current.getVideoTracks()[0] as MediaStreamTrack & {
      applyConstraints?: (constraints: MediaTrackConstraints) => Promise<void>;
    };
    if (!track?.applyConstraints) return;

    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as unknown as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      // Ignore on devices that expose torch capability but fail to toggle
    }
  }, [torchOn, torchSupported]);

  // Submit scanned token to backend
  const submitToken = useCallback(async (token: string) => {
    if (submitting) return;
    scanningRef.current = false;
    setScanning(false);
    setSubmitting(true);
    stopCamera();
    try {
      const res = await api.post(`/events/${eventId}/scan-ticket`, { token });
      const { ticket, already_checked_in } = res.data.data as {
        ticket: TicketType;
        already_checked_in: boolean;
      };
      if (already_checked_in) {
        setResult({ type: "already", ticket, already_checked_in: true });
        playBeep("already");
        void hapticsMedium();
      } else {
        setResult({ type: "success", ticket, already_checked_in: false });
        setCheckedInCount((curr) => (typeof curr === "number" ? curr + 1 : curr));
        playBeep("success");
        void hapticsSuccess();
      }
      void fetchEventStats();
    } catch (err) {
      setResult({ type: "error", message: getApiErrorMessage(err, "Invalid QR code") });
      playBeep("error");
      void hapticsMedium();
    } finally {
      setSubmitting(false);
    }
  }, [fetchEventStats, eventId, playBeep, submitting, stopCamera]);

  // QR scan loop
  useEffect(() => {
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !scanningRef.current || video.readyState < video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { animFrameRef.current = requestAnimationFrame(tick); return; }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

      if (code && code.data && /^[0-9a-f]{64}$/.test(code.data)) {
        submitToken(code.data);
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [scanSession, submitToken]);

  useEffect(() => {
    void startCamera();
    return () => { stopCamera(); };
  }, [scanSession, startCamera, stopCamera]);

  useEffect(() => {
    void fetchEventStats();
  }, [fetchEventStats]);

  const handleScanAgain = useCallback(() => {
    clearAutoResumeTimers();
    setResult(null);
    setScanning(true);
    scanningRef.current = true;
    setScanSession((prev) => prev + 1);
  }, [clearAutoResumeTimers]);

  useEffect(() => {
    clearAutoResumeTimers();
    if (!result || (result.type !== "success" && result.type !== "already")) return;

    setAutoResumeLeft(3);
    autoResumeTickRef.current = window.setInterval(() => {
      setAutoResumeLeft((prev) => {
        if (prev === null) return null;
        return prev > 1 ? prev - 1 : 1;
      });
    }, 1000);

    autoResumeTimerRef.current = window.setTimeout(() => {
      handleScanAgain();
    }, 3000);

    return () => {
      clearAutoResumeTimers();
    };
  }, [clearAutoResumeTimers, handleScanAgain, result]);

  useEffect(() => {
    return () => {
      clearAutoResumeTimers();
    };
  }, [clearAutoResumeTimers]);

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-0 premium-shell">
      <div className="max-w-md mx-auto px-4 py-6">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
          <Link
            to={`/events/${eventId}`}
            className="flex items-center gap-1.5 text-text-dim hover:text-text text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Event
          </Link>
        </motion.div>

        <h1 className="text-2xl font-black text-text mb-1">Scan Guest Ticket</h1>
        <p className="text-sm text-text-dim mb-6">Point camera at the guest's QR code to check them in.</p>

        {(checkedInCount !== null || capacity !== null) && (
          <div className="glass-panel rounded-xl p-3 border border-primary/15 bg-primary/[0.04] mb-4 flex items-center justify-between gap-3">
            <div className="text-xs text-text-dim uppercase tracking-[0.12em] font-bold">Live Attendance</div>
            <div className="text-sm font-black text-primary">
              {checkedInCount ?? "-"} / {capacity ?? "-"}
            </div>
          </div>
        )}

        {/* Camera viewfinder */}
        <div className="relative rounded-2xl overflow-hidden bg-black border border-border h-[68vh] md:aspect-square md:h-auto w-full mx-auto mb-6">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner overlay */}
          {scanning && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Corner brackets */}
              <div className="relative w-52 h-52">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                {/* Scan line animation */}
                <motion.div
                  className="absolute left-1 right-1 h-0.5 bg-primary/80 rounded-full shadow-lg shadow-primary/50"
                  animate={{ top: ["10%", "85%", "10%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                  <ScanLine className="w-3 h-3" />
                  Scanning for QR code...
                </span>
              </div>
            </div>
          )}

          {/* Camera error state */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Camera className="w-10 h-10 text-text-dim" />
              <p className="text-sm text-text-dim">{cameraError}</p>
              <button
                onClick={startCamera}
                className="btn-primary-luxe px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}

          {/* Submitting overlay */}
          {submitting && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-white font-bold">Verifying...</p>
            </div>
          )}

          {torchSupported && !cameraError && (
            <button
              onClick={toggleTorch}
              className={`absolute top-3 right-3 z-10 px-3 py-2 rounded-full text-xs font-bold border transition flex items-center gap-1.5 ${
                torchOn
                  ? "bg-warning/20 border-warning/40 text-warning"
                  : "bg-black/50 border-white/20 text-white"
              }`}
            >
              <Flashlight className="w-3.5 h-3.5" />
              {torchOn ? "Torch On" : "Torch"}
            </button>
          )}
        </div>

        {/* Result card */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              {result.type === "success" && (
                <div className="glass-panel rounded-2xl p-5 border border-success/30 bg-success/5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                    <span className="text-lg font-black text-success">Checked In!</span>
                  </div>
                  <GuestCard ticket={result.ticket} />
                  <button
                    onClick={handleScanAgain}
                    className="mt-4 btn-primary-luxe w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                  >
                    <ScanLine className="w-4 h-4" />
                    {autoResumeLeft ? `Scan Next Guest (${autoResumeLeft}s)` : "Scan Next Guest"}
                  </button>
                </div>
              )}

              {result.type === "already" && (
                <div className="glass-panel rounded-2xl p-5 border border-warning/30 bg-warning/5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-6 h-6 text-warning" />
                    <span className="text-lg font-black text-warning">Already Checked In</span>
                  </div>
                  <p className="text-sm text-text-dim mb-4">
                    This QR code was already used. The guest has been checked in previously.
                  </p>
                  <GuestCard ticket={result.ticket} />
                  <button
                    onClick={handleScanAgain}
                    className="mt-4 btn-secondary-luxe w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                  >
                    <ScanLine className="w-4 h-4" />
                    {autoResumeLeft ? `Scan Again (${autoResumeLeft}s)` : "Scan Again"}
                  </button>
                </div>
              )}

              {result.type === "error" && (
                <div className="glass-panel rounded-2xl p-5 border border-error/30 bg-error/5">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-6 h-6 text-error" />
                    <span className="text-lg font-black text-error">Invalid Ticket</span>
                  </div>
                  <p className="text-sm text-text-dim mb-4">{result.message}</p>
                  <button
                    onClick={handleScanAgain}
                    className="btn-primary-luxe w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                  >
                    <ScanLine className="w-4 h-4" /> Try Again
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GuestCard({ ticket }: { ticket: TicketType }) {
  return (
    <div className="flex items-center gap-3 bg-surface-light rounded-xl p-3 border border-border">
      {ticket.guest_avatar_url ? (
        <img
          src={ticket.guest_avatar_url}
          alt=""
          className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {(ticket.guest_display_name ?? "G").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-text truncate">{ticket.guest_display_name}</p>
        <p className="text-xs text-text-dim truncate">@{ticket.guest_username}</p>
      </div>
      {ticket.guest_social_rating > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <Star className="w-4 h-4 text-warning fill-warning" />
          <span className="text-sm font-bold text-warning">{ticket.guest_social_rating.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
