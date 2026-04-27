import { appLanguageSchema } from "@/lib/server/advisor-schemas";
import { localizeJargonEntry } from "@/lib/server/jargon-catalog";

export const runtime = "nodejs";

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
    return Response.json({ error: "Term not found" }, { status: 404 });
  }

  return Response.json(term);
}
