"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock3, Database, LogIn, MessageCircleMore, ShieldCheck, Star, UserRound } from "lucide-react";

import AuthGate from "@/components/auth/AuthGate";
import BottomNav from "@/components/layout/BottomNav";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { FD_RATES } from "@/lib/fd-data";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
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
  const messages = useChatStore((state) => state.messages);
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
    <>
      <Navbar />
      <Sidebar />

      <main className="min-h-screen bg-app pb-24 pt-16 lg:ml-64 lg:pb-8">
        <section className="mx-auto max-w-5xl px-4 py-5 md:px-6">
          <AuthGate
            title="Sign in to view your profile"
            body="Your profile shows Firebase account details, stored chat sessions, and shortlist context when a database session exists."
          >
            <div className="grid gap-5">
              <div className="rounded-lg border border-outline bg-panel p-5 shadow-soft">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-highlight text-black">
                      <UserRound className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-highlight">
                        Profile
                      </p>
                      <h1 className="mt-2 text-2xl font-semibold text-text-strong">
                        {user?.displayName || profile?.user?.name || "Nivesh Saathi user"}
                      </h1>
                      <p className="mt-1 text-sm text-text-muted">
                        {user?.email || user?.phoneNumber || profile?.user?.email || "Signed in"}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={ROUTES.CHAT}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-highlight px-5 text-sm font-semibold text-black transition hover:brightness-110"
                  >
                    <MessageCircleMore className="h-4 w-4" />
                    Open Saathi
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-outline bg-panel p-4">
                  <ShieldCheck className="h-5 w-5 text-highlight" />
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-text-muted">
                    Sign-in provider
                  </p>
                  <p className="mt-2 text-lg font-semibold text-text-strong">
                    {profile?.user?.provider || user?.providerId || "Firebase"}
                  </p>
                </div>
                <div className="rounded-lg border border-outline bg-panel p-4">
                  <MessageCircleMore className="h-5 w-5 text-highlight" />
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-text-muted">
                    Local chat messages
                  </p>
                  <p className="mt-2 text-lg font-semibold text-text-strong">
                    {messages.length}
                  </p>
                </div>
                <div className="rounded-lg border border-outline bg-panel p-4">
                  <Star className="h-5 w-5 text-highlight" />
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-text-muted">
                    Shortlisted banks
                  </p>
                  <p className="mt-2 text-lg font-semibold text-text-strong">
                    {shortlist.length}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-lg border border-outline bg-panel p-5 shadow-soft">
                  <div className="flex items-center gap-2 text-highlight">
                    <Database className="h-4 w-4" />
                    <p className="text-xs uppercase tracking-[0.2em]">
                      Database details
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm">
                    <div>
                      <p className="text-text-muted">User ID</p>
                      <p className="mt-1 break-all font-mono text-text-strong">
                        {profile?.user?.uid || user?.uid}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-muted">Email</p>
                      <p className="mt-1 text-text-strong">
                        {profile?.user?.email || user?.email || "Not added"}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-muted">Phone</p>
                      <p className="mt-1 text-text-strong">
                        {profile?.user?.phoneNumber || user?.phoneNumber || "Not added"}
                      </p>
                    </div>
                    {profile?.error ? (
                      <p className="text-danger">{profile.error}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-outline bg-panel p-5 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-highlight">
                        Stored chats
                      </p>
                      <p className="mt-2 text-sm text-text-muted">
                        Saved server sessions appear here after you chat while signed in.
                      </p>
                    </div>
                    <Clock3 className="h-5 w-5 text-text-muted" />
                  </div>

                  <div className="mt-4 grid gap-3">
                    {(profile?.chats ?? []).length > 0 ? (
                      profile?.chats?.map((chat) => (
                        <div
                          key={chat.threadId}
                          className="rounded-lg border border-outline bg-app p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-mono text-xs text-text-muted">
                              {chat.threadId}
                            </p>
                            <span className="rounded-full bg-highlight/12 px-3 py-1 text-xs font-semibold text-highlight">
                              {chat.messageCount} messages
                            </span>
                          </div>
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-strong">
                            {chat.latestMessage || "No preview available"}
                          </p>
                          <p className="mt-2 text-xs text-text-muted">
                            {formatDate(chat.updatedAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-outline bg-app p-5 text-sm leading-6 text-text-muted">
                        No saved database chats yet. Open Saathi while signed in and
                        your next conversation will be stored here.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-outline bg-panel p-5 shadow-soft">
                <p className="text-xs uppercase tracking-[0.2em] text-highlight">
                  Shortlist
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {shortlistedRates.length > 0 ? (
                    shortlistedRates.map((rate) => (
                      <div
                        key={rate.id}
                        className="rounded-lg border border-outline bg-app p-4"
                      >
                        <p className="font-semibold text-text-strong">{rate.bankName}</p>
                        <p className="mt-1 text-sm text-text-muted">
                          {rate.bankType.replace("-", " ")} · {rate.regularRate.toFixed(2)}%
                        </p>
                      </div>
                    ))
                  ) : (
                    <Link
                      href={ROUTES.COMPARE}
                      className="inline-flex items-center gap-2 rounded-lg border border-dashed border-outline bg-app p-5 text-sm font-semibold text-text-muted transition hover:border-highlight hover:text-highlight"
                    >
                      <LogIn className="h-4 w-4" />
                      Build a shortlist from Compare
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </AuthGate>
        </section>
      </main>

      <BottomNav />
    </>
  );
}
