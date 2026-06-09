import { useState, useEffect, useRef, useCallback, useMemo, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { compressAndStripMetadata } from "../lib/image-utils";
import api from "../lib/api";
import type { Photo, FriendUser, PendingFriendRequest } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { useBackButton } from "../lib/use-back-button";
import { isNative } from "../lib/capacitor";
import { takePhoto } from "../lib/native-camera";
import { Share } from "@capacitor/share";
import { getTrustLevel } from "../lib/trust-levels";
import TrustBadge from "../components/trust-badge";
import LikersSheet from "../components/LikersSheet";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Grid3x3, Star, Users, Heart, Loader2, X, Trash2,
  Edit3, ChevronLeft, ChevronRight, LayoutDashboard,
  PartyPopper, Award, ImagePlus, Check, UserPlus, MessageCircle, ArrowLeft,
  Eye, BarChart3, Pencil, Sun, Contrast, Droplets, RotateCw,
  Flame, Crown, Shield, Share2, Search, Trophy, CalendarDays, Pin, ChevronDown, Bookmark
} from "lucide-react";

/* helpers */

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function parseMentions(text: string) {
  const parts = text.split(/(@[\w.]+)/g);
  return parts.map((part, i) =>
    /^@[\w.]+$/.test(part)
      ? <span key={i} className="text-primary font-semibold">{part}</span>
      : part
  );
}

interface PhotoComment {
  id: string;
  user_id: string;
  comment_text: string;
  like_count: number;
  created_at: string;
  display_name?: string;
  username?: string;
  avatar_url?: string | null;
  parent_comment_id: string | null;
  is_pinned: boolean;
  replies: PhotoComment[];
}

/* main */

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const feedPhotoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const storyOverlayRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<"photos" | "ratings" | "friends" | "saved">("photos");
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosTotal, setPhotosTotal] = useState(0);
  const [photosPage, setPhotosPage] = useState(1);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [feedStartIndex, setFeedStartIndex] = useState<number | null>(null);
  const [activeCommentPhotoId, setActiveCommentPhotoId] = useState<string | null>(null);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; display_name: string; username?: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [eventTitles, setEventTitles] = useState<Record<string, string>>({});
  const [storyEventId, setStoryEventId] = useState<string | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [likersPhotoId, setLikersPhotoId] = useState<string | null>(null);

  // Saved photos
  const [savedPhotos, setSavedPhotos] = useState<Photo[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const eventPhotos = useMemo(() => photos.filter((photo) => photo.event_id), [photos]);

  const pastEventReels = useMemo(() => {
    const grouped = new Map<string, Photo[]>();
    for (const photo of eventPhotos) {
      if (!photo.event_id) continue;
      const existing = grouped.get(photo.event_id) ?? [];
      existing.push(photo);
      grouped.set(photo.event_id, existing);
    }

    const now = Date.now();
    const dayMs = 86_400_000;

    const scorePhoto = (photo: Photo) => {
      const likes = photo.like_count || 0;
      const comments = photo.comment_count || 0;
      const views = photo.view_count || 0;
      const ageDays = Math.max(1, (now - new Date(photo.created_at).getTime()) / dayMs);
      const recencyBoost = Math.max(1, 30 / (ageDays + 2));
      return likes * 3 + comments * 2.4 + views * 0.3 + recencyBoost;
    };

    return Array.from(grouped.entries())
      .map(([eventId, eventPhotos]) => {
        const sortedSlides = [...eventPhotos].sort((a, b) => {
          const scoreDiff = scorePhoto(b) - scorePhoto(a);
          if (scoreDiff !== 0) return scoreDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        const cover = sortedSlides[0] ?? eventPhotos[0];
        const totalEngagement = eventPhotos.reduce((sum, photo) => {
          return sum + (photo.like_count || 0) * 3 + (photo.comment_count || 0) * 2 + (photo.view_count || 0) * 0.25;
        }, 0);
        const newestTimestamp = Math.max(...eventPhotos.map((photo) => new Date(photo.created_at).getTime()));
        const daysSinceLatest = Math.max(1, (now - newestTimestamp) / dayMs);
        const freshnessBoost = Math.max(1, 45 / (daysSinceLatest + 4));
        const eventScore = totalEngagement + eventPhotos.length * 18 + freshnessBoost;

        return {
          eventId,
          title: eventTitles[eventId] || "Past Event",
          cover,
          slides: sortedSlides,
          score: eventScore,
          latestAt: newestTimestamp,
        };
      })
      .sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
        return b.latestAt - a.latestAt;
      });
  }, [eventPhotos, eventTitles]);

  // Caption editing
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editCaptionText, setEditCaptionText] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);

  // Delete confirmations
  const [deletePhotoConfirmId, setDeletePhotoConfirmId] = useState<string | null>(null);
  const [deleteCommentConfirmId, setDeleteCommentConfirmId] = useState<string | null>(null);

  // Photo insights
  const [insightsPhotoId, setInsightsPhotoId] = useState<string | null>(null);
  const [insights, setInsights] = useState<{ view_count: number; like_count: number; comment_count: number } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // View tracking — IDs already sent
  const viewedPhotoIds = useRef<Set<string>>(new Set());

  // Crowd Rating History
  const [ratingHistory, setRatingHistory] = useState<Array<{ event_id: string; event_title: string; event_date: string; avg_score: number; total_votes: number; user_voted: boolean }>>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  // Friends
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  // Friend search
  const [friendSearch, setFriendSearch] = useState("");

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Avatar editing (filters/adjust)
  const avatarCanvasRef = useRef<HTMLCanvasElement>(null);
  const [avatarEditFile, setAvatarEditFile] = useState<File | null>(null);
  const [avatarEditPreview, setAvatarEditPreview] = useState<string | null>(null);
  const [avatarEditTab, setAvatarEditTab] = useState<"filters" | "adjust">("filters");
  const [avatarFilter, setAvatarFilter] = useState(0);
  const [avatarBrightness, setAvatarBrightness] = useState(100);
  const [avatarContrast, setAvatarContrast] = useState(100);
  const [avatarSaturation, setAvatarSaturation] = useState(100);
  const [avatarRotation, setAvatarRotation] = useState(0);

  const AVATAR_FILTERS = [
    { name: "Normal", css: "" },
    { name: "Vivid", css: "saturate(1.4) contrast(1.1)" },
    { name: "Warm", css: "sepia(0.25) saturate(1.3) brightness(1.05)" },
    { name: "Cool", css: "saturate(0.9) hue-rotate(15deg) brightness(1.05)" },
    { name: "Fade", css: "saturate(0.7) brightness(1.1) contrast(0.9)" },
    { name: "Mono", css: "grayscale(1)" },
    { name: "Noir", css: "grayscale(1) contrast(1.4) brightness(0.9)" },
    { name: "Glow", css: "brightness(1.15) saturate(1.2) contrast(0.95)" },
  ] as const;

  const avatarAdjustCSS = `brightness(${avatarBrightness / 100}) contrast(${avatarContrast / 100}) saturate(${avatarSaturation / 100})`;
  const avatarFilterCSS = AVATAR_FILTERS[avatarFilter].css;
  const avatarCombinedCSS = [avatarFilterCSS, avatarAdjustCSS].filter(Boolean).join(" ");

  function resetAvatarEdit() {
    setAvatarEditFile(null);
    setAvatarEditPreview(null);
    setAvatarEditTab("filters");
    setAvatarFilter(0);
    setAvatarBrightness(100);
    setAvatarContrast(100);
    setAvatarSaturation(100);
    setAvatarRotation(0);
  }

  function showToast(msg: string, type: "success" | "error" = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Android back button: close overlays in reverse z-index order
  useBackButton(!!storyEventId, useCallback(() => { setStoryEventId(null); setStoryIndex(0); }, []));
  useBackButton(!storyEventId && activeCommentPhotoId !== null, useCallback(() => { setActiveCommentPhotoId(null); setComments([]); setReplyingTo(null); setExpandedReplies(new Set()); setNewComment(""); setCommentError(""); }, []));
  useBackButton(!storyEventId && activeCommentPhotoId === null && feedStartIndex !== null, useCallback(() => { setFeedStartIndex(null); setActiveCommentPhotoId(null); setComments([]); setReplyingTo(null); setExpandedReplies(new Set()); setNewComment(""); setCommentError(""); }, []));

  useEffect(() => {
    if (user) { setDisplayName(user.display_name); setBio(user.bio || ""); }
  }, [user]);

  useEffect(() => {
    if (user) {
      api.get("/friends/me?limit=1")
        .then((res) => setFriendCount(res.data.data.total))
        .catch(() => setFriendCount(0));
    }
  }, [user]);

  const loadPhotos = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get(`/users/${user.id}/photos?page=${photosPage}&limit=36`);
      const loadedPhotos: Photo[] = res.data.data.photos;
      setPhotos(loadedPhotos);
      setPhotosTotal(res.data.data.total);
      const uniqueEventIds = Array.from(new Set(loadedPhotos.map((p) => p.event_id).filter((eventId): eventId is string => Boolean(eventId))));
      if (uniqueEventIds.length > 0) {
        const titleEntries = await Promise.all(uniqueEventIds.map(async (id) => {
          try { const eventRes = await api.get(`/events/${id}`); return [id, eventRes.data.data.event?.title || "Event"] as const; }
          catch { return [id, "Event"] as const; }
        }));
        setEventTitles((prev) => ({ ...prev, ...Object.fromEntries(titleEntries) }));
      }
    } catch (error) { console.error("Failed to load profile photos:", getApiErrorMessage(error, "Unknown profile photos error")); }
    finally { setPhotosLoading(false); }
  }, [photosPage, user]);

  const loadRatings = useCallback(async () => {
    if (!user) return;
    setRatingsLoading(true);
    try { const res = await api.get(`/users/${user.id}/ratings`); setRatingHistory(res.data.data.history || []); }
    catch (error) { console.error("Failed to load crowd rating history:", getApiErrorMessage(error, "Unknown rating history error")); }
    finally { setRatingsLoading(false); }
  }, [user]);

  const loadFriendsList = useCallback(async () => {
    setFriendsLoading(true);
    try { const res = await api.get("/friends/me?limit=100"); setFriends(res.data.data.friends); setFriendCount(res.data.data.total); }
    catch (error) { console.error("Failed to load friends list:", getApiErrorMessage(error, "Unknown friends list error")); }
    finally { setFriendsLoading(false); }
  }, []);

  const loadPendingRequests = useCallback(async () => {
    setPendingLoading(true);
    try { const res = await api.get("/friends/me/pending"); setPendingRequests(res.data.data.requests || []); }
    catch (error) { console.error("Failed to load pending friend requests:", getApiErrorMessage(error, "Unknown pending requests error")); }
    finally { setPendingLoading(false); }
  }, []);

  useEffect(() => { if (user) loadPhotos(); }, [loadPhotos, user]);
  useEffect(() => {
    if (user && tab === "ratings") loadRatings();
    if (user && tab === "friends") { loadFriendsList(); loadPendingRequests(); }
    if (user && tab === "saved" && savedPhotos.length === 0) {
      setSavedLoading(true);
      api.get("/photos/saved?limit=50")
        .then((res) => setSavedPhotos(res.data.data.photos || []))
        .catch(() => {})
        .finally(() => setSavedLoading(false));
    }
  }, [loadFriendsList, loadPendingRequests, loadRatings, tab, user]);

  async function handleAcceptFriend(requesterId: string) {
    setPendingActionId(requesterId);
    try { await api.patch(`/friends/${requesterId}/accept`); setPendingRequests((prev) => prev.filter((r) => r.id !== requesterId)); setFriendCount((c) => (c ?? 0) + 1); loadFriendsList(); showToast("Friend request accepted!"); }
    catch (error) { showToast(getApiErrorMessage(error, "Failed to accept"), "error"); }
    finally { setPendingActionId(null); }
  }

  async function handleDeclineFriend(requesterId: string) {
    setPendingActionId(requesterId);
    try { await api.patch(`/friends/${requesterId}/reject`); setPendingRequests((prev) => prev.filter((r) => r.id !== requesterId)); showToast("Request declined"); }
    catch (error) { showToast(getApiErrorMessage(error, "Failed to decline"), "error"); }
    finally { setPendingActionId(null); }
  }

  async function handleUnfriend(friendId: string) {
    try { await api.delete(`/friends/${friendId}`); setFriends((prev) => prev.filter((f) => f.id !== friendId)); setFriendCount((c) => Math.max(0, (c ?? 1) - 1)); showToast("Friend removed"); }
    catch (error) { showToast(getApiErrorMessage(error, "Failed to unfriend"), "error"); }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { showToast("Only JPEG, PNG, WebP allowed", "error"); return; }
    setAvatarEditFile(file);
    setAvatarEditPreview(URL.createObjectURL(file));
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  async function getProcessedAvatar(): Promise<File | null> {
    if (!avatarEditPreview || !avatarEditFile) return null;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = avatarCanvasRef.current;
        if (!canvas) { resolve(avatarEditFile); return; }
        const maxDim = 1024;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > maxDim || h > maxDim) { const r = Math.min(maxDim / w, maxDim / h); w = Math.round(w * r); h = Math.round(h * r); }
        const isRotated = avatarRotation % 180 !== 0;
        canvas.width = isRotated ? h : w;
        canvas.height = isRotated ? w : h;
        const ctx = canvas.getContext("2d")!;
        ctx.filter = avatarCombinedCSS || "none";
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((avatarRotation * Math.PI) / 180);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], avatarEditFile.name, { type: "image/jpeg" }));
          else resolve(avatarEditFile);
        }, "image/jpeg", 0.92);
      };
      img.src = avatarEditPreview;
    });
  }

  async function uploadProcessedAvatar() {
    const processed = await getProcessedAvatar();
    if (!processed) return;
    setAvatarUploading(true);
    try {
      const compressed = await compressAndStripMetadata(processed, { maxSizeMB: 0.5, maxWidthOrHeight: 512 });
      const fd = new FormData(); fd.append("avatar", compressed);
      await api.put("/users/me/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await refreshUser();
      showToast("Avatar updated!");
      resetAvatarEdit();
    }
    catch (error) { showToast(getApiErrorMessage(error, "Upload failed"), "error"); }
    finally { setAvatarUploading(false); }
  }

  async function handleNativeAvatarUpload() {
    const file = await takePhoto();
    if (file) {
      setAvatarEditFile(file);
      setAvatarEditPreview(URL.createObjectURL(file));
    }
  }

  function triggerAvatarUpload() {
    if (isNative()) { handleNativeAvatarUpload(); } else { avatarInputRef.current?.click(); }
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showToast('Only JPEG, PNG, WebP allowed', 'error'); return; }
    setBannerUploading(true);
    try {
      const fd = new FormData(); fd.append('banner', file);
      await api.put('/users/me/banner', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      showToast('Banner updated!');
    } catch (error) { showToast(getApiErrorMessage(error, 'Upload failed'), 'error'); }
    finally { setBannerUploading(false); if (bannerInputRef.current) bannerInputRef.current.value = ''; }
  }

  async function handleNativeBannerUpload() {
    const file = await takePhoto();
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showToast('Only JPEG, PNG, WebP allowed', 'error'); return; }
    setBannerUploading(true);
    try {
      const fd = new FormData(); fd.append('banner', file);
      await api.put('/users/me/banner', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      showToast('Banner updated!');
    } catch (error) { showToast(getApiErrorMessage(error, 'Upload failed'), 'error'); }
    finally { setBannerUploading(false); }
  }

  function triggerBannerUpload() {
    if (isNative()) { void handleNativeBannerUpload(); } else { bannerInputRef.current?.click(); }
  }

  async function handleDeletePhoto(photoId: string) {
    try { await api.delete(`/photos/${photoId}`); setPhotos((p) => p.filter((x) => x.id !== photoId)); setPhotosTotal((t) => t - 1); if (activeCommentPhotoId === photoId) { setActiveCommentPhotoId(null); setComments([]); } showToast("Photo deleted"); }
    catch (error) { showToast(getApiErrorMessage(error, "Delete failed"), "error"); }
  }

  async function loadComments(photoId: string) {
    setLoadingComments(true); setCommentError("");
    try { const res = await api.get(`/photos/${photoId}/comments`); setComments(res.data.data.comments || []); }
    catch { setCommentError("Failed to load comments"); setComments([]); }
    finally { setLoadingComments(false); }
  }

  function updatePhotoCommentCount(photoId: string, delta: number) {
    setPhotos((prev) => prev.map((photo) => (
      photo.id === photoId
        ? { ...photo, comment_count: Math.max(0, (photo.comment_count || 0) + delta) }
        : photo
    )));
  }

  async function handleAddComment() {
    if (!activeCommentPhotoId || !newComment.trim()) return;
    setPostingComment(true); setCommentError("");
    try {
      const body: { comment_text: string; parent_comment_id?: string } = { comment_text: newComment.trim() };
      if (replyingTo) body.parent_comment_id = replyingTo.id;
      const res = await api.post(`/photos/${activeCommentPhotoId}/comments`, body);
      const newC: PhotoComment = res.data.data.comment;
      if (replyingTo) {
        setComments((prev) => prev.map((c) =>
          c.id === replyingTo.id ? { ...c, replies: [...(c.replies || []), newC] } : c
        ));
        setExpandedReplies((prev) => new Set(prev).add(replyingTo.id));
        setReplyingTo(null);
      } else {
        setComments((prev) => [{ ...newC, replies: [] }, ...prev]);
      }
      updatePhotoCommentCount(activeCommentPhotoId, 1);
      setNewComment("");
    }
    catch (error) { setCommentError(getApiErrorMessage(error, "Failed to post comment")); }
    finally { setPostingComment(false); }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await api.delete(`/photos/comments/${commentId}`);
      setComments((prev) => {
        const topLevel = prev.filter((c) => c.id !== commentId);
        return topLevel.map((c) => ({ ...c, replies: (c.replies || []).filter((r) => r.id !== commentId) }));
      });
      if (activeCommentPhotoId) updatePhotoCommentCount(activeCommentPhotoId, -1);
    }
    catch (error) { setCommentError(getApiErrorMessage(error, "Failed to delete comment")); }
  }

  async function handlePinComment(commentId: string) {
    try {
      const res = await api.patch(`/photos/comments/${commentId}/pin`);
      const isPinned: boolean = res.data.data.pinned;
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, is_pinned: isPinned } : c));
    } catch (error) { setCommentError(getApiErrorMessage(error, "Failed to pin comment")); }
  }

  function toggleExpandedReply(commentId: string) {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }

  function closeFeed() {
    setFeedStartIndex(null);
    setActiveCommentPhotoId(null);
    setComments([]);
    setReplyingTo(null);
    setExpandedReplies(new Set());
    setNewComment("");
    setCommentError("");
    setEditingCaptionId(null);
    setInsightsPhotoId(null);
    setInsights(null);
  }

  async function handleEditCaption(photoId: string) {
    setSavingCaption(true);
    try {
      const res = await api.patch(`/photos/${photoId}/caption`, { caption: editCaptionText.trim() || null });
      setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, caption: (res.data.data.photo?.caption ?? editCaptionText.trim()) || null } : p));
      setEditingCaptionId(null);
      showToast("Caption updated!");
    } catch (error) { showToast(getApiErrorMessage(error, "Failed to update caption"), "error"); }
    finally { setSavingCaption(false); }
  }

  async function loadInsights(photoId: string) {
    if (insightsPhotoId === photoId) { setInsightsPhotoId(null); setInsights(null); return; }
    setInsightsPhotoId(photoId);
    setInsightsLoading(true);
    try {
      const res = await api.get(`/photos/${photoId}/insights`);
      setInsights(res.data.data.insights);
    } catch { setInsights(null); }
    finally { setInsightsLoading(false); }
  }

  function trackView(photoId: string) {
    if (viewedPhotoIds.current.has(photoId)) return;
    viewedPhotoIds.current.add(photoId);
    api.post(`/photos/${photoId}/view`).catch(() => {});
  }

  // Like toggle for own profile feed view
  const likeInFlightRef = useRef<Set<string>>(new Set());
  async function handleLikeToggle(photoId: string) {
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
    } catch {
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

  async function handleSharePhoto(photoId: string) {
    const appUrl = (import.meta.env.VITE_APP_URL as string) || window.location.origin;
    const url = `${appUrl}/photos/${photoId}`;
    const shareData = {
      title: "Shared photo on MaskedOn",
      text: "Check out this photo on MaskedOn!",
      url: url,
    };
    try {
      if (isNative()) {
        await Share.share(shareData);
      } else if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        showToast("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  }

  function toggleComments(photoId: string) {
    if (activeCommentPhotoId === photoId) {
      setActiveCommentPhotoId(null);
      setComments([]);
      setReplyingTo(null);
      setExpandedReplies(new Set());
      setNewComment("");
      setCommentError("");
    } else {
      setActiveCommentPhotoId(photoId);
      setComments([]);
      setReplyingTo(null);
      setExpandedReplies(new Set());
      setNewComment("");
      setCommentError("");
      loadComments(photoId);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMessage("");
    try {
      await api.put("/users/me", { display_name: displayName, bio });
      await refreshUser();
      setMessage("Profile updated!"); setMessageType("success"); setEditing(false);
      showToast("Profile saved!");
    }
    catch (error: unknown) { setMessage(getApiErrorMessage(error, "Update failed")); setMessageType("error"); }
    finally { setSaving(false); }
  }

  // Keyboard: Escape closes story/feed view
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (storyEventId) { setStoryEventId(null); setStoryIndex(0); return; }
        if (feedStartIndex !== null) closeFeed();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [feedStartIndex, storyEventId]);

  // Auto-advance story
  useEffect(() => {
    if (!storyEventId) return;
    const currentEventIndex = pastEventReels.findIndex((event) => event.eventId === storyEventId);
    if (currentEventIndex < 0) return;
    const currentPhotos = pastEventReels[currentEventIndex].slides;
    if (currentPhotos.length === 0) return;

    const timer = setTimeout(() => {
      if (storyIndex < currentPhotos.length - 1) { setStoryIndex(storyIndex + 1); }
      else {
        if (currentEventIndex < pastEventReels.length - 1) { setStoryEventId(pastEventReels[currentEventIndex + 1].eventId); setStoryIndex(0); }
        else { setStoryEventId(null); setStoryIndex(0); }
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [pastEventReels, storyEventId, storyIndex]);

  // Auto-scroll to tapped post when feed opens
  useEffect(() => {
    if (feedStartIndex !== null) {
      requestAnimationFrame(() => {
        feedPhotoRefs.current[feedStartIndex]?.scrollIntoView({ behavior: "instant", block: "start" });
      });
    }
  }, [feedStartIndex]);

  // Focus trap for story overlay (#26)
  useEffect(() => {
    if (!storyEventId) return;
    const overlay = storyOverlayRef.current;
    if (!overlay) return;

    // Focus the close button on open
    const closeBtn = overlay.querySelector<HTMLElement>('[aria-label="Close story"]');
    closeBtn?.focus();

    function handleFocusTrap(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        overlay!.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    overlay.addEventListener("keydown", handleFocusTrap);
    return () => overlay.removeEventListener("keydown", handleFocusTrap);
  }, [storyEventId]);

  const activeEventIndex = storyEventId
    ? pastEventReels.findIndex((event) => event.eventId === storyEventId)
    : -1;
  const storyPhotos = activeEventIndex >= 0 ? pastEventReels[activeEventIndex].slides : [];

  if (!user) return null;

  const ratingVal = Number(user.social_rating);
  const hasAnyRatings = user.total_ratings > 0;
  const hasEnoughRatings = user.total_ratings >= 3;
  const trustLevel = getTrustLevel(ratingVal, user.total_ratings);

  const profilePhotos = photos.filter((photo) => !photo.event_id);

  function storyNext() {
    if (storyIndex < storyPhotos.length - 1) { setStoryIndex(storyIndex + 1); }
    else {
      if (activeEventIndex >= 0 && activeEventIndex < pastEventReels.length - 1) {
        setStoryEventId(pastEventReels[activeEventIndex + 1].eventId);
        setStoryIndex(0);
      }
      else { setStoryEventId(null); setStoryIndex(0); }
    }
  }

  function storyPrev() {
    if (storyIndex > 0) { setStoryIndex(storyIndex - 1); }
    else {
      if (activeEventIndex > 0) {
        const previousEvent = pastEventReels[activeEventIndex - 1];
        setStoryEventId(previousEvent.eventId);
        const prevPhotos = previousEvent.slides;
        setStoryIndex(Math.max(0, prevPhotos.length - 1));
      }
    }
  }
  const photoPages = Math.ceil(photosTotal / 36);
  const memberSince = new Date(user.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

  // -- Achievements (computed from existing user activity) --
  const friendCountVal = friendCount ?? 0;
  const achievements = [
    { id: "first-event", icon: PartyPopper, name: "First Event", desc: "Attend your first event", earned: user.events_attended >= 1, color: "#F59E0B" },
    { id: "weekend-warrior", icon: Flame, name: "Weekend Warrior", desc: "Attend 5+ events", earned: user.events_attended >= 5, color: "#F97316" },
    { id: "event-animal",     icon: Flame,  name: "Event Animal",     desc: "Attend 10+ events",  earned: user.events_attended >= 10, color: "#EF4444" },
    { id: "nightlife-legend", icon: Crown,  name: "Nightlife Legend", desc: "Attend 25+ events",  earned: user.events_attended >= 25, color: "#9B6DFF" },
    { id: "host-debut",       icon: Crown,  name: "Host Debut",       desc: "Host your first event", earned: user.events_hosted >= 1, color: "#D4A853" },
    { id: "super-host", icon: Trophy, name: "Super Host", desc: "Host 5+ events", earned: user.events_hosted >= 5, color: "#EC4899" },
    { id: "festival-host", icon: Award, name: "Festival Host", desc: "Host 15+ events", earned: user.events_hosted >= 15, color: "#9B6DFF" },
    { id: "social-spark", icon: Users, name: "Social Spark", desc: "Make 5+ friends", earned: friendCountVal >= 5, color: "#9B6DFF" },
    { id: "social-butterfly", icon: Users, name: "Social Butterfly", desc: "Make 10+ friends", earned: friendCountVal >= 10, color: "#7B4FD4" },
    { id: "connector", icon: Heart, name: "Connector", desc: "Make 25+ friends", earned: friendCountVal >= 25, color: "#14B8A6" },
    { id: "shutterbug", icon: Camera, name: "Shutterbug", desc: "Post 5+ profile photos", earned: profilePhotos.length >= 5, color: "#10B981" },
    { id: "gallery-master", icon: Grid3x3, name: "Gallery Master", desc: "Post 20+ profile photos", earned: profilePhotos.length >= 20, color: "#22C55E" },
    { id: "crowd-favorite", icon: Star, name: "Crowd Favorite", desc: "Keep average rating above 4.5", earned: hasEnoughRatings && ratingVal >= 4.5, color: "#EAB308" },
    { id: "critic-choice", icon: Star, name: "Critic's Choice", desc: "Keep average rating above 4.8", earned: hasEnoughRatings && ratingVal >= 4.8, color: "#F59E0B" },
    { id: "trusted", icon: Shield, name: "Trusted", desc: "Reach Spark trust level", earned: ["Spark", "Luminary", "Inferno"].includes(trustLevel.name), color: "#D4A853" },
    { id: "legendary-trust", icon: Shield, name: "Legendary Trust", desc: "Reach Luminary or Inferno", earned: ["Luminary", "Inferno"].includes(trustLevel.name), color: "#E8BC67" },
    {
      id: "all-rounder",
      icon: BarChart3,
      name: "All-Rounder",
      desc: "Host 5+, attend 10+, make 10+ friends, post 5+ photos",
      earned: user.events_hosted >= 5 && user.events_attended >= 10 && friendCountVal >= 10 && profilePhotos.length >= 5,
      color: "#9B6DFF",
    },
  ];
  const earnedAchievements = achievements.filter(a => a.earned);

  // -- Profile Completion --
  const completionSteps = [
    { label: "Add photo", done: !!user.avatar_url, weight: 25 },
    { label: "Write bio", done: !!user.bio, weight: 20 },
    { label: "Set name", done: user.display_name !== user.username, weight: 15 },
    { label: "Join a event", done: user.events_attended >= 1, weight: 20 },
    { label: "Post a photo", done: profilePhotos.length >= 1, weight: 10 },
    { label: "Make a friend", done: (friendCount ?? 0) >= 1, weight: 10 },
  ];
  const profileCompletion = completionSteps.reduce((sum, s) => sum + (s.done ? s.weight : 0), 0);

  // -- Rating distribution (from history) --
  const ratingDistribution = [5, 4, 3, 2, 1].map(score => ({
    score,
    count: ratingHistory.filter(r => Math.round(r.avg_score) === score).length,
  }));
  const maxDistCount = Math.max(...ratingDistribution.map(d => d.count), 1);

  // -- Filtered friends (for search) --
  const filteredFriends = friendSearch
    ? friends.filter(f =>
        f.display_name.toLowerCase().includes(friendSearch.toLowerCase()) ||
        f.username.toLowerCase().includes(friendSearch.toLowerCase())
      )
    : friends;

  // -- Share profile --
  async function handleShareProfile() {
    if (!user) return;
    const appUrl = (import.meta.env.VITE_APP_URL as string) || "https://maskedon.com";
    const url = `${appUrl}/profile/${user.id}`;
    const shareData = { title: `${user.display_name} on MaskedOn`, url };
    if (isNative()) {
      try { await Share.share(shareData); } catch { /* cancelled */ }
    } else if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      showToast("Profile link copied!");
    }
  }


  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">

      {/* -- TOAST -- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className={`px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl backdrop-blur-md border ${
              toast.type === "success"
                ? "bg-success/90 text-white border-success/30 shadow-success/20"
                : "bg-error/90 text-white border-error/30 shadow-error/20"
            }`}>
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-4 pt-4 relative z-10">

        {/* -- PROFILE CARD -- */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-primary/[0.08]"
          style={{ boxShadow: `0 8px 48px ${trustLevel.color}18, 0 2px 16px rgba(0,0,0,0.3)` }}
        >
          <canvas ref={avatarCanvasRef} className="hidden" />

          {/* -- Card-internal gradient strip -- */}
          <div className="relative h-28 overflow-hidden">
            {/* Banner image or gradient fallback */}
            {user.banner_url ? (
              <img src={user.banner_url} alt="Profile banner" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${trustLevel.color}30 0%, var(--color-primary)/20 50%, var(--color-accent)/10 100%)` }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg/80" />
            {!user.banner_url && (
              <>
                <div className="absolute -top-4 right-6 w-32 h-32 rounded-full blur-3xl opacity-50" style={{ backgroundColor: trustLevel.color }} />
                <div className="absolute top-2 left-1/3 w-20 h-20 rounded-full blur-2xl opacity-30 bg-accent" />
              </>
            )}
            <input ref={bannerInputRef} type="file" aria-label="Upload banner" accept="image/jpeg,image/png,image/webp" onChange={handleBannerUpload} className="hidden" />
          </div>

          <div className="px-5 pb-5 sm:px-7 sm:pb-6">
            {/* Avatar — overlaps gradient strip */}
            <div className="relative -mt-12 mb-4">
              <div className="relative group inline-block">
                <div
                  className="w-24 h-24 rounded-2xl p-[3.5px] shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${trustLevel.color}, var(--color-primary), var(--color-accent))`,
                    boxShadow: `0 8px 40px ${trustLevel.color}50, 0 2px 12px rgba(0,0,0,0.4)`,
                  }}
                >
                  <div className="w-full h-full rounded-[13px] bg-bg overflow-hidden border-[3px] border-bg">
                    {avatarUploading ? (
                      <div className="w-full h-full flex items-center justify-center bg-surface">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      </div>
                    ) : user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-text bg-gradient-to-br from-surface to-surface-light">
                        {user.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                {editing && (
                  <button
                    onClick={triggerAvatarUpload}
                    disabled={avatarUploading}
                    aria-label="Change photo"
                    className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary-hover transition tap-active border-[3px] border-bg"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
                <input ref={avatarInputRef} type="file" aria-label="Upload avatar" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />
              </div>
            </div>

            {/* Name + meta */}
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-text tracking-tight leading-tight">
                    {user.display_name}
                  </h1>
                  {["Spark", "Luminary", "Inferno"].includes(trustLevel.name) && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: trustLevel.color }}
                      title={`Verified ${trustLevel.name}`}
                    >
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p className="text-text-muted text-xs mt-0.5">@{user.username}</p>

                {user.bio && (
                  <p className="text-text-muted/80 text-sm mt-2.5 leading-relaxed line-clamp-2">{user.bio}</p>
                )}

                <div className="flex items-center flex-wrap gap-2 mt-2">
                  <span
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
                    style={{ color: trustLevel.color, backgroundColor: `${trustLevel.color}18` }}
                  >
                    <Shield className="w-2.5 h-2.5" />
                    {trustLevel.name}
                  </span>
                  <span className="text-text-dim text-[11px]">Since {memberSince}</span>
                </div>
              </div>
            </div>

            {/* -- EDIT FORM -- */}
            <AnimatePresence>
              {editing && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleSave}
                  className="mt-5 pt-5 border-t border-primary/[0.06] space-y-4 overflow-hidden"
                >
                  {/* Avatar Edit Section */}
                  {avatarEditPreview ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.12em]">Profile Photo</label>
                        <button type="button" onClick={resetAvatarEdit} className="text-text-dim text-[10px] font-bold uppercase tracking-wider hover:text-error transition tap-active">Remove</button>
                      </div>
                      <div className="flex justify-center">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-primary/20 shadow-lg">
                          <img
                            src={avatarEditPreview}
                            alt="Preview"
                            className="w-full h-full object-cover transition-all duration-200"
                            style={{
                              filter: avatarCombinedCSS || undefined,
                              transform: avatarRotation ? `rotate(${avatarRotation}deg)` : undefined,
                            }}
                            draggable={false}
                          />
                        </div>
                      </div>
                      <div className="flex border-b border-primary/[0.06]">
                        <button type="button" onClick={() => setAvatarEditTab("filters")}
                          className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider text-center tap-active transition ${
                            avatarEditTab === "filters" ? "text-primary border-b-2 border-primary" : "text-text-dim"
                          }`}>
                          Filters
                        </button>
                        <button type="button" onClick={() => setAvatarEditTab("adjust")}
                          className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider text-center tap-active transition ${
                            avatarEditTab === "adjust" ? "text-primary border-b-2 border-primary" : "text-text-dim"
                          }`}>
                          <Sun className="w-3.5 h-3.5 mx-auto mb-0.5" /> Adjust
                        </button>
                      </div>
                      {avatarEditTab === "filters" && (
                        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                          {AVATAR_FILTERS.map((f, i) => (
                            <button key={f.name} type="button" onClick={() => setAvatarFilter(i)}
                              className={`shrink-0 flex flex-col items-center gap-1 tap-active transition ${
                                avatarFilter === i ? "opacity-100" : "opacity-60"
                              }`}>
                              <div className={`w-14 h-14 rounded-full overflow-hidden border-2 transition ${
                                avatarFilter === i ? "border-primary shadow-lg shadow-primary/20" : "border-transparent"
                              }`}>
                                <img src={avatarEditPreview} alt={f.name} className="w-full h-full object-cover"
                                  style={{ filter: f.css || undefined }} draggable={false} />
                              </div>
                              <span className={`text-[9px] font-semibold ${avatarFilter === i ? "text-primary" : "text-text-dim"}`}>{f.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {avatarEditTab === "adjust" && (
                        <div className="space-y-4">
                          {[
                            { label: "Brightness", icon: Sun, value: avatarBrightness, set: setAvatarBrightness, min: 50, max: 150 },
                            { label: "Contrast", icon: Contrast, value: avatarContrast, set: setAvatarContrast, min: 50, max: 150 },
                            { label: "Saturation", icon: Droplets, value: avatarSaturation, set: setAvatarSaturation, min: 0, max: 200 },
                          ].map((s) => (
                            <div key={s.label} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-text-muted text-[11px] font-semibold flex items-center gap-1.5">
                                  <s.icon className="w-3 h-3" /> {s.label}
                                </span>
                                <span className="text-text-dim text-[11px] tabular-nums">{s.value}</span>
                              </div>
                              <input type="range" min={s.min} max={s.max} value={s.value}
                                onChange={(e) => s.set(Number(e.target.value))}
                                className="w-full accent-primary h-1 bg-surface-light rounded-full appearance-none cursor-pointer" />
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-1">
                            <button type="button" onClick={() => setAvatarRotation((r) => (r + 90) % 360)}
                              className="flex items-center gap-1.5 text-text-muted text-[11px] font-semibold tap-active hover:text-text transition">
                              <RotateCw className="w-3.5 h-3.5" /> Rotate
                            </button>
                            <button type="button" onClick={() => { setAvatarFilter(0); setAvatarBrightness(100); setAvatarContrast(100); setAvatarSaturation(100); setAvatarRotation(0); }}
                              className="text-text-dim text-[11px] font-semibold tap-active hover:text-error transition">
                              Reset All
                            </button>
                          </div>
                        </div>
                      )}
                      <button type="button" onClick={uploadProcessedAvatar} disabled={avatarUploading}
                        className="btn-primary-luxe w-full font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 tap-active disabled:opacity-50">
                        {avatarUploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</> : <><Camera className="w-3.5 h-3.5" />Update Photo</>}
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={triggerAvatarUpload}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/20 text-text-muted text-sm font-semibold hover:border-primary/40 hover:text-text transition tap-active">
                      <Camera className="w-4 h-4 text-primary" /> Change Profile Photo
                    </button>
                  )}

                  {/* Banner edit */}
                  <button type="button" onClick={triggerBannerUpload} disabled={bannerUploading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/20 text-text-muted text-sm font-semibold hover:border-primary/40 hover:text-text transition tap-active disabled:opacity-50">
                    {bannerUploading ? <><Loader2 className="w-4 h-4 text-primary animate-spin" /> Uploading banner…</> : <><Camera className="w-4 h-4 text-primary" /> Change Banner Photo</>}
                  </button>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.12em] mb-1.5">Display Name</label>
                      <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} placeholder="Your display name" className="input-luxe w-full rounded-xl px-4 py-3 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.12em] mb-1.5">Bio</label>
                      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} maxLength={500} className="input-luxe w-full rounded-xl px-4 py-3 resize-none text-sm" placeholder="Tell people about yourself..." />
                      <p className="text-text-dim text-[10px] mt-1 text-right">{bio.length}/500</p>
                    </div>
                  </div>
                  {message && (
                    <p className={`text-xs ${messageType === "error" ? "text-error bg-error/10 border-error/15" : "text-success bg-success/10 border-success/15"} border px-4 py-2.5 rounded-xl`}>{message}</p>
                  )}
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="btn-primary-luxe font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50 flex items-center gap-2 text-sm flex-1 justify-center tap-active">
                      {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving</> : <><Check className="w-3.5 h-3.5" />Save</>}
                    </button>
                    <button type="button" onClick={() => { setEditing(false); setDisplayName(user.display_name); setBio(user.bio || ""); resetAvatarEdit(); }}
                      className="btn-secondary-luxe px-5 py-2.5 rounded-xl transition text-sm tap-active">Cancel</button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* -- STATS ROW -- */}
            <div className="grid grid-cols-5 gap-1 mt-6 pt-5 border-t border-primary/[0.06]">
              {[
                { label: "Posts", value: profilePhotos.length, icon: Grid3x3 },
                { label: "Friends", value: friendCount === null ? "…" : friendCount, icon: Users },
                { label: "Hosted", value: user.events_hosted, icon: Crown },
                { label: "Joined", value: user.events_attended, icon: PartyPopper },
                { label: "Rating", value: hasAnyRatings ? ratingVal.toFixed(1) : "—", icon: Star },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="text-center py-2"
                >
                  <stat.icon className="w-3.5 h-3.5 mx-auto text-text-dim/60 mb-1" />
                  <div className="text-base sm:text-lg font-extrabold text-text leading-none">{stat.value}</div>
                  <div className="text-[8px] text-text-dim uppercase tracking-wider font-bold mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* -- ACTION BUTTONS -- */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <button
            onClick={() => { setEditing(true); setMessage(""); }}
            className="glass-panel border border-primary/[0.06] text-text font-semibold py-2.5 rounded-2xl hover:border-primary/15 transition text-sm flex items-center justify-center gap-1.5 tap-active"
          >
            <Edit3 className="w-4 h-4 text-primary" /> Edit
          </button>
          <button
            onClick={handleShareProfile}
            className="glass-panel border border-primary/[0.06] text-text font-semibold py-2.5 rounded-2xl hover:border-primary/15 transition text-sm flex items-center justify-center gap-1.5 tap-active"
          >
            <Share2 className="w-4 h-4 text-accent" /> Share
          </button>
          <Link
            to="/dashboard"
            className="glass-panel border border-primary/[0.06] text-text font-semibold py-2.5 rounded-2xl hover:border-primary/15 transition text-sm flex items-center justify-center gap-1.5 tap-active"
          >
            <LayoutDashboard className="w-4 h-4 text-warning" /> Host
          </Link>
        </div>

        {/* -- PROFILE COMPLETION -- */}
        {profileCompletion < 100 && (
          <Link to="/settings?edit=profile" className="block">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-panel rounded-2xl p-4 mt-3 border border-primary/[0.06] cursor-pointer"
          >
            <div className="flex items-center gap-4">
              {/* SVG completion ring */}
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="var(--color-primary)" strokeOpacity="0.1" strokeWidth="4" />
                  <circle
                    cx="24" cy="24" r="20" fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - profileCompletion / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-primary">
                  {profileCompletion}%
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text font-bold text-sm">Complete your profile</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {completionSteps.filter(s => !s.done).map(step => (
                    <span key={step.label} className="text-[10px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
          </Link>
        )}

        {/* -- ACHIEVEMENTS -- */}
        {achievements.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-bold flex items-center gap-1.5">
                <Trophy className="w-3 h-3" /> Achievements
              </p>
              <Link
                to="/achievements"
                className="flex items-center gap-1 text-[10px] text-primary font-semibold hover:underline"
              >
                {earnedAchievements.length}/{achievements.length} · See all
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {achievements.map((a) => (
                <Link
                  key={a.id}
                  to="/achievements"
                  title={`${a.name}: ${a.desc}`}
                  className={`shrink-0 flex flex-col items-center gap-1.5 transition tap-active ${
                    a.earned ? "" : "opacity-90"
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center relative border ${
                      a.earned ? "border-transparent" : "bg-surface border-border-light"
                    }`}
                    style={a.earned ? {
                      backgroundColor: `${a.color}15`,
                      boxShadow: `0 0 24px ${a.color}20`,
                    } : undefined}
                  >
                    <a.icon className={`w-6 h-6 ${a.earned ? "" : "text-text-muted"}`} style={a.earned ? { color: a.color } : {}} />
                    {a.earned && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-success flex items-center justify-center shadow-sm ring-1 ring-bg/70">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span className={`text-[9px] font-bold max-w-[64px] truncate text-center ${a.earned ? "text-text-dim" : "text-text-muted"}`}>
                    {a.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* -- TAB BAR -- */}
        <div className="flex mt-5 rounded-xl overflow-hidden glass-panel p-0.5">
          {([
            { key: "photos" as const, icon: Grid3x3, label: "Posts" },
            { key: "ratings" as const, icon: Award, label: "Reviews" },
            { key: "friends" as const, icon: Users, label: "Friends" },
            { key: "saved" as const, icon: Bookmark, label: "Saved" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 transition flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider tap-active relative rounded-lg ${
                tab === t.key
                  ? "text-text bg-primary/10"
                  : "text-text-dim hover:text-text"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.key === "friends" && pendingRequests.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-warning absolute top-1.5 right-[28%] animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* -- TAB CONTENT -- */}
        <div className="mt-4">

          {/* --- PHOTOS TAB --- */}
          {tab === "photos" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* Past Events */}
              {pastEventReels.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-bold mb-3 flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3" /> Past Events
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth-x">
                    {pastEventReels.map((event, index) => {
                      const isActive = storyEventId === event.eventId;
                      return (
                        <button
                          key={event.eventId}
                          onClick={() => { setStoryEventId(event.eventId); setStoryIndex(0); }}
                          className="shrink-0 flex flex-col items-center gap-1.5 group tap-active"
                          title={event.title}
                        >
                          <div className={`p-[2.5px] rounded-full transition-all duration-300 ${
                            isActive
                              ? "bg-gradient-to-br from-primary via-warning to-accent shadow-lg shadow-primary/20 scale-105"
                              : "bg-text-dim/20 group-hover:bg-primary/40"
                          }`}>
                            <div className="w-16 h-16 rounded-full overflow-hidden border-[3px] border-bg bg-surface relative">
                              <img src={event.cover.image_url} alt={event.title} className="w-full h-full object-cover" loading="lazy" />
                              <div className="absolute top-0.5 right-0.5 min-w-4 h-4 rounded-full bg-black/70 text-white text-[8px] font-bold flex items-center justify-center px-1 border border-white/20">
                                {index + 1}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-text-dim max-w-[84px] truncate text-center font-medium">{event.title}</span>
                          <span className="text-[9px] text-text-dim/70">{event.slides.length} {event.slides.length === 1 ? "photo" : "photos"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* New Post CTA */}
              <Link
                to="/create-post"
                className="glass-panel rounded-2xl p-3.5 mb-4 flex items-center justify-center gap-2 tap-active hover:border-primary/15 transition border border-primary/[0.06] group"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
                  <ImagePlus className="w-4 h-4 text-primary" />
                </div>
                <span className="text-text font-semibold text-sm">Create New Post</span>
              </Link>

              {/* Photo grid */}
              {photosLoading ? (
                <div className="grid grid-cols-3 gap-[2px] rounded-xl overflow-hidden">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="aspect-square shimmer" />
                  ))}
                </div>
              ) : profilePhotos.length === 0 ? (
                <div className="text-center py-16 glass-panel rounded-2xl border border-primary/[0.06]">
                  <div className="w-16 h-16 rounded-2xl bg-surface-light mx-auto mb-4 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-text-dim/20" />
                  </div>
                  <p className="text-text font-bold text-base">No posts yet</p>
                  <p className="text-text-dim text-sm mt-1 mb-5">Share your best event moments</p>
                  <Link to="/create-post" className="btn-primary-luxe text-sm font-bold px-6 py-2.5 rounded-xl tap-active inline-flex items-center gap-2">
                    <ImagePlus className="w-4 h-4" /> Create Post
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-[2px] sm:gap-1 rounded-xl overflow-hidden">
                    {profilePhotos.map((photo, idx) => (
                      <motion.div
                        key={photo.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                        className="aspect-square bg-surface overflow-hidden cursor-pointer group relative tap-active"
                        onClick={() => setFeedStartIndex(idx)}
                      >
                        <img src={photo.image_url} alt={photo.caption || "Photo"} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex gap-4">
                            <span className="text-white text-sm font-bold flex items-center gap-1">
                              <Heart className="w-4 h-4 fill-white" /> {photo.like_count}
                            </span>
                            <span className="text-white text-sm font-bold flex items-center gap-1">
                              <MessageCircle className="w-4 h-4 fill-white" /> {photo.comment_count || 0}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {photoPages > 1 && (
                    <div className="flex justify-center items-center gap-3 mt-6">
                      <button onClick={() => setPhotosPage((p) => Math.max(1, p - 1))} disabled={photosPage === 1} className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30 tap-active" aria-label="Previous page">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-text-muted text-sm font-semibold tabular-nums">{photosPage} / {photoPages}</span>
                      <button onClick={() => setPhotosPage((p) => Math.min(photoPages, p + 1))} disabled={photosPage === photoPages} className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30 tap-active" aria-label="Next page">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* --- RATINGS TAB --- */}
          {tab === "ratings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* Trust Level summary card */}
              <div className="glass-panel rounded-2xl p-5 mb-4 border border-primary/[0.06] flex items-center gap-4">
                <div className="relative shrink-0">
                  <TrustBadge rating={ratingVal} totalEvents={user.total_ratings} size="lg" showLabel={false} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-extrabold" style={{ color: trustLevel.color }}>{trustLevel.name}</div>
                  <p className="text-text-dim text-xs mt-0.5">
                    {hasEnoughRatings
                      ? `${ratingVal.toFixed(1)}/5 avg across ${user.total_ratings} ${user.total_ratings === 1 ? "event" : "events"}`
                      : "Not enough ratings yet"
                    }
                  </p>
                  {/* Mini progress to next level */}
                  {trustLevel.name !== "Inferno" && hasEnoughRatings && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ backgroundColor: trustLevel.color, width: `${Math.min(100, (ratingVal / 5) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rating Distribution */}
              {ratingHistory.length > 0 && (
                <div className="glass-panel rounded-2xl p-4 mb-4 border border-primary/[0.06]">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-text-dim font-bold mb-3 flex items-center gap-1.5">
                    <BarChart3 className="w-3 h-3" /> Rating Distribution
                  </p>
                  <div className="space-y-2">
                    {ratingDistribution.map((d) => (
                      <div key={d.score} className="flex items-center gap-2.5">
                        <span className="text-text-muted text-xs font-bold w-3 text-right">{d.score}</span>
                        <Star className="w-3 h-3 text-warning shrink-0" />
                        <div className="flex-1 h-2 bg-surface-light rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(d.count / maxDistCount) * 100}%` }}
                            transition={{ duration: 0.8, delay: (5 - d.score) * 0.1 }}
                            className="h-full rounded-full bg-warning"
                          />
                        </div>
                        <span className="text-text-dim text-[10px] font-semibold w-5 tabular-nums">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating History */}
              {ratingsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl shimmer" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 shimmer rounded-lg w-32" />
                        <div className="h-3 shimmer rounded-lg w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : ratingHistory.length === 0 ? (
                <div className="text-center py-16 glass-panel rounded-2xl border border-primary/[0.06]">
                  <div className="w-16 h-16 rounded-2xl bg-surface-light mx-auto mb-4 flex items-center justify-center">
                    <Star className="w-8 h-8 text-text-dim/20" />
                  </div>
                  <p className="text-text font-bold text-base">No crowd ratings yet</p>
                  <p className="text-text-dim text-sm mt-1">Attend events to build your reputation</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ratingHistory.map((entry, i) => {
                    const entryLevel = getTrustLevel(entry.avg_score, 1);
                    return (
                      <motion.div
                        key={entry.event_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.25) }}
                      >
                        <Link
                          to={`/events/${entry.event_id}`}
                          className="glass-panel rounded-2xl p-4 flex items-center gap-3 tap-active block hover:border-primary/10 transition border border-transparent"
                        >
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{
                              backgroundColor: entryLevel.color,
                              boxShadow: `0 0 16px ${entryLevel.color}25`,
                            }}
                          >
                            {entry.avg_score.toFixed(1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-text font-bold text-sm truncate">{entry.event_title}</p>
                            <p className="text-text-dim text-[10px] mt-0.5">
                              {new Date(entry.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              {" · "}{entry.total_votes} vote{entry.total_votes !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold shrink-0 px-2 py-0.5 rounded-full" style={{ color: entryLevel.color, backgroundColor: `${entryLevel.color}12` }}>
                            {entryLevel.name}
                          </span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* --- FRIENDS TAB --- */}
          {tab === "friends" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* Friend search */}
              {friends.length > 5 && (
                <div className="relative mb-4">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                  <input
                    type="text"
                    placeholder="Search friends…"
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    className="input-luxe w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
                  />
                </div>
              )}

              {/* Pending requests */}
              {(pendingLoading || pendingRequests.length > 0) && (
                <div className="mb-5">
                  <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                    {pendingLoading ? "Loading…" : `Pending Requests (${pendingRequests.length})`}
                  </h3>
                  {!pendingLoading && (
                    <div className="space-y-2">
                      {pendingRequests.map((req) => (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="glass-panel rounded-2xl p-4 flex items-center gap-3 border border-warning/10"
                        >
                          <Link to={`/profile/${req.id}`} className="shrink-0">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px]">
                              <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-text text-sm font-bold">
                                {req.avatar_url
                                  ? <img src={req.avatar_url} alt={req.display_name} className="w-full h-full object-cover" />
                                  : req.display_name.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          </Link>
                          <Link to={`/profile/${req.id}`} className="flex-1 min-w-0 hover:opacity-80 transition">
                            <p className="text-text font-bold text-sm truncate">{req.display_name}</p>
                            <p className="text-text-muted text-xs">@{req.username}</p>
                          </Link>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => handleAcceptFriend(req.id)}
                              disabled={pendingActionId === req.id}
                              className="bg-primary/15 hover:bg-primary/25 text-primary font-bold text-xs px-3 py-2 rounded-xl transition disabled:opacity-50 tap-active"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineFriend(req.id)}
                              disabled={pendingActionId === req.id}
                              className="bg-text-dim/10 text-text-muted font-semibold text-xs px-3 py-2 rounded-xl transition disabled:opacity-50 tap-active"
                            >
                              Decline
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Friends list */}
              {friendsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full shimmer" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 shimmer rounded-lg w-24" />
                        <div className="h-3 shimmer rounded-lg w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : friends.length === 0 && pendingRequests.length === 0 ? (
                <div className="text-center py-16 glass-panel rounded-2xl border border-primary/[0.06]">
                  <div className="w-16 h-16 rounded-2xl bg-surface-light mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-8 h-8 text-text-dim/20" />
                  </div>
                  <p className="text-text font-bold text-base">No friends yet</p>
                  <p className="text-text-dim text-sm mt-1 mb-5">Discover people at events</p>
                  <Link to="/events" className="btn-primary-luxe text-sm font-bold px-6 py-2.5 rounded-xl tap-active inline-flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Find Friends
                  </Link>
                </div>
              ) : filteredFriends.length > 0 ? (
                <div className="space-y-2">
                  {filteredFriends.map((f, i) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.2) }}
                      className="glass-panel rounded-2xl p-4 flex items-center gap-3"
                    >
                      <Link to={`/profile/${f.id}`} className="shrink-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px]">
                          <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-text font-bold text-sm">
                            {f.avatar_url
                              ? <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                              : f.display_name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      </Link>
                      <Link to={`/profile/${f.id}`} className="flex-1 min-w-0 hover:opacity-80 transition">
                        <p className="text-text font-bold text-sm truncate">{f.display_name}</p>
                        <p className="text-xs font-bold" style={{ color: getTrustLevel(Number(f.social_rating), 1).color }}>
                          {getTrustLevel(Number(f.social_rating), 1).name}
                        </p>
                      </Link>
                      <button
                        onClick={() => handleUnfriend(f.id)}
                        className="text-text-dim hover:text-error text-xs p-2.5 rounded-xl transition shrink-0 tap-active hover:bg-error/10"
                        title="Remove friend"
                        aria-label={`Remove ${f.display_name} as friend`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : friendSearch ? (
                <div className="text-center py-12 glass-panel rounded-2xl">
                  <p className="text-text-dim text-sm">No friends matching "{friendSearch}"</p>
                </div>
              ) : null}
            </motion.div>
          )}

          {/* --- SAVED TAB --- */}
          {tab === "saved" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {savedLoading ? (
                <div className="flex items-center justify-center py-16 gap-2">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-text-muted text-sm">Loading saved posts…</span>
                </div>
              ) : savedPhotos.length === 0 ? (
                <div className="text-center py-16 glass-panel rounded-2xl">
                  <Bookmark className="w-8 h-8 text-text-dim mx-auto mb-3" />
                  <p className="text-text font-semibold mb-1">No saved posts yet</p>
                  <p className="text-text-dim text-sm">Tap the bookmark icon on any photo to save it for later.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {savedPhotos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-surface">
                      <img
                        src={photo.thumbnail_url || photo.image_url}
                        alt={photo.caption || "Saved photo"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* --- INSTAGRAM-STYLE SCROLLABLE FEED --- */}
      <AnimatePresence>
        {feedStartIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-bg z-50 flex flex-col"
          >
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur-lg border-b border-primary/[0.06] px-4 py-3 flex items-center gap-3">
              <button onClick={closeFeed} className="w-9 h-9 rounded-full bg-surface-light flex items-center justify-center text-text hover:bg-surface transition tap-active" aria-label="Back to grid">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-text text-sm">Posts</h2>
            </div>

            {/* Snap-scroll feed */}
            <div ref={feedContainerRef} className="flex-1 overflow-y-auto snap-feed">
              <div className="max-w-lg mx-auto">
                {profilePhotos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    ref={(el) => {
                      feedPhotoRefs.current[idx] = el;
                      if (el) {
                        const observer = new IntersectionObserver(([entry]) => {
                          if (entry.isIntersecting) { trackView(photo.id); observer.disconnect(); }
                        }, { threshold: 0.5 });
                        observer.observe(el);
                      }
                    }}
                    className="border-b border-primary/[0.06] snap-feed-item"
                  >
                    {/* Post header */}
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] shrink-0">
                        <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-sm font-bold text-text">
                          {user?.avatar_url
                            ? <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                            : (user?.display_name || "?").charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text text-sm font-bold truncate">{user?.display_name}</p>
                      </div>
                      <button onClick={() => loadInsights(photo.id)} className="text-text-dim hover:text-primary transition p-2 rounded-lg hover:bg-primary/10 tap-active" aria-label="View insights" title="Insights">
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeletePhotoConfirmId(photo.id)} className="text-text-dim hover:text-error transition p-2 rounded-lg hover:bg-error/10 tap-active" aria-label="Delete photo">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Insights bar */}
                    <AnimatePresence>
                      {insightsPhotoId === photo.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mx-4 mb-3 glass-panel rounded-xl p-3 flex items-center justify-around">
                            {insightsLoading ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : insights ? (
                              <>
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1 text-text font-bold text-sm"><Eye className="w-3.5 h-3.5 text-primary" /> {insights.view_count}</div>
                                  <p className="text-text-dim text-[9px] uppercase tracking-wider font-semibold mt-0.5">Views</p>
                                </div>
                                <div className="w-px h-8 bg-primary/10" />
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1 text-text font-bold text-sm"><Heart className="w-3.5 h-3.5 text-hot" /> {insights.like_count}</div>
                                  <p className="text-text-dim text-[9px] uppercase tracking-wider font-semibold mt-0.5">Likes</p>
                                </div>
                                <div className="w-px h-8 bg-primary/10" />
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-1 text-text font-bold text-sm"><MessageCircle className="w-3.5 h-3.5 text-accent" /> {insights.comment_count}</div>
                                  <p className="text-text-dim text-[9px] uppercase tracking-wider font-semibold mt-0.5">Comments</p>
                                </div>
                              </>
                            ) : (
                              <p className="text-text-dim text-xs">Failed to load insights</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Image */}
                    <div className="w-full bg-black">
                      <img src={photo.image_url} alt={photo.caption || "Photo"} className="w-full max-h-[70vh] object-contain" loading={idx > 2 ? "lazy" : undefined} />
                    </div>

                    {/* Actions & info */}
                    <div className="px-4 pt-3 pb-3">
                      <div className="flex items-center gap-4 mb-2">
                        <button onClick={() => handleLikeToggle(photo.id)} className="tap-active" aria-label="Like">
                          <Heart className={`w-6 h-6 transition ${photo.liked_by_me ? "text-hot fill-hot" : "text-text hover:text-hot"}`} />
                        </button>
                        <button onClick={() => toggleComments(photo.id)} className="tap-active" aria-label="Comment">
                          <MessageCircle className="w-6 h-6 text-text hover:text-primary transition" />
                        </button>
                        <button onClick={() => handleSharePhoto(photo.id)} className="tap-active" aria-label="Share">
                          <Share2 className="w-6 h-6 text-text hover:text-primary transition" />
                        </button>
                      </div>
                      <button
                        onClick={() => setLikersPhotoId(photo.id)}
                        className="text-text text-sm font-bold hover:text-text-muted transition tap-active text-left"
                      >
                        {photo.like_count.toLocaleString()} {photo.like_count === 1 ? "like" : "likes"}
                      </button>

                      {/* Caption with edit */}
                      {editingCaptionId === photo.id ? (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            value={editCaptionText}
                            onChange={(e) => setEditCaptionText(e.target.value)}
                            maxLength={500}
                            className="input-luxe flex-1 rounded-lg px-3 py-2 text-sm min-w-0"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") handleEditCaption(photo.id); if (e.key === "Escape") setEditingCaptionId(null); }}
                          />
                          <button onClick={() => handleEditCaption(photo.id)} disabled={savingCaption} className="text-primary font-bold text-sm tap-active disabled:opacity-50 shrink-0">
                            {savingCaption ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                          </button>
                          <button onClick={() => setEditingCaptionId(null)} className="text-text-dim text-sm tap-active shrink-0">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1 mt-1">
                          {photo.caption ? (
                            <p className="text-text text-sm flex-1">
                              <span className="font-bold">{user?.display_name}</span>{" "}
                              <span className="text-text-muted">{photo.caption}</span>
                            </p>
                          ) : (
                            <p className="text-text-dim text-sm italic flex-1">No caption</p>
                          )}
                          <button
                            onClick={() => { setEditingCaptionId(photo.id); setEditCaptionText(photo.caption || ""); }}
                            className="text-text-dim hover:text-primary transition p-1 tap-active shrink-0"
                            aria-label="Edit caption"
                            title="Edit caption"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <button onClick={() => toggleComments(photo.id)} className="text-text-dim text-sm mt-1 hover:text-text-muted transition block">
                        View all comments
                      </button>
                      <button onClick={() => toggleComments(photo.id)} className="flex items-center gap-2.5 mt-2 w-full tap-active">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] shrink-0">
                          <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-[8px] font-bold text-text">
                            {user?.avatar_url
                              ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                              : (user?.display_name || "?").charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <span className="text-text-dim text-sm">Add a comment…</span>
                      </button>

                      {/* View count + date */}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-text-dim text-[10px] flex items-center gap-1"><Eye className="w-3 h-3" /> {(photo.view_count || 0).toLocaleString()} views</span>
                        <span className="text-text-dim text-[10px] uppercase">
                          {new Date(photo.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- COMMENTS BOTTOM SHEET --- */}
      <AnimatePresence>
        {activeCommentPhotoId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => { setActiveCommentPhotoId(null); setComments([]); setReplyingTo(null); setExpandedReplies(new Set()); setNewComment(""); setCommentError(""); }} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[75vh] bg-bg rounded-t-3xl flex flex-col shadow-2xl border-t border-primary/[0.08]"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-text-dim/30" />
              </div>
              <div className="px-4 pb-3 border-b border-primary/[0.06] flex items-center justify-between">
                <h3 className="font-bold text-text text-base">Comments</h3>
                <button onClick={() => { setActiveCommentPhotoId(null); setComments([]); setReplyingTo(null); setExpandedReplies(new Set()); setNewComment(""); setCommentError(""); }} className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-text-dim hover:text-text transition tap-active" aria-label="Close comments">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
                {commentError && <div className="text-error text-xs bg-error/10 px-3 py-2 rounded-xl mb-3">{commentError}</div>}
                {loadingComments ? (
                  <div className="flex items-center justify-center gap-2 py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /><span className="text-text-muted text-sm">Loading…</span></div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-text font-bold text-lg mb-1">No comments yet</p>
                    <p className="text-text-dim text-sm">Start the conversation.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id}>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] shrink-0">
                            <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-[10px] font-bold text-text">
                              {comment.avatar_url ? <img src={comment.avatar_url} alt="" className="w-full h-full object-cover" /> : (comment.display_name || "?").charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            {comment.is_pinned && (
                              <div className="flex items-center gap-1 text-[10px] text-primary font-semibold mb-0.5">
                                <Pin className="w-2.5 h-2.5" /> Pinned
                              </div>
                            )}
                            <p className="text-sm leading-snug">
                              <span className="text-text font-bold mr-1.5">{comment.display_name || comment.username || "User"}</span>
                              <span className="text-text-muted">{parseMentions(comment.comment_text)}</span>
                            </p>
                            <div className="flex items-center gap-4 mt-1.5 text-xs text-text-dim">
                              <span>{timeAgo(comment.created_at)}</span>
                              <button type="button" onClick={() => setReplyingTo({ id: comment.id, display_name: comment.display_name || comment.username || "User", username: comment.username })} className="font-semibold hover:text-text transition">Reply</button>
                              <button type="button" onClick={() => handlePinComment(comment.id)} className="font-semibold hover:text-primary transition">{comment.is_pinned ? "Unpin" : "Pin"}</button>
                              {user && user.id === comment.user_id && (
                                deleteCommentConfirmId === comment.id ? (
                                  <span className="flex items-center gap-1.5">
                                    <button onClick={() => { handleDeleteComment(comment.id); setDeleteCommentConfirmId(null); }} className="text-error font-bold transition">Yes, delete</button>
                                    <span className="text-text-dim/40">·</span>
                                    <button onClick={() => setDeleteCommentConfirmId(null)} className="font-semibold hover:text-text transition">Cancel</button>
                                  </span>
                                ) : (
                                  <button onClick={() => setDeleteCommentConfirmId(comment.id)} className="text-error hover:text-error/80 transition font-medium">Delete</button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                        {(comment.replies || []).length > 0 && (
                          <div className="ml-11 mt-2">
                            <button type="button" onClick={() => toggleExpandedReply(comment.id)} className="flex items-center gap-1 text-xs text-accent font-semibold mb-2">
                              <ChevronDown className={`w-3 h-3 transition-transform ${expandedReplies.has(comment.id) ? "rotate-180" : ""}`} />
                              {expandedReplies.has(comment.id) ? "Hide" : `View ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`}
                            </button>
                            {expandedReplies.has(comment.id) && (
                              <div className="space-y-3">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] shrink-0">
                                      <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-[9px] font-bold text-text">
                                        {reply.avatar_url ? <img src={reply.avatar_url} alt="" className="w-full h-full object-cover" /> : (reply.display_name || "?").charAt(0).toUpperCase()}
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs leading-snug">
                                        <span className="text-text font-bold mr-1.5">{reply.display_name || reply.username || "User"}</span>
                                        <span className="text-text-muted">{parseMentions(reply.comment_text)}</span>
                                      </p>
                                      <div className="flex items-center gap-3 mt-1 text-[11px] text-text-dim">
                                        <span>{timeAgo(reply.created_at)}</span>
                                        <button type="button" onClick={() => setReplyingTo({ id: comment.id, display_name: comment.display_name || comment.username || "User", username: comment.username })} className="font-semibold hover:text-text transition">Reply</button>
                                        {user && user.id === reply.user_id && (
                                          deleteCommentConfirmId === reply.id ? (
                                            <span className="flex items-center gap-1.5">
                                              <button onClick={() => { handleDeleteComment(reply.id); setDeleteCommentConfirmId(null); }} className="text-error font-bold transition">Yes, delete</button>
                                              <span className="text-text-dim/40">·</span>
                                              <button onClick={() => setDeleteCommentConfirmId(null)} className="font-semibold hover:text-text transition">Cancel</button>
                                            </span>
                                          ) : (
                                            <button onClick={() => setDeleteCommentConfirmId(reply.id)} className="text-error hover:text-error/80 transition font-medium">Delete</button>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-primary/[0.06] shrink-0 bg-bg rounded-b-3xl">
                {replyingTo && (
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs text-text-dim">Replying to <span className="text-primary font-semibold">@{replyingTo.username || replyingTo.display_name}</span></span>
                    <button type="button" onClick={() => setReplyingTo(null)} className="text-text-dim hover:text-text transition"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] shrink-0">
                    <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-[10px] font-bold text-text">
                      {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : (user?.display_name || "?").charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <input type="text" aria-label="Add a comment" placeholder={replyingTo ? `Reply to ${replyingTo.display_name}…` : "Add a comment…"} value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && newComment.trim()) handleAddComment(); }} disabled={postingComment} className="flex-1 bg-transparent text-text text-sm placeholder:text-text-dim outline-none min-w-0 py-2" />
                  <button onClick={handleAddComment} disabled={postingComment || !newComment.trim()} className="text-primary font-bold text-sm disabled:opacity-40 transition tap-active shrink-0" aria-label="Post comment">
                    {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- PAST EVENT VIEWER --- */}
      <AnimatePresence>
        {storyEventId && storyPhotos.length > 0 && (
          <motion.div
            ref={storyOverlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[70] flex flex-col"
          >
            <img
              src={storyPhotos[storyIndex]?.image_url}
              alt="Backdrop"
              className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110"
              aria-hidden
            />
            <div className="absolute inset-0 bg-black/45" />

            {/* Slide progress bars */}
            <div className="absolute top-0 left-0 right-0 z-20 px-2 pt-2 flex gap-1">
              {storyPhotos.map((_, i) => (
                <div key={i} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
                  {i < storyIndex ? (
                    <div className="h-full bg-white rounded-full w-full" />
                  ) : i === storyIndex ? (
                    <div key={`sp-${storyEventId}-${storyIndex}`} className="h-full bg-white rounded-full story-progress-bar" />
                  ) : null}
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-5 left-0 right-0 z-20 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px]">
                  <div className="w-full h-full rounded-full bg-black overflow-hidden flex items-center justify-center text-sm font-bold text-white">
                    {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : (user?.display_name || "?").charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <p className="text-white text-sm font-bold">{pastEventReels[activeEventIndex]?.title || "Past Event"}</p>
                  <p className="text-white/70 text-[10px]">
                    Event {activeEventIndex + 1} of {pastEventReels.length} · Slide {storyIndex + 1} of {storyPhotos.length}
                  </p>
                </div>
              </div>
              <button onClick={() => { setStoryEventId(null); setStoryIndex(0); }} className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white transition rounded-full" aria-label="Close story">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Story image + tap zones */}
            <div className="flex-1 flex items-center justify-center relative select-none">
              <img
                src={storyPhotos[storyIndex]?.image_url}
                alt={storyPhotos[storyIndex]?.caption || "Past event photo"}
                className="max-w-full max-h-full object-contain"
                draggable={false}
              />
              <div className="absolute inset-0 flex">
                <button className="w-1/3 h-full cursor-default" onClick={storyPrev} aria-label="Previous" />
                <div className="w-1/3 h-full" />
                <button className="w-1/3 h-full cursor-default" onClick={storyNext} aria-label="Next" />
              </div>
            </div>

            {/* Event strip to distinguish between events */}
            {pastEventReels.length > 1 && (
              <div className="absolute bottom-20 left-0 right-0 z-20 px-4">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {pastEventReels.map((event, eventIdx) => (
                    <button
                      key={event.eventId}
                      onClick={() => { setStoryEventId(event.eventId); setStoryIndex(0); }}
                      className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border transition ${
                        eventIdx === activeEventIndex
                          ? "border-primary shadow-lg shadow-primary/25 scale-105"
                          : "border-white/20 opacity-80"
                      }`}
                      aria-label={`Open event ${eventIdx + 1}`}
                    >
                      <img src={event.cover.image_url} alt={event.title} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <span className="absolute bottom-1 left-1 text-[9px] text-white font-bold">{eventIdx + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Caption overlay */}
            {storyPhotos[storyIndex]?.caption && (
              <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-12 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm">{storyPhotos[storyIndex].caption}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Delete Confirmation Modal */}
      <AnimatePresence>
        {deletePhotoConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
            onClick={() => setDeletePhotoConfirmId(null)}
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
                <button onClick={() => setDeletePhotoConfirmId(null)} className="flex-1 py-3.5 text-sm font-semibold text-text-muted hover:bg-surface-light transition tap-active">
                  Cancel
                </button>
                <button
                  onClick={() => { handleDeletePhoto(deletePhotoConfirmId); setDeletePhotoConfirmId(null); }}
                  className="flex-1 py-3.5 text-sm font-bold text-error hover:bg-error/10 transition border-l border-primary/[0.06] tap-active"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Likers sheet */}
      <LikersSheet
        photoId={likersPhotoId}
        likeCount={photos.find((p) => p.id === likersPhotoId)?.like_count ?? 0}
        onClose={() => setLikersPhotoId(null)}
      />
    </div>
  );
}
