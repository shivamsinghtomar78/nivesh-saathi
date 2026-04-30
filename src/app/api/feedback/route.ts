import { jsonSuccess, handleRouteError } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { z } from "zod";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * F-16: Message Feedback API
 * 
 * POST /api/feedback
 * Stores user reaction (👍/👎) and optional reason to Firestore
 * for future model quality analysis and improvement.
 */

const feedbackSchema = z.object({
  messageId: z.string().min(1),
  threadId: z.string().optional(),
  reaction: z.enum(["up", "down"]),
  reason: z.enum(["wrong_info", "not_helpful", "off_topic", "outdated"]).optional(),
});

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const data = feedbackSchema.parse(body);

    const db = getFirebaseAdminDb();
    if (db) {
      await db.collection("message_feedback").add({
        userId: auth.session.uid,
        messageId: data.messageId,
        threadId: data.threadId ?? null,
        reaction: data.reaction,
        reason: data.reason ?? null,
        createdAt: new Date().toISOString(),
      });
    }

    return jsonSuccess({ recorded: true });
  } catch (error) {
    return handleRouteError(error, "Failed to record feedback", {
      zodMessage: "Invalid feedback payload",
    });
  }
}
