import Link from "next/link";

import { ROUTES } from "@/lib/routes";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-app px-4 py-16 text-text md:px-6">
      <section className="mx-auto max-w-3xl rounded-[var(--radius-card)] border border-outline bg-panel p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Terms
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-text-strong">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm leading-7 text-text-muted">
          Nivesh Saathi is an educational fixed deposit comparison and AI
          guidance tool. It is not a bank, broker, or personalized investment
          advisor.
        </p>
        <div className="mt-6 grid gap-4 text-sm leading-7 text-text-muted">
          <p>
            Recommendations are generated from available rate data, user inputs,
            and safety assumptions. Rates, eligibility, taxes, penalties, and
            terms must be verified on the official bank site before booking.
          </p>
          <p>
            Voice and chat responses are designed for clarity and convenience.
            Do not treat generated answers as a guarantee of returns or product
            availability.
          </p>
          <p>
            By using the product, you agree to use it responsibly and to avoid
            submitting sensitive financial information that is not needed for FD
            comparison.
          </p>
        </div>
        <Link href={ROUTES.LANDING} className="mt-8 inline-flex text-sm font-semibold text-accent">
          Back to Nivesh Saathi
        </Link>
      </section>
    </main>
  );
}
