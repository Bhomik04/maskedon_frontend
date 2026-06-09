import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Send, PartyPopper } from "lucide-react";
import api from "../lib/api";
import type { ConversationMessage, ConversationSummary } from "../types";
import { useAuth } from "../context/auth-hook";
import { useNotifications } from "../context/use-notifications-hook";

export default function MessageThreadPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { latestMessage } = useNotifications();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sendError, setSendError] = useState("");
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [body, setBody] = useState("");
  const listEndRef = useRef<HTMLDivElement>(null);

  const otherUserLabel = useMemo(() => conversation?.other_display_name || "Conversation", [conversation]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get("/messages/conversations"),
      api.get(`/messages/conversations/${conversationId}/messages`),
    ]).then(([conversationRes, messagesRes]) => {
      if (!mounted) return;
      const found = (conversationRes.data.data.conversations || []).find((item: ConversationSummary) => item.id === conversationId) || null;
      setConversation(found);
      setMessages(messagesRes.data.data.messages || []);
    }).catch(() => {
      if (mounted) setLoadError("Failed to load conversation. Please go back and try again.");
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [conversationId]);

  useEffect(() => {
    if (!latestMessage || latestMessage.conversation_id !== conversationId) return;
    setMessages((prev) => {
      if (prev.some((item) => item.id === latestMessage.id)) return prev;
      return [...prev, latestMessage as ConversationMessage];
    });
    api.patch(`/messages/conversations/${conversationId}/read`).catch(() => {});
  }, [latestMessage, conversationId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!body.trim()) return;
    setSendError("");
    setSending(true);
    try {
      const res = await api.post(`/messages/conversations/${conversationId}/messages`, { body: body.trim() });
      const nextMessage = res.data.data.message as ConversationMessage;
      setMessages((prev) => [...prev, nextMessage]);
      setBody("");
    } catch {
      setSendError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-error text-sm mb-4">{loadError}</p>
          <button onClick={() => window.history.back()} className="btn-secondary-luxe px-5 py-3 rounded-xl font-bold text-sm">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-4 md:py-8 pb-36">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full border border-border bg-surface/80 flex items-center justify-center text-text hover:border-primary/20 transition"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-dim font-bold">Event message</p>
            <h1 className="text-xl md:text-2xl font-bold text-text truncate">{otherUserLabel}</h1>
            {conversation && (
              <Link to={`/events/${conversation.event_id}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                <PartyPopper className="w-3.5 h-3.5" /> {conversation.event_title}
              </Link>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-4 md:p-6 min-h-[55vh] flex flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="h-full min-h-[40vh] flex flex-col items-center justify-center text-center px-6 py-10">
                <PartyPopper className="w-12 h-12 text-primary/40 mb-3" />
                <h2 className="text-lg font-bold text-text mb-2">Start the conversation</h2>
                <p className="text-sm text-text-muted max-w-md">
                  Ask about the venue, timing, or anything else you need before the event.
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const mine = message.sender_id === user?.id;
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed border ${mine ? "bg-gradient-to-br from-primary to-accent text-white border-transparent" : "bg-bg border-border text-text"}`}>
                      <p className="whitespace-pre-wrap">{message.body}</p>
                      <p className={`mt-1.5 text-[10px] ${mine ? "text-white/70" : "text-text-dim"}`}>
                        {new Date(message.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={listEndRef} />
          </div>

          <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
            {sendError && (
              <p className="text-error text-xs px-1">{sendError}</p>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 2000))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !sending && body.trim()) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                  placeholder="Write a message · Ctrl+Enter to send"
                  className="input-luxe w-full rounded-2xl px-4 py-3 resize-none text-sm"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-text-dim/50">{body.length}/2000</span>
              </div>
              <button
                onClick={handleSend}
                disabled={sending || !body.trim()}
                className="btn-primary-luxe px-4 py-3.5 rounded-2xl font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}