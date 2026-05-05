import { z } from "zod";

import { getRequestIp, handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { serverEnv } from "@/lib/server/env";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

const ttsRequestSchema = z.object({
  text: z.string().trim().min(1).max(900),
  language: z.enum(["en", "hi", "hinglish", "ta", "bn"]).default("en"),
});

function preferredVoiceId(language: string) {
  if (serverEnv.ELEVENLABS_VOICE_ID) return serverEnv.ELEVENLABS_VOICE_ID;
  return language === "en" ? "EXAVITQu4vr4xnSDxMaL" : "21m00Tcm4TlvDq8ikWAM";
}

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const rateLimit = await enforceRateLimit({
      key: `voice-tts:${auth.session.uid}:${getRequestIp(request)}`,
      limit: 20,
      window: "1 m",
    });

    if (!rateLimit.success) {
      return jsonError("Too many voice replies. Please try again shortly.", 429, {
        retryAfter: rateLimit.reset,
      });
    }

    const input = ttsRequestSchema.parse(await request.json());

    if (!serverEnv.ELEVENLABS_API_KEY) {
      const fallbackLanguage =
        input.language === "hi" || input.language === "hinglish" ? "hi-IN" : "en-IN";
      return jsonSuccess({
        provider: "browser-fallback",
        audioUrl: null,
        fallbackLanguage,
        meta: {
          provider: "browser-fallback",
          fallback: true,
          fallbackLanguage,
          naturalTtsConfigured: false,
        },
      });
    }

    const voiceId = preferredVoiceId(input.language);
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": serverEnv.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: input.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.75,
            style: input.language === "en" ? 0.15 : 0.25,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      const fallbackLanguage =
        input.language === "hi" || input.language === "hinglish" ? "hi-IN" : "en-IN";
      return jsonSuccess({
        provider: "browser-fallback",
        audioUrl: null,
        fallbackLanguage,
        meta: {
          provider: "browser-fallback",
          fallback: true,
          fallbackLanguage,
          naturalTtsConfigured: true,
        },
        warning: detail.slice(0, 240),
      });
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const fallbackLanguage =
      input.language === "hi" || input.language === "hinglish" ? "hi-IN" : "en-IN";
    return jsonSuccess({
      provider: "elevenlabs",
      audioUrl: `data:audio/mpeg;base64,${bytes.toString("base64")}`,
      fallbackLanguage,
      meta: {
        provider: "elevenlabs",
        fallback: false,
        fallbackLanguage,
        naturalTtsConfigured: true,
      },
    });
  } catch (error) {
    return handleRouteError(error, "Unable to prepare spoken reply", {
      zodMessage: "Invalid voice TTS request",
    });
  }
}
