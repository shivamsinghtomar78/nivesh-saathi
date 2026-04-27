"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 py-16">
      <div className="w-full max-w-xl rounded-[32px] border border-outline bg-panel p-8 text-center shadow-soft">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-outline bg-panel-strong text-highlight">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold text-text-strong">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          The screen hit an unexpected error, but the app is still safe to retry.
        </p>
        <p className="mt-4 rounded-2xl border border-outline bg-panel-strong px-4 py-3 text-left text-xs leading-6 text-text-muted">
          {error.message}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-highlight px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
