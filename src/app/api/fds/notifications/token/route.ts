import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import {
  requireCsrfProtection,
  requireFirebaseSession,
} from "@/lib/server/auth";
import { serverEnv } from "@/lib/server/env";
import {
  fdTokenSchema,
  registerFcmToken,
  removeFcmToken,
} from "@/lib/server/fd-tracker-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

export async function GET(request: Request) {
  const auth = await requireFirebaseSession(request);
  if (!auth.ok) return auth.response;

  return jsonSuccess({
    vapidKey: serverEnv.FIREBASE_VAPID_KEY ?? null,
  });
}

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const { token } = fdTokenSchema.parse(await request.json());
    const registered = await registerFcmToken({
      userId: auth.session.uid,
      email: auth.session.email ?? null,
      name: auth.session.name ?? null,
      token,
    });

    if (!registered) {
      return jsonError("MongoDB is not configured", 503);
    }

    return jsonSuccess({ registered: true });
  } catch (error) {
    return handleRouteError(error, "Failed to register notification token", {
      zodMessage: "Invalid notification token",
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const { token } = fdTokenSchema.parse(await request.json());
    const removed = await removeFcmToken(auth.session.uid, token);

    if (!removed) {
      return jsonError("MongoDB is not configured", 503);
    }

    return jsonSuccess({ removed: true });
  } catch (error) {
    return handleRouteError(error, "Failed to remove notification token", {
      zodMessage: "Invalid notification token",
    });
  }
}
