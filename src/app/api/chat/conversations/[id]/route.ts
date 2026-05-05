import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { requireFirebaseSession } from "@/lib/server/auth";
import {
  getConversation,
  getRecentMessages,
  getMessages,
  deleteConversation,
  archiveConversation,
} from "@/lib/server/chat-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/chat/conversations/[id] — Fetch messages for a conversation
 *
 * Query params:
 *   limit — max messages to return (default 20)
 *   before — cursor: messages created before this ISO timestamp
 *   after — cursor: messages created after this ISO timestamp
 *
 * If neither before/after is provided, returns the most recent messages.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const { id: conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
      100
    );
    const before = searchParams.get("before") || undefined;
    const after = searchParams.get("after") || undefined;

    // Verify conversation exists and belongs to user
    const conversation = await getConversation(
      conversationId,
      auth.session.uid
    );
    if (!conversation) {
      return jsonError("Conversation not found", 404);
    }

    // Cursor-based pagination
    if (before || after) {
      const result = await getMessages(conversationId, auth.session.uid, {
        limit,
        before,
        after,
      });

      return jsonSuccess({
        conversation,
        messages: result.messages,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      });
    }

    // Default: load most recent messages
    const result = await getRecentMessages(
      conversationId,
      auth.session.uid,
      limit
    );

    return jsonSuccess({
      conversation,
      messages: result.messages,
      hasMore: result.hasMore,
    });
  } catch (error) {
    return handleRouteError(error, "Failed to fetch conversation");
  }
}

/**
 * DELETE /api/chat/conversations/[id] — Delete a conversation and its messages
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const { id: conversationId } = await params;

    const deleted = await deleteConversation(conversationId, auth.session.uid);
    if (!deleted) {
      return jsonError("Conversation not found or already deleted", 404);
    }

    return jsonSuccess({ deleted: true });
  } catch (error) {
    return handleRouteError(error, "Failed to delete conversation");
  }
}

/**
 * PATCH /api/chat/conversations/[id] — Archive a conversation
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const { id: conversationId } = await params;
    const body = await request.json().catch(() => ({}));

    if (body?.action === "archive") {
      const archived = await archiveConversation(
        conversationId,
        auth.session.uid
      );
      if (!archived) {
        return jsonError("Conversation not found", 404);
      }
      return jsonSuccess({ archived: true });
    }

    return jsonError("Invalid action", 400);
  } catch (error) {
    return handleRouteError(error, "Failed to update conversation");
  }
}
