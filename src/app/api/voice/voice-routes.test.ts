import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRouteState = vi.hoisted(() => ({
  bookingStore: new Map<string, unknown>(),
  serverEnv: {
    ELEVENLABS_API_KEY: "",
    ELEVENLABS_VOICE_ID: undefined as string | undefined,
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
}));

vi.mock("@/lib/server/cache", () => ({
  cacheGet: vi.fn(async (key: string) => mockRouteState.bookingStore.get(key) ?? null),
  cacheSet: vi.fn(async (key: string, value: unknown) => {
    mockRouteState.bookingStore.set(key, value);
  }),
}));

vi.mock("@/lib/server/persistence", () => ({
  updateUserMemory: vi.fn(async () => undefined),
}));

import { PATCH as patchBooking, POST as postBooking } from "@/app/api/voice/booking/route";
import { POST as postKyc } from "@/app/api/voice/booking/kyc/route";
import { POST as postTranscribe } from "@/app/api/voice/transcribe/route";
import { POST as postTts } from "@/app/api/voice/tts/route";

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
    mockRouteState.bookingStore.clear();
    mockRouteState.serverEnv.ELEVENLABS_API_KEY = "";
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
