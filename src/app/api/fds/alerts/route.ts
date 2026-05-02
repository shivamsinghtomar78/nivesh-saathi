import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import {
  requireCsrfProtection,
  requireFirebaseSession,
} from "@/lib/server/auth";
import {
  fdAlertPatchSchema,
  getUserAlerts,
  markAlertsRead,
} from "@/lib/server/fd-tracker-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

export async function GET(request: Request) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const alerts = await getUserAlerts(auth.session.uid);
    if (!alerts) {
      return jsonError("MongoDB is not configured", 503);
    }

    return jsonSuccess({ alerts });
  } catch (error) {
    return handleRouteError(error, "Failed to load FD alerts");
  }
}

export async function PATCH(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const input = fdAlertPatchSchema.parse(await request.json());
    const updated = await markAlertsRead({
      userId: auth.session.uid,
      alertIds: input.alertIds,
      markAllRead: input.markAllRead,
    });

    if (updated === null) {
      return jsonError("MongoDB is not configured", 503);
    }

    return jsonSuccess({ updated });
  } catch (error) {
    return handleRouteError(error, "Failed to update FD alerts", {
      zodMessage: "Invalid alert update",
    });
  }
}
