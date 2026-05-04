import { handleRouteError, jsonSuccess } from "@/lib/server/api";
import { requireFirebaseSession } from "@/lib/server/auth";
import { listMongoCalculations } from "@/lib/server/mongo-repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

export async function GET(request: Request) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const calculations = await listMongoCalculations(auth.session.uid);
    return jsonSuccess({ calculations: calculations ?? [] });
  } catch (error) {
    return handleRouteError(error, "Failed to load calculations");
  }
}
