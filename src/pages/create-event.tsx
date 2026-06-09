import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { compressAndStripMetadata } from "../lib/image-utils";
import api from "../lib/api";
import { isNative } from "../lib/capacitor";
import { takePhoto } from "../lib/native-camera";
import { hapticsMedium } from "../lib/haptics";
import { useUploadQueue } from "../context/upload-queue";
import { COUNTRIES, getStatesForCountry, getDistrictsForState } from "../lib/location-data";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import MapPicker from "../components/MapPicker";
import TierManager from "../components/TierManager";
import {
  MapPin, Clock, Ticket, Shield, Loader2, X,
  ChevronLeft, Camera, Upload, Calendar, Zap, Crown, PartyPopper,
  Check, Save, Trash2, Info, Lock, Eye, EyeOff, UtensilsCrossed,
  Leaf, Wine, Cigarette, AlertTriangle, Globe, Image, Navigation,
  Search, Plus,
} from "lucide-react";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DRAFT_KEY = "maskedon_event_draft_v2";

const PRICE_PRESETS = [
  { label: "Free", value: 0, icon: PartyPopper, desc: "Open to all" },
  { label: "₹500", value: 500, icon: Ticket, desc: "Budget friendly" },
  { label: "₹1000", value: 1000, icon: Crown, desc: "Premium vibes" },
  { label: "Custom", value: -1, icon: Zap, desc: "Set your own" },
];

const TRUST_GATES = [
  { rating: 0, label: "Open", desc: "Anyone can join", color: "text-success" },
  { rating: 2.0, label: "Drifter+", desc: "Rating 2.0+", color: "text-orange-400" },
  { rating: 3.0, label: "Socialite+", desc: "Rating 3.0+", color: "text-yellow-400" },
  { rating: 3.6, label: "Spark+", desc: "Rating 3.6+", color: "text-accent" },
  { rating: 4.3, label: "Luminary+", desc: "Rating 4.3+", color: "text-primary" },
  { rating: 4.8, label: "Inferno+", desc: "Rating 4.8+", color: "text-hot" },
];

const STEP_META = [
  { title: "The Vibe", sub: "Name your experience" },
  { title: "Location", sub: "Set the scene" },
  { title: "Date & Time", sub: "When does it happen?" },
  { title: "Access & Privacy", sub: "Control the gate" },
  { title: "Event Details", sub: "Food & atmosphere" },
];

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface FormState {
  title: string;
  description: string;
  // Location
  location_country: string;
  location_state: string;
  location_district: string;
  location_name: string;
  location_city: string;
  latitude: number | null;
  longitude: number | null;
  // Time
  date_time: string;
  end_time: string;
  // Pricing
  ticket_price: number;
  // Tags & trust
  tags: string[];
  min_rating: number;
  // Privacy
  is_private: boolean;
  allow_photos: boolean;
  // Attributes
  food_type: "veg" | "non_veg" | "vegan" | "";
  allows_alcohol: boolean;
  allows_smoking: boolean;
  allows_other_substances: boolean;
}

interface TagSuggestion {
  tag: string;
  uses: number;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  location_country: "India",
  location_state: "",
  location_district: "",
  location_name: "",
  location_city: "",
  latitude: null,
  longitude: null,
  date_time: "",
  end_time: "",
  ticket_price: 0,
  tags: [],
  min_rating: 0,
  is_private: false,
  allow_photos: true,
  food_type: "",
  allows_alcohol: false,
  allows_smoking: false,
  allows_other_substances: false,
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function loadDraft(key: string): Partial<FormState> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveDraft(key: string, form: FormState) {
  try { localStorage.setItem(key, JSON.stringify(form)); } catch { /* quota */ }
}
function clearDraft(key: string) { localStorage.removeItem(key); }

function getRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return "In the past";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `This ${date.toLocaleDateString("en-IN", { weekday: "long" })}`;
  if (diffDays <= 14) return `Next ${date.toLocaleDateString("en-IN", { weekday: "long" })}`;
  return `In ${diffDays} days`;
}

function getDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function normalizeTag(rawTag: string): string {
  return rawTag
    .trim()
    .toLowerCase()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50);
}

// -----------------------------------------------------------------------------
// Sub-Components
// -----------------------------------------------------------------------------

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 w-full max-w-xs mx-auto">
      {Array.from({ length: total }, (_, i) => {
        const s = i + 1;
        const done = s < current;
        const active = s === current;
        return (
          <div key={s} className="flex items-center flex-1">
            <div className={`
              flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold transition-all duration-300
              ${done ? "bg-primary text-white" : active ? "host-step-active" : "bg-surface-light text-text-dim border border-border"}
            `}>
              {done ? <Check className="w-3 h-3" /> : s}
            </div>
            {s < total && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-500 ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Toggle({ checked, onChange, label, description, icon: Icon }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={() => { onChange(!checked); hapticsMedium(); }}
      className="w-full flex items-center justify-between gap-3 py-1 tap-active"
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-text-dim shrink-0" />}
        <div className="min-w-0 text-left">
          <p className="text-sm font-semibold text-text">{label}</p>
          {description && <p className="text-[11px] text-text-dim mt-0.5">{description}</p>}
        </div>
      </div>
      <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 shrink-0 ${checked ? "bg-primary" : "bg-surface-light border border-border"}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${checked ? "left-6" : "left-0.5"}`} />
      </div>
    </button>
  );
}

// -----------------------------------------------------------------------------
// Main Page
// -----------------------------------------------------------------------------

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enqueue } = useUploadQueue();
  const fileRef = useRef<HTMLInputElement>(null);
  const draftKey = user ? `${DRAFT_KEY}_${user.id}` : DRAFT_KEY;

  const [kycChecking, setKycChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [showDraft, setShowDraft] = useState(false);
  const [priceTier, setPriceTier] = useState(0);
  const [pricingMode, setPricingMode] = useState<"free" | "single" | "multi">("free");
  const [tiers, setTiers] = useState<import("../components/TierManager").TierDraft[]>([]);


  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tagQuery, setTagQuery] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [tagLoading, setTagLoading] = useState(false);

  const states = getStatesForCountry(form.location_country);
  const districts = getDistrictsForState(form.location_country, form.location_state);

  // One-time KYC gate before event creation.
  // If no host verification record exists, redirect to verification flow.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get("/verification/host");
        const hasSubmittedKyc = Boolean(res.data?.data?.verification);

        if (!hasSubmittedKyc) {
          navigate("/host-verification?next=/events/create", { replace: true });
          return;
        }
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, "Unable to verify your KYC status. Please try again."));
      } finally {
        if (!cancelled) setKycChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Draft load
  useEffect(() => {
    const d = loadDraft(draftKey);
    if (d && (d.title || d.location_name)) {
      setForm((prev) => ({ ...prev, ...d }));
      setShowDraft(true);
    }
  }, [draftKey]);

  // Auto-save
  useEffect(() => {
    if (!form.title && !form.location_name) return;
    const t = setTimeout(() => saveDraft(draftKey, form), 1200);
    return () => clearTimeout(t);
  }, [draftKey, form]);

  const loadTagSuggestions = useRef(0);

  useEffect(() => {
    const requestId = ++loadTagSuggestions.current;
    const timer = setTimeout(async () => {
      try {
        setTagLoading(true);
        const res = await api.get("/events/tags/suggestions", {
          params: {
            q: tagQuery.trim() || undefined,
            limit: 10,
          },
        });
        if (requestId !== loadTagSuggestions.current) return;
        const tags = (res.data?.data?.tags || []) as TagSuggestion[];
        setTagSuggestions(tags);
      } catch {
        if (requestId !== loadTagSuggestions.current) return;
        setTagSuggestions([]);
      } finally {
        if (requestId === loadTagSuggestions.current) {
          setTagLoading(false);
        }
      }
    }, tagQuery ? 250 : 0);

    return () => clearTimeout(timer);
  }, [tagQuery]);

  function set(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }
  function blur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setTouched((p) => ({ ...p, [e.target.name]: true }));
  }
  function getFieldError(name: string): string {
    if (!touched[name]) return "";
    switch (name) {
      case "title":
        if (!form.title.trim()) return "Give your event a name";
        if (form.title.trim().length < 3) return "Title needs at least 3 characters";
        return "";
      case "location_country": return !form.location_country ? "Select a country" : "";
      case "location_state": return !form.location_state ? "Select a state" : "";
      case "location_district": return !form.location_district ? "Select a district" : "";
      case "location_name": return !form.location_name.trim() ? "Enter the venue name" : "";
      case "date_time":
        if (!form.date_time) return "Pick a date and time";
        if (new Date(form.date_time) <= new Date()) return "Date must be in the future";
        return "";
      case "end_time":
        if (!form.end_time) return "Pick an end time";
        if (!form.date_time) return "Pick a start time first";
        if (new Date(form.end_time) <= new Date(form.date_time)) return "End time must be after start time";
        return "";
      default: return "";
    }
  }
  function toggleTag(rawTag: string) {
    const tag = normalizeTag(rawTag);
    if (!tag) return;
    setForm((p) => {
      if (p.tags.includes(tag)) return { ...p, tags: p.tags.filter((t) => t !== tag) };
      if (p.tags.length >= 10) return p;
      return { ...p, tags: [...p.tags, tag] };
    });
  }

  function addTagFromInput() {
    const normalized = normalizeTag(tagQuery);
    if (!normalized) return;
    toggleTag(normalized);
    setTagQuery("");
  }

  function applyCover(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { setError("Only JPEG, PNG, and WebP images are allowed"); return; }
    setCoverFile(file);
    const r = new FileReader();
    r.onload = (e) => setCoverPreview(e.target?.result as string);
    r.readAsDataURL(file);
  }
  function handleCoverInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) applyCover(f);
  }
  async function triggerCover() {
    if (isNative()) {
      const f = await takePhoto();
      if (f) applyCover(f);
    } else {
      fileRef.current?.click();
    }
  }
  function removeCover() {
    setCoverFile(null);
    setCoverPreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function canProceed(): boolean {
    if (step === 1) return form.title.trim().length >= 3;
    if (step === 2) return !!form.location_country && !!form.location_state && !!form.location_district && !!form.location_name.trim();
    if (step === 3) {
      return !!form.date_time
        && !!form.end_time
        && new Date(form.date_time) > new Date()
        && new Date(form.end_time) > new Date(form.date_time);
    }
    return true;
  }
  function goNext() {
    if (step === 1) setTouched((p) => ({ ...p, title: true }));
    if (step === 2) setTouched((p) => ({ ...p, location_country: true, location_state: true, location_district: true, location_name: true }));
    if (step === 3) setTouched((p) => ({ ...p, date_time: true, end_time: true }));
    if (!canProceed()) return;
    setDir(1);
    setStep((s) => Math.min(s + 1, STEP_META.length));
    window.scrollTo({ top: 0, behavior: "instant" });
    hapticsMedium();
  }
  function goBack() {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "instant" });
    hapticsMedium();
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    // Validate end_time before enqueuing (UI must be visible for this)
    if (!form.end_time) {
      setError("End time is required");
      setLoading(false);
      return;
    }

    if (new Date(form.end_time) <= new Date(form.date_time)) {
      setError("End time must be after start time");
      setLoading(false);
      return;
    }

    // Snapshot all form values + the cover file reference so the background
    // job closure doesn't hold stale React state after this component unmounts.
    const formSnap = { ...form };
    const coverFileSnap = coverFile ?? null;
    const draftKeySnap = draftKey;

    enqueue({
      type: "event",
      label: "Event",
      run: async (setProgress) => {
        setProgress(5);

        const fd = new FormData();
        fd.append("title", formSnap.title);
        if (formSnap.description) fd.append("description", formSnap.description);
        fd.append("location_name", formSnap.location_name);
        fd.append("location_city", formSnap.location_district || formSnap.location_city);
        fd.append("location_country", formSnap.location_country);
        fd.append("location_state", formSnap.location_state);
        fd.append("location_district", formSnap.location_district);
        if (formSnap.latitude !== null) fd.append("latitude", String(formSnap.latitude));
        if (formSnap.longitude !== null) fd.append("longitude", String(formSnap.longitude));
        fd.append("date_time", new Date(formSnap.date_time).toISOString());
        fd.append("end_time", new Date(formSnap.end_time).toISOString());
        fd.append("ticket_price", String(
          pricingMode === "free" ? 0
            : pricingMode === "multi" ? (tiers.length > 0 ? Math.min(...tiers.map((t) => t.price)) : 0)
            : Math.round(Number(formSnap.ticket_price) * 100)
        ));
        if (pricingMode === "multi" && tiers.length > 0) {
          fd.append("tiers", JSON.stringify(tiers.map((t, idx) => ({
            name: t.name,
            description: t.description || undefined,
            price: t.price,
            slots: t.slots,
            max_quantity: t.max_quantity ? Number(t.max_quantity) : null,
            sort_order: idx,
          }))));
        }
        if (formSnap.tags.length > 0) fd.append("tags", JSON.stringify(formSnap.tags));
        if (formSnap.min_rating > 0) fd.append("min_rating", String(formSnap.min_rating));
        fd.append("is_private", String(formSnap.is_private));
        fd.append("allow_photos", String(formSnap.allow_photos));
        if (formSnap.food_type) fd.append("food_type", formSnap.food_type);
        fd.append("allows_alcohol", String(formSnap.allows_alcohol));
        fd.append("allows_smoking", String(formSnap.allows_smoking));
        fd.append("allows_other_substances", String(formSnap.allows_other_substances));

        if (coverFileSnap) {
          setProgress(10);
          const compressed = await compressAndStripMetadata(coverFileSnap, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
          });
          fd.append("cover_image", compressed);
        }

        setProgress(20);

        const res = await api.post("/events", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) {
              const pct = Math.round((e.loaded / e.total) * 75) + 20;
              setProgress(Math.min(pct, 95));
            }
          },
        });

        clearDraft(draftKeySnap);
        return `/events/${res.data.data.event.id}`;
      },
    });

    // Navigate immediately — the upload queue handles the rest.
    navigate("/", { replace: true });
  }

  const isFree = pricingMode === "free" || (pricingMode === "single" && Number(form.ticket_price) === 0);

  const slide = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  if (kycChecking) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center pb-24">
        <div className="flex items-center gap-2 text-text-dim text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking host verification...
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-bg pb-32">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-3">
            <span className="text-[11px] font-bold text-primary uppercase tracking-[0.15em]">Create Experience</span>
          </div>
          <h1 className="text-2xl font-bold text-text tracking-tight">{STEP_META[step - 1].title}</h1>
          <p className="text-text-dim text-sm mt-0.5">{STEP_META[step - 1].sub}</p>
        </motion.div>

        {/* Step indicator */}
        <div className="mb-5">
          <StepIndicator current={step} total={STEP_META.length} />
        </div>

        {/* Draft banner */}
        <AnimatePresence>
          {showDraft && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="host-draft-banner flex items-center justify-between px-4 py-2.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <Save className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs font-semibold text-text">Draft restored</span>
                </div>
                <button
                  type="button"
                  onClick={() => { clearDraft(draftKey); setForm({ ...EMPTY_FORM }); removeCover(); setShowDraft(false); setStep(1); }}
                  className="flex items-center gap-1 text-xs font-semibold text-error hover:text-error/80 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              role="alert"
              aria-live="polite"
              className="bg-error/10 border border-error/20 text-error rounded-2xl p-4 mb-4 text-sm font-medium"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step content */}
        <div className="relative overflow-hidden" style={{ minHeight: 400 }}>
          <AnimatePresence mode="wait" custom={dir}>

            {/* --- STEP 1: The Vibe --- */}
            {step === 1 && (
              <motion.div key="s1" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-4">

                <div className="host-cover-zone rounded-2xl overflow-hidden">
                  {coverPreview ? (
                    <div className="relative">
                      <img src={coverPreview} alt="Cover" className="w-full h-48 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <button type="button" onClick={triggerCover} className="host-cover-btn">
                          <Camera className="w-3.5 h-3.5" /> Change
                        </button>
                        <button type="button" onClick={removeCover} className="host-cover-btn-danger">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={triggerCover}
                      className="w-full h-44 flex flex-col items-center justify-center gap-2.5 host-cover-empty">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/15">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-text">Add Cover Image</p>
                        <p className="text-[11px] text-text-dim mt-0.5">JPEG, PNG, WebP</p>
                      </div>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                    onChange={handleCoverInput} className="hidden" />
                </div>

                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Event Title *</label>
                    <input
                      name="title"
                      value={form.title}
                      onChange={set}
                      onBlur={blur}
                      placeholder="e.g., Rooftop Vibes Vol. 3"
                      maxLength={100}
                      className={`input-luxe w-full rounded-xl px-4 py-3.5 text-base ${getFieldError("title") ? "ring-2 ring-error/50" : ""}`}
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      {getFieldError("title") && <p className="text-error text-xs font-medium">{getFieldError("title")}</p>}
                      <p className="text-text-dim text-[10px] ml-auto">{form.title.length}/100</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Description</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={set}
                      placeholder="Set the mood, dress code, music profile..."
                      rows={3}
                      maxLength={2000}
                      className="input-luxe w-full rounded-xl px-4 py-3.5 resize-none text-sm"
                    />
                    <p className="text-text-dim text-[10px] text-right mt-1">{form.description.length}/2000</p>
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.12em]">Vibe Tags</label>
                    <span className="text-[10px] text-text-dim font-medium">{form.tags.length}/10</span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-text-dim absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={tagQuery}
                        onChange={(e) => setTagQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTagFromInput();
                          }
                        }}
                        placeholder="Search or create tag"
                        className="input-luxe w-full rounded-xl pl-9 pr-3 py-2.5 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addTagFromInput}
                      disabled={!normalizeTag(tagQuery) || form.tags.length >= 10}
                      className="px-3 py-2.5 rounded-xl border border-primary/25 text-primary text-xs font-semibold hover:bg-primary/10 transition disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {tagLoading ? (
                    <p className="text-[11px] text-text-dim">Loading tags...</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {tagSuggestions.map((entry) => (
                        <button
                          key={entry.tag}
                          type="button"
                          onClick={() => toggleTag(entry.tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 tap-active border ${
                            form.tags.includes(entry.tag)
                              ? "host-tag-selected border-primary/30"
                              : "host-tag-idle border-border"
                          }`}
                        >
                          #{entry.tag}
                          <span className="ml-1 text-[10px] text-text-dim">{entry.uses}</span>
                        </button>
                      ))}
                      {tagSuggestions.length === 0 && (
                        <p className="text-[11px] text-text-dim">No matching tags yet. Create a new one from search.</p>
                      )}
                    </div>
                  )}

                  {normalizeTag(tagQuery) && !tagLoading && !tagSuggestions.some((entry) => entry.tag === normalizeTag(tagQuery)) && (
                    <button
                      type="button"
                      onClick={addTagFromInput}
                      disabled={form.tags.length >= 10}
                      className="text-left text-xs text-primary hover:text-primary-hover transition"
                    >
                      Use #{normalizeTag(tagQuery)} <span className="text-text-dim">(0 uses)</span>
                    </button>
                  )}

                  <div className="text-[10px] text-text-dim">{tagQuery ? "Matching tags by usage" : "Top 10 most-used tags"}</div>

                  {form.tags.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      className="pt-2.5 border-t border-border overflow-hidden">
                      <p className="text-[10px] text-text-dim mb-1.5 font-medium">Selected:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {form.tags.map((tag) => (
                          <span key={tag} className="host-tag-active-pill">
                            {tag}
                            <button type="button" onClick={() => toggleTag(tag)} className="ml-1 hover:text-error transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* --- STEP 2: Location --- */}
            {step === 2 && (
              <motion.div key="s2" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-4">

                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-accent" />
                    </div>
                    Region
                  </h2>

                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Country *</label>
                    <select
                      name="location_country"
                      value={form.location_country}
                      onChange={(e) => { set(e); setForm((p) => ({ ...p, location_state: "", location_district: "", location_city: "" })); }}
                      onBlur={blur}
                      className={`input-luxe w-full rounded-xl px-4 py-3.5 ${getFieldError("location_country") ? "ring-2 ring-error/50" : ""}`}
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {getFieldError("location_country") && <p className="text-error text-xs mt-1 font-medium">{getFieldError("location_country")}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">State / UT *</label>
                    <select
                      name="location_state"
                      value={form.location_state}
                      onChange={(e) => { set(e); setForm((p) => ({ ...p, location_district: "", location_city: "" })); }}
                      onBlur={blur}
                      disabled={!form.location_country}
                      className={`input-luxe w-full rounded-xl px-4 py-3.5 disabled:opacity-50 ${getFieldError("location_state") ? "ring-2 ring-error/50" : ""}`}
                    >
                      <option value="">Select state</option>
                      {states.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {getFieldError("location_state") && <p className="text-error text-xs mt-1 font-medium">{getFieldError("location_state")}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">District *</label>
                    <select
                      name="location_district"
                      value={form.location_district}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, location_district: e.target.value, location_city: e.target.value }));
                        setTouched((p) => ({ ...p, location_district: true }));
                      }}
                      onBlur={blur}
                      disabled={!form.location_state}
                      className={`input-luxe w-full rounded-xl px-4 py-3.5 disabled:opacity-50 ${getFieldError("location_district") ? "ring-2 ring-error/50" : ""}`}
                    >
                      <option value="">Select district</option>
                      {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {getFieldError("location_district") && <p className="text-error text-xs mt-1 font-medium">{getFieldError("location_district")}</p>}
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    Venue
                  </h2>
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Venue / Place Name *</label>
                    <input
                      name="location_name"
                      value={form.location_name}
                      onChange={set}
                      onBlur={blur}
                      placeholder="e.g., Skydeck Terrace, Indiranagar"
                      maxLength={300}
                      className={`input-luxe w-full rounded-xl px-4 py-3.5 ${getFieldError("location_name") ? "ring-2 ring-error/50" : ""}`}
                    />
                    {getFieldError("location_name") && <p className="text-error text-xs mt-1 font-medium">{getFieldError("location_name")}</p>}
                  </div>
                </div>

                <div className="glass-panel rounded-2xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-hot/10 flex items-center justify-center">
                      <Navigation className="w-4 h-4 text-hot" />
                    </div>
                    Pin Location on Map
                    <span className="text-[10px] text-text-dim font-normal ml-1">(optional)</span>
                  </h2>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Search for a place, click the map, or drag the pin. For paid events the map is shown only to paid attendees.
                  </p>
                  <MapPicker
                    initialLat={form.latitude}
                    initialLng={form.longitude}
                    mapClassName="h-64"
                    onChange={(val) => {
                      setForm((p) => ({
                        ...p,
                        latitude:  val.lat !== 0 ? val.lat  : null,
                        longitude: val.lng !== 0 ? val.lng  : null,
                        // Auto-fill venue name from map search if field is still empty
                        location_name: !p.location_name.trim() && val.displayName
                          ? val.displayName.split(",")[0].trim()
                          : p.location_name,
                      }));
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* --- STEP 3: Date & Time --- */}
            {step === 3 && (
              <motion.div key="s3" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-4">

                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    Date & Time
                  </h2>

                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Starts *</label>
                    <input
                      type="datetime-local"
                      name="date_time"
                      value={form.date_time}
                      onChange={(e) => { set(e); setTouched((p) => ({ ...p, date_time: true })); }}
                      className={`input-luxe w-full rounded-xl px-4 py-3.5 ${getFieldError("date_time") ? "ring-2 ring-error/50" : ""}`}
                    />
                    {getFieldError("date_time") && <p className="text-error text-xs mt-1 font-medium">{getFieldError("date_time")}</p>}
                    {form.date_time && !getFieldError("date_time") && (
                      <p className="text-accent text-[10px] mt-1.5 font-semibold">{getRelativeDate(form.date_time)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                      Ends *
                    </label>
                    <input
                      type="datetime-local"
                      name="end_time"
                      value={form.end_time}
                      onChange={(e) => { set(e); setTouched((p) => ({ ...p, end_time: true })); }}
                      onBlur={blur}
                      min={form.date_time || undefined}
                      className={`input-luxe w-full rounded-xl px-4 py-3.5 ${getFieldError("end_time") ? "ring-2 ring-error/50" : ""}`}
                    />
                    {getFieldError("end_time") && <p className="text-error text-xs mt-1 font-medium">{getFieldError("end_time")}</p>}
                    {form.end_time && form.date_time && !getFieldError("end_time") && (
                      <p className="text-text-dim text-[10px] mt-1.5 font-medium">
                        <Clock className="w-3 h-3 inline mr-1" />Duration: {getDuration(form.date_time, form.end_time)}
                      </p>
                    )}
                  </div>
                </div>

                {!form.date_time && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-accent/5 border border-accent/10">
                    <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Tip: Events scheduled 3-7 days ahead get <span className="text-accent font-semibold">2.5x more join requests</span> on average.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* --- STEP 4: Access & Privacy --- */}
            {step === 4 && (
              <motion.div key="s4" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-4">

                {/* Pricing */}
                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Ticket className="w-4 h-4 text-warning" />
                    </div>
                    Pricing
                  </h2>

                  {/* Pricing mode selector */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { mode: "free" as const, label: "Free", icon: PartyPopper, desc: "No entry fee" },
                      { mode: "single" as const, label: "Single", icon: Ticket, desc: "One price" },
                      { mode: "multi" as const, label: "Multi-tier", icon: Crown, desc: "Multiple types" },
                    ].map(({ mode, label, icon: Icon, desc }) => (
                      <button key={mode} type="button"
                        onClick={() => { setPricingMode(mode); hapticsMedium(); }}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 tap-active
                          ${pricingMode === mode ? "host-price-active" : "host-price-idle"}`}>
                        <Icon className={`w-5 h-5 ${pricingMode === mode ? "text-warning" : "text-text-dim"}`} />
                        <span className="text-xs font-bold">{label}</span>
                        <span className="text-[9px] text-text-dim">{desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Single price */}
                  <AnimatePresence>
                    {pricingMode === "single" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {PRICE_PRESETS.filter((p) => p.value >= 0).map((p, i) => {
                            const active = priceTier === i && pricingMode === "single";
                            return (
                              <button key={p.label} type="button"
                                onClick={() => { setPriceTier(i); setForm((prev) => ({ ...prev, ticket_price: p.value })); hapticsMedium(); }}
                                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 tap-active
                                  ${active ? "host-price-active" : "host-price-idle"}`}>
                                <p.icon className={`w-5 h-5 ${active ? "text-warning" : "text-text-dim"}`} />
                                <span className="text-xs font-bold">{p.label}</span>
                                <span className="text-[9px] text-text-dim">{p.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                        {/* Custom price input */}
                        <div>
                          <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Custom price (₹)</label>
                          <input
                            type="number"
                            value={form.ticket_price || ""}
                            onChange={(e) => { setPriceTier(-1); setForm({ ...form, ticket_price: Math.max(0, Number(e.target.value)) }); }}
                            min={0}
                            placeholder="Enter price in ₹"
                            className="input-luxe w-full rounded-xl px-4 py-3.5"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Multi-tier manager */}
                  <AnimatePresence>
                    {pricingMode === "multi" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <TierManager tiers={tiers} onChange={setTiers} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {pricingMode !== "free" && (
                    <div className="flex items-start gap-2 text-[11px] text-text-dim bg-primary/5 rounded-xl px-3 py-2.5 border border-primary/10">
                      <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      Map location is only revealed to guests after payment.
                    </div>
                  )}
                </div>

                {/* Trust Gate */}
                <div className="glass-panel rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-text flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                      Trust Gate
                    </h2>
                    <span className="text-[9px] text-text-dim flex items-center gap-1">
                      <Info className="w-3 h-3" /> Min rating to join
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {TRUST_GATES.map((g) => (
                      <button key={g.rating} type="button"
                        onClick={() => { setForm({ ...form, min_rating: g.rating }); hapticsMedium(); }}
                        className={`flex flex-col items-center gap-0.5 p-2.5 rounded-xl transition-all duration-200 tap-active
                          ${form.min_rating === g.rating ? "host-gate-active" : "host-gate-idle"}`}>
                        <span className={`text-sm font-bold ${g.color}`}>{g.label}</span>
                        <span className="text-[9px] text-text-dim">{g.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy */}
                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-warning" />
                    </div>
                    Privacy
                  </h2>
                  <Toggle
                    checked={form.is_private}
                    onChange={(v) => setForm((p) => ({ ...p, is_private: v }))}
                    label="Private Event"
                    description="Hidden from discovery. Only reachable via a 10-character private code."
                    icon={form.is_private ? EyeOff : Eye}
                  />
                  <AnimatePresence>
                    {form.is_private && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-warning/5 border border-warning/15">
                          <Lock className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                          <p className="text-[11px] text-text-muted leading-relaxed">
                            A unique 10-character code will be generated once the event is created. Share it only with people you want to invite.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="pt-2 border-t border-border">
                    <Toggle
                      checked={form.allow_photos}
                      onChange={(v) => setForm((p) => ({ ...p, allow_photos: v }))}
                      label="Allow Photo Uploads"
                      description={form.allow_photos ? "Guests can post photos in this event." : "Photo uploads are disabled for this event."}
                      icon={Image}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- STEP 5: Event Details --- */}
            {step === 5 && (
              <motion.div key="s5" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }} className="space-y-4">

                {/* Food Type */}
                <div className="glass-panel rounded-2xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
                      <UtensilsCrossed className="w-4 h-4 text-success" />
                    </div>
                    Food Type
                  </h2>
                  <p className="text-[11px] text-text-muted">Let guests know what food will be served.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { value: "veg", label: "Veg", icon: Leaf, color: "text-success" },
                        { value: "non_veg", label: "Non-Veg", icon: UtensilsCrossed, color: "text-error" },
                      ] as { value: "veg" | "non_veg" | "vegan"; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[]
                    ).map((f) => (
                      <button key={f.value} type="button"
                        onClick={() => { setForm((p) => ({ ...p, food_type: p.food_type === f.value ? "" : f.value })); hapticsMedium(); }}
                        className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl transition-all duration-200 tap-active border
                          ${form.food_type === f.value ? "bg-surface-light border-primary/30 shadow-sm" : "bg-surface border-border hover:border-border-light"}`}>
                        <f.icon className={`w-6 h-6 ${form.food_type === f.value ? f.color : "text-text-dim"}`} />
                        <span className={`text-xs font-bold ${form.food_type === f.value ? f.color : "text-text-muted"}`}>{f.label}</span>
                        {form.food_type === f.value && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </button>
                    ))}
                  </div>
                  {!form.food_type && <p className="text-[10px] text-text-dim text-center">Leave unselected if no food is served.</p>}
                </div>

                {/* Substances */}
                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                    </div>
                    Atmosphere & Substances
                  </h2>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Transparent disclosure helps guests make informed decisions. These flags are shown as warnings on the event page.
                  </p>
                  <div className="space-y-4 divide-y divide-border">
                    <Toggle
                      checked={form.allows_alcohol}
                      onChange={(v) => setForm((p) => ({ ...p, allows_alcohol: v }))}
                      label="Alcohol Served"
                      description="Alcoholic beverages will be available."
                      icon={Wine}
                    />
                    <div className="pt-4">
                      <Toggle
                        checked={form.allows_smoking}
                        onChange={(v) => setForm((p) => ({ ...p, allows_smoking: v }))}
                        label="Smoking Permitted"
                        description="Smoking is allowed at or near the venue."
                        icon={Cigarette}
                      />
                    </div>
                    <div className="pt-4">
                      <Toggle
                        checked={form.allows_other_substances}
                        onChange={(v) => setForm((p) => ({ ...p, allows_other_substances: v }))}
                        label="Other Substances Present"
                        description="Other substances may be in use at this event. 18+ advisory applies."
                        icon={AlertTriangle}
                      />
                    </div>
                  </div>
                  {(form.allows_alcohol || form.allows_smoking || form.allows_other_substances) && (
                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-warning/8 border border-warning/20">
                      <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                      <p className="text-[11px] text-warning/90 leading-relaxed">
                        Guests will see a disclosure warning before joining. Ensure your event complies with all local laws.
                      </p>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="host-preview-card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-bold">Summary</p>
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  </div>
                  {coverPreview && <img src={coverPreview} alt="" className="w-full h-24 object-cover rounded-xl" />}
                  <h3 className="text-lg font-bold text-text break-words line-clamp-2">
                    {form.title || "Untitled Experience"}
                    {form.is_private && <Lock className="w-4 h-4 text-warning inline ml-2" />}
                  </h3>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div className="flex items-center gap-2 text-text-muted">
                      <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span className="truncate">{form.location_district || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{form.date_time ? new Date(form.date_time).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                      <Ticket className="w-3.5 h-3.5 text-warning shrink-0" />
                      <span>{
                        isFree ? "Free"
                        : pricingMode === "multi"
                          ? `${tiers.length} tier${tiers.length !== 1 ? "s" : ""}`
                          : `₹${form.ticket_price}`
                      }</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {form.is_private && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-warning/10 text-warning border border-warning/20">
                        <Lock className="w-2.5 h-2.5" /> Private
                      </span>
                    )}
                    {form.food_type && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-success/10 text-success border border-success/20">
                        <Leaf className="w-2.5 h-2.5" />
                        {form.food_type === "veg" ? "Veg" : form.food_type === "vegan" ? "Vegan" : "Non-Veg"}
                      </span>
                    )}
                    {form.allows_alcohol && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-warning/10 text-warning border border-warning/20">
                        <Wine className="w-2.5 h-2.5" /> Alcohol
                      </span>
                    )}
                    {form.allows_other_substances && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-error/10 text-error border border-error/20">
                        <AlertTriangle className="w-2.5 h-2.5" /> Advisory
                      </span>
                    )}
                    {!form.allow_photos && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-surface-light text-text-dim border border-border">
                        <EyeOff className="w-2.5 h-2.5" /> No Photos
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <button type="button" onClick={goBack}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl btn-secondary-luxe font-bold text-sm tap-active">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < STEP_META.length ? (
            <button type="button" onClick={goNext}
              className="flex-1 py-3.5 rounded-2xl btn-primary-luxe font-bold text-sm tap-active flex items-center justify-center gap-2">
              Continue
              <span className="text-xs opacity-70">{step}/{STEP_META.length}</span>
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading}
              className="flex-1 py-3.5 rounded-2xl btn-primary-luxe font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 tap-active">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><PartyPopper className="w-4 h-4" />Launch Event</>}
            </button>
          )}
        </div>

      </div>
    </div>

    </>
  );
}
