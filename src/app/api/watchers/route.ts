import { z } from "zod";

import { jsonSuccess, handleRouteError } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const watcherSchema = z.object({
  bankId: z.string().trim().min(1).max(80),
});

export async function GET(request: Request) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const db = getFirebaseAdminDb();
    if (!db) return jsonSuccess({ watchers: [] as string[] });

    const snapshot = await db
      .collection("watchers")
      .where("userId", "==", auth.session.uid)
      .get();

    return jsonSuccess({
      watchers: snapshot.docs.map((doc) => doc.data().bankId as string),
    });
  } catch (error) {
    return handleRouteError(error, "Failed to load rate watchers");
  }
}

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const data = watcherSchema.parse(await request.json());
    const db = getFirebaseAdminDb();
    if (db) {
      await db.collection("watchers").doc(`${auth.session.uid}_${data.bankId}`).set(
        {
          userId: auth.session.uid,
          bankId: data.bankId,
          channels: ["in_app"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    return jsonSuccess({ watching: true, bankId: data.bankId });
  } catch (error) {
    return handleRouteError(error, "Failed to save rate watcher", {
      zodMessage: "Invalid watcher payload",
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const data = watcherSchema.parse(await request.json());
    const db = getFirebaseAdminDb();
    if (db) {
      await db.collection("watchers").doc(`${auth.session.uid}_${data.bankId}`).delete();
    }

    return jsonSuccess({ watching: false, bankId: data.bankId });
  } catch (error) {
    return handleRouteError(error, "Failed to remove rate watcher", {
      zodMessage: "Invalid watcher payload",
    });
  }
}
