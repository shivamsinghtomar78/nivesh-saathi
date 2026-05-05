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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

/* ------------------------------------------------------------------ */
/*  Input schema                                                       */
/* ------------------------------------------------------------------ */

const n8nVoiceRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  language: z.enum(["en", "hi", "hinglish"]).default("en"),
  conversationId: z.string().optional(),
  audioUrl: z.string().url().optional(),
});

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

    // ── Build & send webhook request ───────────────────────────────
    const webhookRequest = buildN8nVoiceRequest({
      userId: auth.session.uid,
      message: input.message,
      language: input.language,
      conversationId: input.conversationId,
      audioUrl: input.audioUrl,
    });

    const result = await sendToN8nVoiceAgent(webhookRequest);

    if (!result.ok) {
      return jsonError(
        result.error.message || "Voice agent could not process your request.",
        502
      );
    }

    // ── Return normalised response ─────────────────────────────────
    return jsonSuccess({
      conversationId: result.data.conversationId,
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
