import { Link } from "react-router-dom";
import { useState } from "react";
import type { Event } from "../types";
import { parseTags } from "../lib/parse-tags";
import { MapPin, Calendar, Users, Ticket } from "lucide-react";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `₹${(price / 100).toLocaleString("en-IN")}`;
}

function getStatusClasses(status: string) {
  switch (status) {
    case "upcoming": return "status-upcoming";
    case "ongoing": return "status-ongoing";
    case "completed": return "status-completed";
    case "cancelled": return "status-cancelled";
    default: return "status-cancelled";
  }
}

export default function EventCard({ event }: { event: Event }) {
  const tags = parseTags(event.tags);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <Link
      to={`/events/${event.id}`}
      className="glass-card group block overflow-hidden card-shine"
    >
      {/* Cover image */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary/20 via-accent/15 to-hot/10">
        {event.cover_image_url ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 skeleton-shimmer" />}
            <img
              src={event.cover_image_url}
              alt={event.title}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-hot/10 flex items-center justify-center">
            <div className="text-5xl opacity-20 group-hover:scale-110 transition-transform">🎉</div>
          </div>
        )}

        {/* Price badge */}
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1.5 bg-bg/80 backdrop-blur-md text-text text-xs font-bold px-3 py-1.5 rounded-full border border-primary/10">
            <Ticket className="w-3 h-3 text-primary" />
            {formatPrice(event.ticket_price)}
          </div>
        </div>

        {/* Status badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatusClasses(event.status)}`}>
            {event.status}
          </span>
        </div>
      </div>

      {/* Card content */}
      <div className="p-4 flex flex-col gap-3">
        <h3 className="font-bold text-text text-sm leading-tight line-clamp-2">
          {event.title}
        </h3>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-text-muted text-xs">
            <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="truncate">{event.location_city}</span>
          </div>
          <div className="flex items-center gap-2 text-text-muted text-xs">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{formatDate(event.date_time)}</span>
          </div>
        </div>

        {/* Friends attending or host info */}
        <div>
          <div className="flex items-center justify-between">
            {(event.friends_attending ?? 0) > 0 ? (
              <div className="flex items-center gap-1.5 text-accent text-xs font-semibold">
                <Users className="w-3.5 h-3.5" />
                <span>{event.friends_attending} friend{event.friends_attending === 1 ? '' : 's'} going</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-text-muted text-xs">
                <Users className="w-3.5 h-3.5" />
                <span>Open</span>
              </div>
            )}
            {event.host_display_name && (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[8px] text-white font-bold">
                  {event.host_display_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-text-dim text-[11px] truncate max-w-[80px]">{event.host_display_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold text-accent bg-accent/10 border border-accent/15 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
