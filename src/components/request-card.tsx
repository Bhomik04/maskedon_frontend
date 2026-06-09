import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import type { EventRequest, FriendUser } from "../types";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Star, Loader2 } from "lucide-react";

interface Props {
  request: EventRequest;
  onAction?: (requestId: string, status: "approved" | "rejected") => Promise<void>;
  showMutuals?: boolean;
}

export default function RequestCard({ request, onAction, showMutuals = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [mutuals, setMutuals] = useState<FriendUser[]>([]);

  useEffect(() => {
    if (showMutuals && request.user_id) {
      api.get(`/friends/${request.user_id}/mutual`)
        .then((res) => setMutuals(res.data.data.mutuals || []))
        .catch(() => {});
    }
  }, [request.user_id, showMutuals]);

  const statusStyles: Record<string, string> = {
    pending: "status-upcoming",
    approved: "status-ongoing",
    rejected: "bg-error/15 text-error",
    withdrawn: "bg-text-dim/15 text-text-dim",
  };

  async function handleAction(status: "approved" | "rejected") {
    if (!onAction) return;
    setLoading(true);
    try {
      await onAction(request.id, status);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${request.user_id}`} className="shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent p-[2px]">
              <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-text text-sm font-bold">
                {request.avatar_url ? (
                  <img src={request.avatar_url} alt={request.display_name || ""} className="w-full h-full object-cover" />
                ) : (
                  (request.display_name || "?").charAt(0).toUpperCase()
                )}
              </div>
            </div>
          </Link>
          <div className="min-w-0">
            <Link to={`/profile/${request.user_id}`} className="text-text font-bold text-sm hover:text-primary transition block truncate">
              {request.display_name || request.username}
            </Link>
            <p className="text-text-muted text-xs flex items-center gap-2 flex-wrap">
              <span>@{request.username}</span>
              {request.social_rating != null && (
                <span className="flex items-center gap-0.5 text-warning">
                  <Star className="w-3 h-3 fill-current" />
                  {request.social_rating?.toFixed(1) || "N/A"}
                </span>
              )}
              <span>{request.events_attended ?? 0} events</span>
            </p>
            {mutuals.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="flex -space-x-1.5">
                  {mutuals.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      className="w-5 h-5 rounded-full border-2 border-surface bg-gradient-to-br from-primary to-accent overflow-hidden flex items-center justify-center text-[8px] text-white font-bold"
                    >
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={m.display_name} className="w-full h-full object-cover" />
                      ) : (
                        (m.display_name ?? "?").charAt(0).toUpperCase()
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-text-dim text-[10px] font-medium">
                  {mutuals.length} mutual{mutuals.length === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusStyles[request.status] || ""}`}>
          {request.status}
        </span>
      </div>

      {request.message && (
        <p className="text-text-muted text-sm mb-3 italic bg-surface-light/50 rounded-xl px-4 py-3">"{request.message}"</p>
      )}

      {onAction && request.status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={() => handleAction("approved")}
            disabled={loading}
            aria-label={`Approve ${request.display_name || request.username}`}
            className="flex-1 bg-success/15 hover:bg-success/25 text-success border border-success/20 font-bold text-sm py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Approve
          </button>
          <button
            onClick={() => handleAction("rejected")}
            disabled={loading}
            aria-label={`Reject ${request.display_name || request.username}`}
            className="flex-1 bg-error/10 hover:bg-error/20 text-error border border-error/20 font-bold text-sm py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Reject
          </button>
        </div>
      )}
    </motion.div>
  );
}
