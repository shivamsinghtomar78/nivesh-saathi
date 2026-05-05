/**
 * n8n Webhook Client
 *
 * Handles communication with the n8n voice-agent webhook workflow.
 * The n8n workflow handles:
 *   - Input validation
 *   - Speech-to-text (if audioUrl provided)
 *   - AI processing via LLM
 *   - Conversation memory / context
 *   - Text-to-speech generation
 *   - Response formatting
 */

import { serverEnv } from "@/lib/server/env";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface N8nVoiceRequest {
  userId: string;
  conversationId?: string;
  message: string;
  audioUrl?: string;
  timestamp: string;
  metadata: {
    language: "en" | "hi";
    platform: "web" | "mobile";
  };
}

export interface N8nVoiceResponse {
  conversationId: string;
  reply: string;
  audioUrl: string | null;
  timestamp: string;
  status: "success";
}

export interface N8nErrorResponse {
  status: "error";
  message: string;
}

export type N8nResult =
  | { ok: true; data: N8nVoiceResponse }
  | { ok: false; error: N8nErrorResponse };

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ??
  "https://shivamsinghtomar7838.app.n8n.cloud/webhook/voice-agent";

const N8N_API_KEY = process.env.N8N_WEBHOOK_API_KEY ?? "";

/** Maximum time (ms) to wait for the n8n workflow to respond. */
const N8N_TIMEOUT_MS = 30_000;

/** Maximum retries on transient 5xx / network errors. */
const MAX_RETRIES = 2;

/** Base delay between retries (doubles each attempt). */
const RETRY_BASE_MS = 800;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isRetryable(status: number): boolean {
  return status === 502 || status === 503 || status === 504 || status === 429;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Map the frontend's AppLanguage value to the simpler "en" | "hi" that
 * the n8n webhook expects. Hinglish is mapped to Hindi since n8n TTS
 * providers typically don't have a dedicated Hinglish mode.
 */
export function toN8nLanguage(
  lang: string
): "en" | "hi" {
  if (lang === "hi" || lang === "hinglish") return "hi";
  return "en";
}

/* ------------------------------------------------------------------ */
/*  Main client                                                        */
/* ------------------------------------------------------------------ */

/**
 * Send a voice message to the n8n webhook and return the structured response.
 *
 * - Validates that the webhook URL is configured.
 * - Adds API-key header when available.
 * - Retries on transient errors.
 * - Returns a discriminated union so the caller can handle success/error.
 */
export async function sendToN8nVoiceAgent(
  request: N8nVoiceRequest
): Promise<N8nResult> {
  if (!N8N_WEBHOOK_URL) {
    return {
      ok: false,
      error: {
        status: "error",
        message: "n8n webhook URL is not configured.",
      },
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (N8N_API_KEY) {
    headers["x-api-key"] = N8N_API_KEY;
  }

  let lastError: string = "Unknown error";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        N8N_TIMEOUT_MS
      );

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = (await response.json()) as N8nVoiceResponse;

        // Normalise: ensure required fields have sane defaults.
        return {
          ok: true,
          data: {
            conversationId: data.conversationId ?? request.conversationId ?? crypto.randomUUID(),
            reply: data.reply ?? "",
            audioUrl: data.audioUrl ?? null,
            timestamp: data.timestamp ?? new Date().toISOString(),
            status: "success",
          },
        };
      }

      // Non-retryable HTTP error
      if (!isRetryable(response.status)) {
        let detail = "";
        try {
          const errorBody = await response.text();
          detail = errorBody.slice(0, 300);
        } catch {
          // ignore
        }
        return {
          ok: false,
          error: {
            status: "error",
            message: detail || `n8n returned status ${response.status}`,
          },
        };
      }

      lastError = `n8n returned status ${response.status}`;
    } catch (caught) {
      if ((caught as Error).name === "AbortError") {
        lastError = "n8n webhook timed out";
      } else {
        lastError =
          caught instanceof Error
            ? caught.message
            : "Network error contacting n8n webhook";
      }
    }

    // Wait before retry (exponential backoff)
    if (attempt < MAX_RETRIES) {
      await delay(RETRY_BASE_MS * 2 ** attempt);
    }
  }

  return {
    ok: false,
    error: {
      status: "error",
      message: lastError,
    },
  };
}

/**
 * Convenience: build a fully-formed N8nVoiceRequest from the typical
 * frontend parameters.
 */
export function buildN8nVoiceRequest(params: {
  userId: string;
  message: string;
  language: string;
  conversationId?: string;
  audioUrl?: string;
}): N8nVoiceRequest {
  return {
    userId: params.userId,
    conversationId: params.conversationId,
    message: params.message,
    audioUrl: params.audioUrl,
    timestamp: new Date().toISOString(),
    metadata: {
      language: toN8nLanguage(params.language),
      platform: "web",
    },
  };
}
