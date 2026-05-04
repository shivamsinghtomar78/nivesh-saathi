"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
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
      <div className="rounded-[var(--radius-card)] border border-outline bg-panel px-4 py-12 text-center text-text-muted tablet:px-6 tablet:py-14">
        Checking your secure session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-[var(--radius-card)] border border-outline bg-panel px-4 py-12 text-center tablet:px-6 tablet:py-14">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-outline bg-accent-soft text-accent">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-[clamp(1.45rem,6vw,1.5rem)] font-semibold leading-tight text-text-strong">{title}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-text-muted">
          {body}
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 tablet:flex-row">
          <Link href={ROUTES.LOGIN} className="w-full tablet:w-auto">
            <Button variant="primary" size="lg" className="w-full">
              Sign in securely
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
