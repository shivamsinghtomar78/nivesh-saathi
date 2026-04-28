"use client";

import Link from "next/link";
import { LogOut, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { signOut } from "firebase/auth";

import { APP_COPY, LANGUAGE_LABELS } from "@/lib/copy";
import { withCsrfHeaders } from "@/lib/csrf";
import { firebaseAuth } from "@/lib/firebase";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";

export default function Navbar() {
  const language = useChatStore((state) => state.language);
  const setLanguage = useChatStore((state) => state.setLanguage);
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [langOpen, setLangOpen] = useState(false);
  const copy = APP_COPY[language];

  const handleLogout = async () => {
    await signOut(firebaseAuth).catch(() => undefined);
    await fetch("/api/auth/session", {
      method: "DELETE",
      headers: withCsrfHeaders(),
    }).catch(() => undefined);
    clearUser();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-outline bg-panel-glass backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href={user ? ROUTES.COMPARE : ROUTES.HOME} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-highlight text-black shadow-soft">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-text-strong">
              Nivesh Saathi
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
              {copy.tagline}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              aria-label="Change language"
              onClick={() => setLangOpen((value) => !value)}
              className="inline-flex h-10 items-center rounded-full border border-outline px-3 text-xs font-medium text-text-muted transition hover:border-highlight hover:text-text-strong"
            >
              {LANGUAGE_LABELS[language]}
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-outline bg-panel p-2 shadow-soft">
                {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLanguage(code as keyof typeof LANGUAGE_LABELS);
                      setLangOpen(false);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-text-muted transition hover:bg-panel-strong hover:text-text-strong"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <>
              <Link
                href={ROUTES.PROFILE}
                aria-label="Profile"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline text-text-muted transition hover:border-highlight hover:text-highlight"
              >
                <UserRound className="h-4 w-4" />
              </Link>
              <button
                type="button"
                aria-label={copy.nav.logout}
                onClick={() => void handleLogout()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline text-text-muted transition hover:border-highlight hover:text-highlight"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              href={ROUTES.LOGIN}
              className="inline-flex rounded-full bg-highlight px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
            >
              {copy.nav.login}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
