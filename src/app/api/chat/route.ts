import { chatRequestSchema } from "@/lib/server/advisor-schemas";
import { jsonError, jsonSuccess, getRequestIp, handleRouteError } from "@/lib/server/api";
import { invokeFdAdvisor } from "@/lib/server/fd-advisor-agent";
import {
  assessPromptRisk,
  buildBlockedPromptResponse,
} from "@/lib/server/prompt-guard";
import {
  getChatSessionOwner,
  persistChatSessionTurn,
} from "@/lib/server/persistence";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { logServerWarn } from "@/lib/server/telemetry";
import { ROUTES } from "@/lib/routes";
import {
  requireCsrfProtection,
  requireFirebaseSession,
} from "@/lib/server/auth";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) {
      return csrfError;
    }

    const sessionResult = await requireFirebaseSession(request);
    if (!sessionResult.ok) {
      return sessionResult.response;
    }

    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      key: `chat:${sessionResult.session.uid}:${ip}`,
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

    if (input.userId && input.userId !== sessionResult.session.uid) {
      return jsonError("Chat user does not match the signed-in session.", 403);
    }

    if (input.threadId) {
      const ownerId = await getChatSessionOwner(input.threadId);
      if (ownerId && ownerId !== sessionResult.session.uid) {
        return jsonError("Chat thread does not belong to this user.", 403);
      }
    }

    const authenticatedInput = {
      ...input,
      userId: sessionResult.session.uid,
    };
    const promptRisk = assessPromptRisk(input.message);

    if (promptRisk.blocked) {
      logServerWarn("chat_prompt_blocked", {
        ip,
        userId: sessionResult.session.uid,
        reasons: promptRisk.reasons,
      });

      return jsonSuccess({
        threadId: authenticatedInput.threadId ?? crypto.randomUUID(),
        response: {
          text: buildBlockedPromptResponse(authenticatedInput.language),
          rateCards: [],
          actions: [
            {
              label:
                authenticatedInput.language === "hi"
                  ? "Rates compare kijiye"
                  : "Compare rates",
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
      ...authenticatedInput,
      message: promptRisk.normalizedMessage,
    });

    await persistChatSessionTurn({
      threadId: result.threadId,
      userId: authenticatedInput.userId,
      language: authenticatedInput.language,
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
