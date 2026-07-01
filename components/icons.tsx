// Minimal hand-rolled line icons (no icon-library dependency). Stroke-based,
// 20x20 viewBox, inherit color via currentColor. Kept to the small set the
// app actually uses.
type IconProps = { className?: string };
const base = "1.8";

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 9.5 10 3l7 6.5" />
      <path d="M5 8v8a1 1 0 0 0 1 1h3v-5h2v5h3a1 1 0 0 0 1-1V8" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 2 4 11.5h5L9 18l7-9.5h-5L11 2Z" />
    </svg>
  );
}

export function BookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H16v13H5.5A1.5 1.5 0 0 0 4 17.5v-13Z" />
      <path d="M4 17.5V4.5" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 16.5V11M10 16.5V6M16 16.5v-8" />
      <path d="M3 17.5h14" />
    </svg>
  );
}

export function GearIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 3v1.8M10 15.2V17M17 10h-1.8M4.8 10H3M15.1 4.9l-1.3 1.3M6.2 13.8l-1.3 1.3M15.1 15.1l-1.3-1.3M6.2 6.2 4.9 4.9" />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 2.5 16 5v5c0 4-2.6 6.6-6 7.5C6.6 16.6 4 14 4 10V5l6-2.5Z" />
      <path d="M7.5 10 9.2 11.7 13 8" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M7 10.2 9 12.2 13.2 7.7" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 2.8 18 16.5H2L10 2.8Z" />
      <path d="M10 8v3.4" />
      <circle cx="10" cy="14" r="0.15" fill="currentColor" />
    </svg>
  );
}

export function DumbbellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 8v4M17 8v4" />
      <path d="M5.5 6.5v7M14.5 6.5v7" />
      <path d="M7 10h6" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={base} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 5l10 10M15 5 5 15" />
    </svg>
  );
}
