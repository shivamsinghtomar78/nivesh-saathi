import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { requireFirebaseSession } from "@/lib/server/auth";
import {
  createConversation,
  listConversations,
} from "@/lib/server/chat-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/chat/new — Create a new conversation
 */
export async function POST(request: Request) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.trim() : undefined;

    const conversation = await createConversation({
      userId: auth.session.uid,
      title,
    });

    if (!conversation) {
      return jsonError("Database unavailable", 503);
    }

    return jsonSuccess({ conversation });
  } catch (error) {
    return handleRouteError(error, "Failed to create conversation");
  }
}

/**
 * GET /api/chat/list — List all conversations for the authenticated user
 *
 * Query params:
 *   limit — max conversations to return (default 50)
 *   includeArchived — include archived conversations (default false)
 */
export async function GET(request: Request) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1),
      100
    );
    const includeArchived = searchParams.get("includeArchived") === "true";

    const conversations = await listConversations(auth.session.uid, {
      limit,
      includeArchived,
    });

    // Group by date for sidebar display
    const grouped: Record<string, typeof conversations> = {};
    for (const conv of conversations) {
      const date = new Date(conv.updatedAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(conv);
    }

    return jsonSuccess({ conversations, grouped });
  } catch (error) {
    return handleRouteError(error, "Failed to list conversations");
  }
}
