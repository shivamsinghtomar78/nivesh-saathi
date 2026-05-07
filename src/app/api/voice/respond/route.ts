import { z } from "zod";
import { withTracing } from "@/lib/server/langsmith";
import type { AppLanguage } from "@/lib/server/advisor-schemas";
import { advisorUiSchema, appLanguageSchema } from "@/lib/server/advisor-schemas";
import { getRequestIp, handleRouteError, jsonError } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import {
  createConversation,
  getConversationOwner,
  insertMessage,
} from "@/lib/server/chat-repository";
import { serverEnv } from "@/lib/server/env";
import { LANGUAGE_META } from "@/lib/languages";
import {
  assessPromptRisk,
  buildBlockedPromptResponse,
} from "@/lib/server/prompt-guard";
import { persistChatSessionTurn, persistFlaggedMessage } from "@/lib/server/persistence";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { logServerWarn } from "@/lib/server/telemetry";
import {
  recordVoiceTurn,
  startVoiceSession,
  trackAnalyticsEvent,
  updateAssistantState,
} from "@/lib/server/assistant-memory";
import { getCachedPredictivePrefetch } from "@/lib/server/predictive-prefetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

const voiceRespondSchema = z.object({
  transcript: z.string().trim().min(1).max(1000),
  language: appLanguageSchema.default("en"),
  conversationId: z.string().trim().optional(),
  threadId: z.string().trim().optional(),
  voiceSessionId: z.string().trim().optional(),
  clientTurnId: z.string().trim().optional(),
  prefetchKey: z.string().trim().optional(),
  uiIntentHint: advisorUiSchema.partial().optional(),
  recentMessages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1200),
      })
    )
    .max(8)
    .optional(),
});

type VoiceRespondInput = z.infer<typeof voiceRespondSchema>;

type GroqChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

function sse(controller: ReadableStreamDefaultController<Uint8Array>, payload: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`));
}

function getVoiceId(language: AppLanguage) {
  if (serverEnv.ELEVENLABS_VOICE_ID) return serverEnv.ELEVENLABS_VOICE_ID;
  return language === "en" ? "EXAVITQu4vr4xnSDxMaL" : "21m00Tcm4TlvDq8ikWAM";
}

function getFallbackSpeechLanguage(language: AppLanguage) {
  return LANGUAGE_META[language]?.speechSynthesis ?? "en-IN";
}

function voiceSystemPrompt(language: AppLanguage) {
  const languageHint =
    language === "hi"
      ? "Hindi"
      : language === "hinglish"
        ? "Hinglish"
        : language === "ta"
          ? "Tamil when needed, otherwise Hinglish/English"
        : language === "te"
          ? "Telugu when needed, otherwise Hinglish/English"
            : "English";

  return [
    "You are Nivesh Saathi, a calm premium Indian financial advisor voice assistant.",
    `Reply in the same language and style as the user. Current UI language hint: ${languageHint}.`,
    "Support English, Hindi, and Hinglish naturally. Use a local conversational Indian tone.",
    "Keep voice replies short, reassuring, and practical. Prefer 1 to 3 concise sentences.",
    "Do not provide regulated investment guarantees. For financial facts, be careful and suggest verifying final bank terms.",
  ].join(" ");
}

type CachedVoicePrefetch = Awaited<ReturnType<typeof getCachedPredictivePrefetch>>;

function buildGroqMessages(input: VoiceRespondInput, prefetch: CachedVoicePrefetch) {
  const predictiveContext = prefetch
    ? [
        "Verified predictive FD context is already prepared from the user's interim speech.",
        `Intent: ${prefetch.prediction.intent}. Confidence: ${prefetch.prediction.confidence}.`,
        `Filters: ${JSON.stringify(prefetch.data.filters)}.`,
        `Top FD cards: ${JSON.stringify(
          prefetch.data.rateCards.slice(0, 3).map((card) => ({
            bankName: card.bankName,
            rate: card.rate,
            maturityAmount: card.maturityAmount,
            tenorLabel: card.tenorLabel,
          }))
        )}.`,
        "Use only this verified context for rates and maturity math. Do not invent banks, rates, or eligibility facts.",
      ].join(" ")
    : "";

  return [
    {
      role: "system" as const,
      content: `${voiceSystemPrompt(input.language)} ${predictiveContext}`,
    },
    ...(input.recentMessages ?? []).map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: "user" as const, content: input.transcript },
  ];
}

/* ─── Empathetic Thinking Fillers ─── */
const THINKING_FILLERS: Record<string, string[]> = {
  en: [
    "Hmm, let me check that for you.",
    "One moment, let me look into this.",
    "Let me calculate that.",
    "Good question, let me think.",
    "Right, let me pull up the details.",
  ],
  hi: [
    "हम्म, मैं देखता हूँ।",
    "एक सेकंड, मैं चेक करता हूँ।",
    "अच्छा सवाल, सोचने दीजिए।",
    "रुकिए, मैं calculate करता हूँ।",
  ],
  hinglish: [
    "Hmm, ek second, dekh leta hoon.",
    "Achha, let me check karta hoon.",
    "Good question, sochne do.",
    "Ek moment, calculate karta hoon.",
    "Hmm, thoda check karta hoon.",
  ],
};

function pickThinkingFiller(language: AppLanguage): string {
  const lang = language === "hi" ? "hi" : language === "hinglish" ? "hinglish" : "en";
  const fillers = THINKING_FILLERS[lang];
  return fillers[Math.floor(Math.random() * fillers.length)];
}

function shouldFlushVoiceChunk(text: string) {
  if (text.length >= 170) return true;
  return /[.!?।]\s*$/.test(text) && text.length >= 36;
}

async function synthesizeChunk(params: {
  text: string;
  language: AppLanguage;
  signal: AbortSignal;
}) {
  if (!serverEnv.ELEVENLABS_API_KEY) {
    return {
      provider: "browser-fallback",
      audioUrl: null,
      fallbackLanguage: getFallbackSpeechLanguage(params.language),
    };
  }

  const voiceId = getVoiceId(params.language);
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        "xi-api-key": serverEnv.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: params.text,
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability: 0.48,
          similarity_boost: 0.78,
          style: params.language === "en" ? 0.18 : 0.28,
          use_speaker_boost: true,
        },
      }),
      signal: params.signal,
    }
  );

  if (!response.ok) {
    return {
      provider: "browser-fallback",
      audioUrl: null,
      fallbackLanguage: getFallbackSpeechLanguage(params.language),
      warning: (await response.text()).slice(0, 220),
    };
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    provider: "elevenlabs",
    audioUrl: `data:audio/mpeg;base64,${bytes.toString("base64")}`,
    fallbackLanguage: getFallbackSpeechLanguage(params.language),
  };
}

async function ensureVoiceConversation(input: {
  userId: string;
  transcript: string;
  language: AppLanguage;
  requestedId?: string;
}) {
  if (input.requestedId) {
    const owner = await getConversationOwner(input.requestedId);
    if (owner && owner !== input.userId) {
      return { ok: false as const, response: jsonError("Conversation does not belong to this user.", 403) };
    }
    if (owner) return { ok: true as const, conversationId: input.requestedId };
  }

  const conversation = await createConversation({
    userId: input.userId,
    firstMessage: input.transcript,
    language: input.language,
    conversationType: "voice",
    interactionMode: "voice",
  });

  return {
    ok: true as const,
    conversationId: conversation?.id ?? input.requestedId ?? crypto.randomUUID(),
  };
}

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    if (!serverEnv.GROQ_API_KEY) {
      return jsonError("Groq is not configured", 503);
    }

    const rateLimit = await enforceRateLimit({
      key: `voice-respond:${auth.session.uid}:${getRequestIp(request)}`,
      limit: 20,
      window: "1 m",
    });

    if (!rateLimit.success) {
      return jsonError("Too many voice turns. Please try again shortly.", 429, {
        retryAfter: rateLimit.reset,
      });
    }

    const input = voiceRespondSchema.parse(await request.json());
    const requestedId = input.conversationId ?? input.threadId;
    const conversation = await ensureVoiceConversation({
      userId: auth.session.uid,
      transcript: input.transcript,
      language: input.language,
      requestedId,
    });

    if (!conversation.ok) return conversation.response;

    const conversationId = conversation.conversationId;
    const cachedPrefetch = input.prefetchKey
      ? await getCachedPredictivePrefetch(input.prefetchKey).catch(() => null)
      : null;
    const voiceSession =
      input.voiceSessionId
        ? { sessionId: input.voiceSessionId }
        : await startVoiceSession({
            userId: auth.session.uid,
            conversationId,
            language: input.language,
            metadata: {
              clientTurnId: input.clientTurnId,
              transport: "deepgram-elevenlabs-sse",
            },
          }).catch(() => null);
    const voiceSessionId = voiceSession?.sessionId;
    const abortController = new AbortController();
    request.signal.addEventListener("abort", () => abortController.abort(), { once: true });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let assistantText = "";

        try {
          sse(controller, {
            type: "meta",
            conversationId,
            threadId: conversationId,
            voiceSessionId,
            clientTurnId: input.clientTurnId,
            prefetchKey: input.prefetchKey,
            ui: input.uiIntentHint ?? cachedPrefetch?.ui,
            prediction: cachedPrefetch?.prediction,
          });
          sse(controller, { type: "user", transcript: input.transcript });

          await insertMessage({
            conversationId,
            userId: auth.session.uid,
              role: "user",
              content: input.transcript,
              type: "voice",
              transcript: input.transcript,
              detectedLanguage: input.language,
              voiceSessionId,
              clientTurnId: input.clientTurnId,
              metadata: {
                source: "voice",
                clientTurnId: input.clientTurnId,
                prefetchKey: input.prefetchKey,
                uiIntentHint: input.uiIntentHint,
              },
            }).catch(() => null);

          const promptRisk = assessPromptRisk(input.transcript);
          if (promptRisk.blocked) {
            logServerWarn("voice_prompt_blocked", {
              userId: auth.session.uid,
              reasons: promptRisk.reasons,
              confidence: promptRisk.confidence,
            });
            await persistFlaggedMessage({
              userId: auth.session.uid,
              message: input.transcript,
              reasons: promptRisk.reasons,
              confidence: promptRisk.confidence,
            });
            assistantText = buildBlockedPromptResponse(input.language);
            sse(controller, { type: "token", token: assistantText });
            const audio = await synthesizeChunk({
              text: assistantText,
              language: input.language,
              signal: abortController.signal,
            });
            sse(controller, { type: audio.audioUrl ? "audio" : "audio_fallback", text: assistantText, ...audio });
          } else {
            // ── Empathetic thinking filler: emit a short human-like phrase
            //    while the LLM generates a response (hides latency) ──
            const fillerText = pickThinkingFiller(input.language);
            sse(controller, { type: "thinking", text: fillerText });

            const fillerPromise = synthesizeChunk({
              text: fillerText,
              language: input.language,
              signal: abortController.signal,
            }).then((audio) => {
              sse(controller, {
                type: audio.audioUrl ? "audio" : "audio_fallback",
                text: fillerText,
                isFiller: true,
                ...audio,
              });
            }).catch(() => {
              // Filler is best-effort — don't block on failure
            });

            // Fire LLM request in parallel with filler TTS
            const generateGroqStream = withTracing(async () => {
              return await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${serverEnv.GROQ_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: serverEnv.GROQ_MODEL,
                  messages: buildGroqMessages({
                    ...input,
                    transcript: promptRisk.normalizedMessage,
                  }, cachedPrefetch),
                  stream: true,
                  temperature: 0.42,
                  max_tokens: 220,
                }),
                signal: abortController.signal,
              });
            }, { name: "voice_llm_generation", run_type: "llm" });

            // Wait for both filler TTS and LLM response to start
            const [groqResponse] = await Promise.all([
              generateGroqStream(),
              fillerPromise,
            ]);

            if (!groqResponse.ok || !groqResponse.body) {
              const detail = await groqResponse.text().catch(() => "");
              throw new Error(detail.slice(0, 220) || `Groq request failed with ${groqResponse.status}`);
            }

            const reader = groqResponse.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let voiceBuffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const events = buffer.split("\n\n");
              buffer = events.pop() ?? "";

              for (const event of events) {
                const lines = event.split("\n").filter((line) => line.startsWith("data: "));
                for (const line of lines) {
                  const data = line.slice(6).trim();
                  if (!data || data === "[DONE]") continue;

                  const chunk = JSON.parse(data) as GroqChunk;
                  const token = chunk.choices?.[0]?.delta?.content ?? "";
                  if (!token) continue;

                  assistantText += token;
                  voiceBuffer += token;
                  sse(controller, { type: "token", token });

                  if (shouldFlushVoiceChunk(voiceBuffer.trim())) {
                    const text = voiceBuffer.trim();
                    voiceBuffer = "";
                    const audio = await synthesizeChunk({
                      text,
                      language: input.language,
                      signal: abortController.signal,
                    });
                    sse(controller, { type: audio.audioUrl ? "audio" : "audio_fallback", text, ...audio });
                  }
                }
              }
            }

            const remaining = voiceBuffer.trim();
            if (remaining) {
              const audio = await synthesizeChunk({
                text: remaining,
                language: input.language,
                signal: abortController.signal,
              });
              sse(controller, { type: audio.audioUrl ? "audio" : "audio_fallback", text: remaining, ...audio });
            }
          }

          const finalText = assistantText.trim();
          if (finalText) {
            await insertMessage({
              conversationId,
              userId: auth.session.uid,
              role: "assistant",
              content: finalText,
              type: "voice",
              detectedLanguage: input.language,
              voiceSessionId,
              clientTurnId: input.clientTurnId,
              model: { provider: "groq", name: serverEnv.GROQ_MODEL },
              metadata: {
                source: "voice",
                provider: "groq",
                model: serverEnv.GROQ_MODEL,
                prefetchKey: input.prefetchKey,
                ui: input.uiIntentHint ?? cachedPrefetch?.ui,
              },
            }).catch(() => null);

            if (voiceSessionId) {
              void recordVoiceTurn({
                sessionId: voiceSessionId,
                userId: auth.session.uid,
                conversationId,
                clientTurnId: input.clientTurnId,
                transcript: input.transcript,
                finalTranscript: input.transcript,
                aiResponse: finalText,
                generatedSpeechText: finalText,
                metadata: {
                  provider: "groq",
                  model: serverEnv.GROQ_MODEL,
                  prefetchKey: input.prefetchKey,
                },
              }).catch(() => undefined);
            }

            void persistChatSessionTurn({
              threadId: conversationId,
              userId: auth.session.uid,
              language: input.language,
              userMessage: input.transcript,
              assistantMessage: finalText,
              fdContextIds: [],
            }).catch(() => undefined);
            void Promise.all([
              trackAnalyticsEvent({
                userId: auth.session.uid,
                conversationId,
                voiceSessionId,
                eventType: "voice_turn_completed",
                source: "voice",
                language: input.language,
                metadata: {
                  clientTurnId: input.clientTurnId,
                  provider: "groq",
                  model: serverEnv.GROQ_MODEL,
                  prefetchKey: input.prefetchKey,
                },
              }),
              updateAssistantState(auth.session.uid, {
                activeConversationId: conversationId,
                activeVoiceSessionId: voiceSessionId,
                lastInteractionMode: "voice",
                contextSummary: finalText.slice(0, 600),
              }),
            ]).catch(() => undefined);
          }

          sse(controller, {
            type: "done",
            reply: finalText,
            conversationId,
            threadId: conversationId,
            voiceSessionId,
            prefetchKey: input.prefetchKey,
            ui: input.uiIntentHint ?? cachedPrefetch?.ui,
          });
        } catch (error) {
          if (!abortController.signal.aborted) {
            sse(controller, {
              type: "error",
              error: error instanceof Error ? error.message : "Unable to prepare voice reply",
            });
          }
        } finally {
          controller.close();
        }
      },
      cancel() {
        abortController.abort();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleRouteError(error, "Unable to process voice response", {
      zodMessage: "Invalid voice response request",
    });
  }
}
