import { chatRequestSchema } from "@/lib/server/advisor-schemas";
import { getRequestIp, handleRouteError } from "@/lib/server/api";
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
    const input = chatRequestSchema.parse(body);

    if (input.userId && input.userId !== sessionResult.session.uid) {
      return new Response(
        JSON.stringify({ ok: false, error: "User mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    if (input.threadId) {
      const ownerId = await getChatSessionOwner(input.threadId);
      if (ownerId && ownerId !== sessionResult.session.uid) {
        return new Response(
          JSON.stringify({ ok: false, error: "Thread does not belong to user" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const authenticatedInput = { ...input, userId: sessionResult.session.uid };
    const promptRisk = assessPromptRisk(input.message);

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
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "meta",
            threadId: authenticatedInput.threadId ?? crypto.randomUUID(),
            rateCards: [],
            actions: [{ label: authenticatedInput.language === "hi" || authenticatedInput.language === "hinglish" ? "Rates compare kijiye" : "Compare rates", type: "primary", action: "open_compare", url: ROUTES.COMPARE }],
            glossary: [],
            warnings: ["Guarded prompt rejected"],
            tone: "cautionary",
            suggestedChips: [],
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
    const result = await invokeFdAdvisor({
      ...authenticatedInput,
      message: promptRisk.normalizedMessage,
    });

    // Persist asynchronously
    void persistChatSessionTurn({
      threadId: result.threadId,
      userId: authenticatedInput.userId,
      language: authenticatedInput.language,
      userMessage: promptRisk.normalizedMessage,
      assistantMessage: result.response.text,
      fdContextIds: result.response.rateCards.map((card) => card.bankId),
    });

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
