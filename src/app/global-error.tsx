"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="en">
      <body className="bg-app text-text">
        <div className="flex min-h-screen items-center justify-center px-4 py-16">
          <div className="w-full max-w-xl rounded-[32px] border border-outline bg-panel p-8 text-center shadow-soft">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-outline bg-panel-strong text-highlight">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-3xl font-semibold text-text-strong">
              App shell failed to render
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              Reload the page to recover the application shell.
            </p>
            <p className="mt-4 rounded-2xl border border-outline bg-panel-strong px-4 py-3 text-left text-xs leading-6 text-text-muted">
              {error.message}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
