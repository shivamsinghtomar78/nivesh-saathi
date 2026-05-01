"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock3, MessageCircleMore, ShieldCheck, Star, UserRound } from "lucide-react";

import AuthGate from "@/components/auth/AuthGate";
import AppShell from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FD_RATES } from "@/lib/fd-data";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useCompareStore } from "@/stores/compareStore";

type ProfilePayload = {
  ok?: boolean;
  user?: {
    uid: string;
    email: string | null;
    phoneNumber: string | null;
    name: string | null;
    picture: string | null;
    provider: string | null;
  };
  chats?: Array<{
    threadId: string;
    language: string;
    fdContextIds: string[];
    messageCount: number;
    updatedAt: string;
    latestMessage?: string;
  }>;
  error?: string;
};

function formatDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.uid;
  const messages = useConversationStore((state) => state.messages);
  const shortlist = useCompareStore((state) => state.shortlist);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;

    fetch("/api/profile")
      .then((response) => response.json() as Promise<ProfilePayload>)
      .then((payload) => {
        if (active) {
          setProfile(payload);
        }
      })
      .catch(() => {
        if (active) {
          setProfile({ error: "Unable to load database profile right now." });
        }
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const shortlistedRates = useMemo(
    () => FD_RATES.filter((rate) => shortlist.includes(rate.id)),
    [shortlist]
  );

  return (
    <AppShell
      eyebrow="Profile"
      title="Account, shortlist, and stored sessions"
      description="Everything tied to the signed-in user now lives inside the same app orchestration, including shortlist context and saved advisor threads."
      actions={user ? (
        <Link href={ROUTES.HOME}>
          <Button size="lg" variant="secondary">
            Back to home
          </Button>
        </Link>
      ) : null}
    >
      <AuthGate
        title="Sign in to view your profile"
        body="Your profile shows the account behind the protected journey and the data that stays with it."
      >
        <div className="grid gap-6">
          <Card className="p-6 shadow-soft">
            <CardHeader>
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-dark text-on-dark">
                    <UserRound className="h-7 w-7" />
                  </div>
                  <div>
                    <Badge variant="accent" className="w-fit">
                      Signed-in user
                    </Badge>
                    <CardTitle className="mt-3">
                      {user?.displayName || profile?.user?.name || "Nivesh Saathi user"}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {user?.email || user?.phoneNumber || profile?.user?.email || "Signed in"}
                    </CardDescription>
                  </div>
                </div>

                <Link href={ROUTES.CHAT}>
                  <Button size="lg" variant="secondary">
                    <MessageCircleMore className="h-4 w-4" />
                    Open text bot
                  </Button>
                </Link>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-5 shadow-soft">
              <CardContent className="!mt-0">
                <ShieldCheck className="h-5 w-5 text-text-strong" />
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-text-muted">
                  Sign-in provider
                </p>
                <p className="mt-2 text-lg font-semibold text-text-strong">
                  {profile?.user?.provider || user?.providerId || "Firebase"}
                </p>
              </CardContent>
            </Card>

            <Card className="p-5 shadow-soft">
              <CardContent className="!mt-0">
                <MessageCircleMore className="h-5 w-5 text-text-strong" />
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-text-muted">
                  Local text messages
                </p>
                <p className="mt-2 text-lg font-semibold text-text-strong">
                  {Math.max(messages.length - 1, 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="p-5 shadow-soft">
              <CardContent className="!mt-0">
                <Star className="h-5 w-5 text-text-strong" />
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-text-muted">
                  Shortlisted banks
                </p>
                <p className="mt-2 text-lg font-semibold text-text-strong">
                  {shortlist.length}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card className="p-6 shadow-soft">
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  Database details
                </Badge>
                <CardTitle>Account snapshot</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                  <p className="text-text-muted">User ID</p>
                  <p className="mt-2 break-all font-mono text-text-strong">
                    {profile?.user?.uid || user?.uid}
                  </p>
                </div>
                <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                  <p className="text-text-muted">Email</p>
                  <p className="mt-2 text-text-strong">
                    {profile?.user?.email || user?.email || "Not added"}
                  </p>
                </div>
                <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                  <p className="text-text-muted">Phone</p>
                  <p className="mt-2 text-text-strong">
                    {profile?.user?.phoneNumber || user?.phoneNumber || "Not added"}
                  </p>
                </div>
                {profile?.error ? (
                  <p className="text-sm text-danger">{profile.error}</p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="p-6 shadow-soft">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Badge variant="success" className="w-fit">
                      Stored chats
                    </Badge>
                    <CardTitle className="mt-3">Saved threads</CardTitle>
                    <CardDescription>
                      These are the persisted advisor threads attached to the signed-in user.
                    </CardDescription>
                  </div>
                  <Clock3 className="h-5 w-5 text-text-muted" />
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                {(profile?.chats ?? []).length > 0 ? (
                  profile?.chats?.map((chat) => (
                    <div
                      key={chat.threadId}
                      className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-xs text-text-muted">
                          {chat.threadId}
                        </p>
                        <span className="rounded-full bg-input-bg px-3 py-1 text-xs font-semibold text-text-strong">
                          {chat.messageCount} messages
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-text-strong">
                        {chat.latestMessage || "No preview available"}
                      </p>
                      <p className="mt-2 text-xs text-text-muted">
                        {formatDate(chat.updatedAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[var(--radius-panel)] border border-dashed border-outline bg-inner-panel p-5 text-sm leading-6 text-text-muted">
                    No saved database chats yet. Open Saathi Advisor while signed in and the next thread will appear here.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="p-6 shadow-soft">
            <CardHeader>
              <Badge variant="outline" className="w-fit">
                Shortlist
              </Badge>
              <CardTitle>Current comparison context</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {shortlistedRates.length > 0 ? (
                shortlistedRates.map((rate) => (
                  <div
                    key={rate.id}
                    className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4"
                  >
                    <p className="font-semibold text-text-strong">{rate.bankName}</p>
                    <p className="mt-2 text-sm text-text-muted">
                      {rate.bankType.replace("-", " ")} bank
                    </p>
                    <p className="mt-2 text-sm text-text-strong">
                      {rate.regularRate.toFixed(2)}% regular
                    </p>
                  </div>
                ))
              ) : (
                <Link
                  href={ROUTES.COMPARE}
                  className="inline-flex items-center rounded-[var(--radius-panel)] border border-dashed border-outline bg-inner-panel p-5 text-sm font-semibold text-text-muted transition hover:border-accent/35 hover:text-text-strong"
                >
                  Build a shortlist from compare
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </AuthGate>
    </AppShell>
  );
}
