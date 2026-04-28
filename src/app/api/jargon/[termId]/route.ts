import { appLanguageSchema } from "@/lib/server/advisor-schemas";
import { jsonError, jsonSuccess } from "@/lib/server/api";
import { localizeJargonEntry } from "@/lib/server/jargon-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    termId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { searchParams } = new URL(request.url);
  const language = appLanguageSchema.catch("hi").parse(
    searchParams.get("language") ?? "hi"
  );
  const { termId } = await context.params;
  const term = localizeJargonEntry(termId, language);

  if (!term) {
    return jsonError("Term not found", 404);
  }

  return jsonSuccess(term);
}
