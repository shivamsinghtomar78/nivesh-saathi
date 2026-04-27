"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";

export default function AuthGate({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === "loading") {
    return (
      <div className="rounded-2xl border border-outline bg-panel px-6 py-14 text-center text-text-muted">
        Checking your secure session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-outline bg-panel px-6 py-14 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-outline bg-panel-strong text-highlight">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-text-strong">{title}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-text-muted">
          {body}
        </p>
        <Link
          href={ROUTES.LOGIN}
          className="mt-6 inline-flex rounded-xl bg-highlight px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Sign in securely
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
