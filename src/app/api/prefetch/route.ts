import {
  getRequestIp,
  handleRouteError,
  jsonError,
  jsonSuccess,
  privateCorsHeaders,
} from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import {
  predictivePrefetchRequestSchema,
  preparePredictivePrefetch,
} from "@/lib/server/predictive-prefetch";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: privateCorsHeaders(request, "POST, OPTIONS"),
  });
}

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 8192) {
      return jsonError("Request body too large", 413);
    }

    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      key: `prefetch:${auth.session.uid}:${ip}`,
      limit: 90,
      window: "1 m",
    });

    if (!rateLimit.success) {
      return jsonError("Too many predictive prefetch requests.", 429, {
        retryAfter: rateLimit.reset,
      });
    }

    const body = await request.json();
    const input = predictivePrefetchRequestSchema.parse(body);
    const result = await preparePredictivePrefetch({
      userId: auth.session.uid,
      input,
    });

    return jsonSuccess({
      turnId: result.turnId,
      sequence: result.sequence,
      prefetchKey: result.prefetchKey,
      cacheHit: result.cacheHit,
      prediction: result.prediction,
      ui: result.ui,
      data: result.data,
      advisorResponse: result.advisorResponse,
    });
  } catch (error) {
    return handleRouteError(error, "Unable to prepare predictive context", {
      zodMessage: "Invalid predictive prefetch request",
    });
  }
}
