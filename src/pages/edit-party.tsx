import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import type { Party } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { parseTags } from "../lib/parse-tags";
import { getTrustLevel } from "../lib/trust-levels";
import { isNative } from "../lib/capacitor";
import { takePhoto } from "../lib/native-camera";
import { motion } from "framer-motion";
import { Image, MapPin, Clock, Ticket, Shield, Tag, Loader2, X, ChevronDown, Eye, ArrowLeft } from "lucide-react";

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

interface PreviewForm {
  title: string;
  location_city: string;
  date_time: string;
  ticket_price: number;
  min_rating: number;
}

function PreviewCard({ form, isFree }: { form: PreviewForm; isFree: boolean }) {
  return (
    <>
      <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-bold mb-1.5">Live Preview</p>
      <h3 className="text-lg font-bold text-text mb-5 tracking-tight">{form.title.trim() || "Untitled Experience"}</h3>
      <div className="space-y-3.5 text-sm">
        {[
          { icon: MapPin, label: "City", value: form.location_city || "—", color: "text-accent" },
          { icon: Clock, label: "When", value: form.date_time ? new Date(form.date_time).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—", color: "text-primary" },
          { icon: Ticket, label: "Entry", value: isFree ? "Free" : `₹${Number(form.ticket_price || 0)}`, color: "text-hot" },
          { icon: Shield, label: "Trust gate", value: Number(form.min_rating) > 0 ? getTrustLevel(Number(form.min_rating), 1).name + "+" : "Open", color: "text-warning" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-text-muted flex items-center gap-2"><item.icon className={`w-3.5 h-3.5 ${item.color}`} />{item.label}</span>
            <span className="text-text font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function EditPartyPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [party, setParty] = useState<Party | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    location_name: "",
    location_city: "",
    date_time: "",
    end_time: "",
    ticket_price: 0,
    tags: "",
    min_rating: 0,
  });

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const loadParty = useCallback(async () => {
    if (!partyId) {
      setError("Invalid party ID");
      setPageLoading(false);
      return;
    }
    try {
      const res = await api.get(`/parties/${partyId}`);
      const p: Party = res.data.data.party;
      setParty(p);

      if (p.status !== "upcoming") {
        setError("This party can no longer be edited.");
        return;
      }

      if (user && p.host_id !== user.id) {
        setError("Only the host can edit this party.");
        return;
      }

      setForm({
        title: p.title,
        description: p.description || "",
        location_name: p.location_name,
        location_city: p.location_city,
        date_time: toLocalDatetime(p.date_time),
        end_time: p.end_time ? toLocalDatetime(p.end_time) : "",
        ticket_price: p.ticket_price / 100,
        tags: parseTags(p.tags).join(", "),
        min_rating: p.min_rating,
      });

      if (p.cover_image_url) {
        setCoverImagePreview(p.cover_image_url);
      }
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load party"));
    } finally {
      setPageLoading(false);
    }
  }, [partyId, user]);

  useEffect(() => { loadParty(); }, [loadParty]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }

  function fieldError(name: string, value: string): boolean {
    return touched[name] === true && !value.trim();
  }

  function handleCoverImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    applyCoverImage(file);
  }

  function applyCoverImage(file: File) {
    setCoverImage(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function triggerCoverUpload() {
    if (isNative()) {
      const file = await takePhoto();
      if (file) applyCoverImage(file);
    } else {
      fileInputRef.current?.click();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("location_name", form.location_name);
      formData.append("location_city", form.location_city);
      formData.append("date_time", new Date(form.date_time).toISOString());
      if (form.end_time) {
        if (new Date(form.end_time) <= new Date(form.date_time)) {
          setError("End time must be after start time");
          setSaving(false);
          return;
        }
        formData.append("end_time", new Date(form.end_time).toISOString());
      }
      formData.append("ticket_price", String(Math.round(Number(form.ticket_price) * 100)));
      if (form.tags) {
        const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
        if (tags.length > 0) formData.append("tags", JSON.stringify(tags));
      }
      formData.append("min_rating", String(form.min_rating));
      if (coverImage) formData.append("cover_image", coverImage);

      await api.put(`/parties/${partyId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/parties/${partyId}`);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Failed to update party"));
    } finally {
      setSaving(false);
    }
  }

  const tagCount = form.tags.split(",").map((tag) => tag.trim()).filter(Boolean).length;
  const isFree = Number(form.ticket_price) === 0;
  const canEdit = party && party.status === "upcoming" && user && party.host_id === user.id;

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center pb-28 md:pb-12">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-16 h-16 rounded-2xl bg-error/10 mx-auto mb-4 flex items-center justify-center">
            <Shield className="w-8 h-8 text-error" />
          </div>
          <p className="text-error font-bold text-lg mb-2">Cannot Edit</p>
          <p className="text-text-muted text-sm mb-6">{error || "This party can no longer be edited. Only upcoming parties can be modified by their host."}</p>
          <button onClick={() => navigate(`/parties/${partyId}`)} className="btn-secondary-luxe px-6 py-3 rounded-xl font-bold text-sm inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Party
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl p-6 md:p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate(`/parties/${partyId}`)} className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center text-text hover:bg-surface transition tap-active" aria-label="Back to party">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">Edit Mode</p>
              <h1 className="text-2xl md:text-3xl font-bold text-text tracking-tight">Update Event Details</h1>
            </div>
          </div>
          <p className="text-text-muted mt-2 text-sm max-w-2xl ml-[52px]">
            Modify your event while it's still upcoming. Changes go live instantly.
          </p>
        </motion.div>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error rounded-2xl p-4 mb-6 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
            {/* Identity */}
            <section className="glass-panel rounded-2xl p-5 space-y-5">
              <h2 className="text-base font-bold text-text flex items-center gap-2"><Tag className="w-4 h-4 text-primary" />Identity</h2>
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Event Title *</label>
                <input name="title" value={form.title} onChange={handleChange} onBlur={handleBlur} placeholder="e.g., Rooftop Vibes Vol. 3" required maxLength={100}
                  className={`input-luxe w-full rounded-xl px-4 py-3.5 ${fieldError('title', form.title) ? 'ring-2 ring-error/50' : ''}`} />
                {fieldError('title', form.title) && <p className="text-error text-[10px] mt-1 font-semibold">Title is required</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Set the mood, dress code, music profile..." rows={4} maxLength={2000} className="input-luxe w-full rounded-xl px-4 py-3.5 resize-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Tags</label>
                <input name="tags" value={form.tags} onChange={handleChange} placeholder="rooftop, afro-house, intimate" maxLength={500} className="input-luxe w-full rounded-xl px-4 py-3.5" />
                <p className="text-text-dim text-xs mt-1.5">{tagCount} tag{tagCount === 1 ? "" : "s"} · Separate with commas</p>
              </div>
            </section>

            {/* Cover Image */}
            <section className="glass-panel rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-bold text-text flex items-center gap-2"><Image className="w-4 h-4 text-accent" />Cover Image</h2>
              {coverImagePreview && (
                <div className="relative rounded-2xl overflow-hidden bg-surface">
                  <img src={coverImagePreview} alt="Cover preview" className="w-full h-48 object-cover" />
                  <button type="button" aria-label="Remove cover image" onClick={() => { setCoverImage(null); setCoverImagePreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-3 right-3 bg-error/80 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-error transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverImageChange} aria-label="Upload cover image" className="hidden" />
              <button type="button" onClick={triggerCoverUpload} className="btn-secondary-luxe w-full px-4 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2">
                <Image className="w-4 h-4" />
                {coverImage ? "Change Image" : coverImagePreview ? "Replace Image" : "Choose Cover Image"}
              </button>
              <p className="text-text-dim text-xs">JPEG, PNG, or WebP</p>
            </section>

            {/* Location & Time */}
            <section className="glass-panel rounded-2xl p-5 space-y-5">
              <h2 className="text-base font-bold text-text flex items-center gap-2"><MapPin className="w-4 h-4 text-accent" />Location & Time</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Location Name *</label>
                  <input name="location_name" value={form.location_name} onChange={handleChange} onBlur={handleBlur} placeholder="Skydeck, Indiranagar" required
                    className={`input-luxe w-full rounded-xl px-4 py-3.5 ${fieldError('location_name', form.location_name) ? 'ring-2 ring-error/50' : ''}`} />
                  {fieldError('location_name', form.location_name) && <p className="text-error text-[10px] mt-1 font-semibold">Location is required</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">City *</label>
                  <input name="location_city" value={form.location_city} onChange={handleChange} onBlur={handleBlur} placeholder="Bangalore" required
                    className={`input-luxe w-full rounded-xl px-4 py-3.5 ${fieldError('location_city', form.location_city) ? 'ring-2 ring-error/50' : ''}`} />
                  {fieldError('location_city', form.location_city) && <p className="text-error text-[10px] mt-1 font-semibold">City is required</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Start *</label>
                  <input type="datetime-local" name="date_time" value={form.date_time} onChange={handleChange} required className="input-luxe w-full rounded-xl px-4 py-3.5" aria-label="Start date and time" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">End</label>
                  <input type="datetime-local" name="end_time" value={form.end_time} onChange={handleChange} min={form.date_time || undefined} className="input-luxe w-full rounded-xl px-4 py-3.5" aria-label="End date and time" />
                  {form.end_time && form.date_time && new Date(form.end_time) <= new Date(form.date_time) && (
                    <p className="text-error text-[10px] mt-1 font-semibold">End time must be after start time</p>
                  )}
                </div>
              </div>
            </section>

            {/* Pricing & Trust */}
            <section className="glass-panel rounded-2xl p-5 space-y-5">
              <h2 className="text-base font-bold text-text flex items-center gap-2"><Ticket className="w-4 h-4 text-warning" />Pricing &amp; Trust</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Ticket Price (₹)</label>
                  <input type="number" name="ticket_price" value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: Math.max(0, Number(e.target.value)) })} min={0} step="1" className="input-luxe w-full rounded-xl px-4 py-3.5" aria-label="Ticket price in rupees" />
                  <span className="text-text-dim text-xs mt-1.5 block">0 = Free entry</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Min Rating</label>
                  <input type="number" name="min_rating" value={form.min_rating} onChange={handleChange} min={0} max={5} step="0.1" className="input-luxe w-full rounded-xl px-4 py-3.5" aria-label="Minimum attendee rating" />
                  <span className="text-text-dim text-xs mt-1.5 block">0 = No restriction</span>
                </div>
              </div>
            </section>

            <button type="submit" disabled={saving} className="btn-primary-luxe w-full font-bold py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving Changes...</> : <>Save Changes</>}
            </button>
          </form>

          {/* Mobile preview */}
          <div className="lg:hidden">
            <button type="button" onClick={() => setShowMobilePreview(!showMobilePreview)}
              className="w-full btn-secondary-luxe py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-4 tap-active">
              <Eye className="w-4 h-4" /> Preview
              <ChevronDown className={`w-4 h-4 transition-transform ${showMobilePreview ? 'rotate-180' : ''}`} />
            </button>
            {showMobilePreview && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden mb-6">
                <PreviewCard form={form} isFree={isFree} />
              </motion.div>
            )}
          </div>

          {/* Desktop Preview sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden lg:block glass-panel rounded-2xl p-5 lg:sticky lg:top-24"
          >
            <PreviewCard form={form} isFree={isFree} />
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
