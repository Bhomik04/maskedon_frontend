import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { Event } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MapPin, Calendar, Ticket, PartyPopper, Users, Clock,
  Zap, X, SlidersHorizontal, TrendingUp,
  Star, RefreshCw, Shield, MapPinOff,
} from "lucide-react";
import { SkeletonEventCard } from "../components/skeleton";
import { useAuth } from "../context/auth-hook";

/* --- helpers --- */

function getStatusClasses(status: string) {
  switch (status) {
    case "upcoming": return "status-upcoming";
    case "ongoing":  return "status-ongoing";
    case "completed": return "status-completed";
    default: return "status-cancelled";
  }
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `\u20B9${(price / 100).toLocaleString("en-IN")}`;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function getTimeUntil(dateStr: string): string {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  if (diff < 0) return "now";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m`;
}

function isTonight(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString() && d.getHours() >= 17;
}

function isThisWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToFriday = (5 - dayOfWeek + 7) % 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysToFriday);
  friday.setHours(17, 0, 0, 0);
  const monday = new Date(friday);
  monday.setDate(friday.getDate() + 3);
  monday.setHours(6, 0, 0, 0);
  return d >= friday && d <= monday;
}

type QuickFilter = "all" | "tonight" | "weekend" | "free" | "friends";
type SortMode = "date_asc" | "trending" | "price_asc" | "price_desc" | "distance";

/* --- component --- */

export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [privateOpen, setPrivateOpen] = useState(false);
  const [privateCode, setPrivateCode] = useState("");
  const [privateError, setPrivateError] = useState("");
  const [privateLoading, setPrivateLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("date_asc");
  const [showFilters, setShowFilters] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState("");
  const [geoPosition, setGeoPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const searchRef = useRef<HTMLInputElement>(null);

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          allEvents.map((p) => p.location_city).filter((c): c is string => Boolean(c))
        )
      ).slice(0, 8),
    [allEvents]
  );

  const tags = useMemo(() => {
    const allTags: string[] = [];
    allEvents.forEach((p) => {
      if (p.tags) {
        try {
          const parsed = JSON.parse(p.tags);
          if (Array.isArray(parsed)) allTags.push(...parsed);
        } catch { /* skip */ }
      }
    });
    return Array.from(new Set(allTags)).slice(0, 12);
  }, [allEvents]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ limit: "200", page: "1", sort: sortMode });
      if (geoPosition && sortMode === "distance") {
        params.set("lat", String(geoPosition.lat));
        params.set("lng", String(geoPosition.lng));
        params.set("radius_km", String(radiusKm));
      }
      const res = await api.get(`/events?${params.toString()}`);
      setAllEvents(res.data.data.events || []);
    } catch (error) {
      setLoadError(getApiErrorMessage(error, "Failed to load events"));
    } finally {
      setLoading(false);
    }
  }, [geoPosition, radiusKm, sortMode]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const handleNearMe = async () => {
    setNearMeLoading(true);
    setNearMeError("");

    if (!navigator.geolocation) {
      setNearMeError("Your device does not support location sharing.");
      setNearMeLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
        setSortMode("distance");
        setNearMeLoading(false);
      },
      () => {
        setNearMeError("Location permission was denied. Showing the standard discovery feed instead.");
        setGeoPosition(null);
        setSortMode("date_asc");
        setNearMeLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handlePrivateLookup = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const code = privateCode.trim().toUpperCase();
    if (code.length !== 10) {
      setPrivateError("Enter the 10-character code.");
      return;
    }

    setPrivateLoading(true);
    setPrivateError("");
    try {
      const res = await api.get(`/events/private/${code}`);
      const eventId = res.data.data.event?.id as string | undefined;
      if (!eventId) {
        setPrivateError("No private event found with that code.");
        return;
      }
      navigate(`/events/${eventId}`);
    } catch (error) {
      setPrivateError(getApiErrorMessage(error, "No private event found with that code."));
    } finally {
      setPrivateLoading(false);
    }
  };

  /* --- derived data --- */

  const filtered = useMemo(() => {
    return allEvents.filter((p) => {
      if (selectedCity && p.location_city !== selectedCity) return false;
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        if (
          !p.title.toLowerCase().includes(term) &&
          !(p.description || "").toLowerCase().includes(term) &&
          !p.location_city.toLowerCase().includes(term) &&
          !p.location_name.toLowerCase().includes(term)
        ) return false;
      }
      switch (quickFilter) {
        case "tonight": return isTonight(p.date_time) || p.status === "ongoing";
        case "weekend": return isThisWeekend(p.date_time);
        case "free": return p.ticket_price === 0;
        case "friends": return (p.friends_attending ?? 0) > 0;
        default: return true;
      }
    });
  }, [allEvents, selectedCity, search, quickFilter]);

  const happeningNow = useMemo(
    () => allEvents.filter((p) => p.status === "ongoing").sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime()),
    [allEvents]
  );

  const trending = useMemo(
    () =>
      allEvents
        .filter((p) => p.status === "upcoming")
        .sort((a, b) => (b.current_attendees ?? 0) - (a.current_attendees ?? 0))
        .slice(0, 6),
    [allEvents]
  );

  const friendsGoing = useMemo(
    () => allEvents.filter((p) => (p.friends_attending ?? 0) > 0).sort((a, b) => (b.friends_attending ?? 0) - (a.friends_attending ?? 0)),
    [allEvents]
  );

  const isShowingSections = !search && !selectedCity && quickFilter === "all";
  const isDistanceMode = sortMode === "distance" && geoPosition !== null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      {/* === Ambient Hero === */}
      <div className="discover-hero relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-4 relative z-10">
          {/* Top bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-5"
          >
            <div>
              <p className="text-text-dim text-xs font-medium">{getGreeting()}</p>
              <h1 className="text-xl font-bold text-text tracking-tight">
                {user?.display_name ? user.display_name.split(" ")[0] : "Discover"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label={searchOpen ? "Close search" : "Open search"}
                className="w-9 h-9 rounded-xl bg-surface/60 backdrop-blur-sm border border-border flex items-center justify-center tap-active"
              >
                {searchOpen ? <X className="w-4 h-4 text-text-muted" /> : <Search className="w-4 h-4 text-text-muted" />}
              </button>
              <button
                onClick={() => setPrivateOpen((v) => !v)}
                aria-label={privateOpen ? "Close private code" : "Open private code"}
                className={`w-9 h-9 rounded-xl backdrop-blur-sm border flex items-center justify-center tap-active transition-all ${
                  privateOpen ? "bg-warning/15 border-warning/25" : "bg-surface/60 border-border"
                }`}
              >
                <Shield className={`w-4 h-4 ${privateOpen ? "text-warning" : "text-text-muted"}`} />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                aria-label={showFilters ? "Close filters" : "Open filters"}
                className={`w-9 h-9 rounded-xl backdrop-blur-sm border flex items-center justify-center tap-active transition-all ${
                  showFilters ? "bg-primary/15 border-primary/30" : "bg-surface/60 border-border"
                }`}
              >
                <SlidersHorizontal className={`w-4 h-4 ${showFilters ? "text-primary" : "text-text-muted"}`} />
              </button>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={handleNearMe}
              disabled={nearMeLoading}
              className="btn-secondary-luxe px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-60"
            >
              {nearMeLoading ? "Locating…" : "Near me"}
            </button>
            {isDistanceMode && (
              <button
                type="button"
                onClick={() => { setGeoPosition(null); setSortMode("date_asc"); }}
                className="text-xs font-semibold text-primary"
              >
                Disable distance view
              </button>
            )}
          </div>
          {nearMeError && (
            <div className="rounded-2xl border border-warning/20 bg-warning/5 backdrop-blur-md p-3.5 flex items-start gap-3 mb-4">
              <MapPinOff className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-warning uppercase tracking-wider">Location Access Disabled</p>
                <p className="text-text-dim text-[11px] mt-1 leading-relaxed">{nearMeError}</p>
              </div>
            </div>
          )}
          {isDistanceMode && (
            <p className="text-text-dim text-[11px] mb-3">
              Sorted by distance within about {radiusKm} km. Location stays on your device and is only used for this search.
            </p>
          )}

          {/* Search bar (expandable) */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="relative mb-4">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search events, cities, vibes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-luxe w-full rounded-xl pl-10 pr-10 py-3 text-sm"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-text-dim" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Private event code (compact) */}
          <AnimatePresence>
            {privateOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-4"
              >
                <div className="rounded-2xl border border-warning/20 bg-gradient-to-r from-warning/10 via-warning/5 to-transparent p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-warning" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Private event code</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrivateOpen(false)}
                      aria-label="Close private code"
                      className="text-text-dim hover:text-text transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <form onSubmit={handlePrivateLookup} className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="text"
                      autoCapitalize="characters"
                      spellCheck={false}
                      placeholder="Enter 10-character code"
                      value={privateCode}
                      onChange={(e) => {
                        const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                        setPrivateCode(cleaned);
                        if (privateError) setPrivateError("");
                      }}
                      maxLength={10}
                      aria-label="Private event code"
                      className="input-luxe flex-1 rounded-xl px-3 py-2.5 text-xs font-mono tracking-[0.2em] uppercase"
                    />
                    <button
                      type="submit"
                      disabled={privateLoading || privateCode.length !== 10}
                      className="btn-secondary-luxe px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {privateLoading ? "Searching..." : "Find"}
                    </button>
                  </form>
                  {privateError && <p className="text-error text-[11px] mt-2">{privateError}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick filter pills */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
          >
            {([
              { key: "all" as QuickFilter, label: "Explore" },
              { key: "tonight" as QuickFilter, label: "Tonight", icon: <Zap className="w-3 h-3" /> },
              { key: "weekend" as QuickFilter, label: "Weekend", icon: <Calendar className="w-3 h-3" /> },
              { key: "free" as QuickFilter, label: "Free", icon: <Ticket className="w-3 h-3" /> },
              { key: "friends" as QuickFilter, label: "Friends Going", icon: <Users className="w-3 h-3" /> },
            ]).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setQuickFilter(key)}
                className={`discover-quick-pill flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  quickFilter === key ? "discover-quick-pill-active" : "discover-quick-pill-idle"
                }`}
              >
                {icon && icon}
                {label}
              </button>
            ))}
          </motion.div>
        </div>
      </div>

      {/* === Filter panel (expandable) === */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/50"
          >
            <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
              {cities.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-2">City</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedCity("")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        !selectedCity ? "chip-active" : "chip-idle"
                      }`}
                    >
                      All
                    </button>
                    {cities.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedCity(selectedCity === c ? "" : c)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                          selectedCity === c ? "chip-active" : "chip-idle"
                        }`}
                      >
                        <MapPin className="w-2.5 h-2.5" />
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-2">Sort by</p>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { key: "date_asc" as SortMode, label: "Soonest" },
                    { key: "trending" as SortMode, label: "Trending" },
                    { key: "distance" as SortMode, label: "Distance" },
                    { key: "price_asc" as SortMode, label: "Price \u2191" },
                    { key: "price_desc" as SortMode, label: "Price \u2193" },
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === "distance" && !geoPosition) {
                          handleNearMe();
                        } else {
                          setSortMode(key);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        sortMode === key ? "chip-active" : "chip-idle"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {tags.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSearch(tag)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium chip-idle"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sortMode === "distance" && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-2">Radius</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 25, 50, 100].map((value) => (
                      <button
                        key={value}
                        onClick={() => setRadiusKm(value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${radiusKm === value ? "chip-active" : "chip-idle"}`}
                      >
                        {value} km
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(selectedCity || sortMode !== "date_asc" || search) && (
                <button
                  onClick={() => { setSelectedCity(""); setSortMode("date_asc"); setSearch(""); setQuickFilter("all"); }}
                  className="text-xs text-primary font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {loading ? (
          <LoadingSkeleton />
        ) : loadError ? (
          <ErrorState error={loadError} onRetry={fetchEvents} />
        ) : (
          <>
            {/* === Smart Sections === */}
            {isShowingSections && (
              <>
                {happeningNow.length > 0 && (
                  <Section
                    icon={<span className="discover-live-dot" />}
                    title="Happening Now"
                    subtitle={`${happeningNow.length} live`}
                  >
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
                      {happeningNow.map((event, i) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="min-w-[260px] max-w-[280px] flex-shrink-0"
                        >
                          <LiveEventCard event={event} />
                        </motion.div>
                      ))}
                    </div>
                  </Section>
                )}

                {trending.length > 0 && (
                  <Section
                    icon={<TrendingUp className="w-3.5 h-3.5 text-primary" />}
                    title="Hot Right Now"
                    subtitle="Most popular"
                  >
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
                      {trending.map((event, i) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="min-w-[220px] max-w-[240px] flex-shrink-0"
                        >
                          <TrendingCard event={event} rank={i + 1} />
                        </motion.div>
                      ))}
                    </div>
                  </Section>
                )}

                {friendsGoing.length > 0 && (
                  <Section
                    icon={<Users className="w-3.5 h-3.5 text-accent" />}
                    title="Friends Are Going"
                    subtitle={`${friendsGoing.length} events`}
                  >
                    <div className="space-y-2.5">
                      {friendsGoing.slice(0, 4).map((event, i) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                        >
                          <FriendsGoingCard event={event} />
                        </motion.div>
                      ))}
                    </div>
                  </Section>
                )}
              </>
            )}

            {/* === Main Events List === */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-text uppercase tracking-wide">
                    {quickFilter === "tonight" ? "Tonight" :
                     quickFilter === "weekend" ? "This Weekend" :
                     quickFilter === "free" ? "Free Events" :
                     quickFilter === "friends" ? "Friends Going" :
                     selectedCity ? `Events in ${selectedCity}` :
                     search ? `Results for "${search}"` : isDistanceMode ? "Near Me" : "All Events"}
                  </h2>
                  <span className="text-[11px] font-bold text-text-dim bg-surface-light/50 px-2 py-0.5 rounded-full">
                    {filtered.length}
                  </span>
                </div>
              </div>

              {filtered.length === 0 ? (
                <EmptyState filter={quickFilter} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-4">
                  {filtered.map((event, i) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.24) }}
                    >
                      <EventCard event={event} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ===============================================
   SUB-COMPONENTS
   =============================================== */

function Section({
  icon, title, subtitle, children,
}: {
  icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-bold text-text tracking-tight">{title}</h2>
          <span className="text-[10px] font-semibold text-text-dim">{subtitle}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function LiveEventCard({ event }: { event: Event }) {
  const maxCap = event.max_capacity ?? 0;
  const curAttendees = event.current_attendees ?? 0;
  const capacityPercent = maxCap > 0 ? Math.round((curAttendees / maxCap) * 100) : 0;
  return (
    <Link to={`/events/${event.id}`} className="block discover-live-card group tap-active">
      <div className="relative aspect-[16/9] overflow-hidden rounded-t-xl">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-hot/20 via-primary/10 to-accent/10 flex items-center justify-center">
            <Zap className="w-8 h-8 text-hot/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-hot/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">
          <span className="discover-live-dot-small" />
          <span className="text-[9px] font-black uppercase tracking-wider">Live</span>
        </div>
        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white/80 px-2 py-0.5 rounded-full text-[9px] font-bold">
          {formatTime(event.date_time)}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white font-bold text-sm line-clamp-1 tracking-tight">{event.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-white/70 text-[10px] flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />{event.location_city}
            </span>
            {event.distance_km !== undefined && event.distance_km !== null && (
              <span className="text-white bg-primary/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-bold">
                {Number(event.distance_km).toFixed(1)} km
              </span>
            )}
            <span className="text-white/70 text-[10px] flex items-center gap-1">
              <Users className="w-2.5 h-2.5" />{event.current_attendees}/{event.max_capacity}
            </span>
          </div>
        </div>
      </div>
      <div className="px-3 py-2 rounded-b-xl bg-surface/60 backdrop-blur-sm">
        <progress className="progress-luxe discover-live-bar" max={100} value={capacityPercent} />
      </div>
    </Link>
  );
}

function TrendingCard({ event, rank }: { event: Event; rank: number }) {
  const maxCap = event.max_capacity ?? 0;
  const curAttendees = event.current_attendees ?? 0;
  const capacityPercent = maxCap > 0 ? Math.round((curAttendees / maxCap) * 100) : 0;
  return (
    <Link to={`/events/${event.id}`} className="block discover-card rounded-xl overflow-hidden group tap-active">
      <div className="relative aspect-[4/3] overflow-hidden">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 via-accent/10 to-hot/8 flex items-center justify-center">
            <PartyPopper className="w-8 h-8 text-text-dim/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute top-2 left-2">
          <span className="discover-rank-badge text-[11px] font-black">#{rank}</span>
        </div>
        <div className="absolute top-2 right-2">
          <span className="discover-price-pill">{formatPrice(event.ticket_price)}</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white font-bold text-[13px] line-clamp-1 tracking-tight">{event.title}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-white/70 text-[10px] flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-primary" />{formatShortDate(event.date_time)}
            </span>
            {event.distance_km !== undefined && event.distance_km !== null && (
              <span className="text-white bg-primary/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-bold">
                {Number(event.distance_km).toFixed(1)} km
              </span>
            )}
            {capacityPercent >= 60 && (
              <span className="filling-fast px-1.5 py-0.5 rounded-full text-[8px]">
                <span className="filling-fast-dot" />{capacityPercent}% full
              </span>
            )}
          </div>
          {(event.friends_attending ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex -space-x-1.5">
                {(event.friends_attending_avatars ?? []).slice(0, 3).map((f, i) => (
                  <div key={i} className="w-4 h-4 rounded-full border border-black/40 overflow-hidden bg-surface-light">
                    {f.avatar_url ? (
                      <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[6px] text-white font-bold">
                        {f.display_name.charAt(0)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-white/60 text-[9px] font-medium">
                {event.friends_attending} friend{event.friends_attending! > 1 ? "s" : ""} going
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function FriendsGoingCard({ event }: { event: Event }) {
  return (
    <Link to={`/events/${event.id}`} className="flex gap-3 p-2.5 rounded-xl discover-card group tap-active">
      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface-light">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent/15 to-primary/10 flex items-center justify-center">
            <PartyPopper className="w-5 h-5 text-text-dim/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="text-text font-bold text-[13px] line-clamp-1 tracking-tight group-hover:text-primary transition-colors">{event.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-text-muted text-[10px] flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5 text-primary" />{formatShortDate(event.date_time)}
          </span>
          <span className="text-text-muted text-[10px] flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5 text-accent" />{event.location_city}
          </span>
          {event.distance_km !== undefined && event.distance_km !== null && (
            <span className="text-primary text-[10px] font-bold bg-primary/10 px-1.5 py-0.5 rounded">
              {Number(event.distance_km).toFixed(1)} km
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="flex -space-x-1.5">
            {(event.friends_attending_avatars ?? []).slice(0, 3).map((f, i) => (
              <div key={i} className="w-4.5 h-4.5 rounded-full border-2 border-surface overflow-hidden bg-surface-light">
                {f.avatar_url ? (
                  <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-[7px] text-white font-bold">
                    {f.display_name.charAt(0)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <span className="text-accent text-[10px] font-semibold">
            {event.friends_attending} friend{event.friends_attending! > 1 ? "s" : ""} going
          </span>
        </div>
      </div>
      <div className="flex items-center">
        <span className="text-xs font-bold text-text">{formatPrice(event.ticket_price)}</span>
      </div>
    </Link>
  );
}

function EventCard({ event }: { event: Event }) {
  const maxCap = event.max_capacity ?? 0;
  const curAttendees = event.current_attendees ?? 0;
  const capacityPercent = maxCap > 0 ? Math.round((curAttendees / maxCap) * 100) : 0;
  const isFillingFast = capacityPercent >= 75 && event.status === "upcoming";
  const isSoldOut = maxCap > 0 && curAttendees >= maxCap;
  const isLive = event.status === "ongoing";
  const timeLabel = getTimeUntil(event.date_time);

  return (
    <Link to={`/events/${event.id}`} className="group block overflow-hidden rounded-2xl discover-card card-shine">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-light">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-600" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 via-accent/10 to-hot/8 flex items-center justify-center">
            <PartyPopper className="w-10 h-10 text-text-dim/20 group-hover:scale-110 transition-transform" />
          </div>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-white bg-hot/90 px-4 py-1.5 rounded-full">Sold Out</span>
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 z-10">
          {isLive ? (
            <span className="flex items-center gap-1 bg-hot/90 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
              <span className="discover-live-dot-small" />Live
            </span>
          ) : (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatusClasses(event.status)}`}>
              {event.status}
            </span>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="discover-price-pill">{formatPrice(event.ticket_price)}</span>
        </div>

        {!isSoldOut && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex gap-1.5">
            {isFillingFast && (
              <span className="filling-fast px-2 py-0.5 rounded-full text-[10px]">
                <span className="filling-fast-dot" />Filling Fast
              </span>
            )}
            {event.status === "upcoming" && timeLabel !== "now" && (
              <span className="bg-black/50 backdrop-blur-sm text-white/80 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                In {timeLabel}
              </span>
            )}
          </div>
        )}

        {(event.friends_attending ?? 0) > 0 && (
          <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <div className="flex -space-x-1">
              {(event.friends_attending_avatars ?? []).slice(0, 2).map((f, i) => (
                <div key={i} className="w-3.5 h-3.5 rounded-full border border-black/30 overflow-hidden">
                  {f.avatar_url ? (
                    <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-accent to-primary text-[5px] text-white font-bold flex items-center justify-center">
                      {f.display_name.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <span className="text-white/70 text-[8px] font-semibold">{event.friends_attending}</span>
          </div>
        )}
      </div>

      <div className="p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-text font-bold text-[15px] line-clamp-1 tracking-tight group-hover:text-primary transition-colors flex-1">{event.title}</h3>
          {event.host_social_rating != null && event.host_social_rating >= 4 && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Star className="w-3 h-3 text-warning fill-warning" />
              <span className="text-[10px] font-bold text-warning">{event.host_social_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-text-muted text-xs">
            <MapPin className="w-3 h-3 text-accent shrink-0" />
            <span className="truncate">{event.location_city}</span>
          </span>
          {event.distance_km !== undefined && event.distance_km !== null && (
            <span className="flex items-center gap-1 text-primary text-xs font-bold bg-primary/10 px-2 py-0.5 rounded-md">
              {Number(event.distance_km).toFixed(1)} km away
            </span>
          )}
          <span className="flex items-center gap-1.5 text-text-muted text-xs">
            <Calendar className="w-3 h-3 text-primary shrink-0" />
            {formatShortDate(event.date_time)}
          </span>
          <span className="flex items-center gap-1.5 text-text-muted text-xs">
            <Clock className="w-3 h-3 text-text-dim shrink-0" />
            {formatTime(event.date_time)}
          </span>
        </div>

        {maxCap > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1 text-text-dim text-[11px]">
                <Users className="w-3 h-3" />
                {curAttendees}/{maxCap}
              </span>
              {event.host_display_name && (
                <div className="flex items-center gap-1.5">
                  {event.host_avatar_url ? (
                    <img src={event.host_avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[7px] text-white font-bold shrink-0">
                      {event.host_display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-text-dim text-[11px] truncate max-w-[72px]">{event.host_display_name}</span>
                </div>
              )}
            </div>
            <progress
              className={`progress-luxe ${capacityPercent >= 90 ? "progress-luxe--hot" : ""} ${capacityPercent >= 60 && capacityPercent < 90 ? "progress-luxe--success" : ""}`}
              max={100}
              value={capacityPercent}
            />
          </div>
        )}

        {event.min_rating > 0 && (
          <div className="flex items-center gap-1 text-warning text-[10px] font-semibold">
            <Shield className="w-3 h-3 shrink-0" />
            <span>Requires {Number(event.min_rating).toFixed(1)}+ rating</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-3 w-28 shimmer rounded-full mb-3" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="min-w-[260px] rounded-xl overflow-hidden">
              <div className="aspect-[16/9] shimmer" />
              <div className="p-3 space-y-2 bg-surface/40">
                <div className="h-3 w-3/4 shimmer rounded" />
                <div className="h-2 w-1/2 shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="h-3 w-20 shimmer rounded-full mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonEventCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="text-center py-20">
      <div className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center mx-auto mb-4">
        <Zap className="w-7 h-7 text-error" />
      </div>
      <p className="text-error text-sm mb-3">{error}</p>
      <button onClick={onRetry} className="btn-secondary-luxe px-5 py-2.5 rounded-xl text-sm font-bold">
        Retry
      </button>
    </div>
  );
}

function EmptyState({ filter }: { filter: QuickFilter }) {
  const messages: Record<QuickFilter, { title: string; sub: string }> = {
    all: { title: "No events found", sub: "Try adjusting your search or filters" },
    tonight: { title: "Nothing tonight", sub: "Check back later or explore other events" },
    weekend: { title: "Weekend's clear", sub: "No events this weekend yet" },
    free: { title: "No free events", sub: "Check out paid events for great experiences" },
    friends: { title: "No friends going yet", sub: "Invite your friends to join the fun" },
  };
  const msg = messages[filter];
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-surface-light flex items-center justify-center mx-auto mb-4">
        <PartyPopper className="w-7 h-7 text-text-dim" />
      </div>
      <p className="text-text font-semibold mb-1">{msg.title}</p>
      <p className="text-text-dim text-sm">{msg.sub}</p>
    </div>
  );
}
