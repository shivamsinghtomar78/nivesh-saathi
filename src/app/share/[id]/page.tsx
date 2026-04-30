import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { getSharedResponse } from "@/lib/server/persistence";
import { getFirebaseAdminAuth } from "@/lib/server/firebase-admin";
import { ROUTES } from "@/lib/routes";

async function requireSignedInShareAccess(pathname: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const loginPath = `${ROUTES.LOGIN}?next=${encodeURIComponent(pathname)}`;

  if (!sessionCookie) {
    redirect(loginPath);
  }

  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) {
    redirect(loginPath);
  }

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    redirect(loginPath);
  }
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSignedInShareAccess(`/share/${id}`);

  const shared = await getSharedResponse(id);

  if (!shared) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-app px-4 py-10 text-text-strong">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <Link href={ROUTES.LANDING} className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-dark text-on-dark shadow-soft">
              <Sparkles className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-semibold">Nivesh Saathi</span>
              <span className="block text-xs text-text-muted">Shared FD recommendation</span>
            </span>
          </Link>
          <Link href={ROUTES.COMPARE}>
            <Button variant="secondary" size="sm">
              Compare rates
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </header>

        <section className="rounded-[var(--radius-card)] border border-outline bg-panel p-6 shadow-soft md:p-8">
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            <ShieldCheck className="h-4 w-4" />
            Read-only advisor note
          </div>
          <div className="whitespace-pre-wrap text-base leading-7 text-text-strong">
            {shared.messageText}
          </div>

          {shared.rateCards.length > 0 && (
            <div className="mt-8 grid gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Rates referenced
              </p>
              {shared.rateCards.map((card, index) => (
                <div
                  key={`${card.bankName ?? "bank"}-${index}`}
                  className="rounded-2xl border border-outline bg-inner-panel p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-text-strong">
                        {card.bankName ?? "Bank"}
                      </p>
                      {card.tenor && (
                        <p className="mt-1 text-xs text-text-muted">{card.tenor}</p>
                      )}
                    </div>
                    {card.rate && (
                      <p className="text-xl font-semibold text-accent">{card.rate}</p>
                    )}
                  </div>
                  {card.maturityPreview && (
                    <p className="mt-3 text-sm text-text-muted">{card.maturityPreview}</p>
                  )}
                  {card.safetyNote && (
                    <p className="mt-3 border-t border-outline pt-3 text-xs leading-6 text-text-muted">
                      {card.safetyNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-xs leading-6 text-text-muted">
          This shared view is informational. Verify current bank rates before investing.
        </p>
      </div>
    </main>
  );
}
