import {
  hasGeminiConfig,
  hasOpenRouterConfig,
  serverEnv,
} from "@/lib/server/env";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type InvokeLlmOptions = {
  temperature?: number;
  maxTokens?: number;
};

function splitSystemPrompt(messages: LlmMessage[]) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const conversation = messages.filter((message) => message.role !== "system");

  return { system, conversation };
}

async function invokeGemini(messages: LlmMessage[], options: InvokeLlmOptions) {
  if (!serverEnv.GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing");
  }

  const { system, conversation } = splitSystemPrompt(messages);
  const endpoint = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${serverEnv.GEMINI_MODEL}:generateContent`
  );
  endpoint.searchParams.set("key", serverEnv.GEMINI_API_KEY);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: system
        ? {
            parts: [{ text: system }],
          }
        : undefined,
      contents: conversation.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 900,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}

async function invokeOpenRouter(
  messages: LlmMessage[],
  options: InvokeLlmOptions
) {
  if (!serverEnv.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is missing");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": serverEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Nivesh Saathi",
    },
    body: JSON.stringify({
      model: serverEnv.OPENROUTER_MODEL,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 900,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const text = payload.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("OpenRouter returned an empty response");
  }

  return text;
}

export async function invokeLlm(
  messages: LlmMessage[],
  options: InvokeLlmOptions = {}
) {
  if (hasGeminiConfig) {
    try {
      return await invokeGemini(messages, options);
    } catch (error) {
      if (!hasOpenRouterConfig) {
        throw error;
      }
    }
  }

  if (hasOpenRouterConfig) {
    return invokeOpenRouter(messages, options);
  }

  return null;
}
