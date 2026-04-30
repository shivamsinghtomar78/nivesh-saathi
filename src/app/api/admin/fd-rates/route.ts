import { jsonError, jsonSuccess } from "@/lib/server/api";
import { cacheSet } from "@/lib/server/cache";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const sessionResult = await requireFirebaseSession(request);
    if (!sessionResult.ok) {
      return sessionResult.response;
    }

    const body = await request.json();
    
    if (!Array.isArray(body)) {
      return jsonError("Expected an array of rates", 400);
    }

    await cacheSet("admin:fd-rates", body, 60 * 60 * 24 * 30);
    return jsonSuccess({ success: true, updated: body.length });
  } catch {
    return jsonError("Failed to update FD rates", 500);
  }
}
