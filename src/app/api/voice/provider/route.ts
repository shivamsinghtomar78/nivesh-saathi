import { jsonSuccess } from "@/lib/server/api";
import { requireFirebaseSession } from "@/lib/server/auth";
import { serverEnv } from "@/lib/server/env";
import { hasVideoSdkServerConfig } from "@/lib/server/videosdk";
import type { VoiceProvider, VoiceProviderStatus } from "@/lib/voice-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

async function checkWorkerHealth() {
  if (!serverEnv.VOICE_AGENT_WORKER_URL) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 900);
  try {
    const response = await fetch(new URL("/health", serverEnv.VOICE_AGENT_WORKER_URL), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const payload = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    return Boolean(payload?.ok);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const auth = await requireFirebaseSession(request);
  if (!auth.ok) return auth.response;

  const configuredProvider = serverEnv.NEXT_PUBLIC_VOICE_PROVIDER;
  const requested: VoiceProvider =
    configuredProvider === "videosdk" || configuredProvider === "vapi"
      ? configuredProvider
      : "auto";
  const workerConfigured = Boolean(serverEnv.VOICE_AGENT_WORKER_URL);
  const workerHealthy = workerConfigured ? await checkWorkerHealth() : false;
  const videosdkAvailable = hasVideoSdkServerConfig() && workerConfigured && workerHealthy;
  const vapiAvailable = Boolean(
    serverEnv.NEXT_PUBLIC_VAPI_PUBLIC_KEY && serverEnv.NEXT_PUBLIC_VAPI_ASSISTANT_ID
  );
  const preferred =
    requested === "videosdk" || requested === "vapi"
      ? requested
      : videosdkAvailable
        ? "videosdk"
        : "vapi";

  const status: VoiceProviderStatus = {
    preferred,
    requested,
    providers: {
      videosdk: {
        available: videosdkAvailable,
        workerHealthy,
        ...(!hasVideoSdkServerConfig()
          ? { reason: "videosdk_not_configured" }
          : !workerConfigured
            ? { reason: "worker_not_configured" }
            : !workerHealthy
              ? { reason: "worker_unhealthy" }
              : {}),
      },
      vapi: {
        available: vapiAvailable,
        ...(!vapiAvailable ? { reason: "vapi_not_configured" } : {}),
      },
    },
  };

  return jsonSuccess(status);
}
