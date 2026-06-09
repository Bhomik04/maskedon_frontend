import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { EventRequest } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Calendar, Loader2, Inbox, RefreshCw, Ticket,
  Clock, CheckCircle, XCircle, RotateCcw, Timer,
  TrendingUp, AlertCircle, ChevronRight, X, Trophy, Star,
  ArrowUpRight, ArrowDownLeft, UserCheck, UserX, Users, Search, ArrowUpDown, Sparkles,
} from "lucide-react";

type FilterTab = "all" | "pending" | "approved" | "rejected" | "withdrawn";
type HostFilterTab = "all" | "pending" | "approved" | "rejected";
type SentSort = "recent" | "eventSoon" | "status";
type HostSort = "recent" | "eventSoon" | "rating";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getCountdown(isoDate: string): { label: string; urgent: boolean } {
  const now = new Date();
  const target = new Date(isoDate);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { label: "Past", urgent: false };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days === 0) return { label: hours === 0 ? "Starting soon!" : `${hours}h away`, urgent: true };
  if (days === 1) return { label: "Tomorrow!", urgent: true };
  return { label: `${days} days away`, urgent: false };
}

function formatPrice(paisa: number) {
  if (!paisa || paisa === 0) return "Free";
  return `₹${(paisa / 100).toLocaleString("en-IN")}`;
}

function timeOrMax(iso: string | null | undefined) {
  if (!iso) return Number.MAX_SAFE_INTEGER;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
    barColor: "from-warning/60 to-warning/20",
    dot: true,
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    barColor: "from-success/70 to-success/20",
    dot: false,
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    color: "text-error",
    bg: "bg-error/10",
    border: "border-error/20",
    barColor: "from-error/50 to-error/10",
    dot: false,
  },
  withdrawn: {
    label: "Withdrawn",
    icon: RotateCcw,
    color: "text-text-dim",
    bg: "bg-text-dim/10",
    border: "border-text-dim/15",
    barColor: "from-text-dim/30 to-text-dim/5",
    dot: false,
  },
} as const;

interface CardProps {
  req: EventRequest;
  index: number;
  onWithdraw: (req: EventRequest) => void;
  withdrawingId: string | null;
}

function RequestCard({ req, index, onWithdraw, withdrawingId }: CardProps) {
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.withdrawn;
  const StatusIcon = cfg.icon;

  const now = new Date();
  const eventDate = req.event_date_time ? new Date(req.event_date_time) : null;
  const isPast = eventDate ? eventDate < now : false;
  const isUpcoming = eventDate ? eventDate >= now : false;

  const canRate = req.status === "approved" && isPast;
  const showCountdown = req.status === "approved" && isUpcoming && !!eventDate;
  const canWithdraw = req.status === "pending";

  const countdown = showCountdown ? getCountdown(req.event_date_time!) : null;
  const isWithdrawing = withdrawingId === req.id;

  const r = req as EventRequest & {
    event_cover_image_url?: string | null;
    event_ticket_price?: number;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -8 }}
      transition={{
        delay: Math.min(index * 0.045, 0.25),
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
      className={`relative overflow-hidden rounded-2xl border ${cfg.border} bg-surface shadow-lg group`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${cfg.barColor} rounded-l-2xl`} />

      {r.event_cover_image_url && (
        <div className="h-14 w-full overflow-hidden">
          <img
            src={r.event_cover_image_url}
            alt=""
            className="w-full h-full object-cover opacity-25 group-hover:opacity-35 transition-opacity duration-500"
            loading="lazy"
          />
        </div>
      )}

      <div className="pl-5 pr-4 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/events/${req.event_id}`} className="flex-1 min-w-0 group/link">
            <h3 className="text-text font-bold text-base leading-snug truncate group-hover/link:text-primary transition-colors">
              {req.event_title}
            </h3>
          </Link>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.border} border shrink-0`}>
            {cfg.dot && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
              </span>
            )}
            <StatusIcon className={`w-3 h-3 ${cfg.color}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-text-muted text-xs mt-2 flex-wrap">
          {req.event_location_city && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-accent shrink-0" />
              {req.event_location_city}
            </span>
          )}
          {req.event_date_time && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-primary shrink-0" />
              {formatDate(req.event_date_time)} · {formatTime(req.event_date_time)}
            </span>
          )}
          {r.event_ticket_price !== undefined && (
            <span className="flex items-center gap-1">
              <Ticket className="w-3 h-3 text-hot shrink-0" />
              {formatPrice(r.event_ticket_price)}
            </span>
          )}
        </div>

        {req.message && (
          <div className="mt-2.5 px-3 py-2 rounded-xl bg-surface-light border border-border text-text-muted text-xs italic leading-relaxed line-clamp-2">
            "{req.message}"
          </div>
        )}

        <div className="flex items-center gap-3 mt-2.5 text-[10px] text-text-dim flex-wrap">
          <span>Requested {formatDate(req.requested_at)}</span>
          {req.responded_at && (
            <span className={cfg.color}>· Responded {formatDate(req.responded_at)}</span>
          )}
        </div>

        {showCountdown && countdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-success/8 border border-success/20"
          >
            <div className="flex items-center gap-2">
              <Timer className={`w-4 h-4 ${countdown.urgent ? "text-warning animate-pulse" : "text-success"}`} />
              <span className={`text-sm font-bold ${countdown.urgent ? "text-warning" : "text-success"}`}>
                {countdown.label}
              </span>
            </div>
            <Link to={`/events/${req.event_id}`} className="flex items-center gap-1 text-xs font-bold text-success hover:text-accent transition">
              View event <ChevronRight className="w-3 h-3" />
            </Link>
          </motion.div>
        )}

        {req.status === "approved" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
            <Link
              to={`/events/${req.event_id}/ticket`}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary/15 to-accent/10 border border-primary/25 text-primary font-bold text-sm hover:from-primary/25 hover:to-accent/20 transition"
            >
              <Ticket className="w-4 h-4" />
                  Open Entry Pass
            </Link>
          </motion.div>
        )}

        {canRate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
            <Link
              to={`/events/${req.event_id}/rate`}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-warning/20 to-hot/15 border border-warning/25 text-warning font-bold text-sm hover:from-warning/30 hover:to-hot/25 transition"
            >
              <Trophy className="w-4 h-4" />
                  Rate this event experience
              <Star className="w-3.5 h-3.5 fill-current" />
            </Link>
          </motion.div>
        )}

        {canWithdraw && (
          <div className="mt-3">
            <AnimatePresence mode="wait">
              {!confirmWithdraw ? (
                <motion.button
                  key="withdraw-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmWithdraw(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-text-dim/20 text-text-dim text-xs font-semibold hover:border-error/30 hover:text-error hover:bg-error/5 transition"
                >
                  <X className="w-3 h-3" />
                      Cancel request
                </motion.button>
              ) : (
                <motion.div
                  key="confirm-row"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                      <span className="text-xs text-text-muted flex-1">Cancel this request?</span>
                  <button
                    onClick={() => setConfirmWithdraw(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-dim border border-border hover:bg-surface-light transition"
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => { setConfirmWithdraw(false); onWithdraw(req); }}
                    disabled={isWithdrawing}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-error border border-error/30 bg-error/8 hover:bg-error/15 transition flex items-center gap-1"
                  >
                    {isWithdrawing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface IncomingCardProps {
  req: EventRequest;
  index: number;
  onAction: (req: EventRequest, status: "approved" | "rejected") => void;
  actingId: string | null;
}

function IncomingRequestCard({ req, index, onAction, actingId }: IncomingCardProps) {
  const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.withdrawn;
  const StatusIcon = cfg.icon;
  const isActing = actingId === req.id;
  const initials = (req.display_name || req.username || "?").slice(0, 2).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -8 }}
      transition={{
        delay: Math.min(index * 0.045, 0.25),
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
      className={`relative overflow-hidden rounded-2xl border ${cfg.border} bg-surface shadow-lg`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${cfg.barColor} rounded-l-2xl`} />

      <div className="pl-5 pr-4 pt-4 pb-4">
        {/* Requester info */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-surface-light border border-border flex items-center justify-center">
            {req.avatar_url ? (
              <img src={req.avatar_url} alt={req.display_name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="text-xs font-bold text-text-dim">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-text font-bold text-sm leading-none truncate">
                  {req.display_name || req.username}
                </p>
                <p className="text-text-dim text-xs mt-0.5">@{req.username}</p>
              </div>
              {req.status !== "pending" ? (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.border} border shrink-0`}>
                  <StatusIcon className={`w-3 h-3 ${cfg.color}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-warning">Pending</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2.5 mt-1.5 text-[10px] text-text-dim flex-wrap">
              {req.social_rating !== undefined && (
                <span className="flex items-center gap-0.5 text-warning font-semibold">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  {Number(req.social_rating).toFixed(1)}
                </span>
              )}
              {req.events_attended !== undefined && (
                <span>{req.events_attended} events attended</span>
              )}
            </div>
          </div>
        </div>

        {/* Event reference */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <Link to={`/events/${req.event_id}`} className="text-xs font-bold text-primary hover:text-accent transition truncate block">
            {req.event_title}
          </Link>
          <div className="flex items-center gap-3 text-[10px] text-text-muted mt-1 flex-wrap">
            {req.event_location_city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                {req.event_location_city}
              </span>
            )}
            {req.event_date_time && (
              <span className="flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                {formatDate(req.event_date_time)} · {formatTime(req.event_date_time)}
              </span>
            )}
          </div>
        </div>

        {req.message && (
          <div className="mt-2.5 px-3 py-2 rounded-xl bg-surface-light border border-border text-text-muted text-xs italic leading-relaxed line-clamp-2">
            "{req.message}"
          </div>
        )}

        <div className="mt-2.5 text-[10px] text-text-dim">
          Requested {formatDate(req.requested_at)} at {formatTime(req.requested_at)}
        </div>

        {/* Approve / Reject actions (pending only) */}
        {req.status === "pending" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => onAction(req, "rejected")}
              disabled={isActing}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-error/30 bg-error/8 text-error text-xs font-bold hover:bg-error/15 transition disabled:opacity-60"
            >
              {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
              Decline
            </button>
            <button
              onClick={() => onAction(req, "approved")}
              disabled={isActing}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-success/30 bg-success/10 text-success text-xs font-bold hover:bg-success/20 transition disabled:opacity-60"
            >
              {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
              Approve
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"sent" | "received">("sent");
  const [hostRequests, setHostRequests] = useState<EventRequest[]>([]);
  const [hostLoading, setHostLoading] = useState(true);
  const [hostError, setHostError] = useState("");
  const [hostTab, setHostTab] = useState<HostFilterTab>("all");
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sentSort, setSentSort] = useState<SentSort>("recent");
  const [hostSort, setHostSort] = useState<HostSort>("recent");
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState("");

  const loadRequests = useCallback((isRefresh = false) => {
    setLoadError("");
    if (isRefresh) setRefreshing(true);
    return api
      .get("/users/me/requests")
      .then((res) => setRequests(res.data.data.requests))
      .catch((err) => setLoadError(getApiErrorMessage(err, "Failed to load requests")))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  const loadHostRequests = useCallback(async (isRefresh = false) => {
    setHostError("");
    if (isRefresh) setRefreshing(true);
    try {
      const res = await api.get("/users/me/host-requests");
      setHostRequests(res.data.data.requests);
    } catch (err) {
      setHostError(getApiErrorMessage(err, "Failed to load host requests"));
    } finally {
      setHostLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);
  useEffect(() => { loadHostRequests(); }, [loadHostRequests]);

  const handleRefresh = useCallback(() => {
    loadRequests(true);
    loadHostRequests(true);
  }, [loadRequests, loadHostRequests]);

  const handleAction = useCallback(async (req: EventRequest, status: "approved" | "rejected") => {
    setActionError("");
    setActingId(req.id);
    try {
      await api.patch(`/events/${req.event_id}/requests/${req.id}`, { status });
      setHostRequests((prev) =>
        prev.map((r) =>
          r.id === req.id ? { ...r, status, responded_at: new Date().toISOString() } : r
        )
      );
    } catch (err) {
      setActionError(getApiErrorMessage(err, `Failed to ${status === "approved" ? "approve" : "reject"} request`));
    } finally {
      setActingId(null);
    }
  }, []);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    const withdrawn = requests.filter((r) => r.status === "withdrawn").length;
    const decided = approved + rejected;
    const successRate = decided > 0 ? Math.round((approved / decided) * 100) : null;
    const upcomingApproved = requests.filter(
      (r) => r.status === "approved" && r.event_date_time && new Date(r.event_date_time) >= new Date()
    ).length;
    return { total, pending, approved, rejected, withdrawn, successRate, upcomingApproved };
  }, [requests]);

  const hostStats = useMemo(() => {
    const total = hostRequests.length;
    const pending = hostRequests.filter((r) => r.status === "pending").length;
    const approved = hostRequests.filter((r) => r.status === "approved").length;
    const rejected = hostRequests.filter((r) => r.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [hostRequests]);

  const nextUpcomingApproved = useMemo(() => {
    return requests
      .filter((r) => r.status === "approved" && r.event_date_time && new Date(r.event_date_time) >= new Date())
      .sort((a, b) => new Date(a.event_date_time!).getTime() - new Date(b.event_date_time!).getTime())[0] ?? null;
  }, [requests]);

  const hostUrgentPending = useMemo(() => {
    const now = Date.now();
    const twoDays = 2 * 24 * 60 * 60 * 1000;
    return hostRequests.filter(
      (r) =>
        r.status === "pending" &&
        r.event_date_time &&
        new Date(r.event_date_time).getTime() - now <= twoDays &&
        new Date(r.event_date_time).getTime() > now
    ).length;
  }, [hostRequests]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const statusOrder: Record<FilterTab, number> = {
      pending: 0,
      approved: 1,
      rejected: 2,
      withdrawn: 3,
      all: 4,
    };

    let result = activeTab === "all" ? requests : requests.filter((r) => r.status === activeTab);

    if (query) {
      result = result.filter((r) =>
        [r.event_title, r.event_location_city, r.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    return [...result].sort((a, b) => {
      if (sentSort === "eventSoon") {
        return timeOrMax(a.event_date_time) - timeOrMax(b.event_date_time);
      }
      if (sentSort === "status") {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
    });
  }, [requests, activeTab, searchQuery, sentSort]);

  const hostFiltered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let result = hostTab === "all" ? hostRequests : hostRequests.filter((r) => r.status === hostTab);

    if (query) {
      result = result.filter((r) =>
        [r.display_name, r.username, r.event_title, r.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    return [...result].sort((a, b) => {
      if (hostSort === "eventSoon") {
        return timeOrMax(a.event_date_time) - timeOrMax(b.event_date_time);
      }
      if (hostSort === "rating") {
        const ra = Number(a.social_rating ?? 0);
        const rb = Number(b.social_rating ?? 0);
        return rb - ra;
      }
      return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
    });
  }, [hostRequests, hostTab, searchQuery, hostSort]);

  const tabCounts: Record<FilterTab, number> = useMemo(
    () => ({
      all: requests.length,
      pending: stats.pending,
      approved: stats.approved,
      rejected: stats.rejected,
      withdrawn: stats.withdrawn,
    }),
    [requests.length, stats]
  );

  const hostTabCounts: Record<HostFilterTab, number> = useMemo(
    () => ({
      all: hostRequests.length,
      pending: hostStats.pending,
      approved: hostStats.approved,
      rejected: hostStats.rejected,
    }),
    [hostRequests.length, hostStats]
  );

  const handleWithdraw = useCallback(async (req: EventRequest) => {
    setWithdrawError("");
    setWithdrawingId(req.id);
    try {
            await api.delete(`/events/${req.event_id}/requests/${req.id}`);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === req.id ? { ...r, status: "withdrawn" as const, responded_at: new Date().toISOString() } : r
        )
      );
    } catch (err) {
      setWithdrawError(getApiErrorMessage(err, "Failed to withdraw request"));
    } finally {
      setWithdrawingId(null);
    }
  }, []);

  if (loading && hostLoading) {
    return (
      <div className="min-h-screen bg-bg pb-28 md:pb-12">
        <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-4">
          <div className="shimmer h-16 rounded-2xl" />
          <div className="shimmer h-12 rounded-full" />
          <div className="shimmer h-24 rounded-2xl" />
          <div className="shimmer h-10 rounded-full" />
          {[0, 1, 2].map((i) => <div key={i} className="shimmer h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const SENT_TABS: { key: FilterTab; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending", icon: Clock },
    { key: "approved", label: "Approved", icon: CheckCircle },
    { key: "rejected", label: "Rejected", icon: XCircle },
    { key: "withdrawn", label: "Withdrawn", icon: RotateCcw },
  ];

  const HOST_TABS: { key: HostFilterTab; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending", icon: Clock },
    { key: "approved", label: "Approved", icon: CheckCircle },
    { key: "rejected", label: "Rejected", icon: XCircle },
  ];

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12 premium-shell">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/12 via-accent/6 to-hot/5 p-4 md:p-5 mb-5"
        >
          <div className="absolute -top-14 -right-12 w-36 h-36 rounded-full bg-primary/15 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 w-32 h-32 rounded-full bg-accent/10 blur-2xl" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Event Access</p>
              <h1 className="text-2xl md:text-[1.8rem] font-black text-text tracking-tight">Access Hub</h1>
              <p className="text-text-dim text-sm mt-0.5">Your complete attendee access and organizer approvals command center.</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh"
              className="btn-secondary-luxe p-2.5 rounded-xl shrink-0 mt-1"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </motion.button>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-2xl border border-border/70 bg-surface/65 backdrop-blur-sm px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">Pending</p>
              <p className="text-lg font-black text-warning leading-none mt-1">{stats.pending}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface/65 backdrop-blur-sm px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">Approved</p>
              <p className="text-lg font-black text-success leading-none mt-1">{stats.approved}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface/65 backdrop-blur-sm px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">Needs Review</p>
              <p className="text-lg font-black text-primary leading-none mt-1">{hostStats.pending}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface/65 backdrop-blur-sm px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">Acceptance</p>
              <p className="text-lg font-black text-hot leading-none mt-1">{stats.successRate !== null ? `${stats.successRate}%` : "-"}</p>
            </div>
          </div>
        </motion.div>

        {/* Mode switcher */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-2 mb-5 p-1.5 rounded-2xl bg-surface/80 border border-border backdrop-blur-sm"
        >
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setMode("sent")}
            className={`relative flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              mode === "sent"
                ? "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/25"
                : "text-text-dim hover:text-text"
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            My Entries
            {stats.pending > 0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${mode === "sent" ? "bg-white/20" : "bg-warning/15 text-warning"}`}>
                {stats.pending}
              </span>
            )}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setMode("received")}
            className={`relative flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              mode === "received"
                ? "bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/25"
                : "text-text-dim hover:text-text"
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Organizer Desk
            {hostStats.pending > 0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${mode === "received" ? "bg-white/20" : "bg-warning/15 text-warning"}`}>
                {hostStats.pending}
              </span>
            )}
          </motion.button>
        </motion.div>

        {/* Access controls */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-5 rounded-2xl border border-border bg-surface/70 p-3 backdrop-blur-sm"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={mode === "sent" ? "Search events, city, status" : "Search names, usernames, events"}
              className="w-full h-10 rounded-xl border border-border bg-bg/55 pl-9 pr-3 text-sm text-text placeholder:text-text-dim/80 outline-none focus:border-primary/45"
            />
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-dim font-bold px-2 py-1">
              <Sparkles className="w-3 h-3" /> Smart View
            </span>

            {mode === "sent" ? (
              <>
                {[
                  { key: "recent", label: "Latest" },
                  { key: "eventSoon", label: "Event Soon" },
                  { key: "status", label: "Status" },
                ].map((opt) => {
                  const active = sentSort === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setSentSort(opt.key as SentSort)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition ${
                        active
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-surface border-border text-text-dim hover:text-text"
                      }`}
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      {opt.label}
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                {[
                  { key: "recent", label: "Latest" },
                  { key: "eventSoon", label: "Event Soon" },
                  { key: "rating", label: "Top Rated" },
                ].map((opt) => {
                  const active = hostSort === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setHostSort(opt.key as HostSort)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition ${
                        active
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-surface border-border text-text-dim hover:text-text"
                      }`}
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      {opt.label}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── MY ENTRIES ── */}
          {mode === "sent" && (
            <motion.div
              key="sent"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              {requests.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.07 }}
                  className="mb-5"
                >
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-text-dim font-bold">Performance Snapshot</p>
                    <p className="text-[10px] text-text-dim font-semibold">{filtered.length} shown</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { label: "Total", value: stats.total, color: "text-text", iconColor: "text-primary" },
                    { label: "Pending", value: stats.pending, color: "text-warning", icon: Clock, iconColor: "text-warning" },
                    { label: "Approved", value: stats.approved, color: "text-success", icon: CheckCircle, iconColor: "text-success" },
                    { label: "Acceptance", value: stats.successRate !== null ? `${stats.successRate}%` : "—", color: "text-hot", icon: TrendingUp, iconColor: "text-hot" },
                  ].map(({ label, value, color, icon: Icon, iconColor }) => (
                    <div key={label} className="glass-panel rounded-xl p-3 text-center flex flex-col items-center gap-1">
                      {Icon && <Icon className={`w-3.5 h-3.5 ${iconColor}`} />}
                      <span className={`text-lg font-bold ${color} leading-none`}>{value}</span>
                      <span className="text-[9px] font-semibold text-text-dim uppercase tracking-wide">{label}</span>
                    </div>
                  ))}
                  </div>
                </motion.div>
              )}

              {stats.upcomingApproved > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.12 }}
                  className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-success/10 to-accent/5 border border-success/20"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-success font-bold text-sm">
                      {stats.upcomingApproved === 1 ? "You're in for 1 upcoming event!" : `You're in for ${stats.upcomingApproved} upcoming events!`}
                    </p>
                    <p className="text-text-dim text-xs truncate">
                      {nextUpcomingApproved?.event_title ? `Next up: ${nextUpcomingApproved.event_title}` : "Check your approved requests below."}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("approved")}
                    className="text-success text-xs font-bold flex items-center gap-0.5 hover:text-accent transition shrink-0"
                  >
                    View <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}

              {(loadError || withdrawError) && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-error/10 border border-error/25 rounded-xl p-3.5 text-error text-sm mb-5 flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {loadError || withdrawError}
                  </span>
                  {loadError && (
                    <button onClick={() => loadRequests(true)} className="underline font-semibold text-xs whitespace-nowrap">Retry</button>
                  )}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 p-1 rounded-2xl border border-border bg-surface/70"
                style={{ scrollbarWidth: "none" }}
              >
                {SENT_TABS.map(({ key, label, icon: Icon }) => {
                  const count = tabCounts[key];
                  const isActive = activeTab === key;
                  return (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setActiveTab(key)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                        isActive
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                          : "text-text-dim border-border bg-surface hover:text-text hover:border-border-hover"
                      }`}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      {label}
                      {count > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-surface-light text-text-dim"}`}>
                          {count}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>

              <AnimatePresence mode="wait">
                {filtered.length === 0 ? (
                  <motion.div
                    key="sent-empty"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="text-center py-16"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-4">
                      {activeTab === "all" ? (
                        <Inbox className="w-7 h-7 text-text-dim" />
                      ) : activeTab === "pending" ? (
                        <Clock className="w-7 h-7 text-warning/60" />
                      ) : activeTab === "approved" ? (
                        <CheckCircle className="w-7 h-7 text-success/60" />
                      ) : activeTab === "rejected" ? (
                        <XCircle className="w-7 h-7 text-error/60" />
                      ) : (
                        <RotateCcw className="w-7 h-7 text-text-dim/60" />
                      )}
                    </div>
                    <p className="text-text font-bold text-base mb-1">
                      {activeTab === "all" ? "No access activity yet" : `No ${activeTab} items`}
                    </p>
                    <p className="text-text-muted text-sm mb-5">
                      {activeTab === "all"
                        ? "Explore events and request access to start your timeline."
                        : activeTab === "approved"
                        ? "No approved access entries yet."
                        : activeTab === "pending"
                        ? "Nothing is waiting for host response right now."
                        : `Nothing to show in ${activeTab}.`}
                    </p>
                    {activeTab === "all" && (
                      <Link to="/events" className="inline-flex items-center btn-primary-luxe px-5 py-2.5 rounded-xl font-bold text-sm">
                        Discover events
                      </Link>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {filtered.map((req, i) => (
                      <RequestCard key={req.id} req={req} index={i} onWithdraw={handleWithdraw} withdrawingId={withdrawingId} />
                    ))}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(filtered.length * 0.045 + 0.1, 0.5) }}
                      className="pt-2"
                    >
                      <Link
                        to="/events"
                        className="flex items-center justify-center py-3 rounded-2xl border border-border bg-surface text-text-dim text-sm font-semibold hover:text-text hover:border-border-hover transition"
                      >
                        Discover more events
                      </Link>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── ORGANIZER DESK ── */}
          {mode === "received" && (
            <motion.div
              key="received"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              {hostRequests.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.07 }}
                  className="mb-5"
                >
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-text-dim font-bold">Decision Queue</p>
                    <p className="text-[10px] text-text-dim font-semibold">{hostFiltered.length} shown</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { label: "Total", value: hostStats.total, color: "text-text" },
                    { label: "Pending", value: hostStats.pending, color: "text-warning", icon: Clock },
                    { label: "Approved", value: hostStats.approved, color: "text-success", icon: UserCheck },
                    { label: "Declined", value: hostStats.rejected, color: "text-error", icon: UserX },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="glass-panel rounded-xl p-3 text-center flex flex-col items-center gap-1">
                      {Icon && <Icon className={`w-3.5 h-3.5 ${color}`} />}
                      <span className={`text-lg font-bold ${color} leading-none`}>{value}</span>
                      <span className="text-[9px] font-semibold text-text-dim uppercase tracking-wide">{label}</span>
                    </div>
                  ))}
                  </div>
                </motion.div>
              )}

              {hostUrgentPending > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl border border-warning/30 bg-gradient-to-r from-warning/10 to-hot/5"
                >
                  <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-warning font-bold text-sm">Priority decisions waiting</p>
                    <p className="text-text-dim text-xs truncate">
                      {hostUrgentPending} pending request{hostUrgentPending > 1 ? "s" : ""} for events happening within 48 hours.
                    </p>
                  </div>
                  <button
                    onClick={() => setHostTab("pending")}
                    className="text-warning text-xs font-bold flex items-center gap-0.5 hover:text-hot transition shrink-0"
                  >
                    Review <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}

              {(hostError || actionError) && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-error/10 border border-error/25 rounded-xl p-3.5 text-error text-sm mb-5 flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {hostError || actionError}
                  </span>
                  {hostError && (
                    <button onClick={() => loadHostRequests(true)} className="underline font-semibold text-xs whitespace-nowrap">Retry</button>
                  )}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 p-1 rounded-2xl border border-border bg-surface/70"
                style={{ scrollbarWidth: "none" }}
              >
                {HOST_TABS.map(({ key, label, icon: Icon }) => {
                  const count = hostTabCounts[key];
                  const isActive = hostTab === key;
                  return (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setHostTab(key)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                        isActive
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                          : "text-text-dim border-border bg-surface hover:text-text hover:border-border-hover"
                      }`}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      {label}
                      {count > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-surface-light text-text-dim"}`}>
                          {count}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>

              <AnimatePresence mode="wait">
                {hostLoading ? (
                  <motion.div key="host-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    {[0, 1, 2].map((i) => <div key={i} className="shimmer h-40 rounded-2xl" />)}
                  </motion.div>
                ) : hostFiltered.length === 0 ? (
                  <motion.div
                    key="host-empty"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="text-center py-16"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-4">
                      {hostTab === "all" ? (
                        <Users className="w-7 h-7 text-text-dim" />
                      ) : hostTab === "pending" ? (
                        <Clock className="w-7 h-7 text-warning/60" />
                      ) : hostTab === "approved" ? (
                        <UserCheck className="w-7 h-7 text-success/60" />
                      ) : (
                        <UserX className="w-7 h-7 text-error/60" />
                      )}
                    </div>
                    <p className="text-text font-bold text-base mb-1">
                      {hostTab === "all" ? "No inbound access requests" : `No ${hostTab} entries`}
                    </p>
                    <p className="text-text-muted text-sm">
                      {hostTab === "all"
                        ? "When guests request access to your events, they will appear here."
                        : `No entries with ${hostTab} status right now.`}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key={hostTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {hostFiltered.map((req, i) => (
                      <IncomingRequestCard key={req.id} req={req} index={i} onAction={handleAction} actingId={actingId} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
