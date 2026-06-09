import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import { getApiErrorMessage } from "../lib/errors";
import type { Event } from "../types";
import { getTrustLevel } from "../lib/trust-levels";
import TrustBadge from "../components/trust-badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Calendar, MapPin, Users, ChevronDown, ChevronUp,
  Loader2, PartyPopper, TrendingUp, IndianRupee, Star,
  UserCheck, Clock, ArrowRight, Zap, Crown, BarChart3,
  CircleDot, AlertCircle, Eye, Flame, ChevronRight, ArrowLeft, ScanLine
} from "lucide-react";

// ── Types ──
interface HostAnalytics {
  revenue: { total: number; this_month: number; last_month: number; currency: string };
  events: { total: number; upcoming: number; ongoing: number; completed: number; cancelled: number };
  attendance: { total_attendees: number; total_capacity: number; avg_occupancy: number };
  requests: { total: number; pending: number; approved: number; rejected: number; approval_rate: number };
  ratings: { avg_event_rating: number | null; total_votes: number; events_rated: number };
  top_event: { id: string; title: string; attendees: number; revenue: number } | null;
}

// ── Helpers ──
function formatPrice(paisa: number) {
  if (paisa === 0) return "₹0";
  return `₹${(paisa / 100).toLocaleString("en-IN")}`;
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function getStatusClasses(status: string) {
  switch (status) {
    case "upcoming": return "status-upcoming";
    case "ongoing": return "status-ongoing";
    case "completed": return "status-completed";
    default: return "status-cancelled";
  }
}

function getCountdown(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hrs}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Ring Chart SVG ──
function RingChart({ value, max, color, size = 64, stroke = 5 }: { value: number; max: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-surface-light" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        className="transition-all duration-1000 ease-out" />
    </svg>
  );
}

// ── Stat Pill ──
function StatPill({ icon: Icon, label, value, color = "text-primary" }: { icon: React.ElementType; label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className={`w-9 h-9 rounded-xl bg-surface-light flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-text font-bold text-lg leading-tight">{value}</span>
      <span className="text-text-dim text-[10px] uppercase tracking-wider font-semibold">{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [analytics, setAnalytics] = useState<HostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [now, setNow] = useState(Date.now());

  const loadEvents = useCallback(async () => {
    const eventsRes = await api.get("/users/me/events");
    setEvents(eventsRes.data.data.events || []);
  }, []);

  const loadAnalytics = useCallback(async () => {
    const analyticsRes = await api.get("/users/me/host-analytics");
    setAnalytics(analyticsRes.data.data.analytics);
  }, []);

  // Android hardware back button → go to Profile
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      navigate("/profile/me");
    };
    window.addEventListener("capacitor:backButton", handler);
    return () => window.removeEventListener("capacitor:backButton", handler);
  }, [navigate]);

  // Tick every minute for countdown updates
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        await Promise.all([loadEvents(), loadAnalytics()]);
      } catch (err) {
        setLoadError(getApiErrorMessage(err, "Failed to load dashboard"));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [loadAnalytics, loadEvents]);

  // Best-effort realtime refresh for ticket scan counts.
  useEffect(() => {
    const id = window.setInterval(() => {
      void loadEvents();
    }, 8000);
    return () => window.clearInterval(id);
  }, [loadEvents]);

  const activeEvents = useMemo(
    () => events.filter((p) => p.status === "upcoming" || p.status === "ongoing"),
    [events]
  );
  const pastEvents = useMemo(
    () => events.filter((p) => p.status === "completed" || p.status === "cancelled" || p.status === "archived"),
    [events]
  );
  const upcomingEvents = useMemo(() =>
    activeEvents
      .filter(p => p.status === "upcoming" || p.status === "ongoing")
      .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime()),
    [activeEvents]
  );

  const trustLevel = user ? getTrustLevel(user.social_rating, user.events_attended ?? 0) : null;

  // Revenue growth
  const revenueGrowth = analytics
    ? (analytics.revenue.last_month > 0
        ? Math.round(((analytics.revenue.this_month - analytics.revenue.last_month) / analytics.revenue.last_month) * 100)
        : analytics.revenue.this_month > 0 ? 100 : 0)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-text-dim text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-5xl mx-auto px-4 pt-5 pb-6 md:pt-8">
        {/* Back nav */}
        <Link to="/profile/me" className="text-text-muted hover:text-text text-sm mb-4 inline-flex items-center gap-1.5 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>

        {/* ══════ HERO HEADER ══════ */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/20 shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {user?.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-text tracking-tight truncate">
                  {getGreeting()}, {user?.display_name.split(" ")[0]}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Crown className="w-3 h-3 text-primary" />
                  <span className="text-text-muted text-xs font-medium">Host Dashboard</span>
                  {trustLevel && <TrustBadge rating={user!.social_rating} totalEvents={user!.events_attended ?? 0} size="sm" showLabel={false} />}
                </div>
              </div>
            </div>
            <Link
              to="/events/create"
              className="btn-primary-luxe font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Event</span>
            </Link>
          </div>

          {/* Quick Stats Ribbon */}
          <div className="dash-stats-ribbon grid grid-cols-4 gap-1 p-3 rounded-2xl">
            <StatPill icon={PartyPopper} label="Hosted" value={analytics?.events.total ?? 0} color="text-primary" />
            <StatPill icon={Users} label="Guests" value={analytics?.attendance.total_attendees ?? 0} color="text-accent" />
            <StatPill icon={IndianRupee} label="Earned" value={formatPrice(analytics?.revenue.total ?? 0)} color="text-success" />
            <StatPill icon={Star} label="Rating" value={analytics?.ratings.avg_event_rating?.toFixed(1) ?? "—"} color="text-warning" />
          </div>
        </motion.div>

        {loadError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-error/10 border border-error/20 rounded-xl p-3.5 text-error text-sm mb-5 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{loadError}</span>
            <button onClick={() => window.location.reload()} className="underline font-semibold shrink-0">Retry</button>
          </motion.div>
        )}

        {/* ══════ ANALYTICS CARDS ══════ */}
        {analytics && analytics.events.total > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Revenue Card */}
              <div className="dash-metric-card col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-text-dim text-[10px] uppercase tracking-wider font-bold">Revenue</span>
                  <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
                    <IndianRupee className="w-3.5 h-3.5 text-success" />
                  </div>
                </div>
                <p className="text-text text-2xl font-bold tracking-tight">{formatPrice(analytics.revenue.this_month)}</p>
                <p className="text-text-dim text-[11px] mt-1">This month</p>
                {revenueGrowth !== 0 && (
                  <div className={`flex items-center gap-1 mt-2 text-[11px] font-semibold ${revenueGrowth > 0 ? "text-success" : "text-error"}`}>
                    <TrendingUp className={`w-3 h-3 ${revenueGrowth < 0 ? "rotate-180" : ""}`} />
                    {revenueGrowth > 0 ? "+" : ""}{revenueGrowth}% vs last month
                  </div>
                )}
              </div>

              {/* Occupancy Ring */}
              <div className="dash-metric-card flex flex-col items-center justify-center">
                <div className="relative mb-2">
                  <RingChart value={analytics.attendance.avg_occupancy} max={100} color="var(--color-accent)" size={72} stroke={6} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-text font-bold text-base">{analytics.attendance.avg_occupancy}%</span>
                  </div>
                </div>
                <span className="text-text-dim text-[10px] uppercase tracking-wider font-bold">Occupancy</span>
              </div>

              {/* Approval Rate Ring */}
              <div className="dash-metric-card flex flex-col items-center justify-center">
                <div className="relative mb-2">
                  <RingChart value={analytics.requests.approval_rate} max={100} color="var(--color-primary)" size={72} stroke={6} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-text font-bold text-base">{analytics.requests.approval_rate}%</span>
                  </div>
                </div>
                <span className="text-text-dim text-[10px] uppercase tracking-wider font-bold">Approval</span>
              </div>

              {/* Rating Card */}
              <div className="dash-metric-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-text-dim text-[10px] uppercase tracking-wider font-bold">Event Ratings</span>
                  <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 text-warning" />
                  </div>
                </div>
                <p className="text-text text-2xl font-bold tracking-tight">
                  {analytics.ratings.avg_event_rating?.toFixed(1) ?? "—"}
                  <span className="text-text-dim text-sm font-medium">/5</span>
                </p>
                <div className="flex items-center gap-2 mt-2 text-text-dim text-[11px]">
                  <span>{analytics.ratings.total_votes} votes</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-text-dim" />
                  <span>{analytics.ratings.events_rated} events</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════ PENDING REQUESTS ALERT ══════ */}
        {analytics && analytics.requests.pending > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <div className="dash-alert-card mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-hot/15 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-hot" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text font-bold text-sm">
                    {analytics.requests.pending} pending request{analytics.requests.pending > 1 ? "s" : ""}
                  </p>
                  <p className="text-text-muted text-xs">People are waiting to join your events</p>
                </div>
                {upcomingEvents.length === 1 && (
                  <Link to={`/dashboard/${upcomingEvents[0].id}/requests`} className="text-hot text-xs font-bold flex items-center gap-0.5 shrink-0">
                    Review <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════ UPCOMING EVENTS ══════ */}
        {upcomingEvents.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Upcoming
              </h2>
              {upcomingEvents.length > 3 && (
                <span className="text-text-dim text-[10px]">{upcomingEvents.length} events</span>
              )}
            </div>
            <div className="space-y-3">
              {upcomingEvents.map((event, i) => {
                const capPct = (event.max_capacity ?? 0) > 0 ? Math.round(((event.current_attendees ?? 0) / (event.max_capacity ?? 1)) * 100) : 0;
                const isSoon = new Date(event.date_time).getTime() - now < 86400000; // < 24h

                return (
                  <motion.div key={event.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.04 }}>
                    <div className="dash-event-card">
                      <div className="flex gap-3.5">
                        {/* Cover thumbnail */}
                        <Link to={`/events/${event.id}`} className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-surface-light">
                          {event.cover_image_url ? (
                            <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/15 via-accent/10 to-hot/8 flex items-center justify-center">
                              <PartyPopper className="w-6 h-6 text-text-dim/25" />
                            </div>
                          )}
                        </Link>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link to={`/events/${event.id}`} className="text-text font-bold text-sm truncate hover:text-primary transition">
                              {event.title}
                            </Link>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${getStatusClasses(event.status)}`}>
                              {event.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-text-muted text-[11px] mb-2">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-primary" />{formatShortDate(event.date_time)}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-text-dim" />{formatTime(event.date_time)}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-accent" />{event.location_city}</span>
                          </div>

                          {/* Capacity + countdown row */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-text-dim text-[10px]">{event.current_attendees}/{event.max_capacity}</span>
                                <span className="text-text-dim text-[10px]">{capPct}%</span>
                              </div>
                              <div className="h-1 bg-surface-light rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-hot transition-all duration-500" style={{ width: `${capPct}%` }} />
                              </div>
                            </div>
                            {isSoon && (
                              <div className="flex items-center gap-1 bg-hot/10 text-hot text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                <Flame className="w-3 h-3" />
                                {getCountdown(event.date_time)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mobile-prominent scan CTA */}
                      <div className="mt-3 pt-3 border-t border-primary/[0.05]">
                        {(event.current_attendees ?? 0) > 0 ? (
                          <Link
                            to={`/events/${event.id}/scan-ticket`}
                            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition"
                          >
                            <ScanLine className="w-3.5 h-3.5" />
                            Scan Tickets
                            <span className="text-primary/80">({event.checked_in_count ?? 0}/{event.current_attendees ?? 0})</span>
                          </Link>
                        ) : (
                          <div className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold border border-border text-text-dim bg-surface-light/40">
                            <ScanLine className="w-3.5 h-3.5" />
                            No guests to scan yet
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 pt-3 border-t border-primary/[0.05]">
                        <Link to={`/dashboard/${event.id}/requests`} className="dash-action-btn">
                          <UserCheck className="w-3.5 h-3.5" />
                          Requests
                        </Link>
                        <Link to={`/dashboard/${event.id}/attendees`} className="dash-action-btn">
                          <Users className="w-3.5 h-3.5" />
                          Guests
                        </Link>
                        {(event.current_attendees ?? 0) > 0 && (
                          <Link to={`/events/${event.id}/scan-ticket`} className="dash-action-btn !text-primary !border-primary/20 !bg-primary/5 hover:!bg-primary/15">
                            <ScanLine className="w-3.5 h-3.5" />
                            Scan
                          </Link>
                        )}
                        <Link to={`/events/${event.id}`} className="dash-action-btn">
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                        <Link to={`/events/${event.id}/edit`} className="dash-action-btn">
                          <BarChart3 className="w-3.5 h-3.5" />
                          Edit
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ══════ TOP EVENT HIGHLIGHT ══════ */}
        {analytics?.top_event && analytics.top_event.revenue > 0 && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
            <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
              <Flame className="w-3 h-3 text-hot" />
              Best Performer
            </h2>
            <Link to={`/events/${analytics.top_event.id}`} className="dash-highlight-card group block">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-text font-bold text-sm truncate group-hover:text-primary transition">{analytics.top_event.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-text-muted text-xs">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{analytics.top_event.attendees} guests</span>
                    <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{formatPrice(analytics.top_event.revenue)}</span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-text-dim group-hover:text-primary transition shrink-0" />
              </div>
            </Link>
          </motion.div>
        )}

        {/* ══════ FULL ANALYTICS LINK ══════ */}
        {analytics && analytics.events.total > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="mb-6">
            <Link
              to="/dashboard/analytics"
              className="flex items-center justify-between p-4 rounded-2xl border border-primary/15 bg-primary/5 hover:bg-primary/10 transition tap-active group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-text font-bold text-sm">Full Analytics</p>
                  <p className="text-text-dim text-xs">Revenue, attendance, requests & more</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-dim group-hover:text-primary transition" />
            </Link>
          </motion.div>
        )}

        {/* ══════ EMPTY STATE ══════ */}
        {events.length === 0 && !loadError && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-hot/10 flex items-center justify-center mx-auto mb-5">
              <PartyPopper className="w-10 h-10 text-text-dim" />
            </div>
            <h2 className="text-text font-bold text-lg mb-1.5">Start hosting</h2>
            <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">Create your first event and build your host reputation</p>
            <Link to="/events/create" className="btn-primary-luxe font-bold px-7 py-3 rounded-xl inline-flex items-center gap-2">
              <Plus className="w-4.5 h-4.5" />
              Create Event
            </Link>
          </motion.div>
        )}

        {/* ══════ PAST EVENTS ══════ */}
        {pastEvents.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <button
              onClick={() => setShowPast((v) => !v)}
              className="flex items-center gap-2 text-text-muted hover:text-text transition mb-3 group w-full"
            >
              <CircleDot className="w-3 h-3 text-text-dim" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Past Events</span>
              <span className="text-[10px] bg-surface-light px-2 py-0.5 rounded-full font-bold text-text-dim">{pastEvents.length}</span>
              <div className="flex-1" />
              {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {showPast && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2.5">
                    {pastEvents.map((event) => {
                      return (
                        <Link
                          key={event.id}
                          to={`/events/${event.id}`}
                          className="dash-past-card group flex items-center gap-3"
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-light shrink-0">
                            {event.cover_image_url ? (
                              <img src={event.cover_image_url} alt="" className="w-full h-full object-cover opacity-70" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/8 flex items-center justify-center">
                                <PartyPopper className="w-4 h-4 text-text-dim/20" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-text text-sm font-semibold truncate group-hover:text-primary transition">{event.title}</p>
                            <div className="flex items-center gap-2 text-text-dim text-[11px]">
                              <span>{formatShortDate(event.date_time)}</span>
                              <span className="w-0.5 h-0.5 rounded-full bg-text-dim" />
                              <span>{event.current_attendees} guests</span>
                              <span className="w-0.5 h-0.5 rounded-full bg-text-dim" />
                              <span>{event.checked_in_count ?? 0} checked-in</span>
                              <span className="w-0.5 h-0.5 rounded-full bg-text-dim" />
                              <span>{event.ticket_price > 0 ? formatPrice(event.ticket_price * (event.current_attendees ?? 0)) : "Free"}</span>
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${getStatusClasses(event.status)}`}>
                            {event.status}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
