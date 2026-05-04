"use client";

import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Sanitize: never show raw error messages in production
  const isProduction = process.env.NODE_ENV === "production";
  const displayMessage = isProduction
    ? "An unexpected error occurred. Our team has been notified."
    : error.message;

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-3 py-10 tablet:px-4 tablet:py-16">
      <div className="w-full max-w-xl rounded-[var(--radius-card)] border border-outline bg-panel p-5 text-center shadow-soft tablet:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-outline bg-panel-strong text-danger">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-[clamp(1.9rem,7vw,2.25rem)] font-semibold leading-tight text-text-strong">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-muted max-w-sm mx-auto">
          {displayMessage}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-text-muted">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 grid gap-3 tablet:flex tablet:items-center tablet:justify-center">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => reset()}
            className="w-full rounded-full tablet:w-auto"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Link href="/">
            <Button variant="outline" size="lg" className="w-full rounded-full tablet:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
