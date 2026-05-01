"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  MessageCircleMore,
  TrendingUp,
} from "lucide-react";

import AuthGate from "@/components/auth/AuthGate";
import AppShell from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FDRate } from "@/lib/fd-data";
import { LANGUAGE_LABELS } from "@/lib/copy";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useCompareStore } from "@/stores/compareStore";

const quickActions = [
  {
    href: ROUTES.CHAT,
    title: "Ask Saathi",
    body: "Chat with the AI advisor for recommendations, calculations, and safety notes.",
    icon: MessageCircleMore,
  },
  {
    href: ROUTES.COMPARE,
    title: "Compare Rates",
    body: "Analyze and shortlist rates across public, private, and small finance banks.",
    icon: BarChart3,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const messages = useConversationStore((state) => state.messages);
  const language = useConversationStore((state) => state.language);
  const shortlist = useCompareStore((state) => state.shortlist);
  const [topRates, setTopRates] = useState<FDRate[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    fetch("/api/fd-rates?limit=3")
      .then((r) => r.json())
      .then((d) => setTopRates(d.rates || []))
      .catch(() => {});
  }, [user]);

  return (
    <AppShell
      eyebrow="Dashboard"
      title="Welcome to Nivesh Saathi"
      description="Your personalized hub for comparing fixed deposits, chatting with our intelligent assistant, and securing the best rates."
      actions={user ? (
        <Link href={ROUTES.CHAT}>
          <Button variant="secondary" className="rounded-full shadow-sm">
            Ask Saathi
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      ) : null}
    >
      <AuthGate
        title="Sign in to view your dashboard"
        body="Access your personalized shortlist, chat history, and the latest top-performing deposits."
      >
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6 xl:grid-cols-[1fr_340px]"
        >
          <div className="grid gap-6">
            <motion.div variants={itemVariants}>
              <Card className="p-6 border-outline bg-panel-glass shadow-sm backdrop-blur-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <CardHeader className="relative z-10 pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="accent" className="bg-accent/10 text-accent hover:bg-accent/20 border-transparent shadow-none">
                      Active Session
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">
                    Hello, {user?.displayName || user?.email?.split('@')[0] || "Investor"}
                  </CardTitle>
                  <CardDescription className="text-text-muted mt-1">
                    Here&apos;s a quick summary of your current session.
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10 grid gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl border border-outline bg-panel p-5 transition-shadow hover:shadow-soft">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Saved Shortlist
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-text-strong">
                      {shortlist.length} <span className="text-sm font-normal text-text-muted">banks</span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-outline bg-panel p-5 transition-shadow hover:shadow-soft">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Chat Activity
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-text-strong">
                      {Math.max(messages.length - 1, 0)} <span className="text-sm font-normal text-text-muted">messages</span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-outline bg-panel p-5 transition-shadow hover:shadow-soft">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Language
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-text-strong">
                      {LANGUAGE_LABELS[language]}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-outline bg-panel p-5 transition-shadow hover:shadow-soft">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Top Market Rate
                    </p>
                    <p className="financial-value mt-2 text-3xl font-semibold text-accent">
                      {topRates[0]?.regularRate ? `${topRates[0].regularRate.toFixed(2)}%` : "--"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={containerVariants} className="grid gap-4 sm:grid-cols-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <motion.div variants={itemVariants} key={action.href}>
                    <Link href={action.href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[var(--radius-card)]">
                      <Card className="group h-full cursor-pointer border-outline bg-panel p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-[var(--shadow-card-hover)]">
                        <CardHeader className="p-0">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-dark text-on-dark transition-transform duration-300 group-hover:scale-110 group-hover:shadow-soft">
                            <Icon className="h-5 w-5" />
                          </div>
                          <CardTitle className="mt-4 text-lg group-hover:text-accent transition-colors">{action.title}</CardTitle>
                          <CardDescription className="mt-2 leading-relaxed">{action.body}</CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="grid gap-4">
            <Card className="p-6 border-outline bg-panel shadow-sm">
              <CardHeader className="pb-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Market Snapshot</span>
                </div>
                <CardTitle className="text-xl">Top Performing Rates</CardTitle>
                <CardDescription className="mt-1">
                  Highest regular returns available right now.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {topRates.map((rate, index) => (
                  <motion.div
                    key={rate.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="group rounded-2xl border border-outline bg-inner-panel p-4 transition-colors hover:bg-panel hover:border-accent/30"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-text-strong">
                          {rate.bankName}
                        </p>
                        <p className="text-xs text-text-muted capitalize mt-0.5">
                          {rate.bankType.replace("-", " ")}
                        </p>
                      </div>
                          {rate.badge && (
                        <Badge variant="outline" className="bg-panel/80 text-[10px] uppercase tracking-wider">
                          {rate.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-bold text-accent">
                        {rate.regularRate.toFixed(2)}%
                      </p>
                      <p className="text-xs font-medium text-text-muted pb-1">
                        {rate.tenorLabel}
                      </p>
                    </div>
                  </motion.div>
                ))}
                
                <Link href={ROUTES.COMPARE} className="mt-2 block w-full">
                  <Button variant="outline" className="w-full rounded-xl text-sm font-medium">
                    View Full Table
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </AuthGate>
    </AppShell>
  );
}
