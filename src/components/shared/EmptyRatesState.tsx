import { Sparkles, WalletCards } from "lucide-react";

export default function EmptyRatesState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-outline bg-panel px-6 py-12 text-center shadow-[var(--shadow-card)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-outline bg-panel-strong">
      <WalletCards className="h-7 w-7 text-accent" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-text-strong">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-muted">
        {body}
      </p>
    <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-outline px-4 py-2 text-xs uppercase tracking-[0.2em] text-accent">
        <Sparkles className="h-4 w-4" />
        Fresh filters help
      </div>
    </div>
  );
}
