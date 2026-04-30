import { z } from "zod";

import { jsonSuccess, handleRouteError } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const summarySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "bot"]),
        content: z.string().max(1200),
        rateCards: z
          .array(
            z.object({
              bankName: z.string().optional(),
              rate: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .max(24),
});

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const data = summarySchema.parse(await request.json());
    const assistantMessages = data.messages.filter((message) => message.role === "bot");
    const latestAssistant = assistantMessages.at(-1);
    const topRates = assistantMessages
      .flatMap((message) => message.rateCards ?? [])
      .filter((card): card is { bankName: string; rate: string } =>
        Boolean(card.bankName && card.rate)
      )
      .slice(0, 3);

    return jsonSuccess({
      summary:
        latestAssistant?.content.slice(0, 220) ||
        "We discussed fixed deposit rates, safety, and next steps for your investment.",
      topRates,
      nextBestAction: topRates.length > 0 ? "compare" : "chat",
    });
  } catch (error) {
    return handleRouteError(error, "Failed to create voice summary", {
      zodMessage: "Invalid voice summary payload",
    });
  }
}
