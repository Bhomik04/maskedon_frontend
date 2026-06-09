import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { compressAndStripMetadata } from "../lib/image-utils";
import { isNative } from "../lib/capacitor";
import { takePhoto } from "../lib/native-camera";
import { useAuth } from "../context/auth-hook";
import PhotoGrid from "../components/photo-grid";
import type { Event, Photo, Attendee } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Camera, Upload, Loader2, Star, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

export default function EventPhotosPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const initialPhotoId = searchParams.get("photo") ?? undefined;
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    try {
      const [eventRes, attendeesRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/events/${eventId}/attendees`),
      ]);
      setEvent(eventRes.data.data.event);
      setAttendees(attendeesRes.data.data.attendees);
    } catch (loadError) {
      console.error("Failed to load event details:", getApiErrorMessage(loadError, "Unknown event details error"));
      setError("Event not found");
    }
  }, [eventId]);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await api.get(`/events/${eventId}/photos?page=${page}&limit=20`);
      setPhotos(res.data.data.photos);
      setTotal(res.data.data.total);
    } catch (loadError) {
      console.error("Failed to load event photos:", getApiErrorMessage(loadError, "Unknown event photos error"));
      setError("Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [page, eventId]);

  useEffect(() => { if (eventId) loadEvent(); }, [loadEvent, eventId]);
  useEffect(() => { if (eventId) loadPhotos(); }, [loadPhotos, eventId]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");

    try {
      const sanitizedFile = await compressAndStripMetadata(file, {
        maxSizeMB: 4,
        maxWidthOrHeight: 1920,
      });

      const formData = new FormData();
      formData.append("image", sanitizedFile, sanitizedFile.name || file.name);
      formData.append("event_id", eventId!);
      if (caption.trim()) formData.append("caption", caption.trim());

      await api.post("/photos", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setCaption("");
      await loadPhotos();
    } catch (uploadError: unknown) {
      setError(getApiErrorMessage(uploadError, "Upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  }

  async function handleNativeCapture() {
    const file = await takePhoto();
    if (!file) return;
    await uploadFile(file);
  }

  const likeInFlightRef = useRef<Set<string>>(new Set());
  async function handleLike(photoId: string) {
    if (likeInFlightRef.current.has(photoId)) return;
    likeInFlightRef.current.add(photoId);
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) { likeInFlightRef.current.delete(photoId); return; }
    const wasLiked = !!photo.liked_by_me;
    
    // Optimistic update
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId
          ? { ...p, liked_by_me: !wasLiked, like_count: Math.max(0, wasLiked ? p.like_count - 1 : p.like_count + 1) }
          : p
      )
    );

    try {
      if (wasLiked) {
        await api.delete(`/photos/${photoId}/like`);
      } else {
        await api.post(`/photos/${photoId}/like`);
      }
    } catch (err) {
      // Revert on error
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, liked_by_me: wasLiked, like_count: Math.max(0, wasLiked ? p.like_count + 1 : p.like_count - 1) }
            : p
        )
      );
    } finally {
      likeInFlightRef.current.delete(photoId);
    }
  }

  async function executeDelete(photoId: string) {
    setDeleteConfirmId(null);
    try {
      await api.delete(`/photos/${photoId}`);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setTotal((count) => count - 1);
    } catch (deleteError: unknown) {
      setError(getApiErrorMessage(deleteError, "Delete failed"));
    }
  }

  const isHost = event && user && event.host_id === user.id;
  const isAttendee = user && attendees.some((a) => a.user_id === user.id);
  const canUpload = user && (isHost || isAttendee);
  const totalPages = Math.ceil(total / 20);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-6 md:py-8 px-4 pb-28 md:pb-12">
      <div className="max-w-6xl mx-auto">
        <Link to={`/events/${eventId}`} className="text-text-muted text-sm hover:text-text transition mb-4 inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to event
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-accent/20">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">Visual Archive</p>
              <h1 className="text-2xl font-bold text-text tracking-tight">Event Gallery</h1>
              {event && <p className="text-text-muted text-sm">{event.title}</p>}
            </div>
          </div>
          <span className="text-text-muted text-sm font-semibold">{total} photo{total !== 1 ? "s" : ""}</span>
        </motion.div>

        {error && <p className="text-error text-sm mb-4 bg-error/10 border border-error/20 px-4 py-3 rounded-xl">{error}</p>}

        {/* Featured Cover Image */}
        {event?.cover_image_url && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-warning" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-warning">Featured</span>
            </div>
            <div className="relative rounded-2xl overflow-hidden group cursor-pointer">
              <img src={event.cover_image_url} alt={`${event.title} cover`} className="w-full h-72 sm:h-96 object-cover group-hover:scale-105 transition duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg/60 via-bg/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white font-bold text-lg">Event Cover Image</p>
                <p className="text-white/70 text-sm">Set by the host</p>
              </div>
            </div>
          </div>
        )}

        {canUpload && (
          <div className="glass-panel rounded-2xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <input
                type="text"
                aria-label="Photo caption"
                placeholder="Write a memory caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="input-luxe flex-1 rounded-xl px-4 py-3 text-sm"
              />
              <input ref={fileInputRef} type="file" aria-label="Upload event photo" title="Upload event photo" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" />
              {isNative() && (
                <button
                  onClick={handleNativeCapture}
                  disabled={uploading}
                  className="btn-secondary-luxe text-sm font-bold px-5 py-3 rounded-xl transition disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Camera className="w-4 h-4" />Take Photo</>}
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-primary-luxe text-sm font-bold px-5 py-3 rounded-xl transition disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />Upload Photo</>}
              </button>
            </div>
          </div>
        )}

        <PhotoGrid photos={photos} onLike={handleLike} onDelete={(id) => setDeleteConfirmId(id)} currentUserId={user?.id} initialPhotoId={initialPhotoId} />

        {/* DELETE CONFIRMATION MODAL */}
        <AnimatePresence>
          {deleteConfirmId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
              onClick={() => setDeleteConfirmId(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-panel rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-error/10 border border-error/15 mx-auto mb-4 flex items-center justify-center">
                    <Trash2 className="w-7 h-7 text-error" />
                  </div>
                  <h3 className="text-text font-bold text-lg mb-1">Delete Photo?</h3>
                  <p className="text-text-muted text-sm leading-relaxed">This photo will be permanently removed and cannot be recovered.</p>
                </div>
                <div className="flex border-t border-primary/[0.06]">
                  <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3.5 text-sm font-semibold text-text-muted hover:bg-surface-light transition tap-active">
                    Cancel
                  </button>
                  <button onClick={() => executeDelete(deleteConfirmId)} className="flex-1 py-3.5 text-sm font-bold text-error hover:bg-error/10 transition border-l border-primary/[0.06] tap-active">
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <button aria-label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-text-muted text-sm font-semibold">{page} / {totalPages}</span>
            <button aria-label="Next page" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
