import { getRequestIp, handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { serverEnv } from "@/lib/server/env";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

type DeepgramGrantResponse = {
  access_token?: string;
  expires_in?: number | null;
};

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    if (!serverEnv.DEEPGRAM_API_KEY) {
      return jsonError("Deepgram is not configured", 503);
    }

    const rateLimit = await enforceRateLimit({
      key: `voice-session:${auth.session.uid}:${getRequestIp(request)}`,
      limit: 12,
      window: "1 m",
    });

    if (!rateLimit.success) {
      return jsonError("Too many voice sessions. Please try again shortly.", 429, {
        retryAfter: rateLimit.reset,
      });
    }

    const grantResponse = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${serverEnv.DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: 120 }),
    });

    if (!grantResponse.ok) {
      const detail = await grantResponse.text();
      console.error(
        `[voice/session] Deepgram grant failed: ${grantResponse.status} ${grantResponse.statusText}`,
        detail.slice(0, 500)
      );
      return jsonError("Unable to create a secure voice session", 503, {
        upstream: grantResponse.status,
        detail: detail.slice(0, 240),
      });
    }

    const payload = (await grantResponse.json()) as DeepgramGrantResponse;

    if (!payload.access_token) {
      return jsonError("Deepgram did not return a session token", 503);
    }

    return jsonSuccess({
      accessToken: payload.access_token,
      expiresIn: payload.expires_in ?? 120,
    });
  } catch (error) {
    return handleRouteError(error, "Unable to start voice session");
  }
}
