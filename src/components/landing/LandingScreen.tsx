"use client";

import Link from "next/link";
import {
  ArrowRight,
  Languages,
  MessageCircleMore,
  Mic,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import PublicHeader from "@/components/landing/PublicHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";

const journeyCards = [
  {
    title: "Compare banks clearly",
    body: "See rate, maturity, bank type, and shortlist-ready differences in one place.",
    icon: Sparkles,
  },
  {
    title: "Text chat only",
    body: "Use the chat bot for typed questions, follow-ups, and jargon explanations.",
    icon: MessageCircleMore,
  },
  {
    title: "Voice bot only",
    body: "Use the voice bot when you want spoken guidance without the text keyboard flow.",
    icon: Mic,
  },
];

export default function LandingScreen() {
  const user = useAuthStore((state) => state.user);
  const primaryHref = user ? ROUTES.HOME : ROUTES.LOGIN;
  const primaryLabel = user ? "Open home" : "Sign in to continue";

  return (
    <main className="min-h-screen">
      <PublicHeader />

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-24 md:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <div className="rounded-[var(--radius-card)] border border-outline bg-panel p-6 shadow-soft md:p-8 lg:p-10">
            <Badge variant="accent">Voice-first FD advisor</Badge>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-text-strong md:text-5xl lg:text-6xl">
              One clean journey from login to compare, chat, and voice guidance.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-text-muted">
              Nivesh Saathi helps users compare fixed deposits, ask the text bot,
              or speak to a voice-only bot after secure sign-in. English is the
              default experience, with in-app language switching for regional use.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={primaryHref}>
                <Button size="lg" variant="secondary">
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={ROUTES.LOGIN}>
                <Button size="lg" variant="outline">
                  Secure auth
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {journeyCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-dark text-on-dark">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-text-strong">
                      {card.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-text-muted">
                      {card.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="p-6 shadow-soft">
              <CardHeader>
                <Badge variant="success" className="w-fit">
                  Secure session
                </Badge>
                <CardTitle>Auth first, then product home</CardTitle>
                <CardDescription>
                  Email, Google, or phone sign-in moves the user into the
                  protected home flow instead of dropping them into a mixed demo.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                  <p className="text-sm font-semibold text-text-strong">
                    Landing
                  </p>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    Public explanation and entry point
                  </p>
                </div>
                <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                  <p className="text-sm font-semibold text-text-strong">
                    Login
                  </p>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    Firebase-backed authentication
                  </p>
                </div>
                <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                  <p className="text-sm font-semibold text-text-strong">
                    Home
                  </p>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    Compare banks, open chat, or launch voice
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="p-6 shadow-soft">
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  Language switch
                </Badge>
                <CardTitle>English first</CardTitle>
                <CardDescription>
                  The app opens in English and keeps regional options one tap
                  away across the protected flow.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex flex-wrap gap-2">
                  {["English", "Hindi", "Tamil", "Bengali"].map((language) => (
                    <span
                      key={language}
                      className="rounded-full border border-outline bg-inner-panel px-3 py-2 text-sm font-semibold text-text-strong"
                    >
                      {language}
                    </span>
                  ))}
                </div>
                <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                  <div className="flex items-center gap-3">
                    <Languages className="h-5 w-5 text-text-strong" />
                    <p className="text-sm leading-6 text-text-muted">
                      The navigation, compare flow, and advisor responses all stay
                      aligned with the selected language.
                    </p>
                  </div>
                </div>
                <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-text-strong" />
                    <p className="text-sm leading-6 text-text-muted">
                      Signed-in users keep their shortlist and chat context across
                      pages.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
