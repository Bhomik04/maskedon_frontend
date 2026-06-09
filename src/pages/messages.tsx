import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Inbox, Loader2, MessageCircle, PartyPopper, ChevronRight, AlertCircle } from "lucide-react";
import api from "../lib/api";
import type { ConversationSummary } from "../types";
import { getApiErrorMessage } from "../lib/errors";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "No messages yet";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [fetchError, setFetchError] = useState("");
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    api.get("/messages/conversations")
      .then((res) => {
        if (mounted) setConversations(res.data.data.conversations || []);
      })
      .catch((err) => {
        if (mounted) setFetchError(getApiErrorMessage(err, "Failed to load messages. Please try again."));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [fetchKey]);

  return (
    <div className="min-h-screen bg-bg px-4 py-6 pb-28 md:py-10 md:pb-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-dim font-bold mb-2">Inbox</p>
            <h1 className="text-3xl font-bold text-text flex items-center gap-3">
              <Inbox className="w-8 h-8 text-primary" /> Messages
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="glass-panel rounded-3xl p-10 flex justify-center">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="glass-panel rounded-3xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
            <h2 className="text-lg font-bold text-text mb-2">Could not load messages</h2>
            <p className="text-text-muted text-sm max-w-md mx-auto mb-5">{fetchError}</p>
            <button
              onClick={() => { setFetchError(""); setLoading(true); setFetchKey(k => k + 1); }}
              className="inline-flex btn-secondary-luxe px-5 py-3 rounded-xl font-bold"
            >
              Try again
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 text-center">
            <MessageCircle className="w-12 h-12 text-text-dim mx-auto mb-4" />
            <h2 className="text-lg font-bold text-text mb-2">No conversations yet</h2>
            <p className="text-text-muted text-sm max-w-md mx-auto">
              Message a host after you send a join request and your conversation will appear here.
            </p>
            <Link to="/events" className="inline-flex mt-5 btn-primary-luxe px-5 py-3 rounded-xl font-bold">
              Discover events
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => navigate(`/messages/${conversation.id}`)}
                className="w-full text-left glass-panel rounded-3xl p-4 md:p-5 hover:border-primary/20 transition border border-transparent"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface-light shrink-0 border border-border">
                    {conversation.event_cover_image_url ? (
                      <img src={conversation.event_cover_image_url} alt={conversation.event_title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                        <PartyPopper className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-text truncate">{conversation.other_display_name}</h2>
                        <p className="text-xs text-text-dim truncate">@{conversation.other_username} · {conversation.event_title}</p>
                      </div>
                      <span className="text-[10px] text-text-dim whitespace-nowrap">{timeAgo(conversation.last_message_at)}</span>
                    </div>

                    <p className="text-sm text-text-muted mt-2 line-clamp-2">
                      {conversation.last_message_body || "Start the conversation"}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-accent">Event chat</span>
                      <div className="flex items-center gap-2">
                        {conversation.unread_count > 0 && (
                          <span className="bg-gradient-to-r from-accent to-primary text-white text-[10px] font-black rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                            {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-text-dim" />
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}