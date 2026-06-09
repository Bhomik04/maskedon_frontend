import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { useBackButton } from "../lib/use-back-button";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2, X, ChevronDown } from "lucide-react";

interface Liker {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  liked_at: string;
}

interface LikersSheetProps {
  photoId: string | null;
  likeCount: number;
  onClose: () => void;
}

export default function LikersSheet({ photoId, likeCount, onClose }: LikersSheetProps) {
  const [likers, setLikers] = useState<Liker[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const isOpen = !!photoId;

  const fetchLikers = useCallback(async (pageNum: number, append = false) => {
    if (!photoId) return;
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      const res = await api.get(`/photos/${photoId}/likes?page=${pageNum}&limit=30`);
      const data = res.data.data;
      if (append) {
        setLikers((prev) => [...prev, ...data.likers]);
      } else {
        setLikers(data.likers);
      }
      setTotal(data.total);
      setHasMore(data.likers.length >= 30);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [photoId]);

  useEffect(() => {
    if (photoId) {
      setPage(1);
      setLikers([]);
      setTotal(0);
      fetchLikers(1);
    }
  }, [photoId, fetchLikers]);

  useBackButton(isOpen, useCallback(() => onClose(), [onClose]));

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLikers(nextPage, true);
  }

  function getInitials(name: string) {
    return name.charAt(0).toUpperCase();
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="w-full max-w-md bg-bg rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[75vh] flex flex-col shadow-2xl border border-primary/[0.08]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-hot fill-hot" />
                <h3 className="text-text font-bold text-base">Likes</h3>
                <span className="text-text-dim text-xs font-semibold bg-surface-light px-2 py-0.5 rounded-full">
                  {likeCount > 0 ? likeCount.toLocaleString() : total}
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-text-dim hover:text-text hover:bg-surface transition tap-active"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-12 px-6">
                  <p className="text-error text-sm">{error}</p>
                  <button
                    onClick={() => fetchLikers(1)}
                    className="text-primary text-sm font-semibold mt-3 tap-active"
                  >
                    Try again
                  </button>
                </div>
              ) : likers.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="w-14 h-14 rounded-2xl bg-surface-light mx-auto mb-4 flex items-center justify-center">
                    <Heart className="w-7 h-7 text-text-dim/20" />
                  </div>
                  <p className="text-text font-semibold text-sm">No likes yet</p>
                  <p className="text-text-dim text-xs mt-1">Be the first to like this post</p>
                </div>
              ) : (
                <div className="py-2">
                  {likers.map((liker) => (
                    <Link
                      key={liker.user_id}
                      to={`/profile/${liker.user_id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-primary/[0.03] transition tap-active"
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent p-[2px] shrink-0">
                        <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center">
                          {liker.avatar_url ? (
                            <img
                              src={liker.avatar_url}
                              alt={liker.display_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-text">
                              {getInitials(liker.display_name)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text text-sm font-bold truncate">{liker.display_name}</p>
                        <p className="text-text-muted text-xs truncate">@{liker.username}</p>
                      </div>
                      <span className="text-text-dim text-[10px] font-medium shrink-0">
                        {timeAgo(liker.liked_at)}
                      </span>
                    </Link>
                  ))}

                  {/* Load more */}
                  {hasMore && (
                    <div className="flex justify-center py-4">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="flex items-center gap-1.5 text-primary text-sm font-semibold hover:text-primary/80 transition disabled:opacity-50 tap-active"
                      >
                        {loadingMore ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        Load more
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom handle (mobile) */}
            <div className="sm:hidden h-1 flex justify-center py-2 shrink-0">
              <div className="w-10 h-1 rounded-full bg-primary/10" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
