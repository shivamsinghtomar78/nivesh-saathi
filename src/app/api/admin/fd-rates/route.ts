import { jsonError, jsonSuccess } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { upsertMongoFdRates } from "@/lib/server/mongo-repositories";

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

    const updated = await upsertMongoFdRates(body);
    if (updated === null) {
      return jsonError("MongoDB is not configured", 503);
    }

    return jsonSuccess({ success: true, updated: body.length });
  } catch {
    return jsonError("Failed to update FD rates", 500);
  }
}
