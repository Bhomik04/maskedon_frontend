import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import PhotoGrid from "../components/photo-grid";
import type { Photo } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { Camera, Upload, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export default function UserPhotosPage() {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const initialPhotoId = searchParams.get("photo") ?? undefined;
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");

  const isOwnProfile = userId === "me" || userId === user?.id;
  const resolvedUserId = isOwnProfile ? user?.id : userId;

  const loadUserInfo = useCallback(async () => {
    if (isOwnProfile) {
      setDisplayName(user?.display_name || "My");
      return;
    }
    try {
      const res = await api.get(`/users/${resolvedUserId}`);
      setDisplayName(res.data.data.user.display_name);
    } catch (loadError) {
      console.error("Failed to load profile info:", getApiErrorMessage(loadError, "Unknown profile info error"));
    }
  }, [isOwnProfile, resolvedUserId, user?.display_name]);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await api.get(`/users/${resolvedUserId}/photos?page=${page}&limit=20`);
      setPhotos(res.data.data.photos);
      setTotal(res.data.data.total);
    } catch (loadError) {
      console.error("Failed to load user photos:", getApiErrorMessage(loadError, "Unknown user photos error"));
      setError("Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [page, resolvedUserId]);

  useEffect(() => {
    setPage(1);
  }, [resolvedUserId]);

  useEffect(() => {
    if (resolvedUserId) {
      loadPhotos();
      loadUserInfo();
    }
  }, [loadPhotos, loadUserInfo, resolvedUserId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (caption.trim()) formData.append("caption", caption.trim());
      await api.post("/photos", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setCaption("");
      loadPhotos();
    } catch (uploadError: unknown) {
      setError(getApiErrorMessage(uploadError, "Upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  async function handleDelete(photoId: string) {
    try {
      await api.delete(`/photos/${photoId}`);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setTotal((count) => count - 1);
    } catch (deleteError: unknown) {
      setError(getApiErrorMessage(deleteError, "Delete failed"));
    }
  }

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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">Media Portfolio</p>
              <h1 className="text-2xl font-bold text-text tracking-tight">
                {isOwnProfile ? "My Photos" : `${displayName}'s Photos`}
              </h1>
            </div>
          </div>
          <p className="text-text-muted text-sm font-semibold">{total} photo{total !== 1 ? "s" : ""}</p>
        </motion.div>

        {error && <p className="text-error text-sm mb-4 bg-error/10 border border-error/20 px-4 py-3 rounded-xl">{error}</p>}

        {isOwnProfile && (
          <div className="glass-panel rounded-2xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <input
                type="text"
                aria-label="Photo caption"
                placeholder="Add a caption to your memory..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="input-luxe flex-1 rounded-xl px-4 py-3 text-sm"
              />
              <input ref={fileInputRef} type="file" aria-label="Upload user photo" title="Upload user photo" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" />
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

        <PhotoGrid photos={photos} onLike={handleLike} onDelete={isOwnProfile ? handleDelete : undefined} currentUserId={user?.id} initialPhotoId={initialPhotoId} />

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
