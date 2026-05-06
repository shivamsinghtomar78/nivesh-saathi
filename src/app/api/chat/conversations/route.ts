import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { requireFirebaseSession } from "@/lib/server/auth";
import { appLanguageSchema } from "@/lib/server/advisor-schemas";
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
    const parsedLanguage =
      typeof body?.language === "string"
        ? appLanguageSchema.safeParse(body.language)
        : null;
    const language = parsedLanguage?.success ? parsedLanguage.data : undefined;
    const tags = Array.isArray(body?.tags)
      ? body.tags.filter((tag: unknown): tag is string => typeof tag === "string")
      : undefined;

    const conversation = await createConversation({
      userId: auth.session.uid,
      title,
      language,
      tags,
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
 *   limit - max conversations to return (default 50)
 *   cursor - updatedAt cursor for pagination
 *   q - full-text search query
 *   includeArchived - include archived conversations (default false)
 *   archived - filter archived true/false
 *   pinned - filter pinned true/false
 *   tags - comma-separated tag filter
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
    const cursor = searchParams.get("cursor") || undefined;
    const query = searchParams.get("q") || undefined;
    const includeArchived = searchParams.get("includeArchived") === "true";
    const archivedParam = searchParams.get("archived");
    const pinnedParam = searchParams.get("pinned");
    const archived =
      archivedParam === null ? undefined : archivedParam === "true";
    const pinned = pinnedParam === null ? undefined : pinnedParam === "true";
    const tags = (searchParams.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const conversations = await listConversations(auth.session.uid, {
      limit,
      cursor,
      query,
      includeArchived,
      archived,
      pinned,
      tags,
    });
    const nextCursor =
      conversations.length === limit
        ? conversations[conversations.length - 1]?.updatedAt ?? null
        : null;

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

    return jsonSuccess({ conversations, grouped, nextCursor });
  } catch (error) {
    return handleRouteError(error, "Failed to list conversations");
  }
}
