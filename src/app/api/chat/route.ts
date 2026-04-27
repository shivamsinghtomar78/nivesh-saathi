import { chatRequestSchema } from "@/lib/server/advisor-schemas";
import { jsonError, jsonSuccess, getRequestIp, handleRouteError } from "@/lib/server/api";
import { invokeFdAdvisor } from "@/lib/server/fd-advisor-agent";
import {
  assessPromptRisk,
  buildBlockedPromptResponse,
} from "@/lib/server/prompt-guard";
import { persistChatSessionTurn } from "@/lib/server/persistence";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { logServerWarn } from "@/lib/server/telemetry";
import { ROUTES } from "@/lib/routes";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      key: `chat:${ip}`,
      limit: 16,
      window: "1 m",
    });

    if (!rateLimit.success) {
      return jsonError("Too many chat requests. Please try again shortly.", 429, {
        retryAfter: rateLimit.reset,
      });
    }

    const body = await request.json();
    const input = chatRequestSchema.parse(body);
    const promptRisk = assessPromptRisk(input.message);

    if (promptRisk.blocked) {
      logServerWarn("chat_prompt_blocked", {
        ip,
        reasons: promptRisk.reasons,
      });

      return jsonSuccess({
        threadId: input.threadId ?? crypto.randomUUID(),
        response: {
          text: buildBlockedPromptResponse(input.language),
          rateCards: [],
          actions: [
            {
              label: input.language === "hi" ? "Rates compare kijiye" : "Compare rates",
              type: "primary",
              action: "open_compare",
              url: ROUTES.COMPARE,
            },
          ],
          glossary: [],
          followUpPrompt: "",
          warnings: ["Guarded prompt rejected"],
        },
      });
    }

    const result = await invokeFdAdvisor({
      ...input,
      message: promptRisk.normalizedMessage,
    });

    await persistChatSessionTurn({
      threadId: result.threadId,
      userId: input.userId,
      language: input.language,
      userMessage: promptRisk.normalizedMessage,
      assistantMessage: result.response.text,
      fdContextIds: result.response.rateCards.map((card) => card.bankId),
    });

    return jsonSuccess(result);
  } catch (error) {
    return handleRouteError(error, "Unable to process chat request", {
      zodMessage: "Invalid chat request",
    });
  }
}
