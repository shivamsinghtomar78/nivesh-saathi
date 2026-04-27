import { serverEnv } from "@/lib/server/env";
import { appLanguageSchema } from "@/lib/server/advisor-schemas";
import { LANGUAGE_META } from "@/lib/languages";

export const runtime = "nodejs";

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
    return Response.json(
      { error: "Deepgram is not configured" },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const languageValue = formData.get("language");

    if (!(audioFile instanceof File)) {
      return Response.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    if (audioFile.size === 0 || audioFile.size > MAX_AUDIO_BYTES) {
      return Response.json(
        { error: "Audio file is empty or exceeds the 10MB limit" },
        { status: 400 }
      );
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
      return Response.json(
        {
          error: "Deepgram transcription failed",
          detail: detail.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as DeepgramTranscriptionResponse;
    const alternative = payload.results?.channels?.[0]?.alternatives?.[0];
    const transcript = alternative?.transcript?.trim() ?? "";

    if (!transcript) {
      return Response.json(
        { error: "No speech detected in the audio" },
        { status: 422 }
      );
    }

    return Response.json({
      transcript,
      confidence: alternative?.confidence ?? null,
      language,
      providerLanguage:
        payload.results?.channels?.[0]?.detected_language ??
        payload.results?.channels?.[0]?.language ??
        deepgramLanguage,
    });
  } catch (error) {
    return Response.json(
      {
        error: "Unable to transcribe audio",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
