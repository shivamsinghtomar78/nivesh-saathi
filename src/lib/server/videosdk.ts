import { createHmac, randomUUID } from "crypto";

import { serverEnv } from "@/lib/server/env";

const VIDEOSDK_API_BASE_URL = "https://api.videosdk.live/v2";

type VideoSdkTokenInput = {
  expiresInSeconds?: number;
  participantId?: string;
  permissions?: Array<"allow_join" | "ask_join" | "allow_mod">;
  roles?: Array<"rtc" | "crawler">;
  roomId?: string;
};

type VideoSdkRoomResponse = {
  roomId?: string;
  customRoomId?: string;
  id?: string;
  disabled?: boolean;
};

export class VideoSdkApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "VideoSdkApiError";
  }
}

export type VoiceAgentWorkerDispatch =
  | {
      ok: true;
      status: "dispatched";
      endpoint: string;
    }
  | {
      ok: false;
      status: "not_configured" | "failed";
      error?: string;
      endpoint?: string;
      upstreamStatus?: number;
    };

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function createVideoSdkParticipantId(prefix: "user" | "agent" = "user") {
  return `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 18)}`;
}

export function hasVideoSdkServerConfig() {
  return Boolean(
    serverEnv.VIDEOSDK_AUTH_TOKEN ||
      (serverEnv.VIDEOSDK_API_KEY && serverEnv.VIDEOSDK_SECRET_KEY)
  );
}

export function generateVideoSdkToken(input: VideoSdkTokenInput = {}) {
  if (!serverEnv.VIDEOSDK_API_KEY || !serverEnv.VIDEOSDK_SECRET_KEY) {
    if (serverEnv.VIDEOSDK_AUTH_TOKEN) return serverEnv.VIDEOSDK_AUTH_TOKEN;
    throw new Error("VideoSDK API key and secret are required to mint scoped tokens.");
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    apikey: serverEnv.VIDEOSDK_API_KEY,
    permissions: input.permissions ?? ["allow_join"],
    roles: input.roles ?? ["rtc"],
    version: 2,
    iat: issuedAt,
    exp: issuedAt + (input.expiresInSeconds ?? 20 * 60),
    ...(input.roomId ? { roomId: input.roomId } : {}),
    ...(input.participantId ? { participantId: input.participantId } : {}),
  };
  const encodedHeader = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", serverEnv.VIDEOSDK_SECRET_KEY)
    .update(unsignedToken)
    .digest();

  return `${unsignedToken}.${base64Url(signature)}`;
}

export function createVideoSdkServerToken() {
  if (serverEnv.VIDEOSDK_AUTH_TOKEN) return serverEnv.VIDEOSDK_AUTH_TOKEN;

  return generateVideoSdkToken({
    expiresInSeconds: 10 * 60,
    permissions: ["allow_join", "allow_mod"],
    roles: ["crawler", "rtc"],
  });
}

export async function createVideoSdkRoom(input?: {
  customRoomId?: string;
  webhookUrl?: string;
}) {
  const response = await fetch(`${VIDEOSDK_API_BASE_URL}/rooms`, {
    method: "POST",
    headers: {
      Authorization: createVideoSdkServerToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(input?.customRoomId ? { customRoomId: input.customRoomId } : {}),
      ...(input?.webhookUrl
        ? {
            webhook: {
              endPoint: input.webhookUrl,
              events: [
                "session-started",
                "session-ended",
                "participant-joined",
                "participant-left",
              ],
            },
          }
        : {}),
      autoCloseConfig: {
        type: "session-end-and-deactivate",
        duration: 60,
      },
    }),
  });

  const rawPayload = await response.text();
  let payload: VideoSdkRoomResponse & {
    message?: string;
    error?: string;
  } = {};
  try {
    payload = rawPayload ? JSON.parse(rawPayload) : {};
  } catch {
    payload = { message: rawPayload.slice(0, 240) };
  }

  if (!response.ok || !payload.roomId) {
    throw new VideoSdkApiError(
      payload.message || payload.error || "VideoSDK room creation failed.",
      response.status,
      {
        upstreamStatus: response.status,
        upstreamStatusText: response.statusText,
        providerDetail: rawPayload.slice(0, 500),
      }
    );
  }

  return {
    roomId: payload.roomId,
    customRoomId: payload.customRoomId,
    id: payload.id,
    disabled: Boolean(payload.disabled),
  };
}

export async function dispatchVoiceAgentWorker(input: {
  agentParticipantId: string;
  conversationId?: string | null;
  language: string;
  participantId: string;
  prefetchKey?: string;
  recentMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  roomId: string;
  sessionId: string;
  threadId?: string | null;
  uiIntentHint?: unknown;
  userId: string;
}): Promise<VoiceAgentWorkerDispatch> {
  if (!serverEnv.VOICE_AGENT_WORKER_URL) {
    return { ok: false, status: "not_configured" };
  }

  const endpoint = new URL("/sessions", serverEnv.VOICE_AGENT_WORKER_URL);
  const endpointUrl = endpoint.toString();

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(serverEnv.VOICE_AGENT_WORKER_SECRET
          ? { "x-worker-secret": serverEnv.VOICE_AGENT_WORKER_SECRET }
          : {}),
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        status: "failed",
        endpoint: endpointUrl,
        upstreamStatus: response.status,
        error: detail.slice(0, 500) || response.statusText,
      };
    }

    return { ok: true, status: "dispatched", endpoint: endpointUrl };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      endpoint: endpointUrl,
      error: error instanceof Error ? error.message.slice(0, 500) : "Worker dispatch failed",
    };
  }
}
