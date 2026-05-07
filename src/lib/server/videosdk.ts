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

export type VoiceAgentWorkerDispatch =
  | {
      ok: true;
      status: "dispatched";
    }
  | {
      ok: false;
      status: "not_configured" | "failed";
      error?: string;
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

  const payload = (await response.json().catch(() => ({}))) as VideoSdkRoomResponse & {
    message?: string;
  };

  if (!response.ok || !payload.roomId) {
    throw new Error(payload.message || "VideoSDK room creation failed.");
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
  roomId: string;
  sessionId: string;
  threadId?: string | null;
  userId: string;
}): Promise<VoiceAgentWorkerDispatch> {
  if (!serverEnv.VOICE_AGENT_WORKER_URL) {
    return { ok: false, status: "not_configured" };
  }

  const endpoint = new URL("/sessions", serverEnv.VOICE_AGENT_WORKER_URL);
  const response = await fetch(endpoint, {
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
      error: detail.slice(0, 500) || response.statusText,
    };
  }

  return { ok: true, status: "dispatched" };
}
