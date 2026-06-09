import { getTrustLevel } from "../lib/trust-levels";

interface TrustBadgeProps {
  rating: number;
  totalEvents: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const sizes = {
  sm: { circle: "w-5 h-5", dot: "w-2.5 h-2.5", text: "text-[9px]", label: "text-[10px]" },
  md: { circle: "w-8 h-8", dot: "w-4 h-4", text: "text-[10px]", label: "text-xs" },
  lg: { circle: "w-12 h-12", dot: "w-6 h-6", text: "text-xs", label: "text-sm" },
};

export default function TrustBadge({ rating, totalEvents, size = "md", showLabel = true }: TrustBadgeProps) {
  const level = getTrustLevel(rating, totalEvents);
  const s = sizes[size];

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`${s.circle} rounded-full flex items-center justify-center shrink-0 font-bold ${s.text} text-white shadow-lg`}
        style={{ backgroundColor: level.color, boxShadow: `0 0 12px ${level.color}40` }}
        title={`${level.name} — ${rating > 0 ? rating.toFixed(1) : "No rating"}`}
      >
        {totalEvents > 0 && rating > 0 ? rating.toFixed(1) : ""}
      </div>
      {showLabel && (
        <span className={`${s.label} font-bold`} style={{ color: level.color }}>
          {level.name}
        </span>
      )}
    </div>
  );
}
