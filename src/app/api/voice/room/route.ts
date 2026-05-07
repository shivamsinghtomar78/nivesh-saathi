import { z } from "zod";

import { getRequestIp, handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { serverEnv } from "@/lib/server/env";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { logServerError, logServerInfo, logServerWarn } from "@/lib/server/telemetry";
import { startVoiceSession, trackAnalyticsEvent } from "@/lib/server/assistant-memory";
import {
  createVideoSdkParticipantId,
  createVideoSdkRoom,
  dispatchVoiceAgentWorker,
  generateVideoSdkToken,
  hasVideoSdkServerConfig,
} from "@/lib/server/videosdk";
import { appLanguageSchema } from "@/lib/server/advisor-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

const videoSdkVoiceRoomSchema = z.object({
  language: appLanguageSchema.default("hinglish"),
  threadId: z.string().trim().min(1).optional(),
  conversationId: z.string().trim().min(1).optional(),
  prefetchKey: z.string().trim().min(1).optional(),
  uiIntentHint: z.unknown().optional(),
  recentMessages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1200),
      })
    )
    .max(8)
    .optional(),
});

function redactWorkerDispatch(dispatch: Awaited<ReturnType<typeof dispatchVoiceAgentWorker>>) {
  if (dispatch.ok) return dispatch;
  return {
    ok: false,
    status: dispatch.status,
    ...(dispatch.error ? { error: dispatch.error.slice(0, 160) } : {}),
  };
}

function getVideoSdkWebhookUrl(request: Request) {
  if (serverEnv.VIDEOSDK_ROOM_WEBHOOK_URL) {
    return serverEnv.VIDEOSDK_ROOM_WEBHOOK_URL;
  }

  const origin = new URL(request.url).origin;
  return `${origin}/api/voice/videosdk-webhook`;
}

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    if (!hasVideoSdkServerConfig()) {
      return jsonError("VideoSDK is not configured", 503, {
        code: "videosdk_not_configured",
      });
    }

    const rateLimit = await enforceRateLimit({
      key: `voice-room:${auth.session.uid}:${getRequestIp(request)}`,
      limit: 10,
      window: "1 m",
    });

    if (!rateLimit.success) {
      return jsonError("Too many voice rooms. Please try again shortly.", 429, {
        retryAfter: rateLimit.reset,
      });
    }

    const input = videoSdkVoiceRoomSchema.parse(await request.json().catch(() => ({})));
    const participantId = createVideoSdkParticipantId("user");
    const agentParticipantId = createVideoSdkParticipantId("agent");
    const conversationId = input.conversationId ?? input.threadId ?? null;
    const room = await createVideoSdkRoom({
      customRoomId: `nivesh-${crypto.randomUUID().slice(0, 8)}`,
      webhookUrl: getVideoSdkWebhookUrl(request),
    });
    const token = generateVideoSdkToken({
      roomId: room.roomId,
      participantId,
      permissions: ["allow_join"],
      roles: ["rtc"],
      expiresInSeconds: 20 * 60,
    });

    const voiceSession = await startVoiceSession({
      userId: auth.session.uid,
      conversationId: conversationId ?? room.roomId,
      language: input.language,
      metadata: {
        transport: "videosdk",
        roomId: room.roomId,
        participantId,
        agentParticipantId,
        prefetchKey: input.prefetchKey,
      },
    }).catch((error) => {
      logServerWarn("videosdk_voice_memory_session_failed", {
        userId: auth.session.uid,
        roomId: room.roomId,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    });
    const sessionId = voiceSession?.sessionId ?? crypto.randomUUID();
    const worker = await dispatchVoiceAgentWorker({
      agentParticipantId,
      conversationId,
      language: input.language,
      participantId,
      roomId: room.roomId,
      sessionId,
      threadId: input.threadId ?? null,
      userId: auth.session.uid,
    });

    if (!worker.ok && worker.status === "failed") {
      logServerError("videosdk_voice_worker_dispatch_failed", {
        userId: auth.session.uid,
        roomId: room.roomId,
        status: worker.status,
        error: worker.error,
      });
    } else {
      logServerInfo("videosdk_voice_room_created", {
        userId: auth.session.uid,
        roomId: room.roomId,
        sessionId,
        worker: worker.status,
      });
    }

    void trackAnalyticsEvent({
      userId: auth.session.uid,
      conversationId: conversationId ?? room.roomId,
      voiceSessionId: sessionId,
      eventType: "voice_room_created",
      source: "voice",
      language: input.language,
      metadata: {
        transport: "videosdk",
        roomId: room.roomId,
        worker: worker.status,
      },
    }).catch(() => undefined);

    return jsonSuccess({
      roomId: room.roomId,
      token,
      participantId,
      agentParticipantId,
      voiceSessionId: sessionId,
      expiresIn: 20 * 60,
      worker: redactWorkerDispatch(worker),
      meta: {
        transport: "videosdk",
        agentName: "Nivesh Saathi",
      },
    });
  } catch (error) {
    return handleRouteError(error, "Unable to create VideoSDK voice room", {
      zodMessage: "Invalid VideoSDK voice room request",
    });
  }
}
