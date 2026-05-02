import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import {
  requireCsrfProtection,
  requireFirebaseSession,
} from "@/lib/server/auth";
import {
  createFdRecord,
  fdInputSchema,
  listUserFds,
} from "@/lib/server/fd-tracker-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

export async function GET(request: Request) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const records = await listUserFds(auth.session.uid);
    if (!records) {
      return jsonError("MongoDB is not configured", 503);
    }

    return jsonSuccess({ records });
  } catch (error) {
    return handleRouteError(error, "Failed to load tracked FDs");
  }
}

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const input = fdInputSchema.parse(await request.json());
    const record = await createFdRecord({
      userId: auth.session.uid,
      email: auth.session.email ?? null,
      name: auth.session.name ?? null,
      input,
    });

    if (!record) {
      return jsonError("MongoDB is not configured", 503);
    }

    return jsonSuccess({ record }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Failed to save FD", {
      zodMessage: "Invalid FD details",
    });
  }
}
