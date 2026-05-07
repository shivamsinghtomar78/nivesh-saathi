import { z } from "zod";

import { getRequestIp, handleRouteError, jsonSuccess } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { logServerInfo, logServerWarn } from "@/lib/server/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

const diagnosticSchema = z.object({
  sessionId: z.string().trim().min(1).max(160),
  attemptId: z.number().int().min(0).max(1000).optional(),
  event: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_:-]+$/i),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const SENSITIVE_METADATA_KEY = /token|secret|key|authorization|audio|transcript|access/i;

function sanitizeMetadataValue(key: string, value: unknown, depth = 0): unknown {
  if (SENSITIVE_METADATA_KEY.test(key)) {
    return "[redacted]";
  }

  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.slice(0, 240);
  }

  if (Array.isArray(value)) {
    return depth >= 2
      ? `[array:${value.length}]`
      : value.slice(0, 12).map((item, index) =>
          sanitizeMetadataValue(`${key}_${index}`, item, depth + 1)
        );
  }

  if (typeof value === "object" && value) {
    if (depth >= 2) return "[object]";

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 24)
        .map(([entryKey, entryValue]) => [
          entryKey,
          sanitizeMetadataValue(entryKey, entryValue, depth + 1),
        ])
    );
  }

  return undefined;
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata)
      .slice(0, 32)
      .map(([key, value]) => [key, sanitizeMetadataValue(key, value)])
      .filter(([, value]) => value !== undefined)
  );
}

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const rateLimit = await enforceRateLimit({
      key: `voice-diagnostics:${auth.session.uid}:${getRequestIp(request)}`,
      limit: 80,
      window: "1 m",
    });

    if (!rateLimit.success) {
      logServerWarn("voice_diagnostics_rate_limited", {
        userId: auth.session.uid,
        retryAfter: rateLimit.reset,
      });
      return jsonSuccess({ accepted: false }, { status: 202 });
    }

    const input = diagnosticSchema.parse(await request.json());
    const metadata = sanitizeMetadata(input.metadata);

    logServerInfo("voice_client_diagnostic", {
      userId: auth.session.uid,
      sessionId: input.sessionId,
      attemptId: input.attemptId,
      event: input.event,
      metadata,
    });

    return jsonSuccess({ accepted: true }, { status: 202 });
  } catch (error) {
    return handleRouteError(error, "Unable to record voice diagnostic", {
      zodMessage: "Invalid voice diagnostic payload",
    });
  }
}
