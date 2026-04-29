"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 py-16">
      <div className="w-full max-w-xl rounded-[var(--radius-card)] border border-outline bg-panel p-8 text-center shadow-soft">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-outline bg-panel-strong text-highlight">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold text-text-strong">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          The screen hit an unexpected error, but the app is still safe to retry.
        </p>
        <p className="mt-4 rounded-[var(--radius-input)] border border-outline bg-panel-strong px-4 py-3 text-left text-xs leading-6 text-text-muted">
          {error.message}
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={() => reset()}
          className="mt-6"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
