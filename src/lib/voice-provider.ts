import { env } from "@/env";

export const voiceProviderSchemaValues = ["auto", "videosdk", "vapi"] as const;
export type VoiceProvider = (typeof voiceProviderSchemaValues)[number];

export function getRequestedVoiceProvider(): VoiceProvider {
  const configured = env.NEXT_PUBLIC_VOICE_PROVIDER;
  if (configured === "videosdk" || configured === "vapi") return configured;
  return "auto";
}

export function isVapiClientConfigured() {
  return Boolean(env.NEXT_PUBLIC_VAPI_PUBLIC_KEY && env.NEXT_PUBLIC_VAPI_ASSISTANT_ID);
}

export type VoiceProviderStatus = {
  preferred: Exclude<VoiceProvider, "auto">;
  requested: VoiceProvider;
  providers: {
    videosdk: {
      available: boolean;
      reason?: string;
      workerHealthy?: boolean;
    };
    vapi: {
      available: boolean;
      reason?: string;
    };
  };
};

export function chooseVoiceProvider(status: VoiceProviderStatus | null): Exclude<VoiceProvider, "auto"> {
  const requested = getRequestedVoiceProvider();
  if (requested === "videosdk" || requested === "vapi") return requested;
  if (status?.providers.videosdk.available) return "videosdk";
  if (status?.providers.vapi.available) return "vapi";
  return "videosdk";
}
