export default function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800 ${className}`}>
      This app does not provide medical advice. Follow your clinician&apos;s guidance,
      especially while using prescription medication. Stop if you feel unwell.
    </p>
  );
}
