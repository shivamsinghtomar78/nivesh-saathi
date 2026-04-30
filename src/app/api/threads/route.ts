import { jsonSuccess, handleRouteError } from "@/lib/server/api";
import { requireFirebaseSession } from "@/lib/server/auth";
import { getUserChatSession, getUserChatSummaries } from "@/lib/server/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * F-08: Chat History / Thread Browser API
 * GET /api/threads — returns user's past chat sessions
 */
export async function GET(request: Request) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");
    if (threadId) {
      const session = await getUserChatSession({
        userId: auth.session.uid,
        threadId,
      });
      return jsonSuccess({ thread: session });
    }

    const summaries = await getUserChatSummaries(auth.session.uid);

    const grouped: Record<string, typeof summaries> = {};
    for (const summary of summaries) {
      const date = new Date(summary.updatedAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(summary);
    }

    return jsonSuccess({ threads: summaries, grouped });
  } catch (error) {
    return handleRouteError(error, "Failed to fetch chat history");
  }
}
