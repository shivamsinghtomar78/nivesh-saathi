import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import {
  requireCsrfProtection,
  requireFirebaseSession,
} from "@/lib/server/auth";
import {
  deleteFdRecord,
  fdPatchSchema,
  updateFdRecord,
} from "@/lib/server/fd-tracker-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

type RouteContext = {
  params: Promise<{
    fdId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const { fdId } = await context.params;
    const input = fdPatchSchema.parse(await request.json());
    const record = await updateFdRecord({
      userId: auth.session.uid,
      fdId,
      input,
    });

    if (record === null) {
      return jsonError("MongoDB is not configured", 503);
    }

    if (!record) {
      return jsonError("FD record not found", 404);
    }

    return jsonSuccess({ record });
  } catch (error) {
    return handleRouteError(error, "Failed to update FD", {
      zodMessage: "Invalid FD update",
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const { fdId } = await context.params;
    const deleted = await deleteFdRecord(auth.session.uid, fdId);

    if (deleted === null) {
      return jsonError("MongoDB is not configured", 503);
    }

    if (!deleted) {
      return jsonError("FD record not found", 404);
    }

    return jsonSuccess({ deleted: true });
  } catch (error) {
    return handleRouteError(error, "Failed to delete FD");
  }
}
