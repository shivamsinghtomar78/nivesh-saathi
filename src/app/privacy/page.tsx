import Link from "next/link";

import { ROUTES } from "@/lib/routes";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-app px-3 py-10 text-text tablet:px-6 tablet:py-16">
      <section className="mx-auto max-w-3xl rounded-[var(--radius-card)] border border-outline bg-panel p-4 shadow-sm tablet:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Privacy
        </p>
        <h1 className="mt-3 text-[clamp(1.9rem,7vw,2.25rem)] font-semibold leading-tight text-text-strong">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm leading-7 text-text-muted">
          Nivesh Saathi uses your account, shortlist, conversation history, and
          stated FD preferences to provide fixed deposit guidance. We use this
          data to personalize answers, save your context, and improve reliability.
        </p>
        <div className="mt-6 grid gap-4 text-sm leading-7 text-text-muted">
          <p>
            We do not sell personal data. Authentication is handled through
            Firebase, and server requests use CSRF protection for same-origin
            actions.
          </p>
          <p>
            All product features require sign-in. Authentication is required to
            compare rates, use Saathi, sync history, save profile memory, watch
            rates, or persist recommendations across devices.
          </p>
          <p>
            FD information can change. Always confirm final terms directly with
            the bank before booking.
          </p>
        </div>
        <Link href={ROUTES.LANDING} className="mt-8 inline-flex text-sm font-semibold text-accent">
          Back to Nivesh Saathi
        </Link>
      </section>
    </main>
  );
}
