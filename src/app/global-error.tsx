"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <html lang="en">
      <body className="bg-app">
        <div className="flex min-h-screen items-center justify-center px-3 py-10 tablet:px-4 tablet:py-16">
          <div className="w-full max-w-xl rounded-[var(--radius-card)] border border-outline bg-panel p-5 text-center shadow-soft tablet:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-outline bg-accent-soft text-accent">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-[clamp(1.9rem,7vw,2.25rem)] font-semibold leading-tight text-text-strong">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              The app hit an unexpected error, but it is safe to retry.
            </p>
            {!isProduction ? (
              <p className="mt-4 break-words rounded-[var(--radius-input)] border border-outline bg-panel-strong px-4 py-3 text-left text-xs leading-6 text-text-muted">
                {error.message}
              </p>
            ) : error.digest ? (
              <p className="mt-4 text-xs text-text-muted">Error ID: {error.digest}</p>
            ) : null}
            <Button
              variant="primary"
              size="lg"
              onClick={() => reset()}
              className="mt-6 w-full tablet:w-auto"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
