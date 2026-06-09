import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import { getApiErrorMessage } from "../lib/errors";
import { getTrustLevel, TRUST_LEVELS } from "../lib/trust-levels";
import TrustBadge from "../components/trust-badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, ArrowLeft, AlertCircle, RefreshCw,
  Calendar, Users, CheckCircle2, Crown,
  TrendingUp, Award,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RatingHistoryEntry {
  event_id: string;
  event_title: string;
  event_date: string;
  avg_score: number;
  total_votes: number;
  user_voted: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function StarRow({ value, max = 5, size = "sm" }: { value: number; max?: number; size?: "sm" | "md" }) {
  const sz = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.round(value);
        return (
          <Star key={i} className={`${sz} ${filled ? "text-warning fill-warning" : "text-text-dim/30"}`} />
        );
      })}
    </div>
  );
}

// ─── Trust Ladder ─────────────────────────────────────────────────────────────

function TrustLadder({ currentRating, totalEvents }: { currentRating: number; totalEvents: number }) {
  const current = getTrustLevel(currentRating, totalEvents);
  const levels = TRUST_LEVELS;

  return (
    <div className="space-y-2">
      {levels.map((lvl, i) => {
        const isActive = lvl.name === current.name;
        const thresholds = [0, 0.1, 2.0, 3.0, 3.6, 4.3, 4.8];
        const needed = thresholds[i];
        const pct = i === 0 ? 100 : Math.min(100, Math.max(0, ((currentRating - (thresholds[i - 1] ?? 0)) / ((thresholds[i] ?? 5) - (thresholds[i - 1] ?? 0))) * 100));

        return (
          <div key={lvl.name} className={`flex items-center gap-3 rounded-xl p-2.5 border transition ${isActive ? "bg-surface border-border" : "border-transparent"}`}>
            <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "ring-2 ring-offset-1 ring-border" : ""} ${lvl.bgClass}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${isActive ? "text-text" : "text-text-dim"}`}>{lvl.name}</span>
                <span className="text-[9px] text-text-dim">{needed > 0 ? `${needed}+ stars` : "Default"}</span>
              </div>
              {isActive && (
                <div className="h-1 rounded-full bg-surface-light overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={`h-full rounded-full ${lvl.bgClass}`}
                  />
                </div>
              )}
            </div>
            {isActive && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Event Rating Card ────────────────────────────────────────────────────────

function EventRatingCard({ entry, index }: { entry: RatingHistoryEntry; index: number }) {
  const avg = Number(entry.avg_score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 340, damping: 30 }}
      className="flex items-start gap-3 p-3.5 rounded-2xl border border-border bg-surface hover:border-border-hover transition"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/15 border border-primary/15 flex items-center justify-center shrink-0">
        <Star className="w-5 h-5 text-warning fill-warning" />
      </div>
      <div className="flex-1 min-w-0">
        <Link to={`/events/${entry.event_id}`} className="text-sm font-bold text-text hover:text-primary transition truncate block">
          {entry.event_title}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="flex items-center gap-1 text-[11px] text-text-dim">
            <Calendar className="w-2.5 h-2.5" />
            {formatDate(entry.event_date)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-text-dim">
            <Users className="w-2.5 h-2.5" />
            {entry.total_votes} vote{entry.total_votes !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="mt-1.5">
          <StarRow value={avg} />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xl font-black text-warning">{avg > 0 ? avg.toFixed(1) : "—"}</p>
        <p className="text-[9px] text-text-dim">avg score</p>
        {entry.user_voted ? (
          <span className="text-[9px] text-success font-bold">Voted</span>
        ) : (
          <span className="text-[9px] text-text-dim">Not voted</span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyRatingsPage() {
  const { user } = useAuth();

  const [history, setHistory] = useState<RatingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "voted" | "pending">("all");

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/users/${user.id}/ratings`);
      setHistory(res.data.data.history);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load rating history"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const rating = Number(user?.social_rating ?? 0);
  const totalEvents = user?.events_attended ?? 0;
  const trustLevel = getTrustLevel(rating, totalEvents);

  const votedCount = history.filter((h) => h.user_voted).length;
  const pendingCount = history.filter((h) => !h.user_voted).length;

  const filtered = history.filter((h) => {
    if (filter === "voted") return h.user_voted;
    if (filter === "pending") return !h.user_voted;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-bg pb-28 md:pb-12">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          <div className="shimmer h-8 w-32 rounded-xl" />
          <div className="shimmer h-28 rounded-2xl" />
          <div className="shimmer h-40 rounded-2xl" />
          {[0, 1, 2].map((i) => <div key={i} className="shimmer h-20 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-10 h-10 text-error" />
        <p className="text-text font-bold">{error}</p>
        <button onClick={fetchHistory} className="btn-primary-luxe px-5 py-2.5 rounded-xl text-sm font-bold">Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12 premium-shell">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-5">
          <Link to="/profile/me" className="flex items-center gap-1.5 text-text-dim hover:text-text text-sm font-semibold transition">
            <ArrowLeft className="w-4 h-4" />
            My Profile
          </Link>
          <button onClick={fetchHistory} aria-label="Refresh ratings" className="ml-auto btn-secondary-luxe p-2 rounded-xl tap-active">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Social</p>
          <h1 className="text-2xl font-black text-text">My Ratings</h1>
        </motion.div>

        {/* ── Rating card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-panel rounded-2xl p-5 mb-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <TrustBadge rating={rating} totalEvents={totalEvents} size="lg" showLabel={false} />
              <span className={`text-[10px] font-bold ${trustLevel.textClass}`}>{trustLevel.name}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-4xl font-black text-text">{rating > 0 ? rating.toFixed(1) : "—"}</p>
                <p className="text-text-dim text-sm">/5.0</p>
              </div>
              <StarRow value={rating} size="md" />
              <p className="text-[11px] text-text-dim mt-1">
                {user?.total_ratings ?? 0} rating{(user?.total_ratings ?? 0) !== 1 ? "s" : ""} received
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1 text-xs text-text-dim">
                <TrendingUp className="w-3 h-3" />
                <span>{totalEvents} attended</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-text-dim">
                <Award className="w-3 h-3" />
                <span>{votedCount} voted</span>
              </div>
            </div>
          </div>

          {rating === 0 && (
            <div className="mt-4 p-3 rounded-xl bg-surface-light border border-border text-center">
              <Crown className="w-5 h-5 text-text-dim mx-auto mb-1" />
              <p className="text-xs text-text-dim">Attend events and rate the crowd to build your social score.</p>
            </div>
          )}
        </motion.div>

        {/* ── Trust ladder ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-2xl p-4 mb-5"
        >
          <p className="text-xs font-bold text-text mb-3 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-primary" /> Trust Level Ladder
          </p>
          <TrustLadder currentRating={rating} totalEvents={totalEvents} />
        </motion.div>

        {/* ── History tabs ── */}
        {history.length > 0 && (
          <div className="flex gap-1.5 p-1.5 bg-surface-light rounded-xl border border-border mb-4">
            {(["all", "voted", "pending"] as const).map((tab) => {
              const counts = { all: history.length, voted: votedCount, pending: pendingCount };
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition capitalize ${filter === tab ? "bg-surface text-text shadow-sm" : "text-text-dim hover:text-text"}`}
                >
                  {tab === "all" ? "All" : tab === "voted" ? "Voted" : "Pending"}
                  <span className="ml-1 opacity-60">({counts[tab]})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── History list ── */}
        {history.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 text-text-dim" />
            </div>
            <p className="text-text font-bold mb-1">No rating history</p>
            <p className="text-text-dim text-sm">Attend events to start building your social rating history.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-text-dim text-sm">No {filter} entries.</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {filtered.map((entry, i) => (
                <EventRatingCard key={entry.event_id} entry={entry} index={i} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
