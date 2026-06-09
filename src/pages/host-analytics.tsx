import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import {
  ArrowLeft, IndianRupee, Users, Star, UserCheck,
  AlertCircle, RefreshCw, TrendingUp, TrendingDown,
  PartyPopper, Flame, CheckCircle2, Clock, XCircle,
  BarChart3, Trophy,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HostAnalytics {
  revenue: { total: number; this_month: number; last_month: number; currency: string };
  events: { total: number; upcoming: number; ongoing: number; completed: number; cancelled: number };
  attendance: { total_attendees: number; total_capacity: number; avg_occupancy: number };
  requests: { total: number; pending: number; approved: number; rejected: number; approval_rate: number };
  ratings: { avg_event_rating: number | null; total_votes: number; events_rated: number };
  top_event: { id: string; title: string; attendees: number; revenue: number } | null;
  payouts?: {
    total: number;
    pending: number;
    processing: number;
    paid: number;
    failed: number;
    retrying: number;
    recent_payouts: {
      id: string;
      event_id: string;
      event_title?: string;
      status: string;
      gross_amount: number;
      platform_fee: number;
      net_amount: number;
      settled_at: string | null;
    }[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupees(paisa: number) {
  if (paisa === 0) return "₹0";
  if (paisa >= 10000000) return `₹${(paisa / 10000000).toFixed(1)}Cr`;
  if (paisa >= 100000) return `₹${(paisa / 100000).toFixed(1)}L`;
  return `₹${(paisa / 100).toLocaleString("en-IN")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label, color = "text-text-dim" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-4 h-4 ${color}`} />
      <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-dim">{label}</h2>
    </div>
  );
}

function Ring({ pct, color, size = 80, stroke = 7 }: {
  pct: number; color: string; size?: number; stroke?: number;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const arc = Math.min(Math.max(pct, 0), 100);
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-surface-light" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${(circ * arc) / 100} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

function BarRow({ label, value, max, color, count }: {
  label: string; value: number; max: number; color: string; count: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-text-muted text-xs w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-surface-light rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-text font-bold text-xs w-6 text-right shrink-0">{count}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HostAnalyticsPage() {
  const [analytics, setAnalytics] = useState<HostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/users/me/host-analytics");
      setAnalytics(res.data.data.analytics);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load analytics"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const revenueGrowth = analytics
    ? analytics.revenue.last_month > 0
      ? Math.round(((analytics.revenue.this_month - analytics.revenue.last_month) / analytics.revenue.last_month) * 100)
      : analytics.revenue.this_month > 0 ? 100 : 0
    : 0;

  const eventMax = analytics
    ? Math.max(analytics.events.upcoming, analytics.events.ongoing, analytics.events.completed, analytics.events.cancelled, 1)
    : 1;

  const requestMax = analytics
    ? Math.max(analytics.requests.approved, analytics.requests.pending, analytics.requests.rejected, 1)
    : 1;

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-6 md:pt-8">

        {/* ── Back ── */}
        <Link
          to="/dashboard"
          className="text-text-muted hover:text-text text-sm mb-5 inline-flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text tracking-tight">Host Analytics</h1>
              <p className="text-text-muted text-xs">Your hosting performance at a glance</p>
            </div>
          </div>
        </motion.div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-text-muted text-sm">Loading analytics…</p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="bg-error/10 border border-error/20 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-error font-semibold text-sm">{error}</p>
              <button onClick={load} className="mt-3 flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text transition tap-active">
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </button>
            </div>
          </div>
        )}

        {analytics && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="space-y-5"
          >
            {/* ════ REVENUE ════ */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="glass-panel rounded-2xl p-5"
            >
              <SectionTitle icon={IndianRupee} label="Revenue" color="text-success" />
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1">All Time</p>
                  <p className="text-text font-black text-xl tracking-tight">{formatRupees(analytics.revenue.total)}</p>
                </div>
                <div>
                  <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1">This Month</p>
                  <p className="text-success font-black text-xl tracking-tight">{formatRupees(analytics.revenue.this_month)}</p>
                </div>
                <div>
                  <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1">Last Month</p>
                  <p className="text-text font-bold text-xl tracking-tight">{formatRupees(analytics.revenue.last_month)}</p>
                </div>
              </div>

              {/* Month-over-month trend */}
              {(analytics.revenue.this_month > 0 || analytics.revenue.last_month > 0) && (
                <div className="bg-surface-light rounded-xl p-3 flex items-center gap-3">
                  {revenueGrowth >= 0
                    ? <TrendingUp className="w-4 h-4 text-success shrink-0" />
                    : <TrendingDown className="w-4 h-4 text-error shrink-0" />
                  }
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-text-dim mb-1.5">
                      <span>Last month</span>
                      <span>This month</span>
                    </div>
                    <div className="flex gap-1.5 h-3 items-end">
                      <progress
                        className="progress-luxe flex-1"
                        max={100}
                        value={analytics.revenue.last_month > 0
                          ? Math.min(100, Math.round((analytics.revenue.last_month / Math.max(analytics.revenue.last_month, analytics.revenue.this_month || 1)) * 100))
                          : 20}
                      />
                      <progress
                        className="progress-luxe progress-luxe--success flex-1"
                        max={100}
                        value={analytics.revenue.this_month > 0
                          ? Math.min(100, Math.round((analytics.revenue.this_month / Math.max(analytics.revenue.last_month || 1, analytics.revenue.this_month)) * 100))
                          : 20}
                      />
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${revenueGrowth >= 0 ? "text-success" : "text-error"}`}>
                    {revenueGrowth > 0 ? "+" : ""}{revenueGrowth}%
                  </span>
                </div>
              )}
            </motion.section>

            {/* ════ EVENTS ════ */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.13 }}
              className="glass-panel rounded-2xl p-5"
            >
              <SectionTitle icon={PartyPopper} label="Event Breakdown" color="text-hot" />
              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <p className="text-text font-black text-3xl">{analytics.events.total}</p>
                  <p className="text-text-dim text-[10px] uppercase tracking-wider">Total</p>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-right">
                  <div>
                    <p className="text-text font-bold text-lg">{analytics.events.upcoming}</p>
                    <p className="text-text-dim text-[10px]">Upcoming</p>
                  </div>
                  <div>
                    <p className="text-success font-bold text-lg">{analytics.events.ongoing}</p>
                    <p className="text-text-dim text-[10px]">Live</p>
                  </div>
                  <div>
                    <p className="text-text-muted font-bold text-lg">{analytics.events.completed}</p>
                    <p className="text-text-dim text-[10px]">Done</p>
                  </div>
                  <div>
                    <p className="text-error font-bold text-lg">{analytics.events.cancelled}</p>
                    <p className="text-text-dim text-[10px]">Cancelled</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                <BarRow label="Upcoming" value={analytics.events.upcoming} max={eventMax} color="var(--color-primary)" count={analytics.events.upcoming} />
                <BarRow label="Live now" value={analytics.events.ongoing} max={eventMax} color="var(--color-success)" count={analytics.events.ongoing} />
                <BarRow label="Completed" value={analytics.events.completed} max={eventMax} color="var(--color-text-dim)" count={analytics.events.completed} />
                <BarRow label="Cancelled" value={analytics.events.cancelled} max={eventMax} color="var(--color-error)" count={analytics.events.cancelled} />
              </div>
            </motion.section>

            {/* ════ ATTENDANCE ════ */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="glass-panel rounded-2xl p-5"
            >
              <SectionTitle icon={Users} label="Attendance" color="text-accent" />
              <div className="flex items-center gap-6">
                {/* Ring */}
                <div className="relative shrink-0">
                  <Ring pct={analytics.attendance.avg_occupancy} color="var(--color-accent)" size={88} stroke={8} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-text font-black text-lg">{analytics.attendance.avg_occupancy}%</span>
                  </div>
                </div>
                {/* Stats */}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-text-dim text-[10px] uppercase tracking-wider mb-0.5">Avg. Fill Rate</p>
                    <p className="text-text font-bold text-base">{analytics.attendance.avg_occupancy}%</p>
                  </div>
                  <div className="flex gap-5">
                    <div>
                      <p className="text-text-dim text-[10px] uppercase tracking-wider mb-0.5">Total Guests</p>
                      <p className="text-accent font-black text-xl">{analytics.attendance.total_attendees.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-text-dim text-[10px] uppercase tracking-wider mb-0.5">Total Slots</p>
                      <p className="text-text font-bold text-xl">{analytics.attendance.total_capacity.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* ════ REQUESTS ════ */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.23 }}
              className="glass-panel rounded-2xl p-5"
            >
              <SectionTitle icon={UserCheck} label="Request Funnel" color="text-primary" />
              <div className="flex items-center gap-6 mb-4">
                <div className="relative shrink-0">
                  <Ring pct={analytics.requests.approval_rate} color="var(--color-primary)" size={88} stroke={8} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-text font-black text-lg">{analytics.requests.approval_rate}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-text-dim text-[10px] uppercase tracking-wider mb-0.5">Approval Rate</p>
                  <p className="text-text font-bold text-base mb-3">{analytics.requests.total} total requests</p>
                  <div className="flex gap-4 text-xs">
                    <span className="text-success font-bold">{analytics.requests.approved} approved</span>
                    <span className="text-warning font-bold">{analytics.requests.pending} pending</span>
                    <span className="text-error font-bold">{analytics.requests.rejected} rejected</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                <BarRow label="Approved" value={analytics.requests.approved} max={requestMax} color="var(--color-success)" count={analytics.requests.approved} />
                <BarRow label="Pending" value={analytics.requests.pending} max={requestMax} color="var(--color-warning)" count={analytics.requests.pending} />
                <BarRow label="Rejected" value={analytics.requests.rejected} max={requestMax} color="var(--color-error)" count={analytics.requests.rejected} />
              </div>
            </motion.section>

            {/* ════ RATINGS ════ */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="glass-panel rounded-2xl p-5"
            >
              <SectionTitle icon={Star} label="Event Ratings" color="text-warning" />
              <div className="flex items-center gap-6">
                <div className="relative shrink-0">
                  <Ring
                    pct={analytics.ratings.avg_event_rating ? (analytics.ratings.avg_event_rating / 5) * 100 : 0}
                    color="var(--color-warning)"
                    size={88}
                    stroke={8}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-text font-black text-lg">
                      {analytics.ratings.avg_event_rating?.toFixed(1) ?? "—"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-text-dim text-[10px] uppercase tracking-wider mb-0.5">Average Rating</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-text font-black text-2xl">
                        {analytics.ratings.avg_event_rating?.toFixed(1) ?? "—"}
                      </p>
                      <p className="text-text-dim text-sm">/5</p>
                    </div>
                  </div>
                  <div className="flex gap-5 text-xs">
                    <div>
                      <p className="text-text-dim mb-0.5">Total Votes</p>
                      <p className="text-text font-bold">{analytics.ratings.total_votes.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-text-dim mb-0.5">Events Rated</p>
                      <p className="text-text font-bold">{analytics.ratings.events_rated}</p>
                    </div>
                  </div>
                  {analytics.ratings.avg_event_rating === null && (
                    <p className="text-text-dim text-xs">No ratings yet — host your first event!</p>
                  )}
                </div>
              </div>
            </motion.section>

            {/* ════ TOP EVENT ════ */}
            {analytics.top_event && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.33 }}
                className="glass-panel rounded-2xl p-5"
              >
                <SectionTitle icon={Trophy} label="Best Performer" color="text-warning" />
                <Link
                  to={`/events/${analytics.top_event.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl bg-surface-light hover:bg-surface transition tap-active group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning/20 to-hot/15 flex items-center justify-center shrink-0">
                    <Flame className="w-6 h-6 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text font-bold text-sm truncate group-hover:text-primary transition">{analytics.top_event.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{analytics.top_event.attendees} guests</span>
                      {analytics.top_event.revenue > 0 && (
                        <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{formatRupees(analytics.top_event.revenue)}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-text-dim text-xs group-hover:text-primary transition">View →</span>
                </Link>
              </motion.section>
            )}

            {/* ════ PAYOUTS ════ */}
            {analytics.payouts && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36 }}
                className="glass-panel rounded-2xl p-5"
              >
                <SectionTitle icon={IndianRupee} label="Host Payouts" color="text-success" />
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1">Paid</p>
                    <p className="text-success font-black text-xl tracking-tight">{analytics.payouts.paid}</p>
                  </div>
                  <div>
                    <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1">Pending</p>
                    <p className="text-warning font-black text-xl tracking-tight">{analytics.payouts.pending}</p>
                  </div>
                  <div>
                    <p className="text-text-dim text-[10px] uppercase tracking-wider mb-1">Failed</p>
                    <p className="text-error font-black text-xl tracking-tight">{analytics.payouts.failed}</p>
                  </div>
                </div>
                {analytics.payouts.recent_payouts.length > 0 ? (
                  <div className="space-y-2.5">
                    {analytics.payouts.recent_payouts.map((payout) => (
                      <div key={payout.id} className="bg-surface-light rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-text font-semibold text-sm truncate">{payout.event_title || "Event payout"}</p>
                          <p className="text-text-dim text-[11px]">{payout.status} · net {formatRupees(payout.net_amount)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-text font-bold text-sm">{formatRupees(payout.gross_amount)}</p>
                          <p className="text-text-dim text-[11px]">fees {formatRupees(payout.platform_fee)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-dim text-xs">No payouts generated yet.</p>
                )}
              </motion.section>
            )}

            {/* ════ STATUS KEY ════ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38 }}
              className="flex flex-wrap items-center justify-center gap-4 pt-2 pb-4"
            >
              {[
                { Icon: CheckCircle2, label: "Approved", color: "text-success" },
                { Icon: Clock, label: "Pending", color: "text-warning" },
                { Icon: XCircle, label: "Rejected/Cancelled", color: "text-error" },
              ].map(({ Icon, label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <span className="text-text-dim text-[11px]">{label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ── Empty State ── */}
        {analytics && analytics.events.total === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <BarChart3 className="w-10 h-10 text-text-dim" />
            </div>
            <h2 className="text-text font-bold text-lg mb-1.5">No data yet</h2>
            <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">Host your first event to start tracking analytics</p>
            <Link to="/events/create" className="btn-primary-luxe font-bold px-7 py-3 rounded-xl inline-flex items-center gap-2">
              <PartyPopper className="w-4 h-4" />
              Create Event
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
