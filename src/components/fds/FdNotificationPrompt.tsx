"use client";

import { BellRing, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFdNotifications } from "@/hooks/useFdNotifications";

export function FdNotificationPrompt() {
  const { enable, error, isEnabled, isReady, state } = useFdNotifications();

  if (state === "checking" || state === "unsupported" || state === "blocked") {
    return null;
  }

  if (isEnabled) {
    return (
      <Card className="border-accent/20 bg-accent-soft p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-strong">
              Maturity alerts are active
            </p>
            <p className="text-xs text-text-muted">
              You will receive FD reminders even when the app is closed.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!isReady && state !== "enabling") {
    return null;
  }

  return (
    <Card className="border-outline bg-panel p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-accent">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-strong">
              Get maturity alerts
            </p>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              Enable secure push reminders for 7 days before, tomorrow, and maturity day.
            </p>
            {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
          </div>
        </div>
        <Button
          variant="soft"
          onClick={() => void enable()}
          disabled={state === "enabling"}
          className="shrink-0"
        >
          {state === "enabling" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BellRing className="h-4 w-4" />
          )}
          Enable alerts
        </Button>
      </div>
    </Card>
  );
}
