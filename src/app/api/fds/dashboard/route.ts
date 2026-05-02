import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { requireFirebaseSession } from "@/lib/server/auth";
import { getFdDashboard } from "@/lib/server/fd-tracker-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

export async function GET(request: Request) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const dashboard = await getFdDashboard(auth.session.uid);
    if (!dashboard) {
      return jsonError("MongoDB is not configured", 503);
    }

    return jsonSuccess({ dashboard });
  } catch (error) {
    return handleRouteError(error, "Failed to load FD dashboard");
  }
}
