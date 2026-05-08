import { chatRequestSchema, type AdvisorRateCard } from "@/lib/server/advisor-schemas";
import {
  jsonError,
  jsonSuccess,
  getRequestIp,
  handleRouteError,
  privateCorsHeaders,
} from "@/lib/server/api";
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
import {
  createConversation,
  getConversationOwner,
  insertMessage,
} from "@/lib/server/chat-repository";
import {
  trackAnalyticsEvent,
  updateAssistantState,
} from "@/lib/server/assistant-memory";
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

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: privateCorsHeaders(request, "POST, OPTIONS"),
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

    let conversationId = input.threadId;
    if (conversationId) {
      const ownerId =
        (await getConversationOwner(conversationId)) ??
        (await getChatSessionOwner(conversationId));
      if (ownerId && ownerId !== sessionResult.session.uid) {
        return jsonError("Chat thread does not belong to this user.", 403);
      }
    }

    if (!conversationId) {
      const conversation = await createConversation({
        userId: sessionResult.session.uid,
        firstMessage: input.message,
        language: input.language,
        conversationType: input.mode === "voice" ? "voice" : "chat",
        interactionMode: input.mode,
      });
      if (!conversation) return jsonError("Database unavailable", 503);
      conversationId = conversation.id;
    }

    const authenticatedInput = {
      ...input,
      userId: sessionResult.session.uid,
      threadId: conversationId,
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
        await insertMessage({
          conversationId,
          userId: authInput.userId,
          role: "user",
          content: authInput.message,
          type: authInput.mode === "voice" ? "voice" : "text",
          detectedLanguage: authInput.language,
          metadata: {
            blocked: true,
            requestId,
            prefetchKey: authInput.prefetchKey,
            uiIntentHint: authInput.uiIntentHint,
          },
        }).catch(() => null);
        const blockedText = buildBlockedPromptResponse(authInput.language);
        await insertMessage({
          conversationId,
          userId: authInput.userId,
          role: "assistant",
          content: blockedText,
          type: "text",
          detectedLanguage: authInput.language,
          metadata: { blocked: true },
        }).catch(() => null);
        void trackAnalyticsEvent({
          userId: authInput.userId,
          conversationId,
          eventType: "chat_prompt_blocked",
          source: authInput.mode === "voice" ? "voice" : "chat",
          language: authInput.language,
          metadata: { reasons: promptRisk.reasons },
        }).catch(() => undefined);

        return {
          threadId: conversationId,
          response: {
            text: blockedText,
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

      await insertMessage({
        conversationId,
        userId: authInput.userId,
        role: "user",
        content: promptRisk.normalizedMessage,
        type: authInput.mode === "voice" ? "voice" : "text",
        detectedLanguage: authInput.language,
        metadata: {
          requestId,
          prefetchKey: authInput.prefetchKey,
          uiIntentHint: authInput.uiIntentHint,
        },
      }).catch(() => null);

      const startedAt = Date.now();
      const result = await invokeFdAdvisor({
        ...authInput,
        message: promptRisk.normalizedMessage,
      });
      const latencyMs = Date.now() - startedAt;

      await insertMessage({
        conversationId: result.threadId,
        userId: authInput.userId,
        role: "assistant",
        content: result.response.text,
        type: authInput.mode === "voice" ? "voice" : "text",
        detectedLanguage: authInput.language,
        latency: { totalMs: latencyMs },
        model: { provider: "advisor", name: "fd-advisor-agent" },
        metadata: {
          rateCardCount: result.response.rateCards.length,
          glossaryCount: result.response.glossary.length,
          tone: result.response.tone,
          ui: result.response.ui,
        },
      }).catch(() => null);

      await persistChatSessionTurn({
        threadId: result.threadId,
        userId: authInput.userId,
        language: authInput.language,
        userMessage: promptRisk.normalizedMessage,
        assistantMessage: result.response.text,
        fdContextIds: result.response.rateCards.map((card: AdvisorRateCard) => card.bankId),
      });
      void Promise.all([
        trackAnalyticsEvent({
          userId: authInput.userId,
          conversationId: result.threadId,
          eventType: "chat_turn_completed",
          source: authInput.mode === "voice" ? "voice" : "chat",
          language: authInput.language,
          latencyMs,
        }),
        updateAssistantState(authInput.userId, {
          activeConversationId: result.threadId,
          lastInteractionMode: authInput.mode,
          contextSummary: result.response.text.slice(0, 600),
        }),
      ]).catch(() => undefined);

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
