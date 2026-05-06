/**
 * API Proxy Route: POST /api/voice/n8n
 *
 * Bridges the authenticated Next.js frontend to the external n8n
 * webhook. This proxy preserves:
 *   - Firebase session authentication
 *   - CSRF protection
 *   - Rate limiting
 *   - Input validation
 *
 * The n8n workflow is responsible for:
 *   - AI processing (LLM calls)
 *   - Conversation memory
 *   - TTS generation
 *   - Response formatting
 */

import { z } from "zod";

import { getRequestIp, handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import {
  buildN8nVoiceRequest,
  sendToN8nVoiceAgent,
} from "@/lib/server/n8n-webhook";
import {
  createConversation,
  getConversationOwner,
  insertMessage,
} from "@/lib/server/chat-repository";
import {
  recordVoiceTurn,
  startVoiceSession,
  trackAnalyticsEvent,
} from "@/lib/server/assistant-memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

/* ------------------------------------------------------------------ */
/*  Input schema                                                       */
/* ------------------------------------------------------------------ */

const n8nVoiceRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  language: z.enum(["en", "hi", "hinglish", "ta", "te"]).default("en"),
  conversationId: z.string().optional(),
  audioUrl: z.string().url().optional(),
});

function persistedAudioMetadata(audioUrl: string | null | undefined) {
  if (!audioUrl || audioUrl.startsWith("data:")) return undefined;
  return { audioUrl, provider: "n8n" };
}

/* ------------------------------------------------------------------ */
/*  CORS preflight                                                     */
/* ------------------------------------------------------------------ */

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-nivesh-csrf, x-csrf-token",
    },
  });
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  try {
    // ── Auth & CSRF ────────────────────────────────────────────────
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    // ── Rate limit ─────────────────────────────────────────────────
    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      key: `voice-n8n:${auth.session.uid}:${ip}`,
      limit: 10,
      window: "1 m",
    });

    if (!rateLimit.success) {
      return jsonError(
        "Too many voice requests. Please try again shortly.",
        429,
        { retryAfter: rateLimit.reset }
      );
    }

    // ── Validate input ─────────────────────────────────────────────
    const body = await request.json();
    const input = n8nVoiceRequestSchema.parse(body);
    let conversationId = input.conversationId;

    if (conversationId) {
      const owner = await getConversationOwner(conversationId);
      if (owner && owner !== auth.session.uid) {
        return jsonError("Conversation does not belong to this user.", 403);
      }
    }

    if (!conversationId) {
      const conversation = await createConversation({
        userId: auth.session.uid,
        firstMessage: input.message,
        language: input.language,
        conversationType: "voice",
        interactionMode: "voice",
      });
      if (!conversation) return jsonError("Database unavailable", 503);
      conversationId = conversation.id;
    }

    const voiceSession = await startVoiceSession({
      userId: auth.session.uid,
      conversationId,
      language: input.language,
      metadata: { provider: "n8n" },
    }).catch(() => null);

    // ── Build & send webhook request ───────────────────────────────
    const webhookRequest = buildN8nVoiceRequest({
      userId: auth.session.uid,
      message: input.message,
      language: input.language,
      conversationId,
      audioUrl: input.audioUrl,
    });

    const result = await sendToN8nVoiceAgent(webhookRequest);

    if (!result.ok) {
      return jsonError(
        result.error.message || "Voice agent could not process your request.",
        502
      );
    }
    const finalConversationId = result.data.conversationId || conversationId;

    await Promise.all([
      insertMessage({
        conversationId: finalConversationId,
        userId: auth.session.uid,
        role: "user",
        content: input.message,
        type: "voice",
        transcript: input.message,
        detectedLanguage: input.language,
        voiceSessionId: voiceSession?.sessionId,
        audio: persistedAudioMetadata(input.audioUrl),
        metadata: { source: "voice-n8n" },
      }),
      insertMessage({
        conversationId: finalConversationId,
        userId: auth.session.uid,
        role: "assistant",
        content: result.data.reply,
        type: "voice",
        detectedLanguage: input.language,
        voiceSessionId: voiceSession?.sessionId,
        audio: persistedAudioMetadata(result.data.audioUrl),
        metadata: { source: "voice-n8n", provider: "n8n" },
      }),
    ]).catch(() => undefined);

    if (voiceSession?.sessionId) {
      void recordVoiceTurn({
        sessionId: voiceSession.sessionId,
        userId: auth.session.uid,
        conversationId: finalConversationId,
        transcript: input.message,
        aiResponse: result.data.reply,
        generatedSpeechText: result.data.reply,
        metadata: { provider: "n8n" },
      }).catch(() => undefined);
    }

    void trackAnalyticsEvent({
      userId: auth.session.uid,
      conversationId: finalConversationId,
      voiceSessionId: voiceSession?.sessionId,
      eventType: "voice_n8n_turn_completed",
      source: "voice",
      language: input.language,
      metadata: { hasAudio: Boolean(result.data.audioUrl) },
    }).catch(() => undefined);

    // ── Return normalised response ─────────────────────────────────
    return jsonSuccess({
      conversationId: finalConversationId,
      voiceSessionId: voiceSession?.sessionId,
      reply: result.data.reply,
      audioUrl: result.data.audioUrl,
      timestamp: result.data.timestamp,
      status: result.data.status,
    });
  } catch (error) {
    return handleRouteError(error, "Unable to process n8n voice request", {
      zodMessage: "Invalid voice agent request",
    });
  }
}
