import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, Calendar, MapPin, Ticket, CheckCircle2, Clock,
  AlertCircle, Star, Users, Tag, Hash, Loader2, IndianRupee,
  ScanLine, UserPlus, X, Check,
} from "lucide-react";
import type { Ticket as TicketType, GroupSlot } from "../types";

// --- Helpers ---

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
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

function shortToken(token: string | null | undefined) {
  if (!token) return "N/A";
  return token.slice(0, 12).toUpperCase();
}

// --- Main Page ---

export default function DigitalTicketPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [groupSlots, setGroupSlots] = useState<GroupSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assigningSlotId, setAssigningSlotId] = useState<string | null>(null);
  const [assignUsername, setAssignUsername] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/events/${eventId}/my-ticket`);
      setTicket(res.data.data.ticket as TicketType);
      setGroupSlots(res.data.data.group_slots ?? []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load ticket"));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="w-10 h-10 text-error" />
        <p className="text-text font-bold">{error || "Ticket not found"}</p>
        <p className="text-sm text-text-dim">
          If you completed payment, use the button below to recover your ticket.
        </p>
        {recoveryError && (
          <p className="text-xs text-error max-w-xs">{recoveryError}</p>
        )}
        <button
          onClick={async () => {
            setRecovering(true);
            setRecoveryError("");
            try {
              await api.post(`/events/${eventId}/payment/recover`);
              await fetchTicket();
            } catch (err) {
              setRecoveryError(getApiErrorMessage(err, "Could not recover ticket. Please contact support."));
            } finally {
              setRecovering(false);
            }
          }}
          disabled={recovering}
          className="btn-primary-luxe px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-60"
        >
          {recovering
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Recovering…</>
            : <><Ticket className="w-4 h-4" /> Recover Ticket</>
          }
        </button>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-text-dim underline"
        >
          Go back
        </button>
      </div>
    );
  }

  async function handleAssignSlot(attendeeId: string) {
    setAssigning(true);
    setAssignError("");
    try {
      await api.post(`/events/${eventId}/attendees/${attendeeId}/assign`, { username: assignUsername.trim() });
      setAssigningSlotId(null);
      setAssignUsername("");
      // Refresh slots
      const res = await api.get(`/events/${eventId}/my-ticket`);
      setGroupSlots(res.data.data.group_slots ?? []);
    } catch (err) {
      setAssignError(getApiErrorMessage(err, "Failed to assign slot"));
    } finally {
      setAssigning(false);
    }
  }

  const isUpcoming = ticket.event_date_time ? new Date(ticket.event_date_time) > new Date() : false;
  const tags = ticket.event_tags
    ? (Array.isArray(ticket.event_tags)
        ? ticket.event_tags.map((t: string) => t.trim()).filter(Boolean)
        : ticket.event_tags.split(",").map((t: string) => t.trim()).filter(Boolean))
    : [];

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12 premium-shell">
      <div className="max-w-sm mx-auto px-4 py-6 md:py-10">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
          <Link
            to="/access-hub"
            className="flex items-center gap-1.5 text-text-dim hover:text-text text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Access Hub
          </Link>
        </motion.div>

        {/* Ticket card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          {/* Cover banner */}
          {ticket.event_cover_image_url && (
            <div className="h-28 w-full rounded-t-3xl overflow-hidden">
              <img src={ticket.event_cover_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Main ticket body */}
          <div
            className={`relative bg-surface border border-border shadow-2xl ${
              ticket.event_cover_image_url ? "rounded-b-none rounded-t-none" : "rounded-t-3xl"
            }`}
          >
            <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-hot" />

            {/* Header */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Digital Ticket</p>
                  <h1 className="text-xl font-black text-text leading-tight">{ticket.event_title}</h1>
                  {ticket.tier_name && (
                    <p className="text-[10px] font-bold text-warning/90 mt-1 flex items-center gap-1">
                      <Ticket className="w-3 h-3" />
                      {ticket.tier_name}
                      {ticket.group_size > 1 && <span className="text-text-dim"> · Slot {ticket.slot_index} of {ticket.group_size}</span>}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {ticket.checked_in ? (
                    <div className="flex items-center gap-1.5 bg-success/20 border border-success/30 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      <span className="text-[10px] font-black text-success uppercase tracking-wider">Checked In</span>
                    </div>
                  ) : (ticket as any).refund_status ? (
                    <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-full ${
                      (ticket as any).refund_status === 'pending_review'
                        ? "bg-warning/20 border-warning/30 text-warning"
                        : (ticket as any).refund_status === 'approved'
                          ? "bg-success/20 border-success/30 text-success"
                          : "bg-error/20 border-error/30 text-error"
                    }`}>
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {(ticket as any).refund_status === 'pending_review' ? 'Refund Pending' : (ticket as any).refund_status === 'approved' ? 'Refunded' : 'Refund Rejected'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-success/15 border border-success/25 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      <span className="text-[10px] font-black text-success uppercase tracking-wider">Approved</span>
                    </div>
                  )}
                  {isUpcoming && !ticket.checked_in && !(ticket as any).refund_status && (
                    <span className="flex items-center gap-1 text-[9px] text-warning font-bold">
                      <Clock className="w-2.5 h-2.5 animate-pulse" /> Upcoming
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="px-5 pb-4 grid grid-cols-2 gap-3">
              {ticket.event_date_time && (
                <div className="bg-surface-light rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3 h-3 text-primary" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-dim">Date</span>
                  </div>
                  <p className="text-xs font-bold text-text leading-snug">{formatDate(ticket.event_date_time)}</p>
                </div>
              )}
              {ticket.event_date_time && (
                <div className="bg-surface-light rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3 h-3 text-accent" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-dim">Time</span>
                  </div>
                  <p className="text-xl font-black text-text">{formatTime(ticket.event_date_time)}</p>
                </div>
              )}
              {ticket.event_location_city && (
                <div className="bg-surface-light rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3 h-3 text-hot" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-dim">Location</span>
                  </div>
                  <p className="text-xs font-bold text-text">{ticket.event_location_city}</p>
                </div>
              )}
              {ticket.event_ticket_price !== undefined && (
                <div className="bg-surface-light rounded-xl p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <IndianRupee className="w-3 h-3 text-success" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-dim">Entry</span>
                  </div>
                  <p className="text-xl font-black text-text">{formatPrice(ticket.event_ticket_price)}</p>
                </div>
              )}
            </div>

            {/* Attendee info */}
            <div className="px-5 pb-4 flex items-center gap-3">
              {ticket.guest_avatar_url ? (
                <img
                  src={ticket.guest_avatar_url}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {(ticket.guest_display_name ?? user?.display_name ?? "G").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text truncate">{ticket.guest_display_name}</p>
                <p className="text-[10px] text-text-dim truncate">@{ticket.guest_username}</p>
              </div>
              {ticket.guest_social_rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                  <span className="text-xs font-bold text-warning">{ticket.guest_social_rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full"
                  >
                    <Tag className="w-2.5 h-2.5" /> {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Tear line */}
            <div className="relative flex items-center px-4 my-1">
              <div className="w-5 h-5 rounded-full bg-bg border border-border absolute -left-2.5" />
              <div className="flex-1 border-t-2 border-dashed border-border" />
              <div className="w-5 h-5 rounded-full bg-bg border border-border absolute -right-2.5" />
            </div>

            {/* Stub — QR code */}
            <div className="px-5 py-5 flex flex-col items-center gap-3">
              {ticket.event_max_capacity !== null && !(ticket as any).refund_status && (
                <div className="flex items-center gap-1.5 text-[10px] text-text-dim">
                  <Users className="w-3 h-3" />
                  <span>{ticket.event_current_attendees} / {ticket.event_max_capacity} attending</span>
                </div>
              )}

              {(ticket as any).refund_status ? (
                <div className="w-full text-center py-6 px-4 bg-surface-light rounded-2xl border border-border">
                  <AlertCircle className={`w-8 h-8 mx-auto mb-2.5 ${
                    (ticket as any).refund_status === 'pending_review'
                      ? "text-warning"
                      : (ticket as any).refund_status === 'approved'
                        ? "text-success"
                        : "text-error"
                  }`} />
                  <h3 className="text-sm font-bold text-text mb-1">
                    {(ticket as any).refund_status === 'pending_review' && 'Refund Request Under Review'}
                    {(ticket as any).refund_status === 'approved' && 'Refund Approved & Processed'}
                    {(ticket as any).refund_status === 'rejected' && 'Refund Request Rejected'}
                  </h3>
                  <p className="text-xs text-text-dim max-w-xs mx-auto mb-3">
                    {(ticket as any).refund_status === 'pending_review' && 'The event organizer or platform admin is reviewing your cancellation and refund request.'}
                    {(ticket as any).refund_status === 'approved' && 'Your ticket has been cancelled and refund has been initiated to your original payment method.'}
                    {(ticket as any).refund_status === 'rejected' && 'The request has been rejected.'}
                  </p>
                  {(ticket as any).refund_admin_note && (
                    <div className="text-left bg-surface/50 border border-border/70 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">Admin Note</p>
                      <p className="text-xs text-text">{(ticket as any).refund_admin_note}</p>
                    </div>
                  )}
                </div>
              ) : ticket.checked_in ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-white rounded-xl border-2 border-border opacity-50">
                    <QRCodeSVG value={ticket.qr_token} size={160} level="M" />
                  </div>
                  <div className="flex items-center gap-1.5 bg-success/15 border border-success/25 px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-xs font-black text-success">Scanned &amp; Checked In</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-white rounded-xl border-2 border-primary/20 shadow-lg shadow-primary/10">
                    <QRCodeSVG value={ticket.qr_token} size={180} level="M" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-text-dim">
                    <ScanLine className="w-3 h-3" />
                    <span>Host scans this at the door — one time only</span>
                  </div>
                </div>
              )}

              {!ticket.checked_in && !(ticket as any).refund_status && (
                <div className="flex items-center gap-1.5 text-[9px] text-text-dim">
                  <Hash className="w-2.5 h-2.5" />
                  Ticket: <span className="font-mono text-[9px]">{shortToken(ticket.qr_token)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-3 bg-surface border-x border-b border-border rounded-b-3xl" />
        </motion.div>

        {/* Group slots (multi-person tickets) */}
        {groupSlots.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-4 space-y-3">
            <p className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Group Slots
            </p>
            {groupSlots.map((slot) => (
              <div key={slot.attendee_id} className="glass-panel rounded-2xl p-4 border border-border">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">Slot {slot.slot_index} of {slot.group_size}</p>
                    {slot.user_id ? (
                      <div className="flex items-center gap-2">
                        {slot.avatar_url ? (
                          <img src={slot.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                            {(slot.display_name ?? slot.username ?? "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-text">{slot.display_name}</p>
                          <p className="text-[10px] text-text-dim">@{slot.username}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-text-dim italic">Unassigned</p>
                    )}
                  </div>
                  {slot.checked_in ? (
                    <div className="flex items-center gap-1 text-success text-[10px] font-bold shrink-0">
                      <Check className="w-3.5 h-3.5" /> Checked in
                    </div>
                  ) : !slot.user_id && slot.slot_index !== 1 ? (
                    assigningSlotId === slot.attendee_id ? null : (
                      <button
                        onClick={() => { setAssigningSlotId(slot.attendee_id); setAssignUsername(""); setAssignError(""); }}
                        className="btn-secondary-luxe flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Assign
                      </button>
                    )
                  ) : null}
                </div>

                {/* Assign form */}
                {assigningSlotId === slot.attendee_id && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Enter username (without @)"
                      value={assignUsername}
                      onChange={(e) => setAssignUsername(e.target.value.replace(/^@/, ""))}
                      className="input-luxe w-full rounded-xl px-3 py-2.5 text-sm"
                      autoFocus
                    />
                    {assignError && <p className="text-xs text-error">{assignError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAssignSlot(slot.attendee_id)}
                        disabled={assigning || !assignUsername.trim()}
                        className="flex-1 btn-primary-luxe px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Confirm
                      </button>
                      <button
                        onClick={() => { setAssigningSlotId(null); setAssignUsername(""); setAssignError(""); }}
                        className="px-3 py-2 rounded-xl border border-border text-xs font-bold text-text-dim hover:bg-surface-light transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 space-y-3"
        >
          <Link
            to={`/events/${eventId}`}
            className="btn-secondary-luxe w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
          >
            <Ticket className="w-4 h-4" />
            View Event
          </Link>
          <p className="text-center text-[10px] text-text-dim">
            Show this QR code to the host at the entrance. It can only be scanned once.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
