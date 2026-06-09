import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, Search, Star, CheckCircle2, Clock,
  AlertCircle, RefreshCw, UserCheck, IndianRupee,
  Crown, Calendar, MapPin,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Attendee {
  id: string;
  user_id: string;
  payment_id: string | null;
  checked_in: boolean;
  joined_at: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  social_rating: number;
}

interface EventInfo {
  id: string;
  title: string;
  date_time: string;
  location_city: string;
  max_capacity: number;
  current_attendees: number;
  ticket_price: number;
  host_id: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatPrice(paisa: number) {
  if (paisa === 0) return "Free";
  return `₹${(paisa / 100).toLocaleString("en-IN")}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (src) return <img src={src} alt={name} className="w-10 h-10 rounded-full object-cover ring-2 ring-border shrink-0" />;
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
      {initials}
    </div>
  );
}

// ─── Attendee Card ────────────────────────────────────────────────────────────

function AttendeeCard({ attendee, index }: { attendee: Attendee; index: number }) {
  const r = Math.round(attendee.social_rating * 2) / 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 340, damping: 30 }}
      className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-surface hover:border-border-hover transition-all"
    >
      <Link to={`/profile/${attendee.user_id}`} className="shrink-0">
        <Avatar src={attendee.avatar_url} name={attendee.display_name} />
      </Link>

      <Link to={`/profile/${attendee.user_id}`} className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text truncate leading-tight">{attendee.display_name}</p>
        <p className="text-[11px] text-text-dim truncate">@{attendee.username}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {attendee.social_rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-warning fill-warning" />
              <span className="text-[10px] font-bold text-warning">{r.toFixed(1)}</span>
            </span>
          )}
          <span className="flex items-center gap-0.5 text-[10px] text-text-dim">
            <Clock className="w-2.5 h-2.5" />
            Joined {timeAgo(attendee.joined_at)}
          </span>
        </div>
      </Link>

      <div className="shrink-0 flex flex-col items-end gap-1">
        {attendee.payment_id ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
            <IndianRupee className="w-2.5 h-2.5" /> Paid
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold text-text-dim bg-surface-light border border-border px-2 py-0.5 rounded-full">
            <UserCheck className="w-2.5 h-2.5" /> Free
          </span>
        )}
        {attendee.checked_in && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
            <CheckCircle2 className="w-3 h-3" /> Checked in
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendeesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError("");
    try {
      const [attendeesRes, eventRes] = await Promise.all([
        api.get(`/events/${eventId}/attendees`),
        api.get(`/events/${eventId}`),
      ]);
      setAttendees(attendeesRes.data.data.attendees);
      setEvent(eventRes.data.data.event);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load attendees"));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return attendees;
    const q = search.toLowerCase();
    return attendees.filter(
      (a) => a.display_name.toLowerCase().includes(q) || a.username.toLowerCase().includes(q)
    );
  }, [attendees, search]);

  // Host guard
  const isHost = event && user && event.host_id === user.id;

  const paidCount = attendees.filter((a) => a.payment_id).length;
  const revenue = event ? paidCount * event.ticket_price : 0;
  const fillPct = event && event.max_capacity > 0
    ? Math.round((event.current_attendees / event.max_capacity) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg pb-28 md:pb-12">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          <div className="shimmer h-10 w-40 rounded-xl" />
          <div className="shimmer h-28 rounded-2xl" />
          <div className="shimmer h-10 rounded-xl" />
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="shimmer h-16 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-10 h-10 text-error" />
        <p className="text-text font-bold">{error}</p>
        <button onClick={fetchData} className="btn-primary-luxe px-5 py-2.5 rounded-xl text-sm font-bold">Retry</button>
      </div>
    );
  }

  if (!event || (!isHost)) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-4 text-center">
        <Crown className="w-10 h-10 text-text-dim" />
        <p className="text-text font-bold">Access restricted</p>
        <p className="text-text-dim text-sm">Only the host can view attendees.</p>
        <Link to="/dashboard" className="btn-primary-luxe px-5 py-2.5 rounded-xl text-sm font-bold">Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12 premium-shell">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">

        {/* ── Back nav ── */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-5">
          <Link
            to={`/dashboard/${eventId}/requests`}
            className="flex items-center gap-1.5 text-text-dim hover:text-text text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Manage Requests
          </Link>
          <span className="text-border">|</span>
          <Link to="/dashboard" className="text-text-dim hover:text-text text-sm transition">Dashboard</Link>
        </motion.div>

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1">Attendees</p>
              <h1 className="text-xl font-bold text-text truncate leading-tight">{event.title}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-[11px] text-text-dim">
                  <Calendar className="w-3 h-3" />
                  {formatDate(event.date_time)} · {formatTime(event.date_time)}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-text-dim">
                  <MapPin className="w-3 h-3" />
                  {event.location_city}
                </span>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={fetchData} className="btn-secondary-luxe p-2.5 rounded-xl ml-3 shrink-0">
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* ── Stats strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3 mb-5"
        >
          <div className="glass-panel rounded-xl p-3 text-center">
            <p className="text-lg font-black text-text">{event.current_attendees}</p>
            <p className="text-[10px] text-text-dim">Attending</p>
            <p className="text-[9px] text-text-dim/60">of {event.max_capacity} cap.</p>
          </div>
          <div className="glass-panel rounded-xl p-3 text-center">
            <p className="text-lg font-black text-accent">{fillPct}%</p>
            <p className="text-[10px] text-text-dim">Capacity</p>
            <div className="h-1 rounded-full bg-surface-light mt-1 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${fillPct}%` }}
                transition={{ duration: 0.6 }}
                className="h-full bg-accent rounded-full"
              />
            </div>
          </div>
          {event.ticket_price > 0 ? (
            <div className="glass-panel rounded-xl p-3 text-center">
              <p className="text-lg font-black text-success">{formatPrice(revenue)}</p>
              <p className="text-[10px] text-text-dim">Revenue</p>
              <p className="text-[9px] text-text-dim/60">{paidCount} paid</p>
            </div>
          ) : (
            <div className="glass-panel rounded-xl p-3 text-center">
              <p className="text-lg font-black text-primary">Free</p>
              <p className="text-[10px] text-text-dim">Entry</p>
              <p className="text-[9px] text-text-dim/60">no ticket</p>
            </div>
          )}
        </motion.div>

        {/* ── Capacity bar ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
          className="mb-5"
        >
          <div className="flex justify-between text-[10px] text-text-dim mb-1.5">
            <span>{event.current_attendees} guests confirmed</span>
            <span>{event.max_capacity - event.current_attendees} spots left</span>
          </div>
          <div className="h-2 rounded-full bg-surface-light overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fillPct}%` }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className={`h-full rounded-full ${fillPct >= 90 ? "bg-error" : fillPct >= 70 ? "bg-warning" : "bg-success"}`}
            />
          </div>
        </motion.div>

        {/* ── Search ── */}
        {attendees.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${attendees.length} attendee${attendees.length !== 1 ? "s" : ""}…`}
              className="input-luxe w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
            />
          </div>
        )}

        {/* ── List ── */}
        {attendees.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-text-dim" />
            </div>
            <p className="text-text font-bold mb-1">No attendees yet</p>
            <p className="text-text-dim text-sm">When guests pay and join, they will appear here.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-text-dim text-sm">No attendees match "{search}"</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {filtered.map((a, i) => (
                <AttendeeCard key={a.id} attendee={a} index={i} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
