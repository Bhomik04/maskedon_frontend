import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/auth-hook";
import type { Event, Attendee, FeeBreakdown, TicketTier } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { parseTags } from "../lib/parse-tags";
import { getTrustLevel } from "../lib/trust-levels";
import { ArrowLeft, MapPin, Calendar, Clock, Users, Star, Tag, Camera, Share2, Ticket, Shield, CheckCircle, Loader2, Send, PartyPopper, Edit3, MoreVertical, Flag, X, Lock, Copy, Leaf, Wine, Cigarette, AlertTriangle, EyeOff, Megaphone } from "lucide-react";
import ReportModal from "../components/ReportModal";
import type { EventAnnouncement } from "../types";

interface EventDetailPayload {
  event: Event;
  attendees: Attendee[];
  friends_attending: { user_id: string; display_name: string; avatar_url: string | null }[];
  host_stats?: { pending_count: number; approved_not_joined_count: number };
  fee_breakdown?: FeeBreakdown | null;
  viewer?: {
    request_status: string | null;
    request_id: string | null;
    is_attending: boolean;
  };
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `₹${(price / 100).toLocaleString("en-IN")}`;
}

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ message: string; refund_percent: number; refunded_amount: number } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcements, setAnnouncements] = useState<EventAnnouncement[]>([]);
  const [announcementSending, setAnnouncementSending] = useState(false);
  const [friendsAttending, setFriendsAttending] = useState<{ user_id: string; display_name: string; avatar_url: string | null }[]>([]);
  const [hostStats, setHostStats] = useState<{ pending_count: number; approved_not_joined_count: number } | null>(null);
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  const isHost = event && user && event.host_id === user.id;

  const loadEvent = useCallback(async () => {
    try {
      const detailRes = await api.get(`/events/${eventId}`);
      const data = detailRes.data.data as EventDetailPayload;

      setEvent(data.event);
      setAttendees(data.attendees || []);
      setFriendsAttending(data.friends_attending ?? []);
      setHostStats(data.host_stats ?? null);
      setFeeBreakdown(data.fee_breakdown ?? null);
      setRequestStatus(data.viewer?.request_status ?? null);
      setRequestId(data.viewer?.request_id ?? null);

      // Fetch ticket tiers (non-fatal)
      try {
        const tiersRes = await api.get(`/events/${eventId}/tiers`);
        const fetchedTiers: TicketTier[] = tiersRes.data.data.tiers ?? [];
        setTiers(fetchedTiers);
        // Pre-select the first tier if tiers exist
        if (fetchedTiers.length > 0 && !selectedTierId) {
          setSelectedTierId(fetchedTiers[0].id);
        }
      } catch {
        // tiers are optional; continue
      }
    } catch (loadError: unknown) {
      setError(getApiErrorMessage(loadError, "Event not found"));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    if (!event || !user) return;
    const canViewAnnouncements = event.host_id === user.id || requestStatus === "approved";
    if (!canViewAnnouncements) return;
    api.get(`/events/${eventId}/announcements`)
      .then((res) => setAnnouncements(res.data.data.announcements || []))
      .catch(() => setAnnouncements([]));
  }, [event, eventId, requestStatus, user]);

  // Android hardware back button → go to Discover
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      navigate("/events");
    };
    window.addEventListener("capacitor:backButton", handler);
    return () => window.removeEventListener("capacitor:backButton", handler);
  }, [navigate]);

  async function handleJoinRequest() {
    setRequesting(true);
    setError(""); // #31
    try {
      const res = await api.post(`/events/${eventId}/requests`, {
        message: message || undefined,
        tier_id: tiers.length > 0 ? selectedTierId : undefined,
      });
      setRequestStatus("pending");
      setRequestId(res.data.data.request?.id ?? null);
      setMessage("");
      setError(""); // #31 — clear on success
    } catch (joinError: unknown) {
      setError(getApiErrorMessage(joinError, "Failed to send request"));
    } finally {
      setRequesting(false);
    }
  }

  async function handleMessageHost() {
    if (!event) return;
    try {
      const res = await api.post("/messages/conversations", { event_id: event.id });
      const convId = res.data.data.conversation?.id;
      if (convId) navigate(`/messages/${convId}`);
    } catch {
      navigate("/messages");
    }
  }

  async function handleWithdraw() {
    if (!requestId) return;
    setWithdrawing(true);
    setError("");
    try {
      await api.delete(`/events/${eventId}/requests/${requestId}`);
      setRequestStatus("withdrawn");
      setRequestId(null);
    } catch (withdrawError: unknown) {
      setError(getApiErrorMessage(withdrawError, "Failed to withdraw request"));
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleCancelTicket() {
    if (!eventId) return;
    setCancelling(true);
    setError("");
    try {
      const res = await api.delete(`/events/${eventId}/attend`);
      const result = res.data.data as { message: string; refund_percent: number; refunded_amount: number };
      setCancelResult(result);
      setShowCancelConfirm(false);
      loadEvent();
    } catch (cancelError: unknown) {
      setError(getApiErrorMessage(cancelError, "Failed to cancel ticket"));
      setShowCancelConfirm(false);
    } finally {
      setCancelling(false);
    }
  }

  async function handlePay() {
    setPaying(true);
    setError("");
    try {
      // Step 1: Create a Cashfree payment order on the backend
      const initRes = await api.post(`/events/${eventId}/pay/initiate`);
      const { payment_session_id } = initRes.data.data as { payment_session_id: string; order_id: string };

      // Step 2: Load Cashfree SDK and open hosted checkout
      // The page will navigate away — don't setPaying(false)
      const { loadCashfreeSDK } = await import("../lib/cashfree");
      const cashfree = await loadCashfreeSDK();
      cashfree.checkout({ paymentSessionId: payment_session_id, redirectTarget: "_self" });
    } catch (payError: unknown) {
      // If the server tells us the order was already paid, navigate to the ticket
      const axiosErr = payError as { response?: { data?: { error?: { code?: string } } } };
      if (axiosErr?.response?.data?.error?.code === "PAYMENT_ALREADY_PROCESSED") {
        navigate(`/events/${eventId}/ticket`);
        return;
      }
      setError(getApiErrorMessage(payError, "Payment initiation failed"));
      setPaying(false);
    }
  }

  async function handlePostAnnouncement() {
    if (!eventId || !announcementBody.trim()) return;
    setAnnouncementSending(true);
    try {
      const res = await api.post(`/events/${eventId}/announcements`, { body: announcementBody.trim() });
      setAnnouncements((prev) => [res.data.data.announcement, ...prev]);
      setAnnouncementBody("");
    } catch (announcementError: unknown) {
      setError(getApiErrorMessage(announcementError, "Failed to send announcement"));
    } finally {
      setAnnouncementSending(false);
    }
  }

  // Share state
  const [shareToast, setShareToast] = useState("");
  const shareTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [codeCopied, setCodeCopied] = useState(false);

  // Report state
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    return () => clearTimeout(shareTimerRef.current);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setShowMoreMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Auto-verify payment after Cashfree redirects back to this page
  // Cashfree appends ?order_id=<order_id> to the return URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");
    if (!orderId) return;

    // Clean the URL so refreshing doesn't re-trigger verification
    navigate(`/events/${eventId}`, { replace: true });

    setVerifying(true);
    api
      .post(`/events/${eventId}/pay/verify`, { order_id: orderId })
      .then(() => {
        setRequestStatus("paid");
        setMessage("Payment confirmed! You're attending. 🎉");
        loadEvent();
        // Navigate to the digital ticket after a brief delay
        setTimeout(() => navigate(`/events/${eventId}/ticket`), 1500);
      })
      .catch((e: unknown) => {
        // If the backend already admitted the user during a recovery step, don't show an
        // error — just redirect to their ticket.
        const axiosErr = e as { response?: { data?: { error?: { code?: string } } } };
        const code = axiosErr?.response?.data?.error?.code;
        if (code === "PAYMENT_ALREADY_PROCESSED") {
          navigate(`/events/${eventId}/ticket`, { replace: true });
          return;
        }
        setError(getApiErrorMessage(e, "Payment verification failed. Contact support if you were charged."));
      })
      .finally(() => {
        setVerifying(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only



  // #30 — Share / copy link
  function handleShare() {
    const appUrl = (import.meta.env.VITE_APP_URL as string) || "https://maskedon.com";
    const url = `${appUrl}/events/${eventId}`;
    if (navigator.share) {
      navigator.share({ title: event?.title || "MaskedOn Event", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareToast("Link copied!");
        clearTimeout(shareTimerRef.current);
        shareTimerRef.current = setTimeout(() => setShareToast(""), 2000);
      }).catch(() => {});
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <PartyPopper className="w-12 h-12 text-text-dim mx-auto mb-4" />
          <p className="text-error text-lg font-semibold">{error || "Event not found"}</p>
        </div>
      </div>
    );
  }

  const tags = parseTags(event.tags);
  const alreadyAttending = attendees.some((a) => a.user_id === user?.id);
  const isEventPast = new Date(event.end_time ?? event.date_time) < new Date();
  const canRate = isEventPast && (isHost || alreadyAttending);
  const canRequestToJoin = event.status === "upcoming";

  function getStatusClasses(status: string) {
    switch (status) {
      case "upcoming": return "status-upcoming";
      case "ongoing": return "status-ongoing";
      case "completed": return "status-completed";
      default: return "status-cancelled";
    }
  }

  return (
    <div className="min-h-screen bg-bg pb-32 md:pb-8">
      {/* Hero image — #29 gradient placeholder when no cover */}
      <div className="relative h-64 md:h-96 overflow-hidden bg-surface">
        {event.cover_image_url ? (
          <motion.img
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.2 }}
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-hot/10 flex items-center justify-center">
            <PartyPopper className="w-20 h-20 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-bg/60 backdrop-blur-md border border-primary/10 flex items-center justify-center text-text hover:bg-bg/80 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {/* #30 — Share button + "..." report menu */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button onClick={handleShare} aria-label="Share this event" title="Share" className="w-10 h-10 rounded-full bg-bg/60 backdrop-blur-md border border-primary/10 flex items-center justify-center text-text hover:bg-bg/80 transition">
            <Share2 className="w-5 h-5" />
          </button>
          {user && !isHost && (
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu((v) => !v)}
                aria-label="More options"
                className="w-10 h-10 rounded-full bg-bg/60 backdrop-blur-md border border-primary/10 flex items-center justify-center text-text hover:bg-bg/80 transition"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-1 glass-panel rounded-xl shadow-2xl overflow-hidden z-20 w-44">
                  <button
                    onClick={() => { setShowMoreMenu(false); setShowReportModal(true); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-warning hover:bg-warning/10 transition flex items-center gap-2"
                  >
                    <Flag className="w-3.5 h-3.5" /> Report Event
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Title & Status */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-3xl md:text-4xl font-bold text-text flex-1 tracking-tight break-all [overflow-wrap:anywhere]">{event.title}</h1>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full whitespace-nowrap ${getStatusClasses(event.status)}`}>
                {event.status}
              </span>
            </div>
            {/* Host stats panel */}
            {isHost && (
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="text-text-muted text-xs font-semibold whitespace-nowrap">
                  <span className="text-success font-bold">{event.current_attendees ?? 0}</span> joined
                </span>
                {hostStats && (
                  <>
                    <span className="text-text-muted text-xs font-semibold whitespace-nowrap">
                      <span className="text-warning font-bold">{hostStats.pending_count}</span> pending
                    </span>
                    <span className="text-text-muted text-xs font-semibold whitespace-nowrap">
                      <span className="text-accent font-bold">{hostStats.approved_not_joined_count}</span> invited, not joined
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Key details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { icon: Calendar, label: "Date", value: new Date(event.date_time).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" }), sub: new Date(event.date_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), color: "text-primary" },
              { icon: MapPin, label: "Location", value: event.location_city, sub: event.location_name, color: "text-accent" },
              { icon: Ticket, label: "Entry", value: tiers.length > 0 ? `${tiers.length} tier${tiers.length !== 1 ? "s" : ""}` : formatPrice(event.ticket_price), sub: tiers.length > 0 ? `From ${formatPrice(Math.min(...tiers.map((t) => t.price)))}` : event.ticket_price === 0 ? "No cover charge" : "Per person", color: "text-hot" },
              { icon: Shield, label: "Trust Gate", value: event.min_rating > 0 ? getTrustLevel(Number(event.min_rating), 1).name + "+" : "Open", sub: event.min_rating > 0 ? `${Number(event.min_rating).toFixed(1)}+ required` : "No restriction", color: "text-warning" },
            ].map((item) => (
              <div key={item.label} className="glass-panel rounded-2xl p-4">
                <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
                <p className="text-text-dim text-[10px] uppercase tracking-wider font-bold mb-1">{item.label}</p>
                <p className="text-text text-sm font-bold break-all [overflow-wrap:anywhere]">{item.value}</p>
                <p className="text-text-dim text-xs mt-0.5 break-all [overflow-wrap:anywhere]">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* About */}
          {event.description && (
            <div className="mb-8">
              <h2 className="text-base font-bold text-text mb-3 flex items-center gap-2">
                <PartyPopper className="w-4 h-4 text-primary" />
                About this Event
              </h2>
              <p className="text-text-muted leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm glass-panel rounded-2xl p-5">{event.description}</p>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5" />
                Vibes
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="text-xs font-semibold text-accent bg-accent/10 border border-accent/15 px-3 py-1.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Food type + badges */}
          {(event.food_type || event.allow_photos === false) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {event.food_type === "veg" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-success/10 text-success border border-success/20">
                  <Leaf className="w-3.5 h-3.5" /> Veg
                </span>
              )}
              {event.food_type === "non_veg" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-error/10 text-error border border-error/20">
                  🍖 Non-Veg
                </span>
              )}
              {event.food_type === "vegan" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                  <Leaf className="w-3.5 h-3.5" /> Vegan
                </span>
              )}
              {event.allow_photos === false && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-surface-light text-text-dim border border-border">
                  <EyeOff className="w-3.5 h-3.5" /> No Photo Uploads
                </span>
              )}
            </div>
          )}

          {/* Substance disclosures */}
          {(event.allows_alcohol || event.allows_smoking || event.allows_other_substances) && (
            <div className="mb-8 space-y-2">
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-warning/8 border border-warning/20">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-warning">Atmosphere Disclosure</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {event.allows_alcohol && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning/90 bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20">
                        <Wine className="w-3 h-3" /> Alcohol
                      </span>
                    )}
                    {event.allows_smoking && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning/90 bg-warning/10 px-2.5 py-1 rounded-full border border-warning/20">
                        <Cigarette className="w-3 h-3" /> Smoking
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {event.allows_other_substances && (
                <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-error/8 border border-error/20">
                  <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-error/90 leading-relaxed">
                    Other substances may be present. 18+ advisory. Ensure compliance with local laws before attending.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Private code (host only) */}
          {isHost && event.is_private && event.private_code && (
            <div className="mb-8">
              <div className="glass-panel rounded-2xl p-5 border border-warning/20">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-warning" />
                  <p className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em]">Private Access Code</p>
                </div>
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-xl font-mono font-bold text-warning tracking-[0.25em] py-2 px-4 bg-warning/8 rounded-xl border border-warning/15">
                    {event.private_code}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(event.private_code!).then(() => {
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      }).catch(() => {});
                    }}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-warning/10 text-warning text-xs font-bold border border-warning/20 hover:bg-warning/20 transition tap-active"
                  >
                    {codeCopied ? <><CheckCircle className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                  </button>
                </div>
                <p className="text-[11px] text-text-dim mt-2.5">Share this code only with guests you want to invite.</p>
              </div>
            </div>
          )}

          {/* Announcements */}
          {(isHost || requestStatus === "approved") && (
            <div className="mb-8">
              <div className="glass-panel rounded-2xl p-5 border border-accent/15">
                <div className="flex items-center gap-2 mb-4">
                  <Megaphone className="w-4 h-4 text-accent" />
                  <p className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em]">Event Announcements</p>
                </div>

                {isHost && (
                  <div className="mb-5 space-y-3">
                    <textarea
                      value={announcementBody}
                      onChange={(e) => setAnnouncementBody(e.target.value.slice(0, 2000))}
                      rows={3}
                      placeholder="Share an update with approved attendees..."
                      className="input-luxe w-full rounded-2xl px-4 py-3 resize-none text-sm"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handlePostAnnouncement}
                        disabled={announcementSending || !announcementBody.trim()}
                        className="btn-primary-luxe px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
                      >
                        {announcementSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Post update
                      </button>
                    </div>
                  </div>
                )}

                {announcements.length === 0 ? (
                  <p className="text-sm text-text-muted">No announcements yet.</p>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="rounded-2xl border border-border bg-bg/60 p-4">
                        <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">{announcement.body}</p>
                        <p className="text-[10px] text-text-dim mt-2">
                          {new Date(announcement.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Map — host always sees it; attendees see it on free events or after payment */}
          {event.latitude != null && event.longitude != null ? (
            (() => {
              const canSeeMap = isHost || event.ticket_price === 0 || requestStatus === "paid" || requestStatus === "approved";
              if (!canSeeMap) {
                return (
                  <div className="mb-8">
                    <div className="relative rounded-2xl overflow-hidden border border-border h-36 bg-surface-light flex items-center justify-center">
                      <div className="absolute inset-0 backdrop-blur-sm" />
                      <div className="relative text-center space-y-2">
                        <Lock className="w-6 h-6 text-text-dim mx-auto" />
                        <p className="text-xs font-semibold text-text-muted">Exact location revealed after ticket purchase</p>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div className="mb-8">
                  <h3 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    Location Map
                  </h3>
                  <div className="rounded-2xl overflow-hidden border border-border h-52">
                    <iframe
                      title="Event location"
                      width="100%"
                      height="100%"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.longitude - 0.005},${event.latitude - 0.005},${event.longitude + 0.005},${event.latitude + 0.005}&layer=mapnik&marker=${event.latitude},${event.longitude}`}
                      className="border-0"
                    />
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}&zoom=16`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[11px] text-text-dim hover:text-primary transition"
                  >
                    <MapPin className="w-3 h-3" /> Open in OpenStreetMap
                  </a>
                </div>
              );
            })()
          ) : event.ticket_price > 0 && !alreadyAttending && requestStatus !== "paid" && !isHost ? (
            <div className="mb-8">
              <div className="relative rounded-2xl overflow-hidden border border-border h-36 bg-surface-light flex items-center justify-center">
                <div className="absolute inset-0 backdrop-blur-sm" />
                <div className="relative text-center space-y-2">
                  <Lock className="w-6 h-6 text-text-dim mx-auto" />
                  <p className="text-xs font-semibold text-text-muted">Exact location revealed after ticket purchase</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Host */}
          {event.host_display_name && (
            <div className="glass-panel rounded-2xl p-5 mb-8">
              <p className="text-[10px] uppercase tracking-[0.15em] text-text-dim font-bold mb-3">Hosted by</p>
              <div className="flex items-center gap-4">
                <Link to={`/profile/${event.host_id}`} className="shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-accent to-hot p-[2px] shadow-lg shadow-primary/20">
                    <div className="w-full h-full rounded-[14px] bg-bg overflow-hidden flex items-center justify-center text-white font-bold text-lg">
                      {event.host_avatar_url ? (
                        <img src={event.host_avatar_url} alt={event.host_display_name} className="w-full h-full object-cover" />
                      ) : (
                        event.host_display_name.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${event.host_id}`} className="text-text font-bold hover:text-primary transition block">{event.host_display_name}</Link>
                  <p className="text-text-muted text-xs flex items-center gap-1.5">
                    @{event.host_username}
                    {event.host_social_rating && event.host_social_rating > 0 && (
                      <span className="text-warning">· ★ {event.host_social_rating.toFixed(1)}</span>
                    )}
                  </p>
                </div>
              </div>
              {isHost && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  {event.status === "upcoming" && (
                    <button
                      onClick={() => navigate(`/events/${event.id}/edit`)}
                      className="btn-primary-luxe flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Event
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/dashboard/${event.id}/requests`)}
                    className="btn-secondary-luxe flex-1 py-2.5 rounded-xl text-xs font-bold"
                  >
                    Manage Requests
                  </button>
                  {(event.status === "upcoming" || event.status === "ongoing") && attendees.length > 0 && (
                    <Link
                      to={`/events/${event.id}/scan-ticket`}
                      className="btn-primary-luxe w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 mt-1"
                    >
                      Scan Guest Tickets
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Attendees (host only) */}
          {isHost && attendees.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Attendees ({attendees.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {attendees.slice(0, 10).map((a) => (
                  <Link
                    key={a.id}
                    to={`/profile/${a.user_id}`}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] hover:shadow-lg hover:shadow-primary/20 transition-shadow"
                    title={a.display_name || "Attendee"}
                  >
                    <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-text text-xs font-bold">
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt={a.display_name || "Attendee"} className="w-full h-full object-cover" />
                      ) : (
                        (a.display_name || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                  </Link>
                ))}
                {attendees.length > 10 && (
                  <div className="w-10 h-10 rounded-full bg-surface-light border border-primary/10 flex items-center justify-center text-[10px] font-bold text-text-muted">
                    +{attendees.length - 10}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Friends attending (guests only) */}
          {!isHost && friendsAttending.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-accent" />
                Friends Going ({friendsAttending.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {friendsAttending.map((f) => (
                  <Link
                    key={f.user_id}
                    to={`/profile/${f.user_id}`}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary p-[1.5px] hover:shadow-lg hover:shadow-accent/20 transition-shadow"
                    title={f.display_name}
                  >
                    <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-text text-xs font-bold">
                      {f.avatar_url ? (
                        <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                      ) : (
                        f.display_name.charAt(0).toUpperCase()
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {/* Share toast */}
            {shareToast && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-success/90 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg"
              >
                {shareToast}
              </motion.div>
            )}

            {/* Guest (not logged in): prompt to login/register to join */}
            {!user && canRequestToJoin && (
              <div className="glass-panel rounded-2xl p-6 border border-primary/20 space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Ticket className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-text">Want to join this event?</p>
                  <p className="text-sm text-text-muted">Create an account or log in to request an invite</p>
                </div>
                <div className="flex gap-3">
                  <Link to="/auth/login" className="flex-1 btn-primary-luxe py-3 rounded-2xl font-bold text-sm text-center">Log In</Link>
                  <Link to="/auth/register" className="flex-1 btn-secondary-luxe py-3 rounded-2xl font-bold text-sm text-center">Sign Up</Link>
                </div>
              </div>
            )}

            {user && !isHost && (
              <>
                {error && <p className="text-error text-sm bg-error/10 border border-error/20 px-4 py-3 rounded-xl">{error}</p>}

                {alreadyAttending || requestStatus === "paid" ? (
                  <div className="glass-panel rounded-2xl p-5 border-success/20 border space-y-3">
                    <p className="text-success font-bold text-center flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      You're on the guest list!
                    </p>
                    <Link
                      to={`/events/${eventId}/ticket`}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary/15 to-accent/10 border border-primary/25 text-primary font-bold text-sm hover:from-primary/25 hover:to-accent/20 transition"
                    >
                      <Ticket className="w-4 h-4" />
                      View Your Ticket
                    </Link>
                    {cancelResult ? (
                      <p className="text-xs text-text-muted text-center">{cancelResult.message}</p>
                    ) : event.status === "upcoming" && (
                      <>
                        {(() => {
                          const hoursUntil = (new Date(event.date_time).getTime() - Date.now()) / 3_600_000;
                          const refundLabel =
                            hoursUntil >= 48 ? "Full refund if cancelled now" :
                            hoursUntil >= 12 ? "50% refund if cancelled now" :
                            "No refund — event is within 12 hours";
                          return (
                            <p className="text-[11px] text-text-dim text-center">{refundLabel}</p>
                          );
                        })()}
                        {!showCancelConfirm ? (
                          <button
                            onClick={() => setShowCancelConfirm(true)}
                            className="w-full text-error text-sm font-semibold py-2 rounded-xl border border-error/20 hover:bg-error/10 transition tap-active flex items-center justify-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel My Ticket
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs text-text-muted text-center font-semibold">Are you sure? This cannot be undone.</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowCancelConfirm(false)}
                                className="flex-1 text-text-muted text-sm font-semibold py-2 rounded-xl border border-border hover:bg-surface transition tap-active"
                              >
                                Keep Ticket
                              </button>
                              <button
                                onClick={handleCancelTicket}
                                disabled={cancelling}
                                className="flex-1 text-error text-sm font-bold py-2 rounded-xl border border-error/20 bg-error/10 hover:bg-error/20 transition disabled:opacity-50 tap-active flex items-center justify-center gap-1.5"
                              >
                                {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                {cancelling ? "Cancelling…" : "Yes, Cancel"}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : requestStatus === "approved" && event.ticket_price > 0 ? (
                  <div className="space-y-3">
                    {/* Fee breakdown card */}
                    {feeBreakdown && (
                      <div className="rounded-2xl bg-surface/60 border border-primary/15 p-4 space-y-2">
                        <p className="text-xs font-semibold text-text-dim uppercase tracking-widest mb-3">Price Breakdown</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-dim">Ticket</span>
                          <span className="text-text font-medium">₹{(feeBreakdown.ticket_price / 100).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-dim">Platform fee ({feeBreakdown.platform_fee_rate_percent}%)</span>
                          <span className="text-text font-medium">₹{(feeBreakdown.platform_fee / 100).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="border-t border-border/30 pt-2 flex items-center justify-between">
                          <span className="text-sm font-bold text-text">Total charged</span>
                          <span className="text-sm font-bold text-primary">₹{(feeBreakdown.user_total / 100).toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    )}
                    <button onClick={handlePay} disabled={paying || verifying} className="btn-primary-luxe w-full px-4 py-4 rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                      {verifying ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying payment...</>
                        : paying ? <><Loader2 className="w-4 h-4 animate-spin" />Redirecting to payment...</>
                        : <><Ticket className="w-4 h-4" />Buy Ticket · {feeBreakdown ? `₹${(feeBreakdown.user_total / 100).toLocaleString("en-IN")}` : formatPrice(event.ticket_price)}</>}
                    </button>
                  </div>
                ) : requestStatus === "approved" ? (
                  <div className="glass-panel rounded-2xl p-5 border-success/20 border space-y-3">
                    <p className="text-success font-bold text-center flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" />Invite Accepted</p>
                    <button onClick={handleMessageHost} className="w-full btn-secondary-luxe px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" />Message Host
                    </button>
                  </div>
                ) : requestStatus === "pending" ? (
                  <div className="glass-panel rounded-2xl p-5 border-warning/20 border">
                    <p className="text-warning font-bold text-center flex items-center justify-center gap-2 mb-3"><Clock className="w-5 h-5" />Awaiting host approval</p>
                    <div className="flex gap-2">
                      <button onClick={handleMessageHost} className="flex-1 btn-secondary-luxe px-3 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5">
                        <Send className="w-3.5 h-3.5" />Message
                      </button>
                      <button
                        onClick={handleWithdraw}
                        disabled={withdrawing}
                        className="flex-1 text-error text-sm font-semibold py-2 rounded-xl border border-error/20 hover:bg-error/10 transition disabled:opacity-50 tap-active flex items-center justify-center gap-1.5"
                      >
                        {withdrawing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Withdrawing…</> : <><X className="w-3.5 h-3.5" />Withdraw</>}
                      </button>
                    </div>
                  </div>
                ) : !canRequestToJoin ? (
                  <div className="glass-panel rounded-2xl p-5 border-text-dim/10 border">
                    <p className="text-text-dim font-semibold text-center">Invites are closed for this event</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Tier picker — only shown when tiers exist */}
                    {tiers.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.12em]">Select Entry Type</p>
                        <div className="space-y-2">
                          {tiers.map((tier) => {
                            const isSoldOut = tier.max_quantity !== null && tier.sold_count >= tier.max_quantity;
                            return (
                              <button
                                key={tier.id}
                                type="button"
                                disabled={isSoldOut}
                                onClick={() => setSelectedTierId(tier.id)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 tap-active text-left
                                  ${selectedTierId === tier.id
                                    ? "border-primary/60 bg-primary/10"
                                    : isSoldOut
                                      ? "border-border/30 bg-surface/30 opacity-50 cursor-not-allowed"
                                      : "border-border/40 bg-surface/50 hover:border-primary/30"}`}
                              >
                                <div>
                                  <p className="text-sm font-bold text-text">{tier.name}</p>
                                  {tier.description && <p className="text-[11px] text-text-muted mt-0.5">{tier.description}</p>}
                                  {tier.slots > 1 && <p className="text-[10px] text-accent mt-0.5">{tier.slots} slots (group entry)</p>}
                                  {isSoldOut && <p className="text-[10px] text-error mt-0.5">Sold out</p>}
                                </div>
                                <div className="text-right shrink-0 ml-3">
                                  <p className="text-sm font-bold text-warning">{formatPrice(tier.price)}</p>
                                  {tier.max_quantity !== null && !isSoldOut && (
                                    <p className="text-[10px] text-text-dim">{tier.max_quantity - tier.sold_count} left</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <textarea
                      placeholder="Write a message to the host..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 300))}
                      maxLength={300}
                      rows={2}
                      aria-label="Message to the host"
                      className="input-luxe w-full rounded-2xl px-4 py-3.5 resize-none text-sm"
                    />
                    <button
                      onClick={handleJoinRequest}
                      disabled={requesting}
                      className="btn-primary-luxe w-full px-4 py-4 rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {requesting ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> 
                        : requestStatus === "rejected" || requestStatus === "withdrawn" ? <><Send className="w-4 h-4" />Request Again</>
                        : <><Send className="w-4 h-4" />Send Invite Request</>}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Action row */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate(`/events/${event.id}/photos`)} className="btn-secondary-luxe px-4 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                <Camera className="w-4 h-4 text-accent" />
                Photos
              </button>
              {canRate ? (
                <button onClick={() => navigate(`/events/${event.id}/rate`)} className="btn-secondary-luxe px-4 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 text-warning border-warning/20">
                  <Star className="w-4 h-4" />
                  Rate Crowd
                </button>
              ) : (
                <div className="btn-secondary-luxe px-4 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 opacity-40 cursor-not-allowed">
                  <Star className="w-4 h-4" />
                  Rate
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* REPORT MODAL */}
      {showReportModal && event && (
        <ReportModal
          targetType="event"
          targetId={event.id}
          targetName={event.title}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
