"use client";

import Link from "next/link";
import { LockKeyhole, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";

export default function AuthGate({
  title,
  body,
  children,
  /** If true, allow guests to view the content without auth */
  allowGuest = false,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
  allowGuest?: boolean;
}) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === "loading") {
    return (
      <div className="rounded-[var(--radius-card)] border border-outline bg-panel px-6 py-14 text-center text-text-muted">
        Checking your secure session...
      </div>
    );
  }

  if (!user && !allowGuest) {
    return (
      <div className="rounded-[var(--radius-card)] border border-outline bg-panel px-6 py-14 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-outline bg-panel-strong text-highlight">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-text-strong">{title}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-text-muted">
          {body}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={ROUTES.LOGIN}>
            <Button variant="primary" size="lg">
              Sign in securely
            </Button>
          </Link>
          <Link href={ROUTES.COMPARE}>
            <Button variant="outline" size="lg">
              <Eye className="mr-2 h-4 w-4" />
              Browse as Guest
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
