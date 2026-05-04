import { z } from "zod";

import { jsonSuccess, handleRouteError } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import {
  canFallbackToFirebase,
  readsFirebaseFirst,
  readsMongoFirst,
  writesFirebase,
} from "@/lib/server/datastore-mode";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import {
  deleteMongoWatcher,
  listMongoWatchers,
  saveMongoWatcher,
} from "@/lib/server/mongo-repositories";
import { logServerInfo } from "@/lib/server/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const watcherSchema = z.object({
  bankId: z.string().trim().min(1).max(80),
});

export async function GET(request: Request) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    if (readsMongoFirst()) {
      const mongoWatchers = await listMongoWatchers(auth.session.uid);
      if (mongoWatchers && mongoWatchers.length > 0) {
        return jsonSuccess({ watchers: mongoWatchers });
      }

      if (!canFallbackToFirebase()) {
        return jsonSuccess({ watchers: mongoWatchers ?? [] });
      }
    }

    const db = canFallbackToFirebase() ? getFirebaseAdminDb() : null;
    if (!db) {
      const mongoWatchers = await listMongoWatchers(auth.session.uid);
      return jsonSuccess({ watchers: mongoWatchers ?? [] });
    }

    const snapshot = await db
      .collection("watchers")
      .where("userId", "==", auth.session.uid)
      .get();

    const firebaseWatchers = snapshot.docs.map((doc) => doc.data().bankId as string);
    if (firebaseWatchers.length > 0 || readsFirebaseFirst()) {
      return jsonSuccess({ watchers: firebaseWatchers });
    }

    const mongoWatchers = await listMongoWatchers(auth.session.uid);
    if (mongoWatchers && mongoWatchers.length > 0) {
      logServerInfo("watchers_read_from_mongo_after_firebase_empty", {
        userId: auth.session.uid,
      });
    }
    return jsonSuccess({ watchers: mongoWatchers ?? firebaseWatchers });
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
    await saveMongoWatcher({
      userId: auth.session.uid,
      bankId: data.bankId,
    }).catch(() => false);

    const db = writesFirebase() ? getFirebaseAdminDb() : null;
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
    await deleteMongoWatcher(auth.session.uid, data.bankId).catch(() => false);

    const db = writesFirebase() ? getFirebaseAdminDb() : null;
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
