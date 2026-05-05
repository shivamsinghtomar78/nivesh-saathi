import {
  hasGeminiConfig,
  hasOpenRouterConfig,
  serverEnv,
} from "@/lib/server/env";
import { logServerWarn } from "@/lib/server/telemetry";
import { withTracing } from "@/lib/server/langsmith";
import { getCurrentRunTree } from "langsmith/traceable";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type InvokeLlmOptions = {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

function splitSystemPrompt(messages: LlmMessage[]) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const conversation = messages.filter((message) => message.role !== "system");

  return { system, conversation };
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

const invokeGemini = withTracing(async function invokeGemini(messages: LlmMessage[], options: InvokeLlmOptions) {
  const { system, conversation } = splitSystemPrompt(messages);
  const endpoint = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${serverEnv.GEMINI_MODEL}:generateContent`
  );
  endpoint.searchParams.set("key", serverEnv.GEMINI_API_KEY);

  const response = await fetchWithTimeout(
    endpoint,
    {
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
    },
    options.timeoutMs ?? 12000
  );

  const runTree = getCurrentRunTree();
  if (runTree) {
    runTree.extra = {
      ...runTree.extra,
      metadata: {
        ...runTree.extra?.metadata,
        provider: "google",
        model: serverEnv.GEMINI_MODEL,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      }
    };
  }

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
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };

  if (runTree && payload.usageMetadata) {
    runTree.extra = {
      ...runTree.extra,
      metadata: {
        ...runTree.extra?.metadata,
        prompt_tokens: payload.usageMetadata.promptTokenCount,
        completion_tokens: payload.usageMetadata.candidatesTokenCount,
        total_tokens: payload.usageMetadata.totalTokenCount,
      }
    };
  }
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}, { name: "invokeGemini", run_type: "llm" });

const invokeOpenRouter = withTracing(async function invokeOpenRouter(
  messages: LlmMessage[],
  options: InvokeLlmOptions
) {
  const response = await fetchWithTimeout(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": serverEnv.NEXT_PUBLIC_APP_URL,
        "X-Title": "Nivesh Saathi",
      },
      body: JSON.stringify({
        model: serverEnv.OPENROUTER_MODEL,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 900,
      }),
    },
    options.timeoutMs ?? 15000
  );

  const runTree = getCurrentRunTree();
  if (runTree) {
    runTree.extra = {
      ...runTree.extra,
      metadata: {
        ...runTree.extra?.metadata,
        provider: "openrouter",
        model: serverEnv.OPENROUTER_MODEL,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      }
    };
  }

  if (!response.ok) {
    throw new Error(`OpenRouter request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  if (runTree && payload.usage) {
    runTree.extra = {
      ...runTree.extra,
      metadata: {
        ...runTree.extra?.metadata,
        prompt_tokens: payload.usage.prompt_tokens,
        completion_tokens: payload.usage.completion_tokens,
        total_tokens: payload.usage.total_tokens,
      }
    };
  }

  const text = payload.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("OpenRouter returned an empty response");
  }

  return text;
}, { name: "invokeOpenRouter", run_type: "llm" });

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function invokeLlm(
  messages: LlmMessage[],
  options: InvokeLlmOptions = {}
) {
  let attempt = 0;
  const maxRetries = 2;
  const backoffs = [1000, 3000];

  while (attempt <= maxRetries) {
    try {
      if (hasGeminiConfig) {
        return await invokeGemini(messages, options);
      }
      break;
    } catch (error) {
      if (attempt === maxRetries) {
        logServerWarn("gemini_fallback_triggered", {
          error: error instanceof Error ? error.message : "unknown",
        });
        if (!hasOpenRouterConfig) throw error;
        break;
      }
      await sleep(backoffs[attempt] || 1000);
      attempt++;
    }
  }

  if (hasOpenRouterConfig) {
    return invokeOpenRouter(messages, options);
  }

  return null;
}
