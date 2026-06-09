import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, ChevronDown, Pin } from "lucide-react";
import { useAuth } from "../context/auth-hook";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";

// --- Types ---
interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  like_count: number;
  created_at: string;
  display_name?: string;
  username?: string;
  avatar_url?: string | null;
  parent_comment_id: string | null;
  is_pinned: boolean;
  replies: Comment[];
}

// --- Helpers ---
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function parseMentions(text: string) {
  const parts = text.split(/(@[\w.]+)/g);
  return parts.map((part, i) =>
    /^@[\w.]+$/.test(part)
      ? <span key={i} className="text-primary font-semibold">{part}</span>
      : part
  );
}

// --- Props ---
interface CommentSheetProps {
  photoId: string | null;
  postOwnerId?: string;
  onClose: () => void;
  onCommentCountChange?: (delta: number) => void;
}

export default function CommentSheet({ photoId, postOwnerId, onClose, onCommentCountChange }: CommentSheetProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; display_name: string; username?: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!photoId) {
      // Reset state when closed
      setComments([]);
      setCommentText("");
      setReplyingTo(null);
      setExpandedReplies(new Set());
      setCommentError("");
      return;
    }
    loadComments();
    // Focus input after sheet animation
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [photoId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadComments() {
    if (!photoId) return;
    setLoadingComments(true);
    setCommentError("");
    try {
      const res = await api.get(`/photos/${photoId}/comments`);
      setComments(res.data.data.comments || []);
    } catch (error) {
      setCommentError(getApiErrorMessage(error, "Failed to load comments"));
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleAddComment() {
    if (!commentText.trim() || !photoId) return;
    setPostingComment(true);
    setCommentError("");
    try {
      const body: { comment_text: string; parent_comment_id?: string } = { comment_text: commentText.trim() };
      if (replyingTo) body.parent_comment_id = replyingTo.id;
      const res = await api.post(`/photos/${photoId}/comments`, body);
      const newComment: Comment = res.data.data.comment;
      if (replyingTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyingTo.id
              ? { ...c, replies: [...(c.replies ?? []), newComment] }
              : c
          )
        );
        setExpandedReplies((prev) => new Set(prev).add(replyingTo.id));
      } else {
        setComments((prev) => [newComment, ...prev]);
        // Scroll to top to show new comment
        setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 50);
      }
      onCommentCountChange?.(1);
      setCommentText("");
      setReplyingTo(null);
    } catch (error) {
      setCommentError(getApiErrorMessage(error, "Failed to post comment"));
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await api.delete(`/photos/comments/${commentId}`);
      setComments((prev) => {
        const afterTopLevel = prev.filter((c) => c.id !== commentId);
        if (afterTopLevel.length < prev.length) {
          onCommentCountChange?.(-1);
          return afterTopLevel;
        }
        const withReplyRemoved = prev.map((c) => ({
          ...c,
          replies: (c.replies ?? []).filter((r) => r.id !== commentId),
        }));
        if (withReplyRemoved.some((c, i) => c.replies.length !== prev[i].replies?.length)) {
          onCommentCountChange?.(-1);
        }
        return withReplyRemoved;
      });
    } catch {
      setCommentError("Failed to delete comment");
    }
  }

  function toggleExpandedReply(commentId: string) {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }

  function cancelReply() {
    setReplyingTo(null);
    setCommentText("");
    inputRef.current?.focus();
  }

  return (
    <AnimatePresence>
      {photoId && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="relative flex flex-col bg-bg rounded-t-3xl"
            style={{ maxHeight: "80vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-text-dim/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 shrink-0">
              <h3 className="text-text font-bold text-base">Comments</h3>
              <button
                onClick={onClose}
                aria-label="Close comments"
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-dim hover:text-text hover:bg-surface transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List — flex-1 + min-h-0 is the key fix */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-4"
            >
              {commentError && (
                <div className="text-error text-xs bg-error/10 px-3 py-2 rounded-lg">{commentError}</div>
              )}

              {loadingComments ? (
                <div className="flex items-center justify-center gap-2 py-10">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-text-muted text-sm">Loading comments…</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-text font-bold text-base mb-1">No comments yet</p>
                  <p className="text-text-dim text-sm">Start the conversation.</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id}>
                    <div className="flex gap-3 items-start">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] shrink-0">
                        <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-[10px] font-bold text-text">
                          {comment.avatar_url ? (
                            <img src={comment.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (comment.display_name || comment.username || "U").charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {comment.is_pinned && (
                          <div className="flex items-center gap-1 text-[10px] text-primary font-semibold mb-0.5">
                            <Pin className="w-3 h-3" /> Pinned
                          </div>
                        )}
                        <p className="text-sm leading-relaxed">
                          <span className="font-bold text-text mr-1.5">{comment.display_name || comment.username || "User"}</span>
                          {comment.user_id === postOwnerId && (
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold bg-primary/15 text-primary mr-1.5 align-middle">Author</span>
                          )}
                          <span className="text-text-muted break-words">{parseMentions(comment.comment_text)}</span>
                        </p>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-text-dim">
                          <span>{timeAgo(comment.created_at)}</span>
                          <button
                            type="button"
                            className="font-semibold hover:text-text transition"
                            onClick={() => {
                              setReplyingTo({ id: comment.id, display_name: comment.display_name || comment.username || "User", username: comment.username });
                              setCommentText(`@${comment.username || comment.display_name} `);
                              inputRef.current?.focus();
                            }}
                          >
                            Reply
                          </button>
                          {user && user.id === comment.user_id && (
                            confirmDeleteCommentId === comment.id ? (
                              <span className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => { handleDeleteComment(comment.id); setConfirmDeleteCommentId(null); }}
                                  className="font-bold text-error transition"
                                >
                                  Yes, delete
                                </button>
                                <span className="text-text-dim/40">·</span>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteCommentId(null)}
                                  className="font-semibold hover:text-text transition"
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteCommentId(comment.id)}
                                className="font-semibold text-error hover:text-error/80 transition"
                              >
                                Delete
                              </button>
                            )
                          )}
                        </div>

                        {(comment.replies?.length ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpandedReply(comment.id)}
                            className="mt-1.5 text-[11px] font-semibold text-accent hover:text-accent/80 transition flex items-center gap-0.5"
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedReplies.has(comment.id) ? "rotate-180" : ""}`} />
                            {expandedReplies.has(comment.id)
                              ? "Hide replies"
                              : `View ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`}
                          </button>
                        )}

                        {/* Replies */}
                        {expandedReplies.has(comment.id) && (comment.replies ?? []).map((reply) => (
                          <div key={reply.id} className="flex gap-2 items-start mt-3 ml-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] shrink-0">
                              <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-[8px] font-bold text-text">
                                {reply.avatar_url
                                  ? <img src={reply.avatar_url} alt="" className="w-full h-full object-cover" />
                                  : (reply.display_name || "?").charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] leading-relaxed">
                                <span className="font-bold text-text mr-1.5">{reply.display_name || reply.username || "User"}</span>
                                <span className="text-text-muted break-words">{parseMentions(reply.comment_text)}</span>
                              </p>
                              <div className="flex items-center gap-3 mt-0.5 text-[10px] text-text-dim">
                                <span>{timeAgo(reply.created_at)}</span>
                                <button
                                  type="button"
                                  className="font-semibold hover:text-text transition"
                                  onClick={() => {
                                    setReplyingTo({ id: comment.id, display_name: comment.display_name || comment.username || "User", username: comment.username });
                                    setCommentText(`@${reply.username || reply.display_name} `);
                                    inputRef.current?.focus();
                                  }}
                                >
                                  Reply
                                </button>
                                {user && user.id === reply.user_id && (
                                  confirmDeleteCommentId === reply.id ? (
                                    <span className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => { handleDeleteComment(reply.id); setConfirmDeleteCommentId(null); }}
                                        className="font-bold text-error transition"
                                      >
                                        Yes, delete
                                      </button>
                                      <span className="text-text-dim/40">·</span>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteCommentId(null)}
                                        className="font-semibold hover:text-text transition"
                                      >
                                        Cancel
                                      </button>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteCommentId(reply.id)}
                                      className="font-semibold text-error hover:text-error/80 transition"
                                    >
                                      Delete
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply indicator */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden shrink-0"
                >
                  <div className="flex items-center justify-between px-4 py-2 bg-primary/8 border-t border-border/30 text-xs text-text-dim">
                    <span>
                      Replying to{" "}
                      <span className="font-semibold text-primary">
                        @{replyingTo.username || replyingTo.display_name}
                      </span>
                    </span>
                    <button type="button" onClick={cancelReply} className="text-text-dim hover:text-text transition ml-2" aria-label="Cancel reply">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input area — always visible at the bottom */}
            <div className="shrink-0 px-4 py-3 border-t border-border/40 bg-bg pb-[max(12px,env(safe-area-inset-bottom))]">
              <div className="flex gap-2.5 items-center">
                {/* Current user avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] shrink-0">
                  <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-[10px] font-bold text-text">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (user?.display_name || user?.username || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  aria-label="Add a comment"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder={replyingTo ? `Reply to @${replyingTo.username || replyingTo.display_name}…` : "Add a comment…"}
                  disabled={postingComment}
                  className="input-luxe flex-1 rounded-2xl px-4 py-2.5 text-sm"
                />
                <button
                  onClick={handleAddComment}
                  disabled={postingComment || !commentText.trim()}
                  aria-label="Post comment"
                  className="feed-send-btn disabled:opacity-30 shrink-0"
                >
                  {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
