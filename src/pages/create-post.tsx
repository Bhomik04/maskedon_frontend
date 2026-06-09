import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { compressAndStripMetadata } from "../lib/image-utils";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { isNative } from "../lib/capacitor";
import { takePhoto } from "../lib/native-camera";
import { useUploadQueue } from "../context/upload-queue";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, ImagePlus, Sun, Contrast, Droplets,
  Loader2, X, RotateCw, Check, Globe, Lock
} from "lucide-react";

/* --- Filter presets --- */
const FILTERS = [
  { name: "Normal", css: "" },
  { name: "Vivid", css: "saturate(1.4) contrast(1.1)" },
  { name: "Warm", css: "sepia(0.25) saturate(1.3) brightness(1.05)" },
  { name: "Cool", css: "saturate(0.9) hue-rotate(15deg) brightness(1.05)" },
  { name: "Fade", css: "saturate(0.7) brightness(1.1) contrast(0.9)" },
  { name: "Mono", css: "grayscale(1)" },
  { name: "Noir", css: "grayscale(1) contrast(1.4) brightness(0.9)" },
  { name: "Glow", css: "brightness(1.15) saturate(1.2) contrast(0.95)" },
] as const;

type EditTab = "filters" | "adjust";

export default function CreatePostPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enqueue } = useUploadQueue();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Step: select → edit → caption
  const [step, setStep] = useState<"select" | "edit" | "caption">("select");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Edit state
  const [editTab, setEditTab] = useState<EditTab>("filters");
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Caption state
  const [caption, setCaption] = useState("");
  const [globalVisibility, setGlobalVisibility] = useState(false);
  const [friendsOnly, setFriendsOnly] = useState(false);

  const adjustCSS = `brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100})`;
  const filterCSS = FILTERS[selectedFilter].css;
  const combinedCSS = [filterCSS, adjustCSS].filter(Boolean).join(" ");

  /* --- Image Selection --- */
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed");
      return;
    }
    setError("");
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setStep("edit");
  }

  async function handleNativeSelect() {
    const file = await takePhoto();
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setStep("edit");
    }
  }

  function triggerSelect() {
    if (isNative()) handleNativeSelect();
    else fileInputRef.current?.click();
  }

  /* --- Apply edits to canvas and get final file --- */
  const getProcessedFile = useCallback(async (): Promise<File | null> => {
    if (!imagePreview || !imageFile) return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) { resolve(imageFile); return; }

        // Max 2048px to keep file size reasonable
        const maxDim = 2048;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        // Handle rotation
        const isRotated = rotation % 180 !== 0;
        canvas.width = isRotated ? h : w;
        canvas.height = isRotated ? w : h;

        const ctx = canvas.getContext("2d")!;
        ctx.filter = combinedCSS || "none";
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], imageFile.name, { type: "image/jpeg" }));
            } else {
              resolve(imageFile);
            }
          },
          "image/jpeg",
          0.92
        );
      };
      img.src = imagePreview;
    });
  }, [imagePreview, imageFile, combinedCSS, rotation]);

  /* --- Upload --- */
  async function handlePost() {
    if (!imageFile) return;
    setUploading(true);
    setError("");

    try {
      // Process the image NOW while the canvas is still mounted.
      // This is fast (canvas render + toBlob) — typically < 300 ms.
      const processedFile = await getProcessedFile();
      if (!processedFile) throw new Error("Failed to process image");

      // Snapshot form values so the background job closure doesn't hold
      // stale references after this component unmounts.
      const captionSnap = caption.trim();
      const globalVisibilitySnap = globalVisibility;
      const friendsOnlySnap = friendsOnly;

      // Enqueue the heavy work (compression + HTTP upload) to run in the
      // background, then immediately navigate so the user can keep scrolling.
      enqueue({
        type: "photo",
        label: "Photo",
        run: async (setProgress) => {
          setProgress(5);
          const compressed = await compressAndStripMetadata(processedFile, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
          });
          setProgress(20);

          const fd = new FormData();
          fd.append("image", compressed);
          if (captionSnap) fd.append("caption", captionSnap);
          fd.append("global_visibility", String(globalVisibilitySnap));
          fd.append("friends_only", String(friendsOnlySnap));

          await api.post("/photos", fd, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (e) => {
              if (e.total) {
                const pct = Math.round((e.loaded / e.total) * 75) + 20;
                setProgress(Math.min(pct, 95));
              }
            },
          });

          return "/profile/me";
        },
      });

      // Navigate immediately — the progress bar handles the rest.
      navigate("/profile/me", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to process image"));
      setUploading(false);
    }
    // Note: setUploading(false) is intentionally omitted from the success path
    // because we navigate away. Leaving it here would update unmounted state.
  }

  function resetAll() {
    setImageFile(null);
    setImagePreview(null);
    setStep("select");
    setSelectedFilter(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setCaption("");
    setGlobalVisibility(false);
    setFriendsOnly(false);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg">
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" aria-label="Select photo" />

      {/* --- HEADER --- */}
      <div className="sticky top-0 z-20 bg-bg/80 backdrop-blur-lg border-b border-primary/[0.06]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => {
              if (step === "select") navigate(-1);
              else if (step === "edit") setStep("select");
              else setStep("edit");
            }}
            className="flex items-center gap-1.5 text-text-muted hover:text-text transition tap-active"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">
              {step === "select" ? "Back" : step === "edit" ? "Cancel" : "Back"}
            </span>
          </button>

          <h1 className="text-base font-bold text-text">
            {step === "select" ? "New Post" : step === "edit" ? "Edit" : "Caption"}
          </h1>

          {step === "edit" && (
            <button
              onClick={() => setStep("caption")}
              className="text-primary font-bold text-sm flex items-center gap-1 tap-active"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {step === "caption" && (
            <button
              onClick={handlePost}
              disabled={uploading}
              className="text-primary font-bold text-sm flex items-center gap-1 tap-active disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {uploading ? "Posting…" : "Share"}
            </button>
          )}
          {step === "select" && <div className="w-16" />}
        </div>
      </div>

      {/* --- ERROR --- */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-lg mx-auto px-4 pt-3"
          >
            <div className="bg-error/10 border border-error/20 text-error text-sm px-4 py-3 rounded-xl flex items-center justify-between">
              {error}
              <button onClick={() => setError("")} className="tap-active"><X className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- STEP 1: SELECT IMAGE --- */}
      {step === "select" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto px-4 pt-8"
        >
          <div
            onClick={triggerSelect}
            className="aspect-square rounded-3xl border-2 border-dashed border-primary/20 bg-surface/50 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/40 transition group tap-active"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition">
              <ImagePlus className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-text font-bold text-lg">Select Photo</p>
              <p className="text-text-muted text-sm mt-1">Tap to choose from gallery or camera</p>
            </div>
          </div>

          <p className="text-text-dim text-xs text-center mt-4">JPEG, PNG, WebP</p>
        </motion.div>
      )}

      {/* --- STEP 2: EDIT IMAGE --- */}
      {step === "edit" && imagePreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-lg mx-auto"
        >
          {/* Preview */}
          <div className="aspect-square bg-black flex items-center justify-center overflow-hidden">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full max-h-full object-contain transition-all duration-200"
              style={{
                filter: combinedCSS || undefined,
                transform: rotation ? `rotate(${rotation}deg)` : undefined,
              }}
              draggable={false}
            />
          </div>

          {/* Edit tabs */}
          <div className="flex border-b border-primary/[0.06]">
            <button
              onClick={() => setEditTab("filters")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center tap-active transition ${
                editTab === "filters" ? "text-primary border-b-2 border-primary" : "text-text-dim"
              }`}
            >
              Filters
            </button>
            <button
              onClick={() => setEditTab("adjust")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center tap-active transition ${
                editTab === "adjust" ? "text-primary border-b-2 border-primary" : "text-text-dim"
              }`}
            >
              <Sun className="w-4 h-4 mx-auto mb-1" /> Adjust
            </button>
          </div>

          {/* Filters grid */}
          {editTab === "filters" && (
            <div className="px-3 py-4">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {FILTERS.map((f, i) => (
                  <button
                    key={f.name}
                    onClick={() => setSelectedFilter(i)}
                    className={`shrink-0 flex flex-col items-center gap-1.5 tap-active transition ${
                      selectedFilter === i ? "opacity-100" : "opacity-60"
                    }`}
                  >
                    <div
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition ${
                        selectedFilter === i ? "border-primary shadow-lg shadow-primary/20" : "border-transparent"
                      }`}
                    >
                      <img
                        src={imagePreview}
                        alt={f.name}
                        className="w-full h-full object-cover"
                        style={{ filter: f.css || undefined }}
                        draggable={false}
                      />
                    </div>
                    <span className={`text-[10px] font-semibold ${
                      selectedFilter === i ? "text-primary" : "text-text-dim"
                    }`}>{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Adjust sliders */}
          {editTab === "adjust" && (
            <div className="px-4 py-4 space-y-5">
              {[
                { label: "Brightness", icon: Sun, value: brightness, set: setBrightness, min: 50, max: 150 },
                { label: "Contrast", icon: Contrast, value: contrast, set: setContrast, min: 50, max: 150 },
                { label: "Saturation", icon: Droplets, value: saturation, set: setSaturation, min: 0, max: 200 },
              ].map((s) => (
                <div key={s.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted text-xs font-semibold flex items-center gap-1.5">
                      <s.icon className="w-3.5 h-3.5" /> {s.label}
                    </span>
                    <span className="text-text-dim text-xs tabular-nums">{s.value}</span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    value={s.value}
                    onChange={(e) => s.set(Number(e.target.value))}
                    className="w-full accent-primary h-1 bg-surface-light rounded-full appearance-none cursor-pointer"
                  />
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="flex items-center gap-2 text-text-muted text-xs font-semibold tap-active hover:text-text transition"
                >
                  <RotateCw className="w-4 h-4" /> Rotate
                </button>
                <button
                  onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); setRotation(0); setSelectedFilter(0); }}
                  className="text-text-dim text-xs font-semibold tap-active hover:text-error transition"
                >
                  Reset All
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* --- STEP 3: CAPTION --- */}
      {step === "caption" && imagePreview && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-lg mx-auto px-4 pt-4"
        >
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-surface">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
                style={{ filter: combinedCSS || undefined }}
                draggable={false}
              />
            </div>

            {/* Caption area */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] shrink-0">
                  <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-[10px] font-bold text-text">
                    {user?.avatar_url
                      ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      : (user?.display_name || "?").charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className="text-text text-sm font-bold">{user?.display_name}</span>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption…"
                maxLength={500}
                rows={4}
                className="input-luxe w-full rounded-xl px-3 py-2.5 text-sm resize-none"
                autoFocus
              />
              <p className="text-text-dim text-[10px] text-right mt-1">{caption.length}/500</p>
            </div>
          </div>

          {/* Visibility toggles — placed right after caption so they're noticed */}
          <div className="mt-5 space-y-3">
            {/* Toggle 1: Show Globally */}
            <div className="glass-panel rounded-2xl px-4 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  globalVisibility && !friendsOnly ? "bg-primary/15" : "bg-surface-light"
                }`}>
                  <Globe className={`w-[18px] h-[18px] transition-colors ${
                    globalVisibility && !friendsOnly ? "text-primary" : "text-text-muted"
                  }`} />
                </div>
                <div>
                  <p className="text-text text-sm font-bold">Show Globally</p>
                  <p className="text-text-dim text-xs mt-0.5">Appear in other people's recommendations</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                title={globalVisibility && !friendsOnly ? "Show globally (tap to disable)" : "Show globally (tap to enable)"}
                aria-checked={globalVisibility && !friendsOnly ? "true" : "false"}
                onClick={() => {
                  setGlobalVisibility((v) => !v);
                  if (!globalVisibility) setFriendsOnly(false); // can't be both
                }}
                className={`relative w-12 h-6 rounded-full transition-colors tap-active flex-shrink-0 ${
                  globalVisibility && !friendsOnly ? "bg-primary" : "bg-surface-light border border-primary/20"
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  globalVisibility && !friendsOnly ? "translate-x-6" : "translate-x-0"
                }`} />
              </button>
            </div>

            {/* Toggle 2: Friends Only */}
            <div className="glass-panel rounded-2xl px-4 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  friendsOnly ? "bg-accent/15" : "bg-surface-light"
                }`}>
                  <Lock className={`w-[18px] h-[18px] transition-colors ${
                    friendsOnly ? "text-accent" : "text-text-muted"
                  }`} />
                </div>
                <div>
                  <p className="text-text text-sm font-bold">Friends Only</p>
                  <p className="text-text-dim text-xs mt-0.5">Only your friends can see this post</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                title={friendsOnly ? "Friends only (tap to disable)" : "Friends only (tap to enable)"}
                aria-checked={friendsOnly ? "true" : "false"}
                onClick={() => {
                  setFriendsOnly((v) => !v);
                  if (!friendsOnly) setGlobalVisibility(false); // mutually exclusive
                }}
                className={`relative w-12 h-6 rounded-full transition-colors tap-active flex-shrink-0 ${
                  friendsOnly ? "bg-accent" : "bg-surface-light border border-accent/20"
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  friendsOnly ? "translate-x-6" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>

          {/* Post preview card */}
          <div className="mt-6 glass-panel rounded-2xl overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3 border-b border-primary/[0.06]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1px]">
                <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-xs font-bold text-text">
                  {user?.avatar_url
                    ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    : (user?.display_name || "?").charAt(0).toUpperCase()}
                </div>
              </div>
              <span className="text-text text-sm font-bold">{user?.display_name}</span>
            </div>
            <div className="aspect-square bg-black flex items-center justify-center">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
                style={{ filter: combinedCSS || undefined }}
                draggable={false}
              />
            </div>
            {caption.trim() && (
              <div className="px-4 py-3">
                <p className="text-text text-sm">
                  <span className="font-bold">{user?.display_name}</span>{" "}
                  <span className="text-text-muted">{caption}</span>
                </p>
              </div>
            )}
          </div>

          {/* Discard button */}
          <button
            onClick={resetAll}
            className="w-full mt-4 mb-8 text-center text-error/70 hover:text-error text-sm font-semibold tap-active transition py-3"
          >
            Discard Post
          </button>
        </motion.div>
      )}
    </div>
  );
}
