import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, IndianRupee, AlertCircle, RefreshCw,
  CheckCircle2, Clock, XCircle, Calendar, Tag, ReceiptText,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Payment {
  id: string;
  payer_id: string;
  host_id: string;
  event_id: string;
  amount: number;
  currency: string;
  status: "initiated" | "pending" | "completed" | "failed" | "refunded";
  // Real Razorpay IDs (new payments)
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  // Legacy mock ID (old payments before Razorpay integration)
  mock_transaction_id: string | null;
  created_at: string;
  completed_at: string | null;
  event_title: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatAmount(paisa: number) {
  return `\u20b9${(paisa / 100).toLocaleString("en-IN")}`;
}

const STATUS = {
  completed: { label: "Paid",     color: "text-success", bg: "bg-success/10", border: "border-success/25", Icon: CheckCircle2 },
  pending:   { label: "Pending",  color: "text-warning", bg: "bg-warning/10", border: "border-warning/25", Icon: Clock },
  initiated: { label: "Pending",  color: "text-warning", bg: "bg-warning/10", border: "border-warning/25", Icon: Clock },
  failed:    { label: "Failed",   color: "text-error",   bg: "bg-error/10",   border: "border-error/25",   Icon: XCircle },
  refunded:  { label: "Refunded", color: "text-error",   bg: "bg-error/10",   border: "border-error/25",   Icon: XCircle },
} as const;

// ─── Payment Card ─────────────────────────────────────────────────────────────

function PaymentCard({ payment, index }: { payment: Payment; index: number }) {
  const s = STATUS[payment.status] ?? STATUS.pending;
  const { Icon } = s;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 340, damping: 30 }}
      className="p-4 rounded-2xl border border-border bg-surface hover:border-border-hover transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link to={`/events/${payment.event_id}`} className="text-sm font-bold text-text hover:text-primary transition truncate block">
            {payment.event_title}
          </Link>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-text-dim">
              <Calendar className="w-2.5 h-2.5" />
              {formatDate(payment.created_at)} · {formatTime(payment.created_at)}
            </span>
{(payment.razorpay_payment_id ?? payment.mock_transaction_id) && (
              <span className="flex items-center gap-1 text-[10px] text-text-dim font-mono truncate max-w-[140px]">
                <Tag className="w-2.5 h-2.5 shrink-0" />
                {(payment.razorpay_payment_id ?? payment.mock_transaction_id)!.slice(0, 18)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <p className={`text-lg font-black ${payment.status === "refunded" ? "text-error line-through" : "text-text"}`}>
            {formatAmount(payment.amount)}
          </p>
          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.color} ${s.bg} ${s.border}`}>
            <Icon className="w-2.5 h-2.5" />
            {s.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "pending" | "refunded">("all");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/users/me/payments");
      setPayments(res.data.data.payments);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load payment history"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filtered = filter === "all" ? payments : payments.filter((p) => p.status === filter);
  const totalSpent = payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const refundedAmt = payments.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg pb-28 md:pb-12">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          <div className="shimmer h-8 w-40 rounded-xl" />
          <div className="shimmer h-20 rounded-2xl" />
          <div className="shimmer h-10 rounded-xl" />
          {[0, 1, 2, 3].map((i) => <div key={i} className="shimmer h-20 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-10 h-10 text-error" />
        <p className="text-text font-bold">{error}</p>
        <button onClick={fetchPayments} className="btn-primary-luxe px-5 py-2.5 rounded-xl text-sm font-bold">Retry</button>
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
          <button onClick={fetchPayments} aria-label="Refresh payments" className="ml-auto btn-secondary-luxe p-2 rounded-xl tap-active">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-success mb-1">Wallet</p>
          <h1 className="text-2xl font-black text-text">Payment History</h1>
        </motion.div>

        {/* Stats */}
        {payments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-3 gap-3 mb-5"
          >
            <div className="glass-panel rounded-xl p-3 text-center">
              <p className="text-lg font-black text-text">{payments.length}</p>
              <p className="text-[10px] text-text-dim">Total</p>
            </div>
            <div className="glass-panel rounded-xl p-3 text-center">
              <p className="text-sm font-black text-success">{formatAmount(totalSpent)}</p>
              <p className="text-[10px] text-text-dim">Spent</p>
            </div>
            <div className="glass-panel rounded-xl p-3 text-center">
              <p className="text-sm font-black text-error">{refundedAmt > 0 ? formatAmount(refundedAmt) : "—"}</p>
              <p className="text-[10px] text-text-dim">Refunded</p>
            </div>
          </motion.div>
        )}

        {/* Filter tabs */}
        {payments.length > 0 && (
          <div className="flex gap-1.5 p-1.5 bg-surface-light rounded-xl border border-border mb-4">
            {(["all", "completed", "pending", "refunded"] as const).map((tab) => {
              const counts = {
                all: payments.length,
                completed: payments.filter((p) => p.status === "completed").length,
                pending: payments.filter((p) => p.status === "pending").length,
                refunded: payments.filter((p) => p.status === "refunded").length,
              };
              const labels = { all: "All", completed: "Paid", pending: "Pending", refunded: "Refunded" };
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${filter === tab ? "bg-surface text-text shadow-sm" : "text-text-dim hover:text-text"}`}
                >
                  {labels[tab]}
                  <span className="ml-1 opacity-60">({counts[tab]})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* List */}
        {payments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-4">
              <ReceiptText className="w-6 h-6 text-text-dim" />
            </div>
            <p className="text-text font-bold mb-1">No payments yet</p>
            <p className="text-text-dim text-sm">Ticket purchases for paid events will appear here.</p>
            <Link to="/discover" className="btn-primary-luxe inline-flex px-5 py-2.5 rounded-xl text-sm font-bold mt-4">
              <IndianRupee className="w-4 h-4 mr-1.5" />
              Browse Events
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-text-dim text-sm">No {filter} payments.</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {filtered.map((p, i) => (
                <PaymentCard key={p.id} payment={p} index={i} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
