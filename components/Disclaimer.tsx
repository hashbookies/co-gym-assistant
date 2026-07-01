import { ShieldIcon } from "@/components/icons";

export default function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2 rounded-xl bg-stone-100/80 px-3 py-2.5 text-[11px] leading-snug text-stone-500 ${className}`}>
      <ShieldIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-stone-400" />
      <span>
        This app does not provide medical advice. Follow your clinician&apos;s guidance,
        especially while using prescription medication. Stop if you feel unwell.
      </span>
    </p>
  );
}
