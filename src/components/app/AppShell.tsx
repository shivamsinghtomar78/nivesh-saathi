"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Landmark, UserRound, Settings, ChevronDown, Home, BarChart3, MessageCircleMore, WalletCards, Lightbulb, Mic } from "lucide-react";
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
  { href: ROUTES.COMPARE, key: "compare" as const, icon: BarChart3 },
  { href: ROUTES.FDS, key: "fds" as const, icon: WalletCards },
  { href: ROUTES.INSIGHTS, key: "insights" as const, icon: Lightbulb },
  { href: ROUTES.CHAT, key: "chat" as const, icon: MessageCircleMore },
  { href: ROUTES.VOICE, key: "voice" as const, icon: Mic },
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
    <div
      className={cn(
        "min-h-screen min-w-0 bg-app text-text",
        workspace && "h-[100svh] overflow-hidden bg-[#0A0A0A] text-[#EAEAEA]"
      )}
    >
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b backdrop-blur-2xl",
          workspace
            ? "border-[#1F1F1F]/85 bg-[#0A0A0A]/94 shadow-none"
            : "border-outline bg-panel-glass/94 shadow-[0_16px_52px_rgba(0,0,0,0.42)]"
        )}
      >
        <div
          className={cn(
            "mx-auto flex min-w-0 items-center gap-2 px-3 tablet:px-5 laptop:px-8",
            workspace ? "h-14 max-w-none" : "h-14 max-w-[95rem] laptop:h-16"
          )}
        >
          <Link href={ROUTES.HOME} className="flex min-w-0 items-center gap-3 group">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className={cn(
                "flex shrink-0 items-center justify-center rounded-[var(--radius-panel)] border border-accent/20 bg-accent-soft text-accent",
                workspace ? "h-9 w-9 shadow-none" : "h-10 w-10 shadow-[var(--shadow-soft-layer)]"
              )}
            >
              <Landmark className="h-5 w-5 transition-colors" />
            </motion.div>
            <div className="hidden min-w-0 tablet:block">
              <p className="truncate text-lg font-semibold text-text-strong">
                Nivesh Saathi
              </p>
            </div>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 laptop:flex">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative px-3 py-2 text-sm font-medium transition"
                >
                  <span className={cn(
                    "relative z-10 transition-colors duration-300",
                    active ? "text-accent" : "text-[#9CA3AF] group-hover:text-[#EAEAEA]"
                  )}>
                    {copy.nav[item.key]}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="activeNavBackground"
                      className="absolute inset-x-2 bottom-1 h-px rounded-full bg-accent/75 shadow-[0_0_18px_rgba(215,182,109,0.2)]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-1.5 tablet:gap-3">
            <div className="hidden rounded-full border border-[#1F1F1F] bg-[#121212]/88 p-1 shadow-none tablet:flex">
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code as keyof typeof LANGUAGE_LABELS)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition",
                    language === code
                      ? "bg-accent-soft text-accent shadow-none"
                      : "text-[#9CA3AF] hover:bg-white/[0.055] hover:text-[#EAEAEA]"
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
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-full border border-[#1F1F1F] bg-[#121212]/88 pl-2.5 pr-2 text-[#EAEAEA] transition hover:border-accent/35 hover:bg-[#161616] tablet:pl-3",
                    workspace ? "h-9" : "h-10"
                  )}
                >
                  <UserRound className="h-4 w-4" />
                  <span className="hidden max-w-[96px] truncate text-sm font-medium tablet:inline-block">
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
                className="inline-flex min-h-10 items-center rounded-full border border-accent/20 bg-accent-soft px-3 text-sm font-semibold text-accent shadow-none transition hover:border-accent/35 hover:bg-accent/15 tablet:px-5"
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
            ? "h-[100svh] overflow-hidden bg-[#0A0A0A] pb-0 pt-14"
            : "min-h-screen pb-24 pt-20 laptop:pb-12 laptop:pt-24"
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={cn(
            "mx-auto flex flex-col",
            workspace
              ? "h-[calc(100svh-3.5rem)] w-full max-w-none gap-0 px-0 py-0"
              : "w-full max-w-[95rem] gap-6 px-3 py-5 tablet:px-5 laptop:gap-8 laptop:px-8 laptop:py-6"
          )}
        >
          {!workspace ? (
            <div className="flex min-w-0 flex-col gap-4 border-b border-outline pb-5 tablet:pb-6 laptop:flex-row laptop:items-end laptop:justify-between">
              <div className="min-w-0 max-w-2xl">
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                  className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent"
                >
                  {eyebrow}
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="text-[clamp(1.8rem,6vw,2.45rem)] font-semibold leading-tight tracking-normal text-text-strong"
                >
                  {title}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="mt-3 max-w-2xl text-sm leading-6 text-text-muted tablet:text-base tablet:leading-relaxed"
                >
                  {description}
                </motion.p>
              </div>
              {actions ? <div className="mt-2 flex w-full flex-wrap gap-3 tablet:w-auto laptop:mt-0">{actions}</div> : null}
            </div>
          ) : null}

          <div className={cn("relative min-w-0", workspace && "h-full min-h-0 w-full")}>
            {children}
          </div>
        </motion.div>
      </main>

      {!workspace ? (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-outline bg-panel-glass/94 pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_48px_rgba(0,0,0,0.42)] backdrop-blur-2xl laptop:hidden">
          <div className="mx-auto grid max-w-3xl grid-cols-6 gap-1 px-1.5 py-2">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-panel)] px-1.5 py-2 text-center text-[10px] font-medium transition tablet:text-[11px]",
                    active
                      ? "text-text-strong"
                      : "text-text-muted hover:bg-input-bg"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="activeBottomNav"
                      className="absolute inset-0 -z-10 rounded-[var(--radius-panel)] border border-accent/20 bg-accent-soft"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className={cn("h-5 w-5 mb-0.5", active && "text-accent")} />
                  <span className={cn("max-w-full truncate", active && "font-semibold")}>{copy.nav[item.key]}</span>
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
