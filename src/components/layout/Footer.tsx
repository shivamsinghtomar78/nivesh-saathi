import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { LANGUAGE_LABELS } from "@/lib/copy";
import { ROUTES } from "@/lib/routes";

export default function Footer() {
  return (
    <footer className="border-t border-outline bg-panel/60 px-6 pb-24 pt-12 lg:pb-10">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p className="font-heading text-2xl font-semibold text-text-strong">
            Nivesh Saathi
          </p>
          <p className="mt-3 max-w-md text-sm leading-6 text-text-muted">
            A voice-first fixed deposit advisor built for clarity, trust, and low-friction decision making.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-outline px-4 py-2 text-xs uppercase tracking-[0.2em] text-highlight">
            <ShieldCheck className="h-4 w-4" />
            DICGC context in plain language
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-text-strong">
            App
          </h4>
          <div className="mt-4 grid gap-3 text-sm text-text-muted">
            <Link href={ROUTES.COMPARE} className="transition hover:text-highlight">
              Compare
            </Link>
            <Link href={ROUTES.CHAT} className="transition hover:text-highlight">
              Saathi chat
            </Link>
            <Link href={ROUTES.VOICE} className="transition hover:text-highlight">
              Voice query
            </Link>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-text-strong">
            Languages
          </h4>
          <div className="mt-4 grid gap-3 text-sm text-text-muted">
            {Object.values(LANGUAGE_LABELS).map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-7xl border-t border-outline pt-6 text-xs leading-6 text-text-muted">
        Nivesh Saathi is an education-first FD comparison experience. Deposits remain with the respective regulated banks and DICGC protection applies up to the applicable limit per depositor per bank.
      </div>
    </footer>
  );
}
