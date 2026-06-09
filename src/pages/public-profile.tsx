import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import type { User, Photo, FriendUser } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { useBackButton } from "../lib/use-back-button";
import { getTrustLevel } from "../lib/trust-levels";
import TrustBadge from "../components/trust-badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Grid3x3, Users, Heart, UserPlus, UserCheck, UserX, Clock,
  X, Loader2, ChevronLeft, ChevronRight, Edit3, Award,
  MessageCircle, ArrowLeft, ShieldBan, ShieldOff, Eye, MoreVertical, Flag, CalendarDays,
  PartyPopper, Flame, Crown, Trophy, Star, Shield, Check, BarChart3, Pin, ChevronDown, Share2
} from "lucide-react";
import ReportModal from "../components/ReportModal";
import LikersSheet from "../components/LikersSheet";
import { Share } from "@capacitor/share";
import { isNative } from "../lib/capacitor";

type FriendStatus = "none" | "pending" | "accepted";
type FriendDir = "incoming" | "outgoing" | null;

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

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: me } = useAuth();
  const isOwnProfile = !!(me && me.id === userId);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const feedPhotoRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"photos" | "ratings" | "friends">("photos");

  // Photos
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosTotal, setPhotosTotal] = useState(0);
  const [photosPage, setPhotosPage] = useState(1);
  const [photosLoading, setPhotosLoading] = useState(true);

  // Feed view (Instagram-style)
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
  const viewedPhotoIds = useRef<Set<string>>(new Set());
  const [storyEventId, setStoryEventId] = useState<string | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [likersPhotoId, setLikersPhotoId] = useState<string | null>(null);

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

  // Ratings
  const [ratingHistory, setRatingHistory] = useState<Array<{ event_id: string; event_title: string; event_date: string; avg_score: number; total_votes: number; user_voted: boolean }>>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  // Friends
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [friendDir, setFriendDir] = useState<FriendDir>(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [mutualFriends, setMutualFriends] = useState<FriendUser[]>([]);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendsTotal, setFriendsTotal] = useState(0);
  const [friendsPage, setFriendsPage] = useState(1);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [showUnfriendMenu, setShowUnfriendMenu] = useState(false);
  const unfriendRef = useRef<HTMLDivElement>(null);

  // Block
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [unfriendConfirm, setUnfriendConfirm] = useState(false);
  const [deleteCommentConfirmId, setDeleteCommentConfirmId] = useState<string | null>(null);

  // Report
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Android back button: close overlays in reverse z-index order
  useBackButton(!!storyEventId, useCallback(() => { setStoryEventId(null); setStoryIndex(0); }, []));
  useBackButton(!storyEventId && activeCommentPhotoId !== null, useCallback(() => { setActiveCommentPhotoId(null); setComments([]); setReplyingTo(null); setExpandedReplies(new Set()); setNewComment(""); setCommentError(""); }, []));
  useBackButton(!storyEventId && activeCommentPhotoId === null && feedStartIndex !== null, useCallback(() => { setFeedStartIndex(null); setActiveCommentPhotoId(null); setComments([]); setReplyingTo(null); setExpandedReplies(new Set()); setNewComment(""); setCommentError(""); }, []));
  useBackButton(showBlockConfirm, useCallback(() => setShowBlockConfirm(false), []));
  useBackButton(showReportModal, useCallback(() => setShowReportModal(false), []));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (unfriendRef.current && !unfriendRef.current.contains(e.target as Node)) setShowUnfriendMenu(false);
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setShowMoreMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadProfile = useCallback(async () => {
    try { const res = await api.get(`/users/${userId}`); setProfile(res.data.data.user); }
    catch (error) { console.error("Failed to load public profile:", getApiErrorMessage(error, "Unknown public profile error")); }
    finally { setLoading(false); }

    try { const countRes = await api.get(`/friends/${userId}/list?limit=1`); setFriendCount(countRes.data.data.total); }
    catch (error) { console.error("Failed to load friend count:", getApiErrorMessage(error, "Unknown friend count error")); }

    if (me && !isOwnProfile) {
      try {
        const [statusRes, mutualRes] = await Promise.all([api.get(`/friends/${userId}/status`), api.get(`/friends/${userId}/mutual`)]);
        const { status, direction } = statusRes.data.data;
        setFriendStatus(status || "none"); setFriendDir(direction || null);
        setMutualFriends(mutualRes.data.data.mutuals || []);
      } catch (error) { console.error("Failed to load friendship state:", getApiErrorMessage(error, "Unknown friendship state error")); }

      try {
        const blockRes = await api.get(`/blocks/${userId}/status`);
        setBlockedByMe(blockRes.data.data.blocked_by_me);
        setBlockedByThem(blockRes.data.data.blocked_by_them);
      } catch (error) { console.error("Failed to load block status:", getApiErrorMessage(error, "Unknown block status error")); }
    }
  }, [isOwnProfile, me, userId]);

  const loadPhotos = useCallback(async () => {
    setPhotosLoading(true);
    try {
      const res = await api.get(`/users/${userId}/photos?page=${photosPage}&limit=36`);
      const loadedPhotos: Photo[] = res.data.data.photos;
      setPhotos(loadedPhotos);
      setPhotosTotal(res.data.data.total);
      const uniqueEventIds = Array.from(new Set(loadedPhotos.map((p) => p.event_id).filter((pid): pid is string => Boolean(pid))));
      if (uniqueEventIds.length > 0) {
        const titleEntries = await Promise.all(uniqueEventIds.map(async (id) => {
          try { const eventRes = await api.get(`/events/${id}`); return [id, eventRes.data.data.event?.title || "Event"] as const; }
          catch { return [id, "Event"] as const; }
        }));
        setEventTitles((prev) => ({ ...prev, ...Object.fromEntries(titleEntries) }));
      }
    }
    catch (error) { console.error("Failed to load public photos:", getApiErrorMessage(error, "Unknown public photos error")); }
    finally { setPhotosLoading(false); }
  }, [photosPage, userId]);

  const loadRatings = useCallback(async () => {
    try { const res = await api.get(`/users/${userId}/ratings`); setRatingHistory(res.data.data.history || []); }
    catch (error) { console.error("Failed to load public ratings:", getApiErrorMessage(error, "Unknown public ratings error")); }
    finally { setRatingsLoading(false); }
  }, [userId]);

  const loadFriendsList = useCallback(async () => {
    setFriendsLoading(true);
    try { const res = await api.get(`/friends/${userId}/list?page=${friendsPage}&limit=20`); setFriends(res.data.data.friends); setFriendsTotal(res.data.data.total); }
    catch (error) { console.error("Failed to load public friends list:", getApiErrorMessage(error, "Unknown public friends list error")); }
    finally { setFriendsLoading(false); }
  }, [friendsPage, userId]);

  useEffect(() => { if (userId) { setLoading(true); setPhotosPage(1); setFriendsPage(1); setTab("photos"); loadProfile(); } }, [loadProfile, userId]);
  useEffect(() => { if (userId) loadPhotos(); }, [loadPhotos, userId]);
  useEffect(() => {
    feedPhotoRefs.current = feedPhotoRefs.current.slice(0, photos.length);
  }, [photos.length, photosPage]);
  useEffect(() => { if (userId && tab === "ratings") loadRatings(); if (userId && tab === "friends") loadFriendsList(); }, [loadFriendsList, loadRatings, tab, userId]);
  useEffect(() => { if (userId && tab === "friends") loadFriendsList(); }, [friendsPage, loadFriendsList, tab, userId]);

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
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  }

  async function handleAddFriend() {
    if (!userId || friendLoading) return;
    setFriendLoading(true);
    try {
      const res = await api.post(`/friends/${userId}`);
      const newStatus = res.data.data.friendship?.status === "accepted" ? "accepted" : "pending";
      setFriendStatus(newStatus); setFriendDir("outgoing");
      if (newStatus === "accepted") setFriendCount((c) => c + 1);
    } catch (error) { console.error("Failed to add friend:", getApiErrorMessage(error, "Unknown add friend error")); }
    finally { setFriendLoading(false); }
  }

  async function handleAcceptFriend() {
    if (!userId || friendLoading) return;
    setFriendLoading(true);
    try { await api.patch(`/friends/${userId}/accept`); setFriendStatus("accepted"); setFriendDir(null); setFriendCount((c) => c + 1); }
    catch (error) { console.error("Failed to accept friend request:", getApiErrorMessage(error, "Unknown accept friend error")); }
    finally { setFriendLoading(false); }
  }

  async function handleDeclineFriend() {
    if (!userId || friendLoading) return;
    setFriendLoading(true);
    try { await api.patch(`/friends/${userId}/reject`); setFriendStatus("none"); setFriendDir(null); }
    catch (error) { console.error("Failed to reject friend request:", getApiErrorMessage(error, "Unknown reject friend error")); }
    finally { setFriendLoading(false); }
  }

  async function handleUnfriend() {
    if (!userId || friendLoading) return;
    setFriendLoading(true); setShowUnfriendMenu(false);
    try { await api.delete(`/friends/${userId}`); setFriendStatus("none"); setFriendDir(null); setFriendCount((c) => Math.max(0, c - 1)); }
    catch (error) { console.error("Failed to unfriend user:", getApiErrorMessage(error, "Unknown unfriend error")); }
    finally { setFriendLoading(false); }
  }

  async function handleCancelRequest() {
    if (!userId || friendLoading) return;
    setFriendLoading(true);
    try { await api.delete(`/friends/${userId}`); setFriendStatus("none"); setFriendDir(null); }
    catch (error) { console.error("Failed to cancel friend request:", getApiErrorMessage(error, "Unknown cancel friend request error")); }
    finally { setFriendLoading(false); }
  }

  async function handleBlock() {
    if (!userId || blockLoading) return;
    setBlockLoading(true);
    try {
      await api.post(`/blocks/${userId}`);
      setBlockedByMe(true);
      setFriendStatus("none");
      setFriendDir(null);
      setShowBlockConfirm(false);
      setShowUnfriendMenu(false);
    } catch (error) { console.error("Failed to block user:", getApiErrorMessage(error, "Unknown block error")); }
    finally { setBlockLoading(false); }
  }

  async function handleUnblock() {
    if (!userId || blockLoading) return;
    setBlockLoading(true);
    try {
      await api.delete(`/blocks/${userId}`);
      setBlockedByMe(false);
    } catch (error) { console.error("Failed to unblock user:", getApiErrorMessage(error, "Unknown unblock error")); }
    finally { setBlockLoading(false); }
  }

  // Comments
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

  // Keyboard: Escape closes story/feed
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

  const activeEventIndex = storyEventId
    ? pastEventReels.findIndex((event) => event.eventId === storyEventId)
    : -1;
  const storyPhotos = activeEventIndex >= 0 ? pastEventReels[activeEventIndex].slides : [];

  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  if (!profile) {
    return <div className="min-h-screen bg-bg flex items-center justify-center"><p className="text-error text-lg font-semibold">User not found</p></div>;
  }

  const ratingVal = Number(profile.social_rating);
  const hasEnoughRatings = profile.total_ratings >= 3;
  const trustLevel = getTrustLevel(ratingVal, profile.total_ratings);
  const photoPages = Math.ceil(photosTotal / 36);
  const friendPages = Math.ceil(friendsTotal / 20);
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  const profilePhotos = photos.filter((photo) => !photo.event_id);

  // -- Public achievements (same unlock logic as own profile) --
  const achievements = [
    { id: "first-event", icon: PartyPopper, name: "First Event", desc: "Attend your first event", earned: profile.events_attended >= 1, color: "#F59E0B" },
    { id: "weekend-warrior", icon: Flame, name: "Weekend Warrior", desc: "Attend 5+ events", earned: profile.events_attended >= 5, color: "#F97316" },
    { id: "event-animal", icon: Flame, name: "Event Animal", desc: "Attend 10+ events", earned: profile.events_attended >= 10, color: "#EF4444" },
    { id: "host-debut", icon: Crown, name: "Host Debut", desc: "Host your first event", earned: profile.events_hosted >= 1, color: "#D4A853" },
    { id: "super-host", icon: Trophy, name: "Super Host", desc: "Host 5+ events", earned: profile.events_hosted >= 5, color: "#EC4899" },
    { id: "festival-host", icon: Award, name: "Festival Host", desc: "Host 15+ events", earned: profile.events_hosted >= 15, color: "#9B6DFF" },
    { id: "social-spark", icon: Users, name: "Social Spark", desc: "Make 5+ friends", earned: friendCount >= 5, color: "#9B6DFF" },
    { id: "social-butterfly", icon: Users, name: "Social Butterfly", desc: "Make 10+ friends", earned: friendCount >= 10, color: "#7B4FD4" },
    { id: "connector", icon: Heart, name: "Connector", desc: "Make 25+ friends", earned: friendCount >= 25, color: "#14B8A6" },
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
      earned: profile.events_hosted >= 5 && profile.events_attended >= 10 && friendCount >= 10 && profilePhotos.length >= 5,
      color: "#9B6DFF",
    },
  ];
  const earnedAchievements = achievements.filter((a) => a.earned);

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

  function renderFriendButton() {
    if (!me) return null;

    // If I blocked this user, show unblock button
    if (blockedByMe) {
      return (
        <button onClick={handleUnblock} disabled={blockLoading}
          className="bg-error/15 hover:bg-error/25 text-error border border-error/20 text-sm font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 disabled:opacity-50 tap-active">
          {blockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />} Unblock
        </button>
      );
    }

    // If they blocked me, show nothing
    if (blockedByThem) {
      return null;
    }

    if (friendStatus === "accepted") {
      return (
        <div className="relative" ref={unfriendRef}>
          <button onClick={() => setShowUnfriendMenu((v) => !v)} disabled={friendLoading}
            className="bg-success/15 hover:bg-success/25 text-success border border-success/20 text-sm font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 disabled:opacity-50 tap-active">
            <UserCheck className="w-4 h-4" /> Friends <span className="text-success/60 text-xs">?</span>
          </button>
          {showUnfriendMenu && (
            <div className="absolute top-full left-0 mt-1 glass-panel rounded-xl shadow-2xl overflow-hidden z-10 w-44">
              <button onClick={() => setUnfriendConfirm(true)} className="w-full text-left px-4 py-2.5 text-xs text-error hover:bg-error/10 transition flex items-center gap-2">
                <UserX className="w-3.5 h-3.5" /> Unfriend
              </button>
              <button onClick={() => { setShowUnfriendMenu(false); setShowBlockConfirm(true); }} className="w-full text-left px-4 py-2.5 text-xs text-error hover:bg-error/10 transition flex items-center gap-2 border-t border-primary/[0.06]">
                <ShieldBan className="w-3.5 h-3.5" /> Block
              </button>
            </div>
          )}
        </div>
      );
    }

    if (friendStatus === "pending" && friendDir === "outgoing") {
      return (
        <button onClick={handleCancelRequest} disabled={friendLoading}
          className="bg-surface-light hover:bg-error/10 text-text-muted hover:text-error border border-primary/[0.08] hover:border-error/20 text-sm font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50 flex items-center gap-2 tap-active">
          <Clock className="w-4 h-4" /> {friendLoading ? "..." : "Request Sent"}
        </button>
      );
    }

    if (friendStatus === "pending" && friendDir === "incoming") {
      return (
        <div className="flex gap-2">
          <button onClick={handleAcceptFriend} disabled={friendLoading}
            className="flex-1 bg-success/15 hover:bg-success/25 text-success border border-success/20 text-sm font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 tap-active">
            <UserCheck className="w-4 h-4" /> Accept
          </button>
          <button onClick={handleDeclineFriend} disabled={friendLoading}
            className="flex-1 bg-error/10 hover:bg-error/20 text-error border border-error/15 text-sm font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 tap-active">
            <UserX className="w-4 h-4" /> Decline
          </button>
        </div>
      );
    }

    return (
      <button onClick={handleAddFriend} disabled={friendLoading}
        className="btn-primary-luxe text-sm font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50 flex items-center gap-2 tap-active">
        <UserPlus className="w-4 h-4" /> {friendLoading ? "..." : "Add Friend"}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">

      <div className="max-w-2xl mx-auto px-4 pt-4 relative z-10">

        {/* PROFILE HEADER CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel rounded-3xl overflow-hidden shadow-2xl"
          style={{ boxShadow: `0 8px 48px ${trustLevel.color}18, 0 2px 16px rgba(0,0,0,0.3)` }}
        >
          {/* -- Card-internal gradient strip (replaces the wasted hero space) -- */}
          <div className="relative h-28 overflow-hidden">
            {/* Banner image or gradient fallback */}
            {profile.banner_url ? (
              <img src={profile.banner_url} alt="Profile banner" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${trustLevel.color}30 0%, var(--color-primary)/20 50%, var(--color-accent)/10 100%)` }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg/80" />
            {/* Ambient glow orbs — only when no banner image */}
            {!profile.banner_url && (
              <>
                <div className="absolute -top-4 right-6 w-32 h-32 rounded-full blur-3xl opacity-50" style={{ backgroundColor: trustLevel.color }} />
                <div className="absolute top-2 left-1/3 w-20 h-20 rounded-full blur-2xl opacity-30 bg-accent" />
              </>
            )}
            {/* More / Edit button pinned to top-right */}
            <div className="absolute top-3 right-3">
              {isOwnProfile && (
                <Link to="/profile/me" className="btn-secondary-luxe text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 tap-active backdrop-blur-sm">
                  <Edit3 className="w-3 h-3" /> Edit
                </Link>
              )}
              {!isOwnProfile && me && !blockedByMe && !blockedByThem && (
                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setShowMoreMenu((v) => !v)}
                    className="w-8 h-8 rounded-xl bg-bg/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition tap-active"
                    aria-label="More options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute top-full right-0 mt-1 glass-panel rounded-xl shadow-2xl overflow-hidden z-20 w-44">
                      <button
                        onClick={() => { setShowMoreMenu(false); setShowReportModal(true); }}
                        className="w-full text-left px-4 py-2.5 text-xs text-warning hover:bg-warning/10 transition flex items-center gap-2"
                      >
                        <Flag className="w-3.5 h-3.5" /> Report User
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="px-5 pb-6 sm:px-6 sm:pb-7">
            {/* Avatar — overlaps the gradient strip */}
            <div className="relative -mt-12 mb-4">
              <div
                className="w-24 h-24 rounded-2xl p-[3.5px] shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${trustLevel.color}, var(--color-primary), var(--color-accent))`,
                  boxShadow: `0 8px 40px ${trustLevel.color}50, 0 2px 12px rgba(0,0,0,0.4)`,
                }}
              >
                <div className="w-full h-full rounded-[13px] bg-bg overflow-hidden border-[3px] border-bg">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-text font-bold bg-gradient-to-br from-surface to-surface-light">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Name + username */}
            <h1 className="text-xl font-extrabold text-text tracking-tight leading-tight">{profile.display_name}</h1>
            <p className="text-text-muted text-xs mt-0.5">@{profile.username}</p>

            {/* Trust badge + member since on one line */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{ color: trustLevel.color, backgroundColor: `${trustLevel.color}18` }}
              >
                <Shield className="w-2.5 h-2.5" /> {trustLevel.name}
              </span>
              <span className="text-text-dim text-[11px]">Since {memberSince}</span>
              {!isOwnProfile && mutualFriends.length > 0 && (
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1">
                    {mutualFriends.slice(0, 3).map((f) => (
                      <div key={f.id} className="w-4 h-4 rounded-full border border-surface bg-gradient-to-br from-primary to-accent overflow-hidden shrink-0 flex items-center justify-center text-[7px] text-white font-bold">
                        {f.avatar_url ? <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" /> : f.display_name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>
                  <span className="text-text-dim text-[10px] font-medium">{mutualFriends.length} mutual</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-text-muted/80 text-sm mt-3 leading-relaxed">{profile.bio}</p>
            )}

            {/* Friend action button */}
            {!isOwnProfile && me && (
              <div className="mt-4">
                {renderFriendButton()}
              </div>
            )}

            {/* STATS ROW */}
            <div className="grid grid-cols-5 gap-1 mt-5 pt-5 border-t border-primary/[0.06]">
              {[
                { label: "Posts", value: photosTotal, color: "text-text" },
                { label: "Friends", value: friendCount, color: "text-text" },
                { label: "Hosted", value: profile.events_hosted, color: "text-accent" },
                { label: "Joined", value: profile.events_attended, color: "text-primary" },
              ].map((stat) => (
                <div key={stat.label} className="text-center py-2 rounded-xl hover:bg-primary/[0.03] transition">
                  <div className={`text-base sm:text-lg font-bold ${stat.color} flex items-center justify-center gap-0.5`}>
                    {stat.value}
                  </div>
                  <div className="text-[8px] sm:text-[10px] text-text-dim uppercase tracking-wider font-bold mt-0.5">{stat.label}</div>
                </div>
              ))}
              <div className="text-center py-2 rounded-xl hover:bg-primary/[0.03] transition flex flex-col items-center justify-center">
                <TrustBadge rating={ratingVal} totalEvents={profile.total_ratings} size="sm" showLabel={false} />
                <div className="text-[8px] sm:text-[10px] uppercase tracking-wider font-bold mt-0.5" style={{ color: trustLevel.color }}>{trustLevel.name}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ACHIEVEMENTS */}
        {!blockedByMe && !blockedByThem && achievements.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-bold flex items-center gap-1.5">
                <Trophy className="w-3 h-3" /> Achievements
              </p>
              <span className="text-[10px] text-text-dim font-semibold">
                {earnedAchievements.length}/{achievements.length}
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {achievements.map((a) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`shrink-0 flex flex-col items-center gap-1.5 transition ${
                    a.earned ? "" : "opacity-25 grayscale"
                  }`}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
                    style={a.earned ? {
                      backgroundColor: `${a.color}15`,
                      boxShadow: `0 0 24px ${a.color}20`,
                    } : { backgroundColor: "var(--color-surface-light)" }}
                    title={a.desc}
                  >
                    <a.icon className="w-6 h-6" style={a.earned ? { color: a.color } : {}} />
                    {a.earned && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-success flex items-center justify-center shadow-sm ring-1 ring-bg/70">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-text-dim max-w-[64px] truncate text-center" title={a.desc}>
                    {a.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* TAB BAR */}
        {!blockedByMe && !blockedByThem && (
        <div className="flex border-b border-primary/[0.06] mt-5">
          {([
            { key: "photos" as const, icon: Grid3x3, label: "Posts" },
            { key: "ratings" as const, icon: Award, label: "Ratings" },
            { key: "friends" as const, icon: Users, label: "Friends" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 transition flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider tap-active relative ${
                tab === t.key ? "text-text" : "text-text-dim hover:text-text"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {tab === t.key && (
                <motion.div layoutId="public-profile-tab-indicator" className="absolute bottom-0 left-[20%] right-[20%] h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
        )}

        {/* TAB CONTENT */}
        {!blockedByMe && !blockedByThem && (
        <div className="mt-4">

          {/* PHOTOS TAB */}
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
                        <button key={event.eventId} onClick={() => { setStoryEventId(event.eventId); setStoryIndex(0); }}
                          className="shrink-0 flex flex-col items-center gap-1.5 group tap-active" title={event.title}>
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

              {photosLoading ? (
                <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="aspect-square shimmer" />
                  ))}
                </div>
              ) : photos.length === 0 ? (
                <div className="text-center py-16 glass-panel rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-surface-light mx-auto mb-3 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-text-dim/30" />
                  </div>
                  <p className="text-text-dim font-semibold">No posts yet</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-[2px] sm:gap-1 rounded-xl overflow-hidden">
                    {photos.map((photo, idx) => (
                      <div key={photo.id} className="aspect-square bg-surface overflow-hidden cursor-pointer group relative tap-active"
                        onClick={() => setFeedStartIndex(idx)}>
                        <img src={photo.image_url} alt={photo.caption || "Photo"} className="w-full h-full object-cover transition group-hover:scale-105 duration-300" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex gap-4">
                            <span className="text-white text-sm font-bold flex items-center gap-1"><Heart className="w-4 h-4 fill-white" /> {photo.like_count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {photoPages > 1 && (
                    <div className="flex justify-center items-center gap-3 mt-6">
                      <button onClick={() => setPhotosPage((p) => Math.max(1, p - 1))} disabled={photosPage === 1} className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30 tap-active" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                      <span className="text-text-muted text-sm font-semibold tabular-nums">{photosPage} / {photoPages}</span>
                      <button onClick={() => setPhotosPage((p) => Math.min(photoPages, p + 1))} disabled={photosPage === photoPages} className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30 tap-active" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* RATINGS TAB */}
          {tab === "ratings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* Trust level summary card */}
              <div className="glass-panel rounded-2xl p-5 mb-4 flex items-center gap-4">
                <TrustBadge rating={ratingVal} totalEvents={profile.total_ratings} size="lg" showLabel={false} />
                <div>
                  <div className="text-lg font-extrabold" style={{ color: trustLevel.color }}>{trustLevel.name}</div>
                  <p className="text-text-dim text-xs">
                    {hasEnoughRatings
                      ? `${ratingVal.toFixed(1)}/5 avg across ${profile.total_ratings} ${profile.total_ratings === 1 ? "event" : "events"}`
                      : "Not enough ratings yet"}
                  </p>
                </div>
              </div>

              {ratingsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass-panel rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full shimmer" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 shimmer rounded-lg w-28" />
                          <div className="h-3 shimmer rounded-lg w-20" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : ratingHistory.length === 0 ? (
                <div className="text-center py-16 glass-panel rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-surface-light mx-auto mb-3 flex items-center justify-center">
                    <Award className="w-7 h-7 text-text-dim/30" />
                  </div>
                  <p className="text-text-dim font-semibold">No crowd ratings yet</p>
                  <p className="text-text-dim/60 text-sm mt-1">Ratings appear after attending events</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ratingHistory.map((entry, i) => {
                    const entryTrust = getTrustLevel(entry.avg_score, 1);
                    return (
                      <motion.div key={entry.event_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.25) }}>
                        <Link to={`/events/${entry.event_id}`} className="glass-panel rounded-2xl p-4 flex items-center gap-3 hover:border-primary/15 transition tap-active block">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: entryTrust.color + '20', color: entryTrust.color }}>
                            {entry.avg_score.toFixed(1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-text font-bold text-sm truncate">{entry.event_title}</p>
                            <p className="text-text-dim text-[10px]">{timeAgo(entry.event_date)} · {entry.total_votes} {entry.total_votes === 1 ? "vote" : "votes"}</p>
                          </div>
                          <span className="text-[10px] font-bold shrink-0" style={{ color: entryTrust.color }}>{entryTrust.name}</span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* FRIENDS TAB */}
          {tab === "friends" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* Mutual friends section */}
              {!isOwnProfile && mutualFriends.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    {mutualFriends.length} Mutual {mutualFriends.length === 1 ? "Friend" : "Friends"}
                  </h3>
                  <div className="space-y-2">
                    {mutualFriends.map((f) => (
                      <Link key={f.id} to={`/profile/${f.id}`} className="glass-panel rounded-2xl p-4 flex items-center gap-3 hover:border-primary/15 transition tap-active block">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] shrink-0">
                          <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-text font-bold text-sm">
                            {f.avatar_url ? <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" /> : f.display_name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text font-bold text-sm truncate">{f.display_name}</p>
                          <p className="text-text-muted text-xs">@{f.username}</p>
                        </div>
                        <div className="text-xs font-bold shrink-0" style={{ color: getTrustLevel(Number(f.social_rating), 1).color }}>
                          {getTrustLevel(Number(f.social_rating), 1).name}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* All friends */}
              {friendsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full shimmer" />
                      <div className="flex-1 space-y-2"><div className="h-3.5 shimmer rounded-lg w-24" /><div className="h-3 shimmer rounded-lg w-16" /></div>
                    </div>
                  ))}
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-16 glass-panel rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-surface-light mx-auto mb-3 flex items-center justify-center">
                    <Users className="w-7 h-7 text-text-dim/30" />
                  </div>
                  <p className="text-text-dim font-semibold">No friends yet</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {friends.map((f, i) => (
                      <motion.div key={f.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.03, 0.2) }}>
                        <Link to={`/profile/${f.id}`} className="glass-panel rounded-2xl p-4 flex items-center gap-3 hover:border-primary/15 transition tap-active block">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] shrink-0">
                            <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-text font-bold text-sm">
                              {f.avatar_url ? <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" /> : f.display_name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-text font-bold text-sm truncate">{f.display_name}</p>
                            <p className="text-text-muted text-xs">@{f.username}</p>
                          </div>
                          <div className="text-xs font-bold shrink-0" style={{ color: getTrustLevel(Number(f.social_rating), 1).color }}>
                            {getTrustLevel(Number(f.social_rating), 1).name}
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                  {friendPages > 1 && (
                    <div className="flex justify-center items-center gap-3 mt-6">
                      <button onClick={() => setFriendsPage((p) => Math.max(1, p - 1))} disabled={friendsPage === 1} className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30 tap-active" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                      <span className="text-text-muted text-sm font-semibold tabular-nums">{friendsPage} / {friendPages}</span>
                      <button onClick={() => setFriendsPage((p) => Math.min(friendPages, p + 1))} disabled={friendsPage === friendPages} className="btn-secondary-luxe p-2.5 rounded-xl disabled:opacity-30 tap-active" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </div>
        )}
      </div>

      {/* BLOCKED BANNER */}
      {blockedByThem && !isOwnProfile && me && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <div className="glass-panel rounded-2xl p-5 text-center border border-error/10">
            <ShieldBan className="w-8 h-8 text-error/50 mx-auto mb-2" />
            <p className="text-text-dim font-semibold text-sm">This content is not available</p>
          </div>
        </div>
      )}

      {blockedByMe && !isOwnProfile && me && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <div className="glass-panel rounded-2xl p-5 text-center border border-error/10">
            <ShieldBan className="w-8 h-8 text-error/40 mx-auto mb-2" />
            <p className="text-text-dim font-semibold text-sm">You have blocked this user</p>
            <p className="text-text-dim/60 text-xs mt-1">Unblock them to see their content</p>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && profile && (
        <ReportModal
          targetType="user"
          targetId={profile.id}
          targetName={profile.display_name}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* BLOCK CONFIRMATION MODAL */}
      <AnimatePresence>
        {showBlockConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
            onClick={() => setShowBlockConfirm(false)}
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
                  <ShieldBan className="w-7 h-7 text-error" />
                </div>
                <h3 className="text-text font-bold text-lg mb-1">Block {profile.display_name}?</h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  They won't be able to find your profile, see your posts, or send you friend requests. Any existing friendship will be removed.
                </p>
              </div>
              <div className="flex border-t border-primary/[0.06]">
                <button onClick={() => setShowBlockConfirm(false)} className="flex-1 py-3.5 text-sm font-semibold text-text-muted hover:bg-surface-light transition tap-active">
                  Cancel
                </button>
                <button onClick={handleBlock} disabled={blockLoading} className="flex-1 py-3.5 text-sm font-bold text-error hover:bg-error/10 transition border-l border-primary/[0.06] tap-active disabled:opacity-50">
                  {blockLoading ? "Blocking…" : "Block"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INSTAGRAM-STYLE SCROLLABLE FEED */}
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
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] shrink-0">
                  <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-[10px] font-bold text-text">
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                      : profile.display_name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <h2 className="font-bold text-text text-sm truncate">{profile.display_name}</h2>
              </div>
            </div>

            {/* Snap-scroll feed */}
            <div ref={feedContainerRef} className="flex-1 overflow-y-auto snap-feed">
              <div className="max-w-lg mx-auto">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    ref={(el) => {
                      feedPhotoRefs.current[idx] = el;
                      if (!el) return;
                      const obs = new IntersectionObserver(([entry]) => {
                        if (entry.isIntersecting && !viewedPhotoIds.current.has(photo.id)) {
                          viewedPhotoIds.current.add(photo.id);
                          api.post(`/photos/${photo.id}/view`).catch(() => {});
                        }
                      }, { threshold: 0.5 });
                      obs.observe(el);
                    }}
                    className="border-b border-primary/[0.06] snap-feed-item"
                  >
                    {/* Post header */}
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] shrink-0">
                        <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-sm font-bold text-text">
                          {profile.avatar_url
                            ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                            : profile.display_name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text text-sm font-bold truncate">{profile.display_name}</p>
                      </div>
                    </div>

                    {/* Image */}
                    <div className="w-full bg-black">
                      <img src={photo.image_url} alt={photo.caption || "Photo"} className="w-full max-h-[70vh] object-contain" loading={idx > 2 ? "lazy" : undefined} />
                    </div>

                    {/* Instagram-style actions & info */}
                    <div className="px-4 pt-3 pb-3">
                      <div className="flex items-center gap-4 mb-2">
                        <button onClick={() => handleLike(photo.id)} className="tap-active" aria-label="Like">
                          <Heart className={`w-6 h-6 transition ${photo.liked_by_me ? "text-hot fill-hot animate-heart-like" : "text-text hover:text-hot"}`} />
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
                      {photo.caption && (
                        <p className="text-text text-sm mt-1">
                          <span className="font-bold">{profile.display_name}</span>{" "}
                          <span className="text-text-muted">{photo.caption}</span>
                        </p>
                      )}
                      <button onClick={() => toggleComments(photo.id)} className="text-text-dim text-sm mt-1 hover:text-text-muted transition block">
                        View all comments
                      </button>
                      {me && (
                        <button onClick={() => toggleComments(photo.id)} className="flex items-center gap-2.5 mt-2 w-full tap-active">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] shrink-0">
                            <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-[8px] font-bold text-text">
                              {me.avatar_url
                                ? <img src={me.avatar_url} alt="" className="w-full h-full object-cover" />
                                : me.display_name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <span className="text-text-dim text-sm">Add a comment…</span>
                        </button>
                      )}
                      {photo.view_count > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-text-dim">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-[11px]">{photo.view_count.toLocaleString()} {photo.view_count === 1 ? "view" : "views"}</span>
                        </div>
                      )}
                      <p className="text-text-dim text-[10px] uppercase mt-2">
                        {new Date(photo.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMMENTS BOTTOM SHEET */}
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
              <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[200px]">
                {commentError && <div className="text-error text-xs bg-error/10 px-3 py-2 rounded-xl mb-3">{commentError}</div>}
                {loadingComments ? (
                  <div className="flex items-center justify-center gap-2 py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /><span className="text-text-muted text-sm">Loading…</span></div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-12">
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
                              {me && me.id === comment.user_id && (
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
                                        {me && me.id === reply.user_id && (
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
              {me && (
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
                        {me.avatar_url ? <img src={me.avatar_url} alt="" className="w-full h-full object-cover" /> : me.display_name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <input type="text" aria-label="Add a comment" placeholder={replyingTo ? `Reply to ${replyingTo.display_name}…` : "Add a comment…"} value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && newComment.trim()) handleAddComment(); }} disabled={postingComment} className="flex-1 bg-transparent text-text text-sm placeholder:text-text-dim outline-none min-w-0 py-2" />
                    <button onClick={handleAddComment} disabled={postingComment || !newComment.trim()} className="text-primary font-bold text-sm disabled:opacity-40 transition tap-active shrink-0" aria-label="Post comment">
                      {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PAST EVENT VIEWER */}
      <AnimatePresence>
        {storyEventId && storyPhotos.length > 0 && (
          <motion.div
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

            {/* Progress bars */}
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
                    {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : profile.display_name.charAt(0).toUpperCase()}
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

      {/* Unfriend Confirmation Modal */}
      <AnimatePresence>
        {unfriendConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
            onClick={() => setUnfriendConfirm(false)}
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
                  <UserX className="w-7 h-7 text-error" />
                </div>
                <h3 className="text-text font-bold text-lg mb-1">Remove Friend?</h3>
                <p className="text-text-muted text-sm leading-relaxed">You'll no longer be friends. You can always send a friend request again later.</p>
              </div>
              <div className="flex border-t border-primary/[0.06]">
                <button onClick={() => setUnfriendConfirm(false)} className="flex-1 py-3.5 text-sm font-semibold text-text-muted hover:bg-surface-light transition tap-active">
                  Cancel
                </button>
                <button
                  onClick={() => { handleUnfriend(); setUnfriendConfirm(false); }}
                  className="flex-1 py-3.5 text-sm font-bold text-error hover:bg-error/10 transition border-l border-primary/[0.06] tap-active"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comment Delete Confirmation (handled inline) */}

      {/* Likers sheet */}
      <LikersSheet
        photoId={likersPhotoId}
        likeCount={photos.find((p) => p.id === likersPhotoId)?.like_count ?? 0}
        onClose={() => setLikersPhotoId(null)}
      />
    </div>
  );
}
