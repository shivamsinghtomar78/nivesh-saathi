import { z } from "zod";

import { handleRouteError, jsonSuccess } from "@/lib/server/api";
import { logServerInfo, logServerWarn } from "@/lib/server/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

const videoSdkWebhookSchema = z
  .object({
    event: z.string().trim().max(120).optional(),
    type: z.string().trim().max(120).optional(),
    roomId: z.string().trim().max(160).optional(),
    meetingId: z.string().trim().max(160).optional(),
    sessionId: z.string().trim().max(160).optional(),
    participantId: z.string().trim().max(160).optional(),
    data: z.unknown().optional(),
    payload: z.unknown().optional(),
  })
  .passthrough();

function sanitizeWebhookValue(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.slice(0, 240);
  }

  if (Array.isArray(value)) {
    return depth >= 2
      ? `[array:${value.length}]`
      : value.slice(0, 12).map((item) => sanitizeWebhookValue(item, depth + 1));
  }

  if (typeof value === "object" && value) {
    if (depth >= 2) return "[object]";

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 32)
        .map(([key, entryValue]) => [key, sanitizeWebhookValue(entryValue, depth + 1)])
    );
  }

  return undefined;
}

export async function POST(request: Request) {
  try {
    const rawPayload = await request.json().catch(() => ({}));
    const payload = videoSdkWebhookSchema.parse(rawPayload);
    const event = payload.event ?? payload.type ?? "videosdk_webhook";
    const roomId = payload.roomId ?? payload.meetingId;

    logServerInfo("videosdk_room_webhook", {
      event,
      roomId,
      sessionId: payload.sessionId,
      participantId: payload.participantId,
      payload: sanitizeWebhookValue(payload),
    });

    return jsonSuccess({ accepted: true }, { status: 202 });
  } catch (error) {
    logServerWarn("videosdk_room_webhook_invalid", {
      message: error instanceof Error ? error.message : "Invalid VideoSDK webhook",
    });
    return handleRouteError(error, "Unable to process VideoSDK webhook", {
      zodMessage: "Invalid VideoSDK webhook payload",
    });
  }
}

export async function GET() {
  return jsonSuccess({
    ok: true,
    endpoint: "videosdk-webhook",
  });
}
