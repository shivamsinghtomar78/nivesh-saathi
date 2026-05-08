import { chatRequestSchema } from "@/lib/server/advisor-schemas";
import { getRequestIp, handleRouteError, privateCorsHeaders } from "@/lib/server/api";
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
import { detectVoiceLanguageMode } from "@/lib/voice-flow";
import {
  requireCsrfProtection,
  requireFirebaseSession,
} from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: privateCorsHeaders(request, "POST, OPTIONS"),
  });
}

/**
 * F-15: Streaming Chat Endpoint
 * 
 * Sends the response as Server-Sent Events (SSE):
 * 1. First event: structured data (rate cards, glossary, actions, portfolio)
 * 2. Subsequent events: text tokens streamed character by character
 * 3. Final event: done signal with threadId
 * 
 * This creates a ChatGPT-like streaming experience.
 */
export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 4096) {
      return new Response(
        JSON.stringify({ ok: false, error: "Request body too large" }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }

    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const sessionResult = await requireFirebaseSession(request);
    if (!sessionResult.ok) return sessionResult.response;

    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      key: `chat:${sessionResult.session.uid}:${ip}`,
      limit: 16,
      window: "1 m",
    });

    if (!rateLimit.success) {
      return new Response(
        JSON.stringify({ ok: false, error: "Too many requests. Please wait." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const parsedInput = chatRequestSchema.parse(body);
    const input = {
      ...parsedInput,
      language: detectVoiceLanguageMode(parsedInput.message, parsedInput.language),
    };

    if (input.userId && input.userId !== sessionResult.session.uid) {
      return new Response(
        JSON.stringify({ ok: false, error: "User mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    let conversationId = input.threadId;
    if (conversationId) {
      const ownerId =
        (await getConversationOwner(conversationId)) ??
        (await getChatSessionOwner(conversationId));
      if (ownerId && ownerId !== sessionResult.session.uid) {
        return new Response(
          JSON.stringify({ ok: false, error: "Thread does not belong to user" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
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
      if (!conversation) {
        return new Response(
          JSON.stringify({ ok: false, error: "Database unavailable" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }
      conversationId = conversation.id;
    }

    const authenticatedInput = {
      ...input,
      userId: sessionResult.session.uid,
      threadId: conversationId,
    };
    const promptRisk = assessPromptRisk(input.message);

    await insertMessage({
      conversationId,
      userId: sessionResult.session.uid,
      role: "user",
      content: promptRisk.normalizedMessage,
      type: input.mode === "voice" ? "voice" : "text",
      detectedLanguage: input.language,
      metadata: {
        requestId: input.requestId,
        amount: input.amount,
        tenorMonths: input.tenorMonths,
        bankType: input.bankType,
        prefetchKey: input.prefetchKey,
        uiIntentHint: input.uiIntentHint,
      },
    }).catch(() => null);

    if (promptRisk.blocked) {
      logServerWarn("chat_prompt_blocked", {
        ip,
        userId: sessionResult.session.uid,
        reasons: promptRisk.reasons,
        confidence: promptRisk.confidence,
      });
      await persistFlaggedMessage({
        userId: sessionResult.session.uid,
        message: input.message,
        reasons: promptRisk.reasons,
        confidence: promptRisk.confidence,
      });

      const blockedText = buildBlockedPromptResponse(authenticatedInput.language);
      await insertMessage({
        conversationId,
        userId: sessionResult.session.uid,
        role: "assistant",
        content: blockedText,
        type: "text",
        detectedLanguage: input.language,
        metadata: { blocked: true },
      }).catch(() => null);
      void trackAnalyticsEvent({
        userId: sessionResult.session.uid,
        conversationId,
        eventType: "chat_prompt_blocked",
        source: input.mode === "voice" ? "voice" : "chat",
        language: input.language,
        metadata: { reasons: promptRisk.reasons },
      }).catch(() => undefined);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "meta",
            threadId: conversationId,
            conversationId,
            rateCards: [],
            actions: [{ label: authenticatedInput.language === "hi" || authenticatedInput.language === "hinglish" ? "Rates compare kijiye" : "Compare rates", type: "primary", action: "open_compare", url: ROUTES.COMPARE }],
            glossary: [],
            warnings: ["Guarded prompt rejected"],
            tone: "cautionary",
            suggestedChips: [],
            ui: {
              mode: "conversational",
              expand: false,
              entities: [],
              dataType: "general",
              visualizations: [],
              componentHints: [],
              actionButtons: [],
            },
          })}\n\n`));
          // Stream blocked text character by character
          for (let i = 0; i < blockedText.length; i++) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", token: blockedText[i] })}\n\n`));
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Invoke the advisor agent
    const startedAt = Date.now();
    const result = await invokeFdAdvisor({
      ...authenticatedInput,
      message: promptRisk.normalizedMessage,
    });
    const latencyMs = Date.now() - startedAt;

    await insertMessage({
      conversationId: result.threadId,
      userId: authenticatedInput.userId,
      role: "assistant",
      content: result.response.text,
      type: input.mode === "voice" ? "voice" : "text",
      detectedLanguage: input.language,
      streamingState: "complete",
      latency: { totalMs: latencyMs },
      model: { provider: "advisor", name: "fd-advisor-agent" },
      metadata: {
        rateCardCount: result.response.rateCards.length,
        glossaryCount: result.response.glossary.length,
        tone: result.response.tone,
        ui: result.response.ui,
      },
    }).catch(() => null);

    // Persist asynchronously
    void persistChatSessionTurn({
      threadId: result.threadId,
      userId: authenticatedInput.userId,
      language: authenticatedInput.language,
      userMessage: promptRisk.normalizedMessage,
      assistantMessage: result.response.text,
      fdContextIds: result.response.rateCards.map((card) => card.bankId),
    });
    void Promise.all([
      trackAnalyticsEvent({
        userId: authenticatedInput.userId,
        conversationId: result.threadId,
        eventType: "chat_stream_completed",
        source: input.mode === "voice" ? "voice" : "chat",
        language: input.language,
        latencyMs,
        metadata: {
          rateCardCount: result.response.rateCards.length,
          glossaryCount: result.response.glossary.length,
        },
      }),
      updateAssistantState(authenticatedInput.userId, {
        activeConversationId: result.threadId,
        lastInteractionMode: input.mode,
        contextSummary: result.response.text.slice(0, 600),
      }),
    ]).catch(() => undefined);

    // Stream the response
    const fullText = result.response.text;
    const encoder = new TextEncoder();
    const CHUNK_SIZE = 3; // Stream 3 characters at a time for balanced speed

    const stream = new ReadableStream({
      start(controller) {
        // Send metadata first (rate cards, glossary, actions, etc.)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "meta",
              threadId: result.threadId,
              conversationId: result.threadId,
              rateCards: result.response.rateCards,
              actions: result.response.actions,
              glossary: result.response.glossary,
              warnings: result.response.warnings,
              tone: result.response.tone,
              suggestedChips: result.response.suggestedChips,
              modeSwitchSuggestion: result.response.modeSwitchSuggestion,
              followUpPrompt: result.response.followUpPrompt,
              portfolioSplit: result.response.portfolioSplit,
              showCalculator: result.response.showCalculator,
              showTimeMachine: result.response.showTimeMachine,
              ui: result.response.ui,
            })}\n\n`
          )
        );

        // Stream text in small chunks
        let offset = 0;
        const interval = setInterval(() => {
          if (offset >= fullText.length) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
            );
            controller.close();
            clearInterval(interval);
            return;
          }

          const chunk = fullText.slice(offset, offset + CHUNK_SIZE);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "token", token: chunk })}\n\n`
            )
          );
          offset += CHUNK_SIZE;
        }, 18); // ~55 chars/sec for natural feel
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleRouteError(error, "Unable to process streaming chat request", {
      zodMessage: "Invalid chat request",
    });
  }
}
