"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, MessageCircleMore, Mic, Shield, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { signOut } from "firebase/auth";

import { APP_COPY, LANGUAGE_LABELS } from "@/lib/copy";
import { firebaseAuth } from "@/lib/firebase";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";

const navLinks = [
  { href: ROUTES.HOME, key: "home", icon: Sparkles },
  { href: ROUTES.COMPARE, key: "compare", icon: Shield },
  { href: ROUTES.CHAT, key: "chat", icon: MessageCircleMore },
  { href: ROUTES.VOICE, key: "voice", icon: Mic },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const language = useChatStore((state) => state.language);
  const setLanguage = useChatStore((state) => state.setLanguage);
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const copy = APP_COPY[language];

  const handleLogout = async () => {
    await signOut(firebaseAuth).catch(() => undefined);
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    clearUser();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-outline bg-panel-glass backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href={ROUTES.HOME} className="flex items-center gap-3">
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

        <nav className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const label = copy.nav[link.key];

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                  pathname === link.href
                    ? "bg-highlight text-black"
                    : "text-text-muted hover:bg-panel-strong hover:text-text-strong"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

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
            <button
              type="button"
              aria-label={copy.nav.logout}
              onClick={() => void handleLogout()}
              className="hidden items-center gap-2 rounded-full border border-outline px-4 py-2 text-sm text-text-muted transition hover:border-highlight hover:text-highlight md:inline-flex"
            >
              <LogOut className="h-4 w-4" />
              {copy.nav.logout}
            </button>
          ) : (
            <Link
              href={ROUTES.LOGIN}
              className="hidden rounded-full bg-highlight px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 md:inline-flex"
            >
              {copy.nav.login}
            </Link>
          )}

          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline text-text-strong md:hidden"
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-outline bg-panel px-4 py-4 md:hidden">
          <nav className="grid gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    pathname === link.href
                      ? "bg-highlight text-black"
                      : "text-text-muted hover:bg-panel-strong hover:text-text-strong"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {copy.nav[link.key]}
                </Link>
              );
            })}
            {!user && (
              <Link
                href={ROUTES.LOGIN}
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex justify-center rounded-2xl bg-highlight px-4 py-3 text-sm font-semibold text-black"
              >
                {copy.nav.login}
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
