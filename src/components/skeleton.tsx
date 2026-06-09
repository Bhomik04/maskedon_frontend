/**
 * skeleton.tsx — Reusable shimmer loading primitives.
 *
 * Usage examples:
 *   <Skeleton className="h-4 w-3/4" />           — single line
 *   <Skeleton className="h-10 w-10 rounded-full" /> — avatar circle
 *   <SkeletonCard />                               — full glass-panel card
 *   <SkeletonEventCard />                          — event card placeholder
 *   <SkeletonProfileHeader />                      — profile page header
 *   <SkeletonPhotoGrid count={9} />                — photo grid
 *   <SkeletonFeedPost />                           — feed post
 *   <SkeletonListItem />                           — generic list item
 */

/** Base shimmer block */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`skeleton-shimmer rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}

/** A generic card with title + subtitle + body lines */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="glass-panel rounded-2xl p-5 space-y-3" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** Event card shimmer */
export function SkeletonEventCard() {
  return (
    <div className="rounded-2xl overflow-hidden discover-card" aria-hidden="true">
      <Skeleton className="w-full aspect-[16/10] rounded-none" />
      <div className="p-3.5 space-y-2.5">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-1 w-full rounded-full" />
      </div>
    </div>
  );
}

/** Profile page header shimmer */
export function SkeletonProfileHeader() {
  return (
    <div className="flex flex-col items-center text-center py-6" aria-hidden="true">
      <Skeleton className="w-28 h-28 rounded-full mb-5" />
      <Skeleton className="h-6 w-40 mb-2" />
      <Skeleton className="h-4 w-24 mb-4" />
      <div className="grid grid-cols-3 gap-6 w-full max-w-xs py-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Public profile header with hero banner */
export function SkeletonPublicProfileHeader() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10">
        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            <Skeleton className="w-28 h-28 sm:w-32 sm:h-32 rounded-full -mt-20 sm:-mt-24 shrink-0" />
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <Skeleton className="h-7 w-48 mx-auto sm:mx-0" />
              <Skeleton className="h-4 w-24 mx-auto sm:mx-0" />
              <Skeleton className="h-3 w-64 mx-auto sm:mx-0" />
            </div>
            <div className="flex flex-col items-center gap-3 shrink-0">
              <Skeleton className="h-16 w-24 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>
          <div className="flex gap-5 mt-6 pt-6 border-t border-primary/[0.06] justify-center sm:justify-start">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Photo grid shimmer */
export function SkeletonPhotoGrid({ count = 9, cols = 3 }: { count?: number; cols?: number }) {
  const colClass = cols === 4 ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-3";
  return (
    <div className={`grid ${colClass} gap-1`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="aspect-square rounded-sm" />
      ))}
    </div>
  );
}

/** Feed post shimmer */
export function SkeletonFeedPost() {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden" aria-hidden="true">
      <div className="p-4 flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="w-full h-72 rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex gap-4">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

/** Generic list item shimmer (notifications, requests, friends) */
export function SkeletonListItem() {
  return (
    <div className="glass-panel rounded-2xl p-4 flex items-center gap-3" aria-hidden="true">
      <Skeleton className="w-11 h-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

/** Dashboard stats card shimmer */
export function SkeletonStatsRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="glass-panel rounded-2xl p-5 space-y-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Page header shimmer (icon + title + subtitle) */
export function SkeletonPageHeader() {
  return (
    <div className="glass-panel rounded-2xl p-5 flex items-center gap-3" aria-hidden="true">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
    </div>
  );
}
