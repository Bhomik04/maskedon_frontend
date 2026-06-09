import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, PartyPopper, Crown, Users, Camera, Star,
  Lock, RefreshCw, AlertCircle, CheckCircle2,
} from "lucide-react";

// --- Static Catalog (mirrors backend achievement-rules.ts) --------------------

interface AchievementMeta {
  key: string;
  name: string;
  description: string;
  icon: string;
  /** stat key from user stats used for progress */
  statKey?: keyof AchievementStats;
  /** value at which this achievement is considered "done" */
  threshold?: number;
}

interface AchievementGroup {
  category: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  Icon?: React.ComponentType<{ className?: string }>;
  achievements: AchievementMeta[];
}

const GROUPS: AchievementGroup[] = [
  {
    category: "Attendance",
    colorClass: "text-hot",
    bgClass: "bg-hot/10",
    borderClass: "border-hot/20",
    Icon: PartyPopper,
    achievements: [
      { key: "first-event",      name: "First Event",      description: "Attend your first event",  icon: "🎉", statKey: "events_attended", threshold: 1  },
      { key: "weekend-warrior",  name: "Weekend Warrior",  description: "Attend 5+ events",        icon: "🔥", statKey: "events_attended", threshold: 5  },
      { key: "event-animal",     name: "Event Animal",     description: "Attend 10+ events",       icon: "🐉", statKey: "events_attended", threshold: 10 },
      { key: "nightlife-legend", name: "Nightlife Legend", description: "Attend 25+ events",       icon: "👑", statKey: "events_attended", threshold: 25 },
    ],
  },
  {
    category: "Hosting",
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/20",
    Icon: Crown,
    achievements: [
      { key: "host-debut",    name: "Host Debut",    description: "Host your first event", icon: "🎙️", statKey: "events_hosted", threshold: 1  },
      { key: "super-host",   name: "Super Host",    description: "Host 5+ events",        icon: "⚡", statKey: "events_hosted", threshold: 5  },
      { key: "festival-host",name: "Festival Host", description: "Host 15+ events",       icon: "🎪", statKey: "events_hosted", threshold: 15 },
    ],
  },
  {
    category: "Social",
    colorClass: "text-accent",
    bgClass: "bg-accent/10",
    borderClass: "border-accent/20",
    Icon: Users,
    achievements: [
      { key: "social-spark",     name: "Social Spark",     description: "Make 5+ friends",  icon: "✨", statKey: "friend_count", threshold: 5  },
      { key: "social-butterfly", name: "Social Butterfly", description: "Make 10+ friends", icon: "🦋", statKey: "friend_count", threshold: 10 },
      { key: "connector",        name: "Connector",        description: "Make 25+ friends", icon: "🕸️", statKey: "friend_count", threshold: 25 },
    ],
  },
  {
    category: "Photos",
    colorClass: "text-warning",
    bgClass: "bg-warning/10",
    borderClass: "border-warning/20",
    Icon: Camera,
    achievements: [
      { key: "shutterbug",    name: "Shutterbug",    description: "Post 5+ profile photos",  icon: "📸", statKey: "profile_photo_count", threshold: 5  },
      { key: "gallery-master",name: "Gallery Master",description: "Post 20+ profile photos", icon: "🖼️", statKey: "profile_photo_count", threshold: 20 },
    ],
  },
  {
    category: "Rating",
    colorClass: "text-success",
    bgClass: "bg-success/10",
    borderClass: "border-success/20",
    Icon: Star,
    achievements: [
      { key: "crowd-favorite",  name: "Crowd Favorite",  description: "Keep average rating above 4.5", icon: "⭐" },
      { key: "critic-choice",   name: "Critic's Choice", description: "Keep average rating above 4.8", icon: "💎" },
      { key: "trusted",         name: "Trusted",         description: "Reach Spark trust level",       icon: "🔵" },
      { key: "legendary-trust", name: "Legendary Trust", description: "Reach Luminary or Inferno",     icon: "🟣" },
    ],
  },
  {
    category: "Special",
    colorClass: "text-text",
    bgClass: "bg-surface-light",
    borderClass: "border-border",
    achievements: [
      { key: "all-rounder", name: "All-Rounder", description: "Host 5+, attend 10+, 10+ friends, 5+ photos", icon: "🌟" },
    ],
  },
];

const TOTAL_ACHIEVEMENTS = GROUPS.reduce((n, g) => n + g.achievements.length, 0);

// --- Types --------------------------------------------------------------------

interface AchievementStats {
  events_attended: number;
  events_hosted: number;
  social_rating: number;
  total_ratings: number;
  friend_count: number;
  profile_photo_count: number;
}

interface UnlockedEntry {
  achievement_key: string;
  achievement_name: string;
  unlocked_at: string;
}

interface AchievementsData {
  unlocked: UnlockedEntry[];
  total_unlocked: number;
  stats: AchievementStats | null;
}

// --- Badge Card ---------------------------------------------------------------

interface BadgeCardProps {
  meta: AchievementMeta;
  unlocked: boolean;
  unlockedAt?: string;
  group: AchievementGroup;
  stats: AchievementStats | null;
  index: number;
}

function BadgeCard({ meta, unlocked, unlockedAt, group, stats, index }: BadgeCardProps) {
  const progress =
    meta.statKey && meta.threshold && stats
      ? Math.min(1, stats[meta.statKey] / meta.threshold)
      : null;

  const pct = progress !== null ? Math.round(progress * 100) : null;
  const current = meta.statKey && stats ? stats[meta.statKey] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 300, damping: 28 }}
      className={`relative flex items-start gap-3 p-4 rounded-2xl border transition-all ${
        unlocked
          ? `${group.bgClass} ${group.borderClass}`
          : "bg-surface border-border opacity-60"
      }`}
    >
      {/* Badge icon */}
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
          unlocked ? group.bgClass : "bg-surface-light"
        }`}
      >
        {unlocked ? (
          <span>{meta.icon}</span>
        ) : (
          <Lock className="w-4 h-4 text-text-dim" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-bold leading-tight ${unlocked ? "text-text" : "text-text-dim"}`}>
            {meta.name}
          </p>
          {unlocked && (
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${group.colorClass}`} />
          )}
        </div>
        <p className="text-[11px] text-text-dim mt-0.5 leading-snug">{meta.description}</p>

        {/* Progress bar (only for stat-based, locked achievements) */}
        {!unlocked && pct !== null && (
          <div className="mt-2.5 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-text-dim">
              <span>{current} / {meta.threshold}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-light overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: index * 0.04 + 0.2 }}
                className={`h-full rounded-full ${group.bgClass.replace("/10", "")} bg-current ${group.colorClass}`}
                style={{ opacity: 0.7 }}
              />
            </div>
          </div>
        )}

        {/* Unlocked date */}
        {unlocked && unlockedAt && (
          <p className={`text-[10px] font-semibold mt-1 ${group.colorClass}`}>
            Unlocked {new Date(unlockedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// --- Main Page ----------------------------------------------------------------

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/achievements/me");
      setData(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load achievements"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAchievements(); }, [fetchAchievements]);

  const unlockedKeys = new Set(data?.unlocked.map((u) => u.achievement_key) ?? []);
  const unlockedMap = new Map(data?.unlocked.map((u) => [u.achievement_key, u.unlocked_at]) ?? []);

  const pct = data ? Math.round((data.total_unlocked / TOTAL_ACHIEVEMENTS) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg pb-28 md:pb-12">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="shimmer h-28 rounded-2xl" />
          <div className="shimmer h-8 rounded-full" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="shimmer h-6 w-32 rounded-lg" />
              {[0, 1].map((j) => <div key={j} className="shimmer h-20 rounded-2xl" />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12 premium-shell">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">

        {/* -- Header -- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-1">Profile</p>
              <h1 className="text-2xl font-bold text-text tracking-tight flex items-center gap-2">
                <Trophy className="w-6 h-6 text-warning" />
                Achievements
              </h1>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={fetchAchievements}
              aria-label="Refresh"
              className="btn-secondary-luxe p-2.5 rounded-xl mt-1"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Progress card */}
          {data && (
            <div className="glass-panel p-4 rounded-2xl border border-primary/15">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-text font-bold text-base">
                    {data.total_unlocked} <span className="text-text-dim font-normal text-sm">/ {TOTAL_ACHIEVEMENTS} unlocked</span>
                  </p>
                  <p className="text-text-dim text-xs mt-0.5">
                    {pct === 100 ? "You've unlocked everything!" : `${100 - pct}% left to go`}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-full bg-surface-light border-2 border-primary/20 flex items-center justify-center">
                  <span className="text-lg font-black text-primary">{pct}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-surface-light overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.2, type: "spring", stiffness: 80 }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                />
              </div>

              {/* Stat mini-row */}
              {data.stats && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: "Attended", value: data.stats.events_attended },
                    { label: "Hosted", value: data.stats.events_hosted },
                    { label: "Friends", value: data.stats.friend_count },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-base font-black text-text">{value}</p>
                      <p className="text-[10px] text-text-dim">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* -- Error -- */}
        {error && (
          <div className="bg-error/10 border border-error/25 rounded-xl p-3.5 text-error text-sm mb-5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </span>
            <button onClick={fetchAchievements} className="underline font-semibold text-xs">Retry</button>
          </div>
        )}

        {/* -- Filter tabs -- */}
        <div className="flex items-center gap-1.5 mb-5">
          {(["all", "unlocked", "locked"] as const).map((f) => (
            <motion.button
              key={f}
              whileTap={{ scale: 0.93 }}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold capitalize transition-all border ${
                filter === f
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                  : "text-text-dim border-border bg-surface hover:text-text hover:border-border-hover"
              }`}
            >
              {f}
              {f === "unlocked" && data && (
                <span className={`ml-1.5 text-[9px] font-bold px-1 py-0.5 rounded-full ${filter === f ? "bg-white/20" : "bg-surface-light"}`}>
                  {data.total_unlocked}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {/* -- Groups -- */}
        <AnimatePresence mode="wait">
          <motion.div key={filter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {GROUPS.map((group) => {
              const visibleItems = group.achievements.filter((a) => {
                if (filter === "unlocked") return unlockedKeys.has(a.key);
                if (filter === "locked") return !unlockedKeys.has(a.key);
                return true;
              });

              if (visibleItems.length === 0) return null;

              const GroupIcon = group.Icon;
              const groupUnlocked = group.achievements.filter((a) => unlockedKeys.has(a.key)).length;

              return (
                <motion.section
                  key={group.category}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Section header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {GroupIcon && (
                        <div className={`w-6 h-6 rounded-lg ${group.bgClass} flex items-center justify-center`}>
                          <GroupIcon className={`w-3.5 h-3.5 ${group.colorClass}`} />
                        </div>
                      )}
                      <p className="text-xs font-bold text-text uppercase tracking-wide">{group.category}</p>
                    </div>
                    <span className={`text-[10px] font-bold ${group.colorClass}`}>
                      {groupUnlocked} / {group.achievements.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {visibleItems.map((meta, idx) => (
                      <BadgeCard
                        key={meta.key}
                        meta={meta}
                        unlocked={unlockedKeys.has(meta.key)}
                        unlockedAt={unlockedMap.get(meta.key)}
                        group={group}
                        stats={data?.stats ?? null}
                        index={idx}
                      />
                    ))}
                  </div>
                </motion.section>
              );
            })}

            {/* Empty filter state */}
            {GROUPS.every((g) => g.achievements.filter((a) => {
              if (filter === "unlocked") return unlockedKeys.has(a.key);
              if (filter === "locked") return !unlockedKeys.has(a.key);
              return true;
            }).length === 0) && (
              <div className="text-center py-14">
                <Trophy className="w-10 h-10 text-warning mx-auto mb-3" />
                <p className="text-text font-bold">
                  {filter === "unlocked" ? "No achievements unlocked yet" : "All achievements unlocked!"}
                </p>
                <p className="text-text-dim text-sm mt-1">
                  {filter === "unlocked"
                    ? "Start attending events and connecting with people."
                    : "Incredible — you're a MaskedOn legend."}
                </p>
                {filter === "unlocked" && (
                  <Link to="/events" className="btn-primary-luxe inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl text-sm font-bold">
                    <PartyPopper className="w-4 h-4" /> Discover Events
                  </Link>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
