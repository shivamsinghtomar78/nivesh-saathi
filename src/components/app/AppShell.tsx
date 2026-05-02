"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Landmark, UserRound, Settings, ChevronDown, Home, BarChart3, MessageCircleMore, WalletCards } from "lucide-react";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

import { APP_COPY, LANGUAGE_LABELS } from "@/lib/copy";
import { withCsrfHeaders } from "@/lib/csrf";
import { firebaseAuth } from "@/lib/firebase";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

const NAV_ITEMS = [
  { href: ROUTES.HOME, key: "home" as const, icon: Home },
  { href: ROUTES.FDS, key: "fds" as const, icon: WalletCards },
  { href: ROUTES.COMPARE, key: "compare" as const, icon: BarChart3 },
  { href: ROUTES.CHAT, key: "chat" as const, icon: MessageCircleMore },
];

type AppShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  workspace?: boolean;
};

export default function AppShell({
  actions,
  children,
  description,
  eyebrow,
  workspace = false,
  title,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const language = useConversationStore((state) => state.language);
  const setLanguage = useConversationStore((state) => state.setLanguage);
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const copy = APP_COPY[language];
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div className="bg-app min-h-screen">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-outline bg-panel-glass/90 shadow-[0_12px_42px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[95rem] items-center gap-4 px-4 md:px-6 lg:px-8">
          <Link href={ROUTES.HOME} className="flex min-w-0 items-center gap-3 group">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-panel)] bg-surface-dark text-on-dark shadow-[var(--shadow-soft-layer)]"
            >
              <Landmark className="h-5 w-5 transition-colors group-hover:text-accent" />
            </motion.div>
            <div className="min-w-0 hidden sm:block">
              <p className="truncate text-lg font-semibold text-text-strong">
                Nivesh Saathi
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
                  className="relative px-4 py-2 text-sm font-medium transition group"
                >
                  <span className={cn(
                    "relative z-10 transition-colors duration-300",
                    active ? "text-on-accent" : "text-text-muted group-hover:text-text-strong"
                  )}>
                    {copy.nav[item.key]}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="activeNavBackground"
                      className="absolute inset-0 rounded-full bg-accent shadow-[0_18px_42px_rgba(91,224,189,0.18)]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden rounded-full bg-input-bg border border-outline p-1 shadow-[var(--shadow-soft-layer)] md:flex">
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code as keyof typeof LANGUAGE_LABELS)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition",
                    language === code
                      ? "bg-accent text-on-accent shadow-sm dark:shadow-[0_12px_30px_rgba(89,221,185,0.18)]"
                      : "text-text-muted hover:bg-inner-panel hover:text-text-strong"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            
            <ThemeToggle />

            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex h-10 items-center gap-2 rounded-full border border-outline bg-input-bg pl-3 pr-2 text-text-strong transition hover:border-accent/40 hover:shadow-[var(--shadow-soft-layer)]"
                >
                  <UserRound className="h-4 w-4" />
                  <span className="text-sm font-medium max-w-[80px] truncate hidden sm:inline-block">
                    {user.displayName || 'Profile'}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-text-muted transition-transform", isProfileOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 overflow-hidden rounded-[var(--radius-panel)] border border-outline bg-panel py-1 shadow-[var(--shadow-card)]"
                    >
                      <div className="px-4 py-3 border-b border-outline mb-1">
                        <p className="text-sm font-medium text-text-strong truncate">{user.displayName || 'User'}</p>
                        <p className="text-xs text-text-muted truncate">{user.email}</p>
                      </div>
                      <Link
                        href={ROUTES.PROFILE}
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted transition hover:bg-inner-panel hover:text-text-strong"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          void handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href={ROUTES.LOGIN}
                className="rounded-full bg-surface-dark px-5 py-2 text-sm font-medium text-on-dark transition hover:bg-surface-dark-hover"
              >
                {copy.nav.login}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main
        className={cn(
          workspace
            ? "h-screen overflow-hidden pb-0 pt-16"
            : "min-h-screen pb-24 pt-24 lg:pb-12"
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={cn(
            "mx-auto flex max-w-[95rem] flex-col px-4 md:px-6 lg:px-8",
            workspace ? "h-[calc(100vh-4rem)] gap-4 py-4" : "gap-8 py-6"
          )}
        >
          {!workspace ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-outline pb-6">
              <div className="max-w-2xl">
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-2"
                >
                  {eyebrow}
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="text-3xl font-semibold tracking-tight text-text-strong md:text-4xl"
                >
                  {title}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="mt-3 text-base leading-relaxed text-text-muted"
                >
                  {description}
                </motion.p>
              </div>
              {actions ? <div className="flex flex-wrap gap-3 mt-4 md:mt-0">{actions}</div> : null}
            </div>
          ) : null}

          <div className={cn("relative", workspace && "h-full min-h-0")}>
            {children}
          </div>
        </motion.div>
      </main>

      {!workspace ? (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-outline bg-panel-glass/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl lg:hidden">
          <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1 px-2 py-2">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-[var(--radius-panel)] px-2 py-2.5 text-center text-[11px] font-medium transition flex flex-col items-center justify-center gap-1",
                    active
                      ? "text-text-strong"
                      : "text-text-muted hover:bg-input-bg"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="activeBottomNav"
                      className="absolute inset-0 -z-10 rounded-[var(--radius-panel)] bg-accent-soft"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className={cn("h-5 w-5 mb-0.5", active && "text-accent")} />
                  <span className={cn(active && "font-semibold")}>{copy.nav[item.key]}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
      <OnboardingWizard />
    </div>
  );
}
