import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, UserX, Loader2, AlertCircle, RefreshCw,
  ShieldOff, Trash2, Check, X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlockedUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  blocked_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (src) return <img src={src} alt={name} className="w-10 h-10 rounded-full object-cover ring-2 ring-border shrink-0 grayscale" />;
  return (
    <div className="w-10 h-10 rounded-full bg-surface-light border border-border flex items-center justify-center text-xs font-bold text-text-dim shrink-0">
      {initials}
    </div>
  );
}

// ─── Blocked User Card ────────────────────────────────────────────────────────

function BlockedCard({
  user,
  index,
  onUnblock,
  unblocking,
}: {
  user: BlockedUser;
  index: number;
  onUnblock: (id: string) => void;
  unblocking: string | null;
}) {
  const [confirm, setConfirm] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -6 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 340, damping: 30 }}
      className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-surface hover:border-border-hover transition"
    >
      <Avatar src={user.avatar_url} name={user.display_name} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text truncate">{user.display_name}</p>
        <p className="text-[11px] text-text-dim truncate">@{user.username}</p>
        <p className="text-[10px] text-text-dim/60 mt-0.5">Blocked {timeAgo(user.blocked_at)}</p>
      </div>

      <div className="shrink-0">
        <AnimatePresence mode="wait">
          {!confirm ? (
            <motion.button
              key="unblock"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-error/25 text-error text-xs font-bold hover:bg-error/8 transition tap-active"
            >
              <ShieldOff className="w-3.5 h-3.5" />
              Unblock
            </motion.button>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5"
            >
              <button
                onClick={() => setConfirm(false)}
                aria-label="Cancel"
                className="p-1.5 rounded-lg border border-border text-text-dim hover:bg-surface-light transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setConfirm(false); onUnblock(user.id); }}
                disabled={unblocking === user.id}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-success/25 bg-success/10 text-success text-xs font-bold hover:bg-success/20 transition"
              >
                {unblocking === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Yes
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BlockedUsersPage() {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const fetchBlocked = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/blocks/me");
      setBlocked(res.data.data.blocked);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load blocked users"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);

  async function handleUnblock(userId: string) {
    setActionError("");
    setUnblocking(userId);
    // Optimistic removal
    const prev = blocked;
    setBlocked((b) => b.filter((u) => u.id !== userId));
    try {
      await api.delete(`/blocks/${userId}`);
    } catch (err) {
      setBlocked(prev); // rollback
      setActionError(getApiErrorMessage(err, "Failed to unblock user"));
    } finally {
      setUnblocking(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg pb-28 md:pb-12">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          <div className="shimmer h-8 w-32 rounded-xl" />
          <div className="shimmer h-10 rounded-xl" />
          {[0, 1, 2].map((i) => <div key={i} className="shimmer h-16 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-10 h-10 text-error" />
        <p className="text-text font-bold">{error}</p>
        <button onClick={fetchBlocked} className="btn-primary-luxe px-5 py-2.5 rounded-xl text-sm font-bold">Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12 premium-shell">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">

        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-5">
          <Link to="/settings" className="flex items-center gap-1.5 text-text-dim hover:text-text text-sm font-semibold transition">
            <ArrowLeft className="w-4 h-4" />
            Settings
          </Link>
          <button onClick={fetchBlocked} aria-label="Refresh blocked list" className="ml-auto btn-secondary-luxe p-2 rounded-xl tap-active">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-error mb-1">Privacy</p>
          <h1 className="text-2xl font-black text-text">Blocked Users</h1>
          <p className="text-text-dim text-sm mt-1">Blocked users cannot message you, see your profile, or interact with your content.</p>
        </motion.div>

        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-error/10 border border-error/25 text-error text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {actionError}
          </motion.div>
        )}

        {blocked.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-4">
              <UserX className="w-6 h-6 text-text-dim" />
            </div>
            <p className="text-text font-bold mb-1">No blocked users</p>
            <p className="text-text-dim text-sm">People you block will appear here.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-text-dim">{blocked.length} blocked user{blocked.length !== 1 ? "s" : ""}</p>
              <div className="flex items-center gap-1 text-xs text-text-dim">
                <Trash2 className="w-3 h-3" />
                Tap Unblock to remove
              </div>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {blocked.map((user, i) => (
                  <BlockedCard
                    key={user.id}
                    user={user}
                    index={i}
                    onUnblock={handleUnblock}
                    unblocking={unblocking}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
