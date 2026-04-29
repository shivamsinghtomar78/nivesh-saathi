"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  MessageCircleMore,
  Mic,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

import AuthGate from "@/components/auth/AuthGate";
import AppShell from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FD_RATES } from "@/lib/fd-data";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useCompareStore } from "@/stores/compareStore";

const quickActions = [
  {
    href: ROUTES.COMPARE,
    title: "Compare banks",
    body: "See differences across public, private, and small finance banks.",
    icon: BarChart3,
  },
  {
    href: ROUTES.CHAT,
    title: "Open text bot",
    body: "Ask typed questions without the voice controls getting in the way.",
    icon: MessageCircleMore,
  },
  {
    href: ROUTES.VOICE,
    title: "Open voice bot",
    body: "Use microphone-led guidance with spoken replies and no text input box.",
    icon: Mic,
  },
];

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const messages = useChatStore((state) => state.messages);
  const shortlist = useCompareStore((state) => state.shortlist);
  const topRates = [...FD_RATES].sort((left, right) => right.regularRate - left.regularRate).slice(0, 3);

  return (
    <AppShell
      eyebrow="Protected home"
      title="Choose how this user moves through the app"
      description="Start from comparison, open the text-only bot, or switch to the voice-only bot. The app keeps English as the default entry point and lets users switch language from the top bar."
      actions={
        <Link href={ROUTES.COMPARE}>
          <Button variant="secondary" size="lg">
            Compare now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      }
    >
      <AuthGate
        title="Sign in to enter the app home"
        body="After authentication, users land here first so the rest of the experience stays organized."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="grid gap-6">
            <Card className="p-6 shadow-soft">
              <CardHeader>
                <Badge variant="accent" className="w-fit">
                  Welcome
                </Badge>
                <CardTitle>
                  {user?.displayName || user?.email || user?.phoneNumber || "Nivesh Saathi user"}
                </CardTitle>
                <CardDescription>
                  The orchestration now starts with a clear protected home instead
                  of dropping users into a combined demo screen.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    Shortlist
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-text-strong">
                    {shortlist.length}
                  </p>
                </div>
                <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    Text messages
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-text-strong">
                    {Math.max(messages.length - 1, 0)}
                  </p>
                </div>
                <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    Default language
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-text-strong">
                    EN
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link key={action.href} href={action.href}>
                    <Card className="h-full p-5 shadow-soft transition hover:-translate-y-0.5">
                      <CardHeader>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-dark text-on-dark">
                          <Icon className="h-5 w-5" />
                        </div>
                        <CardTitle className="mt-3">{action.title}</CardTitle>
                        <CardDescription>{action.body}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="p-6 shadow-soft">
              <CardHeader>
                <Badge variant="success" className="w-fit">
                  Top rates
                </Badge>
                <CardTitle>Quick market snapshot</CardTitle>
                <CardDescription>
                  A starting point before users open the full comparison page.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {topRates.map((rate) => (
                  <div
                    key={rate.id}
                    className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text-strong">
                          {rate.bankName}
                        </p>
                        <p className="mt-1 text-sm text-text-muted">
                          {rate.bankType.replace("-", " ")}
                        </p>
                      </div>
                      {rate.badge ? <Badge variant="outline">{rate.badge}</Badge> : null}
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-text-strong">
                      {rate.regularRate.toFixed(2)}%
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      Typical tenor: {rate.tenorLabel}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="p-6 shadow-soft">
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  Flow
                </Badge>
                <CardTitle>Clean app order</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {[
                  { icon: ShieldCheck, label: "Landing -> login -> protected home" },
                  { icon: Star, label: "Home -> compare banks or companies" },
                  { icon: MessageCircleMore, label: "Chat -> text only bot" },
                  { icon: Mic, label: "Voice -> voice only bot" },
                  { icon: Sparkles, label: "Language switch stays available across pages" },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="flex items-start gap-3 rounded-[var(--radius-panel)] border border-outline bg-inner-panel px-4 py-3"
                    >
                      <Icon className="mt-0.5 h-4 w-4 text-text-strong" />
                      <p className="text-sm leading-6 text-text-muted">{item.label}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthGate>
    </AppShell>
  );
}
