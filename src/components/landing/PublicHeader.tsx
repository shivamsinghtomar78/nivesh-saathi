"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";

export default function PublicHeader() {
  const user = useAuthStore((state) => state.user);
  const reduceMotion = useReducedMotion();
  const href = user ? ROUTES.HOME : ROUTES.LOGIN;
  const label = user ? "Open home" : "Sign in";
  const fullLabel = user ? "Open app home" : "Sign in / Login";

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50 border-b border-outline/80 bg-app/82 backdrop-blur-xl"
      initial={reduceMotion ? false : { opacity: 0, y: -18 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href={ROUTES.LANDING} className="flex min-w-0 items-center gap-3">
          <motion.div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-highlight text-black shadow-soft"
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

        <motion.div
          whileHover={reduceMotion ? undefined : { y: -2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        >
          <Link
            href={href}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-highlight px-3 text-sm font-semibold text-black shadow-soft transition hover:brightness-110 sm:rounded-full sm:px-5"
          >
            <span className="sm:hidden">{label}</span>
            <span className="hidden sm:inline">{fullLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </motion.header>
  );
}
