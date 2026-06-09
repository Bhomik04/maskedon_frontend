import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { Notification } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, CheckCheck, PartyPopper, UserPlus, Star, Heart,
  MessageCircle, Loader2, Trash2, X, ChevronRight,
  Ticket, Users, AlertCircle, RefreshCw, BellOff,
} from "lucide-react";

// --- Types -----------------------------------------------------------------

type FilterTab = "all" | "requests" | "social" | "events";

interface NotifConfig {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  ringClass: string;
  bgClass: string;
  barClass: string;
  label: string;
}

// --- Notification type config -----------------------------------------------

const TYPE_CONFIG: Record<string, NotifConfig> = {
  join_request: {
    icon: Users,
    iconClass: "text-accent",
    ringClass: "ring-accent/25",
    bgClass: "bg-accent/10",
    barClass: "from-accent/60 to-accent/15",
    label: "Join Request",
  },
  request_approved: {
    icon: PartyPopper,
    iconClass: "text-success",
    ringClass: "ring-success/25",
    bgClass: "bg-success/10",
    barClass: "from-success/70 to-success/15",
    label: "Approved",
  },
  request_rejected: {
    icon: X,
    iconClass: "text-error",
    ringClass: "ring-error/25",
    bgClass: "bg-error/10",
    barClass: "from-error/50 to-error/10",
    label: "Rejected",
  },
  new_rating: {
    icon: Star,
    iconClass: "text-warning",
    ringClass: "ring-warning/25",
    bgClass: "bg-warning/10",
    barClass: "from-warning/60 to-warning/15",
    label: "Rating",
  },
  photo_liked: {
    icon: Heart,
    iconClass: "text-hot",
    ringClass: "ring-hot/25",
    bgClass: "bg-hot/10",
    barClass: "from-hot/60 to-hot/15",
    label: "Photo Like",
  },
  photo_commented: {
    icon: MessageCircle,
    iconClass: "text-accent",
    ringClass: "ring-accent/25",
    bgClass: "bg-accent/10",
    barClass: "from-accent/50 to-accent/10",
    label: "Comment",
  },
  friend_request: {
    icon: UserPlus,
    iconClass: "text-primary",
    ringClass: "ring-primary/25",
    bgClass: "bg-primary/10",
    barClass: "from-primary/60 to-primary/15",
    label: "Friend Request",
  },
  friend_accepted: {
    icon: UserPlus,
    iconClass: "text-success",
    ringClass: "ring-success/25",
    bgClass: "bg-success/10",
    barClass: "from-success/60 to-success/15",
    label: "Friend Accepted",
  },
  payment_confirmed: {
    icon: Ticket,
    iconClass: "text-hot",
    ringClass: "ring-hot/25",
    bgClass: "bg-hot/10",
    barClass: "from-hot/50 to-hot/10",
    label: "Payment",
  },
  message: {
    icon: MessageCircle,
    iconClass: "text-primary",
    ringClass: "ring-primary/25",
    bgClass: "bg-primary/10",
    barClass: "from-primary/60 to-primary/15",
    label: "Message",
  },
  announcement: {
    icon: PartyPopper,
    iconClass: "text-accent",
    ringClass: "ring-accent/25",
    bgClass: "bg-accent/10",
    barClass: "from-accent/60 to-accent/15",
    label: "Announcement",
  },
};

const DEFAULT_CONFIG: NotifConfig = {
  icon: Bell,
  iconClass: "text-primary",
  ringClass: "ring-primary/20",
  bgClass: "bg-primary/10",
  barClass: "from-primary/50 to-primary/10",
  label: "Notification",
};

const TAB_TYPES: Record<FilterTab, string[]> = {
  all: [],
  requests: ["join_request", "request_approved", "request_rejected"],
  social: ["friend_request", "friend_accepted", "photo_liked", "photo_commented", "new_rating", "message"],
  events: ["payment_confirmed", "announcement"],
};

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

function getGroupLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  if (diffDays < 30) return "This Month";
  return "Earlier";
}

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "This Month", "Earlier"];

function getNotifLink(n: Notification): string | null {
  const { type, reference_type, reference_id } = n;
  if (type === "friend_request" && reference_id) return `/profile/${reference_id}`;
  if (type === "friend_accepted" && reference_id) return `/profile/${reference_id}`;
  if (type === "new_rating") return "/profile/me";
  if ((type === "photo_liked" || type === "photo_commented") && reference_id) return `/photos/${reference_id}`;
  if (type === "message" && reference_id) return `/messages/${reference_id}`;
  if (type === "announcement" && reference_id) return `/events/${reference_id}`;
  if (reference_type === "event" && reference_id) {
    if (type === "join_request") return `/dashboard/${reference_id}/requests`;
    return `/events/${reference_id}`;
  }
  return null;
}

// --- Single Notification Card -----------------------------------------------

interface NotifCardProps {
  n: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
  navigate: (path: string) => void;
}

function NotifCard({ n, onRead, onDelete, deleting, navigate }: NotifCardProps) {
  const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CONFIG;
  const Icon = cfg.icon;
  const link = getNotifLink(n);
  const isUnread = !n.is_read;

  function handleClick() {
    if (isUnread) onRead(n.id);
    if (link) navigate(link);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={`relative overflow-hidden rounded-2xl border transition-all group ${
        isUnread
          ? "border-primary/20 bg-primary/[0.025] shadow-sm shadow-primary/10"
          : "border-border bg-surface"
      }`}
    >
      {/* Left accent bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${cfg.barClass} rounded-l-2xl transition-opacity ${isUnread ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`}
      />

      <div className="flex items-start gap-3 p-4 pl-5">
        {/* Icon */}
        <div
          className={`shrink-0 w-10 h-10 rounded-xl ${cfg.bgClass} flex items-center justify-center ring-1 ${cfg.ringClass} transition-transform group-hover:scale-105`}
        >
          <Icon className={`w-5 h-5 ${cfg.iconClass}`} />
        </div>

        {/* Content */}
        <button
          onClick={handleClick}
          disabled={!link && !isUnread}
          className={`flex-1 min-w-0 text-left ${link ? "cursor-pointer" : "cursor-default"}`}
        >
          <div className="flex items-center gap-2 mb-0.5">
            {isUnread && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
            <p className={`text-sm leading-snug ${isUnread ? "text-text font-bold" : "text-text-muted font-medium"} truncate`}>
              {n.title}
            </p>
          </div>
          {n.body && (
            <p className="text-text-dim text-xs leading-relaxed line-clamp-2 mt-0.5">
              {n.body}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${cfg.bgClass} ${cfg.iconClass}`}>
              {cfg.label}
            </span>
            <span className="text-[10px] text-text-dim font-medium">{timeAgo(n.created_at)}</span>
          </div>
        </button>

        {/* Right area: arrow + delete */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {link && (
            <button
              onClick={handleClick}
              className="p-1 rounded-lg hover:bg-surface-light transition text-text-dim/40 hover:text-primary"
              aria-label="Open"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
            disabled={deleting}
            aria-label="Delete notification"
            className="p-1 rounded-lg text-text-dim/0 group-hover:text-text-dim/40 hover:!text-error hover:bg-error/10 transition"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// --- Main Page --------------------------------------------------------------

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [clearingAll, setClearingAll] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const limit = 20;

  // -- Fetch -------------------------------------------------------------
  const fetchPage = useCallback(async (pageNum: number, replace = false) => {
    if (pageNum === 1) replace = true;
    setFetchError("");
    if (pageNum > 1) setLoadingMore(true);
    try {
      const res = await api.get("/notifications", { params: { page: pageNum, limit } });
      const data = res.data.data;
      const fetched: Notification[] = data.notifications;
      setNotifications((prev) => replace ? fetched : [...prev, ...fetched]);
      setTotal(data.total);
      setUnread(data.unread);
      setHasMore(pageNum * limit < data.total);
    } catch (err) {
      setFetchError(getApiErrorMessage(err, "Failed to load notifications"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [limit]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  // -- Infinite scroll ----------------------------------------------------
  useEffect(() => {
    if (!bottomRef.current || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPage(nextPage);
        }
      },
      { rootMargin: "120px" }
    );
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, fetchPage]);

  // -- Filter ------------------------------------------------------------
  const filtered = useMemo(() => {
    if (activeTab === "all") return notifications;
    const types = TAB_TYPES[activeTab];
    return notifications.filter((n) => types.includes(n.type));
  }, [notifications, activeTab]);

  // -- Group by time -----------------------------------------------------
  const grouped = useMemo(() => {
    const map: Record<string, Notification[]> = {};
    for (const n of filtered) {
      const label = getGroupLabel(n.created_at);
      if (!map[label]) map[label] = [];
      map[label].push(n);
    }
    return GROUP_ORDER.filter((g) => map[g]?.length > 0).map((g) => ({
      label: g,
      items: map[g],
    }));
  }, [filtered]);

  // -- Tab counts --------------------------------------------------------
  const tabCounts = useMemo(() => ({
    all: notifications.length,
    requests: notifications.filter((n) => TAB_TYPES.requests.includes(n.type)).length,
    social: notifications.filter((n) => TAB_TYPES.social.includes(n.type)).length,
    events: notifications.filter((n) => TAB_TYPES.events.includes(n.type)).length,
  }), [notifications]);

  const unreadInTab = useMemo(() => {
    const tab = activeTab === "all" ? notifications : notifications.filter((n) => TAB_TYPES[activeTab].includes(n.type));
    return tab.filter((n) => !n.is_read).length;
  }, [notifications, activeTab]);

  // -- Mark read ---------------------------------------------------------
  function markRead(id: string) {
    const n = notifications.find((n) => n.id === id);
    if (!n || n.is_read) return;
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: 1 } : n));
    setUnread((u) => Math.max(0, u - 1));
    api.patch(`/notifications/${id}/read`).catch(() => {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: 0 } : n));
      setUnread((u) => u + 1);
    });
  }

  async function markAllRead() {
    if (markingAll) return;
    setMarkingAll(true);
    const prev = notifications.map((n) => ({ ...n }));
    const prevUnread = unread;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnread(0);
    try {
      await api.patch("/notifications/read-all");
    } catch {
      setNotifications(prev);
      setUnread(prevUnread);
    } finally {
      setMarkingAll(false);
    }
  }

  // -- Delete ------------------------------------------------------------
  async function deleteOne(id: string) {
    setDeletingIds((s) => new Set(s).add(id));
    const prevNotifs = [...notifications];
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    if (target && !target.is_read) setUnread((u) => Math.max(0, u - 1));
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      setNotifications(prevNotifs);
      setTotal((t) => t + 1);
      if (target && !target.is_read) setUnread((u) => u + 1);
    } finally {
      setDeletingIds((s) => { const next = new Set(s); next.delete(id); return next; });
    }
  }

  async function clearAll() {
    setClearingAll(true);
    const prev = [...notifications];
    const prevTotal = total;
    const prevUnread = unread;
    setNotifications([]);
    setTotal(0);
    setUnread(0);
    setShowClearConfirm(false);
    try {
      await api.delete("/notifications/all");
    } catch {
      setNotifications(prev);
      setTotal(prevTotal);
      setUnread(prevUnread);
    } finally {
      setClearingAll(false);
    }
  }

  function refresh() {
    setRefreshing(true);
    setPage(1);
    fetchPage(1, true);
  }

  // -- Loading skeleton ---------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-bg pb-28 md:pb-12">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="shimmer h-16 rounded-2xl" />
          <div className="shimmer h-10 rounded-full" />
          <div className="shimmer h-5 w-24 rounded-lg" />
          {[0,1,2,3].map((i) => <div key={i} className="shimmer h-20 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const TABS: { key: FilterTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "all", label: "All", icon: Bell },
    { key: "requests", label: "Requests", icon: Users },
    { key: "social", label: "Social", icon: Heart },
    { key: "events", label: "Events", icon: PartyPopper },
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
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1">Activity</p>
            <h1 className="text-2xl font-bold text-text tracking-tight flex items-center gap-2">
              Notifications
              {unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-hot text-white text-[10px] font-bold"
                >
                  {unread > 99 ? "99+" : unread}
                </motion.span>
              )}
            </h1>
            {total > 0 && (
              <p className="text-text-dim text-xs mt-0.5">
                {total} notification{total !== 1 ? "s" : ""}{unread > 0 ? ` · ${unread} unread` : ""}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={refresh}
              disabled={refreshing}
              aria-label="Refresh"
              className="btn-secondary-luxe p-2.5 rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </motion.button>
            {notifications.length > 0 && (
              <div className="relative">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowClearConfirm((v) => !v)}
                  aria-label="More options"
                  className="btn-secondary-luxe p-2.5 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
                <AnimatePresence>
                  {showClearConfirm && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 4 }}
                      className="absolute right-0 top-12 z-50 w-52 rounded-2xl bg-surface border border-border shadow-xl shadow-black/20 p-2 overflow-hidden"
                    >
                      <p className="text-text-muted text-xs px-2 py-1.5 font-semibold">Clear notifications?</p>
                      <button
                        onClick={clearAll}
                        disabled={clearingAll}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-error text-sm font-bold hover:bg-error/10 transition flex items-center gap-2"
                      >
                        {clearingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Clear all notifications
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-text-dim text-sm font-semibold hover:bg-surface-light transition"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* -- Unread action banner -- */}
        <AnimatePresence>
          {unreadInTab > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <p className="text-primary font-bold text-sm">
                    {unreadInTab} unread {activeTab === "all" ? "" : activeTab} notification{unreadInTab !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={markAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-accent transition"
                >
                  {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                  Mark all read
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* -- Error -- */}
        {fetchError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-error/10 border border-error/25 rounded-xl p-3.5 text-error text-sm mb-5 flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {fetchError}
            </span>
            <button onClick={refresh} className="underline font-semibold text-xs whitespace-nowrap">Retry</button>
          </motion.div>
        )}

        {/* -- Filter Tabs -- */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {TABS.map(({ key, label, icon: Icon }) => {
            const count = tabCounts[key];
            const isActive = activeTab === key;
            const hasUnread = key === "all"
              ? unread > 0
              : notifications.filter((n) => !n.is_read && TAB_TYPES[key].includes(n.type)).length > 0;
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.93 }}
                onClick={() => setActiveTab(key)}
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
                {hasUnread && !isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-hot border border-bg" />
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* -- Content -- */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key={`empty-${activeTab}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-4">
                {activeTab === "all" ? (
                  <BellOff className="w-7 h-7 text-text-dim" />
                ) : activeTab === "requests" ? (
                  <Users className="w-7 h-7 text-text-dim" />
                ) : activeTab === "social" ? (
                  <Heart className="w-7 h-7 text-text-dim" />
                ) : (
                  <PartyPopper className="w-7 h-7 text-text-dim" />
                )}
              </div>
              <p className="text-text font-bold text-base mb-1">
                {activeTab === "all" ? "All caught up!" : `No ${activeTab} notifications`}
              </p>
              <p className="text-text-muted text-sm">
                {activeTab === "all"
                  ? "You'll be notified about event updates, requests, and more."
                  : `${activeTab === "requests" ? "Request activity" : activeTab === "social" ? "Social interactions" : "Event activity"} will appear here.`}
              </p>
              {activeTab === "all" && <div className="mt-5 text-text-dim text-xs">Discover events to get started</div>}
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {grouped.map(({ label, items }) => (
                <div key={label}>
                  {/* Group header */}
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-dim whitespace-nowrap">
                      {label}
                    </p>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[9px] text-text-dim/60 font-semibold">{items.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2">
                    <AnimatePresence>
                      {items.map((n) => (
                        <NotifCard
                          key={n.id}
                          n={n}
                          onRead={markRead}
                          onDelete={deleteOne}
                          deleting={deletingIds.has(n.id)}
                          navigate={navigate}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}

              {/* Infinite scroll sentinel */}
              <div ref={bottomRef} />
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              )}
              {!hasMore && notifications.length > limit && (
                <p className="text-center text-text-dim text-xs py-4 font-medium">
                  All {total} notifications loaded
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click-away to close clear confirm */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
}
