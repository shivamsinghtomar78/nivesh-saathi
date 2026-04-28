"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Sparkles, UserRound } from "lucide-react";
import { signOut } from "firebase/auth";
import type { ReactNode } from "react";

import { APP_COPY, LANGUAGE_LABELS } from "@/lib/copy";
import { withCsrfHeaders } from "@/lib/csrf";
import { firebaseAuth } from "@/lib/firebase";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";

const NAV_ITEMS = [
  { href: ROUTES.HOME, key: "home" as const },
  { href: ROUTES.COMPARE, key: "compare" as const },
  { href: ROUTES.CHAT, key: "chat" as const },
  { href: ROUTES.VOICE, key: "voice" as const },
  { href: ROUTES.PROFILE, key: "profile" as const },
];

type AppShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function AppShell({
  actions,
  children,
  description,
  eyebrow,
  title,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const language = useChatStore((state) => state.language);
  const setLanguage = useChatStore((state) => state.setLanguage);
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const copy = APP_COPY[language];

  const handleLogout = async () => {
    await signOut(firebaseAuth).catch(() => undefined);
    await fetch("/api/auth/session", {
      method: "DELETE",
      headers: withCsrfHeaders(),
    }).catch(() => undefined);
    clearUser();
    router.push(ROUTES.LANDING);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-outline bg-panel-glass/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 md:px-6 lg:px-8">
          <Link href={ROUTES.HOME} className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#111113] text-[#f5f4ef] shadow-soft">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-text-strong">
                Nivesh Saathi
              </p>
              <p className="truncate text-[11px] uppercase tracking-[0.18em] text-text-muted">
                {copy.tagline}
              </p>
            </div>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-2 lg:flex">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-[#111113] text-[#f5f4ef]"
                      : "bg-white/70 text-[#383a40] hover:bg-white"
                  )}
                >
                  {copy.nav[item.key]}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden rounded-full bg-white/75 p-1 shadow-[0_8px_18px_rgba(0,0,0,0.06)] md:flex">
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code as keyof typeof LANGUAGE_LABELS)}
                  className={cn(
                    "rounded-full px-3 py-2 text-xs font-semibold transition",
                    language === code
                      ? "bg-[#111113] text-[#f5f4ef]"
                      : "text-[#50535a] hover:text-[#111113]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <Link
              href={ROUTES.PROFILE}
              aria-label="Profile"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline bg-white/65 text-text-muted transition hover:border-highlight hover:text-text-strong"
            >
              <UserRound className="h-4 w-4" />
            </Link>

            {user ? (
              <button
                type="button"
                aria-label="Sign out"
                onClick={() => void handleLogout()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline bg-white/65 text-text-muted transition hover:border-highlight hover:text-text-strong"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href={ROUTES.LOGIN}
                className="hidden rounded-full bg-[#111113] px-4 py-2 text-sm font-semibold text-[#f5f4ef] transition hover:bg-[#1e1e22] md:inline-flex"
              >
                {copy.nav.login}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="min-h-screen pb-24 pt-24 lg:pb-8">
        <section className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-strong md:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted md:text-base">
                {description}
              </p>
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>

          {children}
        </section>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-outline bg-panel-glass/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-2xl px-2 py-2 text-center text-[11px] font-semibold transition",
                  active
                    ? "bg-[#111113] text-[#f5f4ef]"
                    : "text-text-muted hover:bg-white/75 hover:text-text-strong"
                )}
              >
                {copy.nav[item.key]}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
