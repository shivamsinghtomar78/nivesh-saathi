"use client";

import { withCsrfHeaders } from "@/lib/csrf";

export function recordVoiceDiagnostic(input: {
  attemptId?: number;
  event: string;
  metadata?: Record<string, unknown>;
  sessionId?: string | null;
}) {
  if (typeof window === "undefined") return;

  void fetch("/api/voice/diagnostics", {
    method: "POST",
    headers: withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      attemptId: input.attemptId,
      event: input.event,
      metadata: input.metadata,
      sessionId: input.sessionId || `client-${Date.now()}`,
    }),
  }).catch(() => undefined);
}
