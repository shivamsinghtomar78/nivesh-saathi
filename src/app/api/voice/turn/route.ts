import { z } from "zod";

import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import {
  appLanguageSchema,
  advisorUiSchema,
  bankTypeFilterSchema,
} from "@/lib/server/advisor-schemas";
import {
  recordVoiceTurn,
  trackAnalyticsEvent,
  updateAssistantState,
} from "@/lib/server/assistant-memory";
import {
  createConversation,
  getConversationOwner,
  insertMessage,
} from "@/lib/server/chat-repository";
import { serverEnv } from "@/lib/server/env";
import { invokeFdAdvisor } from "@/lib/server/fd-advisor-agent";
import { getChatSessionOwner, persistChatSessionTurn } from "@/lib/server/persistence";
import { assessPromptRisk, buildBlockedPromptResponse } from "@/lib/server/prompt-guard";
import { logServerWarn } from "@/lib/server/telemetry";
import { detectVoiceLanguageMode } from "@/lib/voice-flow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

const voiceTurnSchema = z.object({
  userId: z.string().trim().min(1),
  sessionId: z.string().trim().min(1),
  conversationId: z.string().trim().optional().nullable(),
  threadId: z.string().trim().optional().nullable(),
  clientTurnId: z.string().trim().optional(),
  transcript: z.string().trim().min(1).max(1000),
  finalTranscript: z.string().trim().max(1000).optional(),
  language: appLanguageSchema.default("hinglish"),
  amount: z.number().int().positive().optional(),
  tenorMonths: z.number().int().positive().optional(),
  seniorCitizen: z.boolean().optional(),
  bankType: bankTypeFilterSchema.optional(),
  prefetchKey: z.string().trim().optional(),
  uiIntentHint: advisorUiSchema.partial().optional(),
  latency: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function requireWorkerSecret(request: Request) {
  const expected = serverEnv.VOICE_AGENT_WORKER_SECRET;
  if (!expected) {
    return jsonError("Voice worker secret is not configured", 503, {
      code: "voice_worker_secret_not_configured",
    });
  }

  if (request.headers.get("x-worker-secret") !== expected) {
    return jsonError("Invalid worker secret", 401, {
      code: "invalid_worker_secret",
    });
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const secretError = requireWorkerSecret(request);
    if (secretError) return secretError;

    const input = voiceTurnSchema.parse(await request.json());
    const detectedLanguage = detectVoiceLanguageMode(input.transcript, input.language);
    let conversationId = input.threadId ?? input.conversationId ?? undefined;

    if (conversationId) {
      const ownerId =
        (await getConversationOwner(conversationId)) ??
        (await getChatSessionOwner(conversationId));
      if (ownerId && ownerId !== input.userId) {
        return jsonError("Thread does not belong to user", 403, {
          code: "voice_thread_owner_mismatch",
        });
      }
    }

    if (!conversationId) {
      const conversation = await createConversation({
        userId: input.userId,
        firstMessage: input.transcript,
        language: detectedLanguage,
        conversationType: "voice",
        interactionMode: "voice",
      });
      if (!conversation) {
        return jsonError("Database unavailable", 503, {
          code: "voice_conversation_unavailable",
        });
      }
      conversationId = conversation.id;
    }

    const startedAt = Date.now();
    const promptRisk = assessPromptRisk(input.transcript);

    await insertMessage({
      conversationId,
      userId: input.userId,
      role: "user",
      content: promptRisk.normalizedMessage,
      transcript: input.finalTranscript ?? input.transcript,
      type: "voice",
      detectedLanguage,
      voiceSessionId: input.sessionId,
      metadata: {
        clientTurnId: input.clientTurnId,
        prefetchKey: input.prefetchKey,
        uiIntentHint: input.uiIntentHint,
        sttLatency: input.latency,
      },
    }).catch(() => null);

    if (promptRisk.blocked) {
      logServerWarn("voice_turn_prompt_blocked", {
        userId: input.userId,
        conversationId,
        reasons: promptRisk.reasons,
      });
      const blockedText = buildBlockedPromptResponse(detectedLanguage);
      await insertMessage({
        conversationId,
        userId: input.userId,
        role: "assistant",
        content: blockedText,
        type: "voice",
        detectedLanguage,
        voiceSessionId: input.sessionId,
        metadata: { blocked: true },
      }).catch(() => null);

      return jsonSuccess({
        threadId: conversationId,
        text: blockedText,
        rateCards: [],
        actions: [],
        glossary: [],
        warnings: ["Guarded prompt rejected"],
        suggestedChips: [],
      });
    }

    const result = await invokeFdAdvisor({
      message: promptRisk.normalizedMessage,
      language: detectedLanguage,
      threadId: conversationId,
      userId: input.userId,
      mode: "voice",
      amount: input.amount,
      tenorMonths: input.tenorMonths,
      seniorCitizen: input.seniorCitizen,
      bankType: input.bankType,
      prefetchKey: input.prefetchKey,
      uiIntentHint: input.uiIntentHint,
    });
    const totalMs = Date.now() - startedAt;

    await insertMessage({
      conversationId: result.threadId,
      userId: input.userId,
      role: "assistant",
      content: result.response.text,
      type: "voice",
      detectedLanguage,
      voiceSessionId: input.sessionId,
      streamingState: "complete",
      latency: { totalMs },
      model: { provider: "advisor", name: "fd-advisor-agent" },
      metadata: {
        clientTurnId: input.clientTurnId,
        rateCardCount: result.response.rateCards.length,
        tone: result.response.tone,
        ui: result.response.ui,
      },
    }).catch(() => null);

    void Promise.all([
      persistChatSessionTurn({
        threadId: result.threadId,
        userId: input.userId,
        language: detectedLanguage,
        userMessage: promptRisk.normalizedMessage,
        assistantMessage: result.response.text,
        fdContextIds: result.response.rateCards.map((card) => card.bankId),
      }),
      recordVoiceTurn({
        sessionId: input.sessionId,
        userId: input.userId,
        conversationId: result.threadId,
        clientTurnId: input.clientTurnId,
        transcript: input.transcript,
        finalTranscript: input.finalTranscript ?? input.transcript,
        aiResponse: result.response.text,
        latency: { ...(input.latency ?? {}), totalMs },
        metadata: input.metadata,
      }),
      trackAnalyticsEvent({
        userId: input.userId,
        conversationId: result.threadId,
        voiceSessionId: input.sessionId,
        eventType: "voice_turn_completed",
        source: "voice",
        language: detectedLanguage,
        latencyMs: totalMs,
        metadata: {
          rateCardCount: result.response.rateCards.length,
          clientTurnId: input.clientTurnId,
        },
      }),
      updateAssistantState(input.userId, {
        activeConversationId: result.threadId,
        activeVoiceSessionId: input.sessionId,
        contextSummary: result.response.text.slice(0, 600),
        lastInteractionMode: "voice",
      }),
    ]).catch(() => undefined);

    return jsonSuccess({
      threadId: result.threadId,
      text: result.response.text,
      latency: { totalMs },
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
    });
  } catch (error) {
    return handleRouteError(error, "Unable to process voice turn", {
      zodMessage: "Invalid voice turn payload",
    });
  }
}
