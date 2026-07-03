// Pulsing skeleton placeholders for localStorage-hydration loading states.
// Uses Tailwind's animate-pulse so the existing reduced-motion CSS rule
// (animation-duration: 0.01ms) collapses the pulse automatically — no extra
// motion handling needed here.
//
// All skeletons are aria-hidden: they are purely decorative; the real content
// announces itself once it arrives.

/** Single-card pulse — Today page loading state. */
export function SkeletonCard() {
  return (
    <div className="card animate-pulse space-y-3" aria-hidden>
      <div className="h-3.5 w-2/5 rounded-md bg-stone-100" />
      <div className="h-2.5 w-full rounded-md bg-stone-100" />
      <div className="h-2.5 w-4/5 rounded-md bg-stone-100" />
    </div>
  );
}

/** List of pulsing row skeletons — History list loading state. */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="space-y-2.5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i}>
          <div className="card animate-pulse flex items-center gap-3">
            <div className="h-9 w-9 flex-none rounded-full bg-stone-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-3/4 rounded-md bg-stone-100" />
              <div className="h-2.5 w-1/2 rounded-md bg-stone-100" />
            </div>
            <div className="h-5 w-14 flex-none rounded-full bg-stone-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Two stacked card pulses — Settings and History detail loading states. */
export function SkeletonStack() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="card animate-pulse space-y-3">
        <div className="h-3.5 w-2/5 rounded-md bg-stone-100" />
        <div className="h-2.5 w-full rounded-md bg-stone-100" />
        <div className="h-2.5 w-4/5 rounded-md bg-stone-100" />
      </div>
      <div className="card animate-pulse space-y-3">
        <div className="h-3.5 w-1/3 rounded-md bg-stone-100" />
        <div className="h-2.5 w-full rounded-md bg-stone-100" />
        <div className="h-2.5 w-3/4 rounded-md bg-stone-100" />
        <div className="h-2.5 w-full rounded-md bg-stone-100" />
      </div>
    </div>
  );
}
