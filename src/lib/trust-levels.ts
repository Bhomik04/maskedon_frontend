/** Trust level system for crowd-based social ratings */

export interface TrustLevel {
  name: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const TRUST_LEVELS: TrustLevel[] = [
  { name: "Newcomer",   color: "#6B7280", bgClass: "bg-gray-500",   textClass: "text-gray-500",   borderClass: "border-gray-500" },
  { name: "Wallflower", color: "#EF4444", bgClass: "bg-red-500",    textClass: "text-red-500",    borderClass: "border-red-500" },
  { name: "Drifter",    color: "#F97316", bgClass: "bg-orange-500", textClass: "text-orange-500", borderClass: "border-orange-500" },
  { name: "Socialite",  color: "#EAB308", bgClass: "bg-yellow-500", textClass: "text-yellow-500", borderClass: "border-yellow-500" },
  { name: "Spark",      color: "#9B6DFF", bgClass: "bg-violet-400",   textClass: "text-violet-400",   borderClass: "border-violet-400" },
  { name: "Luminary",   color: "#D4A853", bgClass: "bg-yellow-600", textClass: "text-yellow-600", borderClass: "border-yellow-600" },
  { name: "Inferno",    color: "#EC4899", bgClass: "bg-pink-500",   textClass: "text-pink-500",   borderClass: "border-pink-500" },
];

export function getTrustLevel(socialRating: number, totalEvents: number): TrustLevel {
  if (totalEvents === 0 || socialRating === 0) return TRUST_LEVELS[0];
  if (socialRating >= 4.8) return TRUST_LEVELS[6];
  if (socialRating >= 4.3) return TRUST_LEVELS[5];
  if (socialRating >= 3.6) return TRUST_LEVELS[4];
  if (socialRating >= 3.0) return TRUST_LEVELS[3];
  if (socialRating >= 2.0) return TRUST_LEVELS[2];
  return TRUST_LEVELS[1];
}
