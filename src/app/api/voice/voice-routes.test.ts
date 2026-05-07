import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRouteState = vi.hoisted(() => ({
  bookingStore: new Map<string, unknown>(),
  serverEnv: {
    DEEPGRAM_API_KEY: "",
    ELEVENLABS_API_KEY: "",
    ELEVENLABS_VOICE_ID: undefined as string | undefined,
    GROQ_API_KEY: "",
    GROQ_MODEL: "llama-3.3-70b-versatile",
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
import { POST as postRespond } from "@/app/api/voice/respond/route";
import { POST as postSession } from "@/app/api/voice/session/route";
import { POST as postTranscribe } from "@/app/api/voice/transcribe/route";
import { POST as postTts } from "@/app/api/voice/tts/route";
import { logServerInfo } from "@/lib/server/telemetry";

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
  });

  it("returns browser fallback metadata when neural TTS is not configured", async () => {
    const response = await postTts(
      jsonRequest("http://localhost/api/voice/tts", {
        text: "1 lakh ke liye FD compare karo",
        language: "hinglish",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.provider).toBe("browser-fallback");
    expect(body.meta).toMatchObject({
      fallback: true,
      fallbackLanguage: "hi-IN",
      naturalTtsConfigured: false,
    });
  });

  it("returns a clear transcription setup failure when Deepgram is unavailable", async () => {
    const response = await postTranscribe(
      new Request("http://localhost/api/voice/transcribe", {
        method: "POST",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Deepgram is not configured");
  });

  it("mints a temporary Deepgram browser token for duplex voice", async () => {
    mockRouteState.serverEnv.DEEPGRAM_API_KEY = "dg-key";
    const fetchMock = vi.fn(async () =>
      Response.json({ access_token: "dg-temp-token", expires_in: 120 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await postSession(
      new Request("http://localhost/api/voice/session", { method: "POST" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.accessToken).toBe("dg-temp-token");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepgram.com/v1/auth/grant",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Token dg-key",
        }),
        body: JSON.stringify({ ttl_seconds: 30 }),
      })
    );
  });

  it("returns a clear setup code when the Deepgram key lacks Member role", async () => {
    mockRouteState.serverEnv.DEEPGRAM_API_KEY = "dg-default-role-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            err_code: "FORBIDDEN",
            err_msg: "Insufficient permissions.",
          }),
          {
            status: 403,
            statusText: "Forbidden",
            headers: { "Content-Type": "application/json" },
          }
        )
      )
    );

    const response = await postSession(
      new Request("http://localhost/api/voice/session", { method: "POST" })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Unable to create a secure voice session");
    expect(body.details).toMatchObject({
      code: "deepgram_key_requires_member_role",
      upstream: 403,
      requiredDeepgramRole: "member",
    });
    expect(JSON.stringify(body)).not.toContain("Insufficient permissions");
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

  it("streams a Groq voice response with browser TTS fallback events", async () => {
    mockRouteState.serverEnv.GROQ_API_KEY = "groq-key";
    const encoder = new TextEncoder();
    const groqStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"Namaste, "}}]}\n\n'
          )
        );
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"main dekh raha hoon."}}]}\n\n'
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(groqStream, { status: 200 }))
    );

    const response = await postRespond(
      jsonRequest("http://localhost/api/voice/respond", {
        transcript: "FD rate batao",
        language: "hinglish",
        threadId: "voice-conv-1",
      })
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('"type":"token"');
    expect(text).toContain('"type":"audio_fallback"');
    expect(text).toContain('"type":"done"');
    expect(text).toContain("Namaste");
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
