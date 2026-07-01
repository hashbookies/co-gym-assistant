export default function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-5 flex items-start gap-3">
      <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-brand-500" aria-hidden />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p> : null}
      </div>
    </header>
  );
}
