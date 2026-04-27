import { serverEnv } from "@/lib/server/env";
import { appLanguageSchema } from "@/lib/server/advisor-schemas";
import { getRequestIp, jsonError, jsonSuccess, handleRouteError } from "@/lib/server/api";
import { LANGUAGE_META } from "@/lib/languages";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

type DeepgramTranscriptionResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
      }>;
      detected_language?: string;
      language?: string;
    }>;
  };
};

export async function POST(request: Request) {
  if (!serverEnv.DEEPGRAM_API_KEY) {
    return jsonError("Deepgram is not configured", 503);
  }

  try {
    const ip = getRequestIp(request);
    const rateLimit = await enforceRateLimit({
      key: `voice:${ip}`,
      limit: 8,
      window: "1 m",
    });

    if (!rateLimit.success) {
      return jsonError("Too many voice requests. Please try again shortly.", 429, {
        retryAfter: rateLimit.reset,
      });
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const languageValue = formData.get("language");

    if (!(audioFile instanceof File)) {
      return jsonError("Audio file is required", 400);
    }

    if (audioFile.size === 0 || audioFile.size > MAX_AUDIO_BYTES) {
      return jsonError("Audio file is empty or exceeds the 10MB limit", 400);
    }

    const language = appLanguageSchema.parse(
      typeof languageValue === "string" ? languageValue : "hi"
    );
    const deepgramLanguage = LANGUAGE_META[language].deepgram;
    const endpoint = new URL("https://api.deepgram.com/v1/listen");
    endpoint.searchParams.set("model", "nova-2");
    endpoint.searchParams.set("smart_format", "true");
    endpoint.searchParams.set("punctuate", "true");
    endpoint.searchParams.set("language", deepgramLanguage);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Token ${serverEnv.DEEPGRAM_API_KEY}`,
        "Content-Type": audioFile.type || "audio/webm",
      },
      body: await audioFile.arrayBuffer(),
    });

    if (!response.ok) {
      const detail = await response.text();
      return jsonError("Deepgram transcription failed", 502, {
        detail: detail.slice(0, 300),
      });
    }

    const payload = (await response.json()) as DeepgramTranscriptionResponse;
    const alternative = payload.results?.channels?.[0]?.alternatives?.[0];
    const transcript = alternative?.transcript?.trim() ?? "";

    if (!transcript) {
      return jsonError("No speech detected in the audio", 422);
    }

    return jsonSuccess({
      transcript,
      confidence: alternative?.confidence ?? null,
      language,
      providerLanguage:
        payload.results?.channels?.[0]?.detected_language ??
        payload.results?.channels?.[0]?.language ??
        deepgramLanguage,
    });
  } catch (error) {
    return handleRouteError(error, "Unable to transcribe audio");
  }
}
