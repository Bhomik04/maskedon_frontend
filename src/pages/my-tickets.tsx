import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import type { Ticket } from "../types";
import {
  ArrowLeft, Ticket as TicketIcon, Calendar, MapPin, Clock,
  CheckCircle2, Loader2, Hash, Inbox,
  ChevronRight, Timer, Flame,
} from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatPrice(paisa: number) {
  if (!paisa || paisa === 0) return "Free";
  return `\u20b9${(paisa / 100).toLocaleString("en-IN")}`;
}

function getCountdown(isoDate: string): { label: string; urgent: boolean } {
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return { label: "Past", urgent: false };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days === 0) return { label: hours === 0 ? "Starting soon!" : `${hours}h away`, urgent: true };
  if (days === 1) return { label: "Tomorrow!", urgent: true };
  return { label: `${days} days away`, urgent: false };
}

function shortToken(token: string | null | undefined) {
  if (!token) return "N/A";
  return token.slice(0, 10).toUpperCase();
}

function TicketCard({ ticket, index }: { ticket: Ticket; index: number }) {
  const isUpcoming = ticket.event_date_time ? new Date(ticket.event_date_time) > new Date() : false;
  const countdown = isUpcoming ? getCountdown(ticket.event_date_time) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.05, 0.3),
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
    >
      <Link
        to={`/events/${ticket.event_id}/ticket`}
        className="block relative overflow-hidden rounded-2xl border border-border bg-surface shadow-lg group hover:border-primary/30 transition-all duration-300"
      >
        {/* Top gradient accent */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-hot" />

        {/* Cover image strip */}
        {ticket.event_cover_image_url && (
          <div className="h-20 w-full overflow-hidden">
            <img
              src={ticket.event_cover_image_url}
              alt=""
              className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-500"
              loading="lazy"
            />
          </div>
        )}

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-text font-bold text-base leading-snug truncate group-hover:text-primary transition-colors">
                {ticket.event_title}
              </h3>
              {ticket.tier_name && (
                <p className="text-[10px] font-bold text-warning/90 mt-0.5 flex items-center gap-1">
                  <TicketIcon className="w-3 h-3" />
                  {ticket.tier_name}
                </p>
              )}
            </div>
            <div className="shrink-0">
              {ticket.checked_in ? (
                <div className="flex items-center gap-1.5 bg-success/15 border border-success/25 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-success" />
                  <span className="text-[10px] font-black text-success uppercase tracking-wider">Checked In</span>
                </div>
              ) : (ticket as any).refund_status ? (
                <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-full ${
                  (ticket as any).refund_status === 'pending_review'
                    ? "bg-warning/15 border-warning/25 text-warning"
                    : (ticket as any).refund_status === 'approved'
                      ? "bg-success/15 border-success/25 text-success"
                      : "bg-error/15 border-error/25 text-error"
                }`}>
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {(ticket as any).refund_status === 'pending_review' ? 'Refund Pending' : (ticket as any).refund_status === 'approved' ? 'Refunded' : 'Refund Rejected'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                  <TicketIcon className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-wider">Active</span>
                </div>
              )}
            </div>
          </div>

          {/* Details row */}
          <div className="flex items-center gap-3 text-text-muted text-xs flex-wrap">
            {ticket.event_date_time && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-primary shrink-0" />
                {formatDate(ticket.event_date_time)}
              </span>
            )}
            {ticket.event_date_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-accent shrink-0" />
                {formatTime(ticket.event_date_time)}
              </span>
            )}
            {ticket.event_location_city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-hot shrink-0" />
                {ticket.event_location_city}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-3 text-[10px] text-text-dim">
              <span className="flex items-center gap-1">
                <Hash className="w-2.5 h-2.5" />
                <span className="font-mono">{shortToken(ticket.qr_token)}</span>
              </span>
              {ticket.event_ticket_price > 0 && (
                <span className="font-bold text-success">{formatPrice(ticket.event_ticket_price)}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {countdown && isUpcoming && (
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  countdown.urgent
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success"
                }`}>
                  {countdown.urgent ? <Flame className="w-2.5 h-2.5" /> : <Timer className="w-2.5 h-2.5" />}
                  {countdown.label}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-text-dim group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/users/me/tickets")
      .then((res) => setTickets(res.data.data.tickets || []))
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load tickets")))
      .finally(() => setLoading(false));
  }, []);

  // Android hardware back button
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      navigate(-1);
    };
    window.addEventListener("capacitor:backButton", handler);
    return () => window.removeEventListener("capacitor:backButton", handler);
  }, [navigate]);

  const upcomingTickets = useMemo(
    () => tickets.filter((t) => new Date(t.event_date_time) >= new Date()),
    [tickets]
  );
  const pastTickets = useMemo(
    () => tickets.filter((t) => new Date(t.event_date_time) < new Date()),
    [tickets]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12 premium-shell">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-text-dim hover:text-text text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/15 to-hot/10 flex items-center justify-center">
              <TicketIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Your Collection</p>
              <h1 className="text-2xl font-bold text-text tracking-tight">My Tickets</h1>
            </div>
          </div>
          {tickets.length > 0 && (
            <p className="text-text-dim text-sm mt-2">
              {upcomingTickets.length} upcoming · {pastTickets.length} past
            </p>
          )}
        </motion.div>

        {error && (
          <div className="bg-error/10 border border-error/20 rounded-xl p-3.5 text-error text-sm mb-5">
            {error}
          </div>
        )}

        {tickets.length === 0 && !error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-hot/10 flex items-center justify-center mx-auto mb-5">
              <Inbox className="w-10 h-10 text-text-dim" />
            </div>
            <h2 className="text-text font-bold text-lg mb-1.5">No tickets yet</h2>
            <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">
              When you purchase tickets for events, they'll show up here.
            </p>
            <Link
              to="/events"
              className="btn-primary-luxe font-bold px-7 py-3 rounded-xl inline-flex items-center gap-2"
            >
              Discover Events
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Tickets */}
            {upcomingTickets.length > 0 && (
              <div>
                <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Upcoming ({upcomingTickets.length})
                </h2>
                <div className="space-y-3">
                  <AnimatePresence>
                    {upcomingTickets.map((ticket, i) => (
                      <TicketCard key={ticket.attendee_id} ticket={ticket} index={i} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Past Tickets */}
            {pastTickets.length > 0 && (
              <div>
                <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-text-dim" />
                  Past ({pastTickets.length})
                </h2>
                <div className="space-y-3">
                  <AnimatePresence>
                    {pastTickets.map((ticket, i) => (
                      <TicketCard key={ticket.attendee_id} ticket={ticket} index={i} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
