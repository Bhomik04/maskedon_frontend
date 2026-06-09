import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import type { EventRequest } from "../types";
import RequestCard from "../components/request-card";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Loader2, Inbox } from "lucide-react";

export default function ManageRequestsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [actionError, setActionError] = useState("");

  const loadData = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    try {
      const [reqsRes, eventRes] = await Promise.all([
        api.get(`/events/${eventId}/requests`),
        api.get(`/events/${eventId}`),
      ]);
      setRequests(reqsRes.data.data.requests);
      setEventTitle(eventRes.data.data.event.title);
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Failed to load requests"));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAction(requestId: string, status: "approved" | "rejected") {
    setActionError("");
    try {
      await api.patch(`/events/${eventId}/requests/${requestId}`, { status });
      const res = await api.get(`/events/${eventId}/requests`);
      setRequests(res.data.data.requests);
    } catch (error) {
      setActionError(getApiErrorMessage(error, `Failed to ${status} request`));
    }
  }

  const filtered = filter ? requests.filter((r) => r.status === filter) : requests;
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        <Link to="/dashboard" className="text-text-muted hover:text-text text-sm mb-4 inline-flex items-center gap-1.5 transition">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-accent/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">Approval Console</p>
              <h1 className="text-2xl font-bold text-text tracking-tight">Join Requests</h1>
            </div>
          </div>
          <p className="text-text-muted text-sm">{eventTitle} · {pendingCount} pending decision{pendingCount !== 1 ? "s" : ""}</p>
        </motion.div>

        {/* Filter tabs */}
        <div className="glass-panel flex gap-1 mb-6 p-1.5 rounded-xl w-full sm:w-fit overflow-x-auto scrollbar-hide">
          {["", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm px-4 py-2 rounded-lg font-semibold transition ${
                filter === f
                  ? "bg-primary text-white shadow"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {f || "All"} {f === "pending" && pendingCount > 0 ? `(${pendingCount})` : ""}
            </button>
          ))}
        </div>

        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 mb-4 text-error text-sm"
          >
            {actionError}
          </motion.div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface-light flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-text-dim" />
            </div>
            <p className="text-text-muted text-sm">No requests found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => (
              <RequestCard key={req.id} request={req} onAction={handleAction} showMutuals={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
