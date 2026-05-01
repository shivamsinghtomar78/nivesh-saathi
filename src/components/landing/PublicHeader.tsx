"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Globe, Sparkles } from "lucide-react";

import { ROUTES } from "@/lib/routes";
import { LANGUAGE_LABELS } from "@/lib/copy";
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";
import type { AppLanguage } from "@/lib/server/advisor-schemas";

export default function PublicHeader() {
  const [langOpen, setLangOpen] = React.useState(false);
  const user = useAuthStore((state) => state.user);
  const language = useConversationStore((s) => s.language);
  const setLanguage = useConversationStore((s) => s.setLanguage);
  const reduceMotion = useReducedMotion();

  const href = user ? ROUTES.HOME : ROUTES.LOGIN;
  const label = user ? "Open home" : "Sign in";
  const fullLabel = user ? "Open app home" : "Sign in / Login";

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50 border-b border-outline bg-panel-glass/88 shadow-[0_8px_30px_rgba(0,0,0,0.16)] backdrop-blur-xl"
      initial={reduceMotion ? false : { opacity: 0, y: -18 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
        <Link href={ROUTES.LANDING} className="flex min-w-0 items-center gap-3">
          <motion.div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-panel)] bg-surface-dark text-on-dark shadow-[var(--shadow-soft-layer)]"
            whileHover={reduceMotion ? undefined : { rotate: 8, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <Sparkles className="h-5 w-5" />
          </motion.div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-text-strong sm:text-lg">
              Nivesh Saathi
            </p>
            <p className="hidden text-[11px] uppercase tracking-[0.18em] text-text-muted sm:block">
              Your trusted FD guide
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language toggle for non-English visitors */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-outline bg-input-bg px-3 py-2 text-xs font-medium text-text-muted transition hover:border-accent/30 hover:text-text-strong"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{LANGUAGE_LABELS[language]}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 z-50 mt-2 w-36 rounded-[var(--radius-panel)] border border-outline bg-panel py-1 shadow-[var(--shadow-card)]">
                {(Object.entries(LANGUAGE_LABELS) as [AppLanguage, string][]).map(([code, lbl]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLanguage(code);
                      setLangOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition ${
                      language === code
                        ? "bg-accent/10 text-accent font-semibold"
                        : "text-text-muted hover:bg-inner-panel hover:text-text-strong"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            )}
          </div>

          <motion.div
            whileHover={reduceMotion ? undefined : { y: -2 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          >
            <Link
              href={href}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(0,102,255,0.34)] transition hover:bg-accent-hover sm:px-5"
            >
              <span className="sm:hidden">{label}</span>
              <span className="hidden sm:inline">{fullLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
