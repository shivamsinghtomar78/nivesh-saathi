import { chatRequestSchema } from "@/lib/server/advisor-schemas";
import { getRequestIp, handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import {
  createConversation,
  getConversationOwner,
  insertMessage,
} from "@/lib/server/chat-repository";
import { invokeFdAdvisor } from "@/lib/server/fd-advisor-agent";
import {
  assessPromptRisk,
  buildBlockedPromptResponse,
} from "@/lib/server/prompt-guard";
import {
  persistChatSessionTurn,
  persistFlaggedMessage,
} from "@/lib/server/persistence";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { logServerWarn } from "@/lib/server/telemetry";
import { ROUTES } from "@/lib/routes";
import { detectVoiceLanguageMode } from "@/lib/voice-flow";
import {
  trackAnalyticsEvent,
  updateAssistantState,
} from "@/lib/server/assistant-memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

/**
 * POST /api/chat/send — Send a message and get an AI response
 *
 * Body:
 *   conversationId (optional) — If absent, creates a new conversation
 *   message — The user's message
 *   language, amount, tenorMonths, seniorCitizen, bankType, etc.
 *
 * Flow:
 *   1. If no conversationId → create new conversation
 *   2. Insert user message into chat_messages
 *   3. Generate AI response via fd-advisor-agent
 *   4. Insert AI message into chat_messages
 *   5. Update conversation (lastMessage, updatedAt, messageCount)
 *   6. Also persist to legacy chat_history collection for backward compat
 */
export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 4096) {
      return jsonError("Request body too large", 413);
    }

    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      key: `chat:${auth.session.uid}:${ip}`,
      limit: 16,
      window: "1 m",
    });

    if (!rateLimit.success) {
      return jsonError("Too many chat requests. Please try again shortly.", 429, {
        retryAfter: rateLimit.reset,
      });
    }

    const body = await request.json();
    const parsedInput = chatRequestSchema.parse(body);
    const input = {
      ...parsedInput,
      language: detectVoiceLanguageMode(parsedInput.message, parsedInput.language),
    };
    const userId = auth.session.uid;

    // Parse conversationId from body (not in chatRequestSchema, separate field)
    let conversationId: string | undefined = body.conversationId;

    // Validate conversation ownership
    if (conversationId) {
      const owner = await getConversationOwner(conversationId);
      if (owner && owner !== userId) {
        return jsonError("Conversation does not belong to this user.", 403);
      }
    }

    // Step 1: Create conversation if none exists
    if (!conversationId) {
      const conversation = await createConversation({
        userId,
        firstMessage: input.message,
        language: input.language,
        conversationType: input.mode === "voice" ? "voice" : "chat",
        interactionMode: input.mode,
      });
      if (!conversation) {
        return jsonError("Database unavailable", 503);
      }
      conversationId = conversation.id;
    }

    // Step 2: Insert user message
    await insertMessage({
      conversationId,
      userId,
      role: "user",
      content: input.message,
      type: input.mode === "voice" ? "voice" : "text",
      detectedLanguage: input.language,
      metadata: {
        amount: input.amount,
        tenorMonths: input.tenorMonths,
        bankType: input.bankType,
        prefetchKey: input.prefetchKey,
        uiIntentHint: input.uiIntentHint,
      },
    });

    // Check prompt safety
    const promptRisk = assessPromptRisk(input.message);

    if (promptRisk.blocked) {
      logServerWarn("chat_prompt_blocked", {
        ip,
        userId,
        reasons: promptRisk.reasons,
        confidence: promptRisk.confidence,
      });
      await persistFlaggedMessage({
        userId,
        message: input.message,
        reasons: promptRisk.reasons,
        confidence: promptRisk.confidence,
      });

      const blockedText = buildBlockedPromptResponse(input.language);

      // Step 3-4: Insert blocked response as assistant message
      await insertMessage({
        conversationId,
        userId,
        role: "assistant",
        content: blockedText,
        type: "text",
        detectedLanguage: input.language,
        metadata: { blocked: true },
      });

      void trackAnalyticsEvent({
        userId,
        conversationId,
        eventType: "chat_prompt_blocked",
        source: "chat",
        language: input.language,
        metadata: { reasons: promptRisk.reasons },
      }).catch(() => undefined);

      return jsonSuccess({
        conversationId,
        threadId: conversationId,
        response: {
          text: blockedText,
          rateCards: [],
          actions: [
            {
              label:
                input.language === "hi" || input.language === "hinglish"
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

    // Step 3: Generate AI response
    const startedAt = Date.now();
    const result = await invokeFdAdvisor({
      ...input,
      userId,
      threadId: conversationId,
      message: promptRisk.normalizedMessage,
    });
    const latencyMs = Date.now() - startedAt;

    // Step 4: Insert AI response as assistant message
    await insertMessage({
      conversationId,
      userId,
      role: "assistant",
      content: result.response.text,
      type: input.mode === "voice" ? "voice" : "text",
      detectedLanguage: input.language,
      latency: { totalMs: latencyMs },
      model: { provider: "advisor", name: "fd-advisor-agent" },
      metadata: {
        rateCardCount: result.response.rateCards.length,
        glossaryCount: result.response.glossary.length,
        tone: result.response.tone,
        suggestedChips: result.response.suggestedChips,
        ui: result.response.ui,
      },
    });

    void Promise.all([
      trackAnalyticsEvent({
        userId,
        conversationId,
        eventType: "chat_turn_completed",
        source: input.mode === "voice" ? "voice" : "chat",
        language: input.language,
        latencyMs,
        metadata: {
          rateCardCount: result.response.rateCards.length,
          glossaryCount: result.response.glossary.length,
        },
      }),
      updateAssistantState(userId, {
        activeConversationId: conversationId,
        lastInteractionMode: input.mode,
        contextSummary: result.response.text.slice(0, 600),
      }),
    ]).catch(() => undefined);

    // Step 5-6: Also persist to legacy collection for backward compatibility
    void persistChatSessionTurn({
      threadId: conversationId,
      userId,
      language: input.language,
      userMessage: promptRisk.normalizedMessage,
      assistantMessage: result.response.text,
      fdContextIds: result.response.rateCards.map((card) => card.bankId),
    }).catch(() => undefined);

    return jsonSuccess({
      conversationId,
      threadId: result.threadId,
      response: result.response,
    });
  } catch (error) {
    return handleRouteError(error, "Unable to process chat request", {
      zodMessage: "Invalid chat request",
    });
  }
}
