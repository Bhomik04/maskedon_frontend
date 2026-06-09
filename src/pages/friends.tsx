import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { FriendUser, PendingFriendRequest } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserPlus, UserCheck, UserMinus, Clock, Search, Loader2,
  Star, ChevronRight, X, Check, RefreshCw, UserX, AlertCircle,
  Send,
} from "lucide-react";

// --- Types -----------------------------------------------------------------

type Tab = "friends" | "requests" | "sent";

// --- Helpers ---------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function RatingStars({ rating }: { rating: number }) {
  const r = Math.round(rating * 2) / 2;
  return (
    <span className="flex items-center gap-0.5">
      <Star className="w-3 h-3 text-warning fill-warning" />
      <span className="text-[11px] font-bold text-warning">{r.toFixed(1)}</span>
    </span>
  );
}

function Avatar({ src, name, size = "md" }: { src: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-9 h-9 text-xs" : size === "lg" ? "w-14 h-14 text-base" : "w-11 h-11 text-sm";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (src) {
    return <img src={src} alt={name} className={`${sizeClass} rounded-full object-cover ring-2 ring-border shrink-0`} />;
  }
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0`}>
      {initials}
    </div>
  );
}

// --- Friend Card -----------------------------------------------------------

interface FriendCardProps {
  user: FriendUser;
  onUnfriend: (id: string) => void;
  unfriending: boolean;
}

function FriendCard({ user, onUnfriend, unfriending }: FriendCardProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-surface hover:border-border-hover transition-all group"
    >
      <Link to={`/profile/${user.id}`} className="shrink-0">
        <Avatar src={user.avatar_url} name={user.display_name} />
      </Link>

      <Link to={`/profile/${user.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text truncate leading-tight">{user.display_name}</p>
        <p className="text-[11px] text-text-dim truncate">@{user.username}</p>
        {user.social_rating > 0 && (
          <div className="mt-0.5">
            <RatingStars rating={user.social_rating} />
          </div>
        )}
      </Link>

      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          to={`/profile/${user.id}`}
          className="p-2 rounded-xl text-text-dim hover:text-primary hover:bg-primary/10 transition"
          aria-label="View profile"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
        <AnimatePresence mode="wait">
          {confirming ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1"
            >
              <button
                onClick={() => { onUnfriend(user.id); setConfirming(false); }}
                disabled={unfriending}
                className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition flex items-center gap-1"
              >
                {unfriending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3" />}
                Remove
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-[10px] font-bold px-2 py-1.5 rounded-lg text-text-dim hover:bg-surface-light transition"
              >
                Cancel
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="unfriend"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setConfirming(true)}
              className="p-2 rounded-xl text-text-dim/0 group-hover:text-text-dim/40 hover:!text-error hover:bg-error/10 transition"
              aria-label="Remove friend"
            >
              <UserX className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// --- Request Card (incoming) -----------------------------------------------

interface RequestCardProps {
  req: PendingFriendRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  accepting: boolean;
  rejecting: boolean;
}

function RequestCard({ req, onAccept, onReject, accepting, rejecting }: RequestCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="relative flex items-center gap-3 p-3.5 rounded-2xl border border-primary/15 bg-primary/[0.02] hover:border-primary/25 transition-all"
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-primary/60 to-primary/15 rounded-l-2xl" />

      <Link to={`/profile/${req.id}`} className="shrink-0">
        <Avatar src={req.avatar_url} name={req.display_name} />
      </Link>

      <Link to={`/profile/${req.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text truncate leading-tight">{req.display_name}</p>
        <p className="text-[11px] text-text-dim truncate">@{req.username}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {req.social_rating > 0 && <RatingStars rating={req.social_rating} />}
          <span className="flex items-center gap-1 text-[10px] text-text-dim">
            <Clock className="w-2.5 h-2.5" />
            {timeAgo(req.created_at)}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onReject(req.id)}
          disabled={accepting || rejecting}
          aria-label="Decline request"
          className="p-2 rounded-xl border border-border text-text-dim hover:text-error hover:border-error/30 hover:bg-error/10 transition"
        >
          {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onAccept(req.id)}
          disabled={accepting || rejecting}
          aria-label="Accept request"
          className="p-2 rounded-xl bg-success/10 border border-success/20 text-success hover:bg-success/20 transition"
        >
          {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
}

// --- Sent Request Card -----------------------------------------------------

interface SentCardProps {
  req: PendingFriendRequest;
  onCancel: (id: string) => void;
  cancelling: boolean;
}

function SentCard({ req, onCancel, cancelling }: SentCardProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-surface hover:border-border-hover transition-all group"
    >
      <Link to={`/profile/${req.id}`} className="shrink-0">
        <Avatar src={req.avatar_url} name={req.display_name} />
      </Link>

      <Link to={`/profile/${req.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text truncate leading-tight">{req.display_name}</p>
        <p className="text-[11px] text-text-dim truncate">@{req.username}</p>
        <span className="flex items-center gap-1 text-[10px] text-text-dim mt-0.5">
          <Send className="w-2.5 h-2.5" />
          Sent {timeAgo(req.created_at)}
        </span>
      </Link>

      <div className="shrink-0">
        <AnimatePresence mode="wait">
          {confirming ? (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1">
              <button
                onClick={() => { onCancel(req.id); setConfirming(false); }}
                disabled={cancelling}
                className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition flex items-center gap-1"
              >
                {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Cancel
              </button>
              <button onClick={() => setConfirming(false)} className="text-[10px] px-2 py-1.5 rounded-lg text-text-dim hover:bg-surface-light transition">
                Keep
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="withdraw"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setConfirming(true)}
              className="text-[10px] font-semibold px-3 py-1.5 rounded-xl border border-border text-text-dim hover:text-error hover:border-error/30 transition"
            >
              Withdraw
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// --- Suggestion Card -------------------------------------------------------

interface SuggestionCardProps {
  user: FriendUser;
  onAdd: (id: string) => void;
  adding: boolean;
  added: boolean;
}

function SuggestionCard({ user, onAdd, adding, added }: SuggestionCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-surface text-center min-w-[120px] max-w-[140px] shrink-0"
    >
      <Link to={`/profile/${user.id}`}>
        <Avatar src={user.avatar_url} name={user.display_name} size="lg" />
      </Link>
      <div className="w-full">
        <Link to={`/profile/${user.id}`}>
          <p className="text-xs font-bold text-text truncate leading-tight">{user.display_name}</p>
          <p className="text-[10px] text-text-dim truncate">@{user.username}</p>
        </Link>
        {user.social_rating > 0 && (
          <div className="flex justify-center mt-0.5">
            <RatingStars rating={user.social_rating} />
          </div>
        )}
      </div>
      <button
        onClick={() => onAdd(user.id)}
        disabled={adding || added}
        className={`w-full py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
          added
            ? "bg-success/10 text-success border border-success/20 cursor-default"
            : "btn-primary-luxe"
        }`}
      >
        {adding ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : added ? (
          <><Check className="w-3 h-3" /> Sent</>
        ) : (
          <><UserPlus className="w-3 h-3" /> Add</>
        )}
      </button>
    </motion.div>
  );
}

// --- Main Page --------------------------------------------------------------

export default function FriendsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("friends");

  // Data
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incoming, setIncoming] = useState<PendingFriendRequest[]>([]);
  const [sent, setSent] = useState<PendingFriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<FriendUser[]>([]);

  // Loading
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Action state per userId
  const [unfriendingIds, setUnfriendingIds] = useState<Set<string>>(new Set());
  const [acceptingIds, setAcceptingIds] = useState<Set<string>>(new Set());
  const [rejectingIds, setRejectingIds] = useState<Set<string>>(new Set());
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Search
  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const [friendsRes, incomingRes, sentRes, suggestionsRes] = await Promise.all([
        api.get("/friends/me", { params: { limit: 100 } }),
        api.get("/friends/me/pending"),
        api.get("/friends/me/sent"),
        api.get("/friends/me/suggestions"),
      ]);
      setFriends(friendsRes.data.data.friends);
      setIncoming(incomingRes.data.data.requests);
      setSent(sentRes.data.data.requests);
      setSuggestions(suggestionsRes.data.data.suggestions);
    } catch (err) {
      setFetchError(getApiErrorMessage(err, "Failed to load friends"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // -- Filtered friends list ---------------------------------------------
  const filteredFriends = useMemo(() => {
    if (!search.trim()) return friends;
    const q = search.toLowerCase();
    return friends.filter(
      (f) => f.display_name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q)
    );
  }, [friends, search]);

  // -- Actions -----------------------------------------------------------

  async function handleUnfriend(userId: string) {
    setUnfriendingIds((s) => new Set(s).add(userId));
    const prev = [...friends];
    setFriends((f) => f.filter((u) => u.id !== userId));
    try {
      await api.delete(`/friends/${userId}`);
    } catch {
      setFriends(prev);
    } finally {
      setUnfriendingIds((s) => { const n = new Set(s); n.delete(userId); return n; });
    }
  }

  async function handleAccept(userId: string) {
    setAcceptingIds((s) => new Set(s).add(userId));
    const accepted = incoming.find((r) => r.id === userId);
    const prevIncoming = [...incoming];
    setIncoming((r) => r.filter((x) => x.id !== userId));
    try {
      await api.patch(`/friends/${userId}/accept`);
      if (accepted) setFriends((f) => [accepted as unknown as FriendUser, ...f]);
    } catch {
      setIncoming(prevIncoming);
    } finally {
      setAcceptingIds((s) => { const n = new Set(s); n.delete(userId); return n; });
    }
  }

  async function handleReject(userId: string) {
    setRejectingIds((s) => new Set(s).add(userId));
    const prev = [...incoming];
    setIncoming((r) => r.filter((x) => x.id !== userId));
    try {
      await api.patch(`/friends/${userId}/reject`);
    } catch {
      setIncoming(prev);
    } finally {
      setRejectingIds((s) => { const n = new Set(s); n.delete(userId); return n; });
    }
  }

  async function handleCancel(userId: string) {
    setCancellingIds((s) => new Set(s).add(userId));
    const prev = [...sent];
    setSent((r) => r.filter((x) => x.id !== userId));
    try {
      await api.delete(`/friends/${userId}`);
    } catch {
      setSent(prev);
    } finally {
      setCancellingIds((s) => { const n = new Set(s); n.delete(userId); return n; });
    }
  }

  async function handleAdd(userId: string) {
    setAddingIds((s) => new Set(s).add(userId));
    try {
      await api.post(`/friends/${userId}`);
      setAddedIds((s) => new Set(s).add(userId));
      setSuggestions((s) => s.filter((u) => u.id !== userId));
    } catch {
      // ignore — suggestion stays
    } finally {
      setAddingIds((s) => { const n = new Set(s); n.delete(userId); return n; });
    }
  }

  // -- Loading skeleton ---------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-bg pb-28 md:pb-12">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="shimmer h-16 rounded-2xl" />
          <div className="shimmer h-10 rounded-full" />
          <div className="shimmer h-12 rounded-2xl" />
          {[0, 1, 2, 3].map((i) => <div key={i} className="shimmer h-[68px] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count: number }[] = [
    { key: "friends", label: "Friends", icon: UserCheck, count: friends.length },
    { key: "requests", label: "Requests", icon: UserPlus, count: incoming.length },
    { key: "sent", label: "Sent", icon: Send, count: sent.length },
  ];

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12 premium-shell">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">

        {/* -- Header -- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-5"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1">Social</p>
            <h1 className="text-2xl font-bold text-text tracking-tight">Friends</h1>
            <p className="text-text-dim text-xs mt-0.5">
              {friends.length} friend{friends.length !== 1 ? "s" : ""}
              {incoming.length > 0 && ` · ${incoming.length} pending request${incoming.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={fetchAll}
            aria-label="Refresh"
            className="btn-secondary-luxe p-2.5 rounded-xl mt-1"
          >
            <RefreshCw className="w-4 h-4" />
          </motion.button>
        </motion.div>

        {/* -- Error -- */}
        {fetchError && (
          <div className="bg-error/10 border border-error/25 rounded-xl p-3.5 text-error text-sm mb-5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {fetchError}
            </span>
            <button onClick={fetchAll} className="underline font-semibold text-xs whitespace-nowrap">Retry</button>
          </div>
        )}

        {/* -- Incoming requests banner -- */}
        <AnimatePresence>
          {incoming.length > 0 && tab !== "requests" && (
            <motion.button
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onClick={() => setTab("requests")}
              className="w-full mb-4 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <p className="text-primary font-bold text-sm">
                    {incoming.length} friend request{incoming.length !== 1 ? "s" : ""} waiting
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-primary" />
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* -- Tabs -- */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="flex items-center gap-1.5 mb-5"
        >
          {TABS.map(({ key, label, icon: Icon, count }) => {
            const isActive = tab === key;
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.93 }}
                onClick={() => setTab(key)}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                    : "text-text-dim border-border bg-surface hover:text-text hover:border-border-hover"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
                {count > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-surface-light text-text-dim"}`}>
                    {count}
                  </span>
                )}
                {key === "requests" && incoming.length > 0 && !isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-hot border border-bg" />
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* -- Friends Tab -- */}
        <AnimatePresence mode="wait">
          {tab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Search */}
              {friends.length > 0 && (
                <div className="relative mb-4">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search friends…"
                    className="input-luxe w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
                  />
                </div>
              )}

              {/* Friends list */}
              {filteredFriends.length === 0 && friends.length === 0 ? (
                <div className="text-center py-14">
                  <div className="w-14 h-14 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-text-dim" />
                  </div>
                  <p className="text-text font-bold mb-1">No friends yet</p>
                  <p className="text-text-muted text-sm mb-4">Add people to build your social network.</p>
                  <button
                    onClick={() => navigate("/search")}
                    className="btn-primary-luxe px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" /> Find people
                  </button>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-text-muted text-sm">No friends match "{search}"</p>
                </div>
              ) : (
                <div className="space-y-2 mb-6">
                  <AnimatePresence>
                    {filteredFriends.map((f) => (
                      <FriendCard
                        key={f.id}
                        user={f}
                        onUnfriend={handleUnfriend}
                        unfriending={unfriendingIds.has(f.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-6">
                  <div className="mb-3">
                    <p className="text-xs font-bold text-text-dim uppercase tracking-wide">People you may know</p>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    <AnimatePresence>
                      {suggestions.map((s) => (
                        <SuggestionCard
                          key={s.id}
                          user={s}
                          onAdd={handleAdd}
                          adding={addingIds.has(s.id)}
                          added={addedIds.has(s.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* -- Requests Tab -- */}
          {tab === "requests" && (
            <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {incoming.length === 0 ? (
                <div className="text-center py-14">
                  <div className="w-14 h-14 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-6 h-6 text-text-dim" />
                  </div>
                  <p className="text-text font-bold mb-1">No pending requests</p>
                  <p className="text-text-muted text-sm">Friend requests you receive will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2 relative">
                  <AnimatePresence>
                    {incoming.map((req) => (
                      <RequestCard
                        key={req.id}
                        req={req}
                        onAccept={handleAccept}
                        onReject={handleReject}
                        accepting={acceptingIds.has(req.id)}
                        rejecting={rejectingIds.has(req.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {/* -- Sent Tab -- */}
          {tab === "sent" && (
            <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {sent.length === 0 ? (
                <div className="text-center py-14">
                  <div className="w-14 h-14 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-4">
                    <Send className="w-6 h-6 text-text-dim" />
                  </div>
                  <p className="text-text font-bold mb-1">No sent requests</p>
                  <p className="text-text-muted text-sm">Friend requests you send will appear here until accepted.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {sent.map((req) => (
                      <SentCard
                        key={req.id}
                        req={req}
                        onCancel={handleCancel}
                        cancelling={cancellingIds.has(req.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
