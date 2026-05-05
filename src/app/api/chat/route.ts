import { chatRequestSchema, type AdvisorRateCard } from "@/lib/server/advisor-schemas";
import { jsonError, jsonSuccess, getRequestIp, handleRouteError } from "@/lib/server/api";
import { invokeFdAdvisor } from "@/lib/server/fd-advisor-agent";
import {
  assessPromptRisk,
  buildBlockedPromptResponse,
} from "@/lib/server/prompt-guard";
import {
  getChatSessionOwner,
  persistChatSessionTurn,
  persistFlaggedMessage,
} from "@/lib/server/persistence";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { logServerWarn } from "@/lib/server/telemetry";
import { ROUTES } from "@/lib/routes";
import {
  requireCsrfProtection,
  requireFirebaseSession,
} from "@/lib/server/auth";
import { withTracing } from "@/lib/server/langsmith";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-nivesh-csrf",
    },
  });
}

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 4096) {
      return jsonError("Request body too large", 413);
    }

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
    const requestId = input.requestId || crypto.randomUUID();

    const processChatRequest = withTracing(async (authInput: typeof authenticatedInput) => {
      const promptRisk = assessPromptRisk(authInput.message);

      if (promptRisk.blocked) {
        logServerWarn("chat_prompt_blocked", {
          ip,
          userId: authInput.userId,
          reasons: promptRisk.reasons,
          confidence: promptRisk.confidence,
        });
        await persistFlaggedMessage({
          userId: authInput.userId,
          message: authInput.message,
          reasons: promptRisk.reasons,
          confidence: promptRisk.confidence,
        });

        return {
          threadId: authInput.threadId ?? crypto.randomUUID(),
          response: {
            text: buildBlockedPromptResponse(authInput.language),
            rateCards: [],
            actions: [
              {
                label:
                  authInput.language === "hi" || authInput.language === "hinglish"
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
        };
      }

      const result = await invokeFdAdvisor({
        ...authInput,
        message: promptRisk.normalizedMessage,
      });

      await persistChatSessionTurn({
        threadId: result.threadId,
        userId: authInput.userId,
        language: authInput.language,
        userMessage: promptRisk.normalizedMessage,
        assistantMessage: result.response.text,
        fdContextIds: result.response.rateCards.map((card: AdvisorRateCard) => card.bankId),
      });

      return result;
    }, {
      name: "process_chat_request",
      run_type: "chain",
      metadata: {
        userId: sessionResult.session.uid,
        sessionId: input.threadId,
        threadId: input.threadId,
        requestId,
        feature: "chat",
        mode: input.mode || "chat",
      }
    });

    const result = await processChatRequest(authenticatedInput);

    return jsonSuccess(result);
  } catch (error) {
    return handleRouteError(error, "Unable to process chat request", {
      zodMessage: "Invalid chat request",
    });
  }
}
