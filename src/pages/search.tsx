import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useSearchParams, Link } from "react-router-dom";
import api from "../lib/api";
import type { Event } from "../types";
import { getApiErrorMessage } from "../lib/errors";
import { parseTags } from "../lib/parse-tags";
import { motion } from "framer-motion";
import { Search, MapPin, Calendar, Users, Star, Ticket, Tag, Loader2 } from "lucide-react";

type SearchUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  social_rating: number;
};

type SearchResults = {
  users: SearchUser[];
  events: Event[];
  query: string;
};

type Tab = "all" | "users" | "events";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `₹${(price / 100).toLocaleString("en-IN")}`;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [inputValue, setInputValue] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(initialQuery.length >= 2);
  const [tab, setTab] = useState<Tab>("all");
  const [searchError, setSearchError] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track whether the initial URL-query fetch has been fired to prevent double-fetch.
  // Both effects run after the first render; without this guard, Effect 1 starts a
  // request that Effect 2 immediately aborts and restarts — wasting a round-trip.
  const initialFetchFiredRef = useRef(false);

  const debouncedQuery = useDebounce(inputValue, 350);

  const fetchSearch = useCallback((query: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setSearchError("");
    api
      .get("/search", { params: { q: query, limit: 20 }, signal: controller.signal })
      .then((r) => setResults(r.data.data))
      .catch((error) => {
        if (axios.isAxiosError(error) && error.code === "ERR_CANCELED") return;
        setSearchError(getApiErrorMessage(error, "Search failed. Please try again."));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Effect 1: fire the initial fetch when the page is opened with ?q= in the URL.
  // Sets the guard so Effect 2 doesn't duplicate it.
  useEffect(() => {
    if (initialQuery.length >= 2 && !initialFetchFiredRef.current) {
      initialFetchFiredRef.current = true;
      fetchSearch(initialQuery);
    }
  }, [fetchSearch, initialQuery]);

  // Effect 2: react to debounced typing. Skip if query matches what was already
  // fetched by Effect 1 (guard prevents the abort + duplicate-request race).
  useEffect(() => {
    if (debouncedQuery === initialQuery && initialFetchFiredRef.current) return;
    if (debouncedQuery.length < 2) {
      if (debouncedQuery.length === 0) setSearchParams({}, { replace: true });
      setResults(null);
      setLoading(false);
      return;
    }
    setTab("all");
    setSearchParams({ q: debouncedQuery }, { replace: true });
    fetchSearch(debouncedQuery);
  }, [debouncedQuery, fetchSearch, initialQuery, setSearchParams]);

  const users = results?.users ?? [];
  const events = results?.events ?? [];
  const totalUsers = users.length;
  const totalEvents = events.length;
  const totalAll = totalUsers + totalEvents;

  const displayUsers = tab !== "events" ? users : [];
  const displayEvents = tab !== "users" ? events : [];
  const noResults = !!results && totalAll === 0;

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h1 className="text-xl font-bold text-text tracking-tight">Search</h1>
          <p className="text-text-dim text-sm mt-0.5">Find people and events in your social orbit.</p>
        </motion.div>

        {/* Search input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
          <input
            autoFocus
            type="text"
            placeholder="Search users and events..."
            value={inputValue}
            onChange={(e) => {
              const next = e.target.value;
              setInputValue(next);
              if (next.length < 2) {
                setLoading(false);
                setResults(null);
              } else {
                setLoading(true);
              }
            }}
            className="input-luxe w-full rounded-2xl pl-12 pr-12 py-4 text-sm"
            aria-label="Search users and events"
          />
          {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted animate-spin" />}
        </div>

        {/* Tabs */}
        {results && totalAll > 0 && (
          <div className="glass-panel flex gap-1 mb-6 rounded-xl p-1 w-full sm:w-fit overflow-x-auto scrollbar-hide">
            {(["all", "users", "events"] as Tab[]).map((t) => {
              const count = t === "all" ? totalAll : t === "users" ? totalUsers : totalEvents;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                    tab === t ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  <span className={`text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold ${
                    tab === t ? "bg-primary/20 text-primary" : "bg-text-muted/15 text-text-dim"
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty prompt */}
        {!results && !loading && !searchError && debouncedQuery.length < 2 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface-light flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-text-dim/30" />
            </div>
            <p className="text-text-muted text-sm">Type at least 2 characters to search</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !results && (
          <div className="space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-panel rounded-2xl p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-surface-lighter shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-surface-lighter rounded-full w-2/5" />
                  <div className="h-2.5 bg-surface-lighter rounded-full w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {searchError && (
          <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-error text-sm mb-6">
            {searchError}
          </div>
        )}

        {noResults && (
          <div className="text-center py-16">
            <p className="text-text-muted text-lg font-semibold">No results for "{results!.query}"</p>
            <p className="text-text-dim text-sm mt-1">Try a different search term</p>
          </div>
        )}

        {/* Users section */}
        {displayUsers.length > 0 && (
          <div className="mb-8">
            {tab === "all" && (
              <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Users · {totalUsers}
              </h2>
            )}
            <div className="space-y-2">
              {displayUsers.map((u, i) => (
                <motion.div key={u.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                  <Link
                    to={`/profile/${u.id}`}
                    className="glass-panel flex items-center gap-4 rounded-2xl p-4 hover:border-primary/20 transition group"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] shrink-0">
                      <div className="w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center text-text font-bold">
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt={u.display_name} loading="lazy" className="w-full h-full object-cover" />
                          : u.display_name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text font-semibold group-hover:text-primary transition truncate">{u.display_name}</p>
                      <p className="text-text-muted text-xs">@{u.username}</p>
                    </div>
                    {u.social_rating > 0 && (
                      <div className="flex items-center gap-1 text-warning text-sm font-semibold shrink-0">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {u.social_rating.toFixed(1)}
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Events section */}
        {displayEvents.length > 0 && (
          <div>
            {tab === "all" && (
              <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <Ticket className="w-3.5 h-3.5" />
                Events · {totalEvents}
              </h2>
            )}
            <div className="space-y-2">
              {displayEvents.map((p, i) => {
                const tags = parseTags(p.tags);
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                    <Link
                      to={`/events/${p.id}`}
                      className="glass-panel flex items-start gap-4 rounded-2xl p-4 hover:border-primary/20 transition group"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/20 to-primary/15 shrink-0 overflow-hidden">
                        {p.cover_image_url && (
                          <img src={p.cover_image_url} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-text font-semibold truncate group-hover:text-primary transition">{p.title}</p>
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                            p.status === "upcoming" ? "status-upcoming" :
                            p.status === "ongoing" ? "status-ongoing" :
                            p.status === "completed" ? "status-completed" :
                            "status-cancelled"
                          }`}>{p.status}</span>
                        </div>
                        <p className="text-text-muted text-xs flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-accent" />{p.location_city}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-primary" />{formatDate(p.date_time)}</span>
                          <span className="font-semibold">{formatPrice(p.ticket_price)}</span>
                        </p>
                        {p.host_display_name && (
                          <p className="text-text-dim text-xs mt-0.5">by {p.host_display_name}</p>
                        )}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="text-[10px] font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <Tag className="w-2.5 h-2.5" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
