import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRouteState = vi.hoisted(() => ({
  bookingStore: new Map<string, unknown>(),
  serverEnv: {
    DEEPGRAM_API_KEY: "",
    ELEVENLABS_API_KEY: "",
    ELEVENLABS_VOICE_ID: undefined as string | undefined,
    GROQ_API_KEY: "",
    GROQ_MODEL: "llama-3.3-70b-versatile",
    VIDEOSDK_API_KEY: "",
    VIDEOSDK_SECRET_KEY: "",
    VIDEOSDK_AUTH_TOKEN: "",
    VIDEOSDK_ROOM_WEBHOOK_URL: undefined as string | undefined,
    VOICE_AGENT_WORKER_URL: undefined as string | undefined,
    VOICE_AGENT_WORKER_SECRET: undefined as string | undefined,
  },
}));

vi.mock("@/lib/server/auth", () => ({
  requireCsrfProtection: vi.fn(() => null),
  requireFirebaseSession: vi.fn(async () => ({
    ok: true,
    session: {
      uid: "user-1",
      name: "Test User",
      email: "test@example.com",
      phone_number: "9999999999",
    },
  })),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  enforceRateLimit: vi.fn(async () => ({ success: true, reset: 0 })),
}));

vi.mock("@/lib/server/env", () => ({
  serverEnv: mockRouteState.serverEnv,
  hasLangSmithConfig: false,
}));

vi.mock("@/lib/server/cache", () => ({
  cacheGet: vi.fn(async (key: string) => mockRouteState.bookingStore.get(key) ?? null),
  cacheSet: vi.fn(async (key: string, value: unknown) => {
    mockRouteState.bookingStore.set(key, value);
  }),
}));

vi.mock("@/lib/server/persistence", () => ({
  persistChatSessionTurn: vi.fn(async () => undefined),
  persistFlaggedMessage: vi.fn(async () => undefined),
  updateUserMemory: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server/chat-repository", () => ({
  createConversation: vi.fn(async () => ({ id: "voice-conv-1" })),
  getConversationOwner: vi.fn(async () => "user-1"),
  insertMessage: vi.fn(async () => ({ id: "msg-1" })),
}));

vi.mock("@/lib/server/assistant-memory", () => ({
  recordVoiceTurn: vi.fn(async () => true),
  startVoiceSession: vi.fn(async () => ({ sessionId: "voice-session-1" })),
  trackAnalyticsEvent: vi.fn(async () => true),
  updateAssistantState: vi.fn(async () => true),
}));

vi.mock("@/lib/server/telemetry", () => ({
  logServerError: vi.fn(),
  logServerInfo: vi.fn(),
  logServerWarn: vi.fn(),
}));

import { POST as postDiagnostics } from "@/app/api/voice/diagnostics/route";
import { PATCH as patchBooking, POST as postBooking } from "@/app/api/voice/booking/route";
import { POST as postKyc } from "@/app/api/voice/booking/kyc/route";
import { POST as postRoom } from "@/app/api/voice/room/route";
import { logServerError, logServerInfo } from "@/lib/server/telemetry";

const sampleRateCard = {
  bankId: "sbi",
  bankName: "State Bank of India",
  bankNameLocal: "State Bank of India",
  officialUrl: "https://sbi.co.in/fd",
  rate: "7.50% p.a.",
  rateValue: 7.5,
  tenorMonths: 12,
  tenorLabel: "1 year",
  maturityAmount: 107714,
  interestEarned: 7714,
  maturityPreview: "Rs 1,00,000 -> Rs 1,07,714",
  safetyNote: "DICGC cover applies up to Rs 5 lakh per bank.",
  sourceLabel: "Demo seed data",
  sourceUrl: "https://sbi.co.in/fd",
  asOf: "2026-04-28",
};

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("voice API routes", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    mockRouteState.bookingStore.clear();
    mockRouteState.serverEnv.DEEPGRAM_API_KEY = "";
    mockRouteState.serverEnv.ELEVENLABS_API_KEY = "";
    mockRouteState.serverEnv.GROQ_API_KEY = "";
    mockRouteState.serverEnv.GROQ_MODEL = "llama-3.3-70b-versatile";
    mockRouteState.serverEnv.VIDEOSDK_API_KEY = "";
    mockRouteState.serverEnv.VIDEOSDK_SECRET_KEY = "";
    mockRouteState.serverEnv.VIDEOSDK_AUTH_TOKEN = "";
    mockRouteState.serverEnv.VIDEOSDK_ROOM_WEBHOOK_URL = undefined;
    mockRouteState.serverEnv.VOICE_AGENT_WORKER_URL = undefined;
    mockRouteState.serverEnv.VOICE_AGENT_WORKER_SECRET = undefined;
  });

  it("creates a VideoSDK room and returns a scoped client token", async () => {
    mockRouteState.serverEnv.VIDEOSDK_API_KEY = "videosdk-key";
    mockRouteState.serverEnv.VIDEOSDK_SECRET_KEY = "videosdk-secret";
    const fetchMock = vi.fn(async () =>
      Response.json({ roomId: "abc-xyzw-lmno", id: "room-db-id", disabled: false })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await postRoom(
      jsonRequest("http://localhost/api/voice/room", {
        language: "hinglish",
        threadId: "thread-1",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.roomId).toBe("abc-xyzw-lmno");
    expect(body.token.split(".")).toHaveLength(3);
    expect(body.meta).toMatchObject({ transport: "videosdk" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.videosdk.live/v2/rooms",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.any(String),
        }),
      })
    );
  });

  it("surfaces VideoSDK room creation failures without returning an opaque 500", async () => {
    mockRouteState.serverEnv.VIDEOSDK_API_KEY = "videosdk-key";
    mockRouteState.serverEnv.VIDEOSDK_SECRET_KEY = "videosdk-secret";
    mockRouteState.serverEnv.VIDEOSDK_ROOM_WEBHOOK_URL =
      "http://localhost:3000/api/voice/videosdk-webhook";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { message: "Webhook endpoint must be reachable over HTTPS." },
          { status: 400, statusText: "Bad Request" }
        )
      )
    );

    const response = await postRoom(
      jsonRequest("https://nivesh-saathi-seven.vercel.app/api/voice/room", {
        language: "hinglish",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("Unable to create VideoSDK room");
    expect(body.details).toMatchObject({
      code: "videosdk_room_create_failed",
      upstream: 400,
    });
    expect(logServerError).toHaveBeenCalledWith(
      "videosdk_room_create_failed",
      expect.objectContaining({
        upstreamStatus: 400,
      })
    );
  });

  it("records sanitized browser voice diagnostics", async () => {
    const response = await postDiagnostics(
      jsonRequest("http://localhost/api/voice/diagnostics", {
        sessionId: "voice-session-client-1",
        attemptId: 2,
        event: "ws_close",
        metadata: {
          code: 1006,
          reason: "",
          transcript: "raw speech should never be logged",
          accessToken: "dg-temp-token",
          chunks: { count: 4, bytes: 12000 },
        },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.accepted).toBe(true);
    expect(logServerInfo).toHaveBeenCalledWith(
      "voice_client_diagnostic",
      expect.objectContaining({
        sessionId: "voice-session-client-1",
        attemptId: 2,
        event: "ws_close",
        metadata: expect.objectContaining({
          code: 1006,
          transcript: "[redacted]",
          accessToken: "[redacted]",
          chunks: { count: 4, bytes: 12000 },
        }),
      })
    );
  });

  it("creates, confirms, and completes a mock KYC handoff draft", async () => {
    const createResponse = await postBooking(
      jsonRequest("http://localhost/api/voice/booking", {
        language: "hinglish",
        selectedOption: 2,
        rateCard: sampleRateCard,
      })
    );
    const created = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(created.draft.selectedOption).toBe(2);
    expect(created.meta.mockKyc).toBe(true);

    const patchResponse = await patchBooking(
      jsonRequest("http://localhost/api/voice/booking", {
        draftId: created.draft.draftId,
        consentAccepted: true,
        confirmationState: "confirmed",
        status: "kyc_handoff",
      })
    );
    const patched = await patchResponse.json();

    expect(patched.draft.confirmationState).toBe("confirmed");
    expect(patched.draft.kyc.status).toBe("handoff_shown");

    const kycResponse = await postKyc(
      jsonRequest("http://localhost/api/voice/booking/kyc", {
        draftId: created.draft.draftId,
      })
    );
    const completed = await kycResponse.json();

    expect(completed.draft.status).toBe("completed");
    expect(completed.meta).toMatchObject({
      mockKyc: true,
      collectsRealDocuments: false,
    });
  });
});
