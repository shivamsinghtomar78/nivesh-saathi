import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
  NEXT_PUBLIC_VAPI_PUBLIC_KEY: "vapi-key",
  NEXT_PUBLIC_VAPI_ASSISTANT_ID: "assistant-id",
  NEXT_PUBLIC_VOICE_PROVIDER: "auto",
}));

vi.mock("@/env", () => ({
  env: mockEnv,
}));

describe("voice provider selection", () => {
  beforeEach(() => {
    mockEnv.NEXT_PUBLIC_VOICE_PROVIDER = "auto";
    mockEnv.NEXT_PUBLIC_VAPI_PUBLIC_KEY = "vapi-key";
    mockEnv.NEXT_PUBLIC_VAPI_ASSISTANT_ID = "assistant-id";
    vi.resetModules();
  });

  it("prefers VideoSDK when auto status reports it available", async () => {
    const { chooseVoiceProvider } = await import("@/lib/voice-provider");

    expect(
      chooseVoiceProvider({
        preferred: "videosdk",
        requested: "auto",
        providers: {
          videosdk: { available: true, workerHealthy: true },
          vapi: { available: true },
        },
      })
    ).toBe("videosdk");
  });

  it("falls back to Vapi when VideoSDK worker is unavailable", async () => {
    const { chooseVoiceProvider } = await import("@/lib/voice-provider");

    expect(
      chooseVoiceProvider({
        preferred: "vapi",
        requested: "auto",
        providers: {
          videosdk: { available: false, reason: "worker_unhealthy" },
          vapi: { available: true },
        },
      })
    ).toBe("vapi");
  });

  it("honors explicit provider override", async () => {
    mockEnv.NEXT_PUBLIC_VOICE_PROVIDER = "vapi";
    const { chooseVoiceProvider } = await import("@/lib/voice-provider");

    expect(
      chooseVoiceProvider({
        preferred: "videosdk",
        requested: "auto",
        providers: {
          videosdk: { available: true, workerHealthy: true },
          vapi: { available: true },
        },
      })
    ).toBe("vapi");
  });
});
