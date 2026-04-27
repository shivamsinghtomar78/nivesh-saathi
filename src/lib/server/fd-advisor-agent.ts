import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  END,
  MemorySaver,
  MessagesValue,
  START,
  StateGraph,
  StateSchema,
} from "@langchain/langgraph";
import { z } from "zod";

import {
  advisorResponseSchema,
  type AdvisorResponse,
  type AppLanguage,
  type BankTypeFilter,
  type ChatRequest,
} from "@/lib/server/advisor-schemas";
import { buildDeterministicAdvisorResponse } from "@/lib/server/fd-service";
import { hasLlmConfig } from "@/lib/server/env";
import { invokeLlm, type LlmMessage } from "@/lib/server/llm-client";

const DEFAULT_AMOUNT = 50000;
const DEFAULT_TENOR_MONTHS = 12;

const detectedIntentSchema = z.object({
  objective: z.enum([
    "compare_rates",
    "understand_term",
    "check_safety",
    "book_fd",
    "kyc_help",
    "general_fd",
  ]),
  amount: z.number().int().positive().nullable(),
  tenorMonths: z.number().int().positive().nullable(),
  bankType: z.enum(["all", "public", "private", "small-finance"]),
  seniorCitizen: z.boolean(),
  termsToExplain: z.array(z.string()),
  wantsBooking: z.boolean(),
});

const narrativeSchema = z.object({
  text: z.string().min(1),
  followUpPrompt: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});

const agentState = new StateSchema({
  messages: MessagesValue,
  language: z.enum(["en", "hi", "ta", "bn"]).optional(),
  requestedAmount: z.number().optional(),
  requestedTenorMonths: z.number().optional(),
  seniorCitizen: z.boolean().optional(),
  bankType: z.enum(["all", "public", "private", "small-finance"]).optional(),
  intent: detectedIntentSchema.optional(),
  response: advisorResponseSchema.optional(),
});

const checkpointer = new MemorySaver();

function getMessageText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (
          item &&
          typeof item === "object" &&
          "text" in item &&
          typeof item.text === "string"
        ) {
          return item.text;
        }

        return "";
      })
      .join(" ")
      .trim();
  }

  return "";
}

function getMessageRole(message: unknown): "user" | "assistant" {
  if (!message || typeof message !== "object") {
    return "assistant";
  }

  const candidate = message as {
    getType?: () => string;
    _getType?: () => string;
    type?: string;
  };
  const type = candidate.getType?.() ?? candidate._getType?.() ?? candidate.type;

  return type === "human" ? "user" : "assistant";
}

function safeJsonParse<T>(rawText: string, schema: z.ZodSchema<T>): T | null {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? rawText;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    return null;
  }

  try {
    return schema.parse(JSON.parse(candidate.slice(firstBrace, lastBrace + 1)));
  } catch {
    return null;
  }
}

function detectTerms(message: string) {
  const normalized = message.toLowerCase();
  const terms: string[] = [];

  if (/(p\.a\.|per annum|प्रति वर्ष)/i.test(message)) {
    terms.push("pa");
  }
  if (/(tenor|tenure|अवधि|মেয়াদ|காலம்)/i.test(message)) {
    terms.push("tenor");
  }
  if (/(tds|tax deducted)/i.test(normalized)) {
    terms.push("tds");
  }
  if (/(dicgc|insured|insurance|safe|सुरक्षित|নিরাপদ|பாதுகாப்பு)/i.test(message)) {
    terms.push("dicgc");
  }
  if (/(small finance|small-finance|स्मॉल फाइनेंस)/i.test(message)) {
    terms.push("small-finance-bank");
  }
  if (/(maturity|परिपक्वता)/i.test(message)) {
    terms.push("maturity");
  }
  if (/(compound|चक्रवृद्धि)/i.test(message)) {
    terms.push("compound-interest");
  }
  if (/(kyc|aadhaar|aadhar|pan)/i.test(normalized)) {
    terms.push("kyc");
  }

  return terms;
}

function extractAmount(message: string) {
  const explicitCurrencyMatch =
    message.match(/(?:₹|rs\.?|rupees?|rupay|rupaye)\s*([0-9][0-9,]*)/i) ??
    message.match(/([0-9][0-9,]*)\s*(?:rupees?|rupay|rupaye)/i);

  if (!explicitCurrencyMatch) {
    return null;
  }

  return Number(explicitCurrencyMatch[1].replaceAll(",", ""));
}

function extractTenorMonths(message: string) {
  const monthMatch = message.match(
    /(\d+)\s*(?:month|months|mo|महिने|महीने|माह|மாதம்|மாதங்கள்|মাস)/i
  );
  if (monthMatch) {
    return Number(monthMatch[1]);
  }

  const yearMatch = message.match(
    /(\d+)\s*(?:year|years|yr|yrs|साल|वर्ष|ஆண்டு|ஆண்டுகள்|বছর)/i
  );
  if (yearMatch) {
    return Number(yearMatch[1]) * 12;
  }

  return null;
}

function inferObjective(message: string, terms: string[]) {
  const normalized = message.toLowerCase();

  if (/(kyc|aadhaar|aadhar|pan)/i.test(normalized)) {
    return "kyc_help" as const;
  }

  if (/(book|open fd|start fd|apply|redirect)/i.test(normalized)) {
    return "book_fd" as const;
  }

  if (/(what is|explain|samjhao|समझाओ|মানে|விளக்கு)/i.test(message) && terms.length > 0) {
    return "understand_term" as const;
  }

  if (/(safe|safety|insured|surakshit|নিরাপদ|பாதுகாப்பு)/i.test(message)) {
    return "check_safety" as const;
  }

  if (/(compare|best|highest|rate|fd)/i.test(normalized)) {
    return "compare_rates" as const;
  }

  return "general_fd" as const;
}

function detectIntentHeuristically(input: {
  message: string;
  requestedAmount?: number;
  requestedTenorMonths?: number;
  seniorCitizen?: boolean;
  bankType?: BankTypeFilter;
}) {
  const termsToExplain = detectTerms(input.message);
  const amount = input.requestedAmount ?? extractAmount(input.message);
  const tenorMonths =
    input.requestedTenorMonths ?? extractTenorMonths(input.message);

  return detectedIntentSchema.parse({
    objective: inferObjective(input.message, termsToExplain),
    amount,
    tenorMonths,
    bankType:
      input.bankType ??
      (/small finance/i.test(input.message)
        ? "small-finance"
        : /public/i.test(input.message)
          ? "public"
          : /private/i.test(input.message)
            ? "private"
            : "all"),
    seniorCitizen:
      input.seniorCitizen ??
      /(senior citizen|senior|वरिष्ठ|বয়স্ক|மூத்த குடிமகன்)/i.test(input.message),
    termsToExplain,
    wantsBooking: /(book|open fd|apply|start|redirect)/i.test(input.message),
  });
}

async function detectIntentNode(state: typeof agentState.State) {
  const latestMessage = state.messages.at(-1);
  const messageText = getMessageText(latestMessage?.content);

  const heuristicIntent = detectIntentHeuristically({
    message: messageText,
    requestedAmount: state.requestedAmount,
    requestedTenorMonths: state.requestedTenorMonths,
    seniorCitizen: state.seniorCitizen,
    bankType: state.bankType,
  });

  if (!hasLlmConfig) {
    return { intent: heuristicIntent };
  }

  const prompt: LlmMessage[] = [
    {
      role: "system",
      content:
        "You extract structured user intent for a fixed deposit advisor. Return raw JSON only with keys objective, amount, tenorMonths, bankType, seniorCitizen, termsToExplain, wantsBooking. Use null for unknown amount or tenorMonths. bankType must be one of all, public, private, small-finance.",
    },
    {
      role: "user",
      content: `Message: ${messageText}\nHeuristic guess: ${JSON.stringify(
        heuristicIntent
      )}`,
    },
  ];

  try {
    const llmResponse = await invokeLlm(prompt, {
      temperature: 0,
      maxTokens: 500,
    });
    const parsed = llmResponse
      ? safeJsonParse(llmResponse, detectedIntentSchema)
      : null;

    if (!parsed) {
      return { intent: heuristicIntent };
    }

    return {
      intent: {
        ...parsed,
        amount: parsed.amount ?? heuristicIntent.amount,
        tenorMonths: parsed.tenorMonths ?? heuristicIntent.tenorMonths,
        termsToExplain: Array.from(
          new Set([...heuristicIntent.termsToExplain, ...parsed.termsToExplain])
        ),
      },
    };
  } catch {
    return { intent: heuristicIntent };
  }
}

async function assembleResponseNode(state: typeof agentState.State) {
  const intent = state.intent ?? detectIntentHeuristically({ message: "" });
  const amount = intent.amount ?? state.requestedAmount ?? DEFAULT_AMOUNT;
  const tenorMonths =
    intent.tenorMonths ?? state.requestedTenorMonths ?? DEFAULT_TENOR_MONTHS;
  const language = (state.language ?? "hi") as AppLanguage;

  const response = await buildDeterministicAdvisorResponse({
    language,
    amount,
    tenorMonths,
    seniorCitizen: intent.seniorCitizen || state.seniorCitizen,
    bankType: intent.bankType,
    glossaryTermIds: intent.termsToExplain,
    wantsBooking:
      intent.wantsBooking ||
      intent.objective === "book_fd" ||
      intent.objective === "kyc_help",
  });

  return { response };
}

async function narrateNode(state: typeof agentState.State) {
  const response = state.response;
  const language = (state.language ?? "hi") as AppLanguage;

  if (!response) {
    const fallback = await buildDeterministicAdvisorResponse({
      language,
      amount: DEFAULT_AMOUNT,
      tenorMonths: DEFAULT_TENOR_MONTHS,
      glossaryTermIds: ["pa", "tenor", "dicgc"],
    });

    return {
      response: fallback,
      messages: [new AIMessage(fallback.text)],
    };
  }

  if (!hasLlmConfig) {
    return {
      messages: [new AIMessage(response.text)],
    };
  }

  const recentMessages = state.messages
    .slice(-6)
    .map((message) => ({
      role: getMessageRole(message),
      content: getMessageText(message.content),
    }));

  const prompt: LlmMessage[] = [
    {
      role: "system",
      content:
        "You are Nivesh Saathi, a warm fixed deposit guide for India. Write in the user's requested language, keep the tone simple, do not invent rates, and return raw JSON only with keys text, followUpPrompt, warnings.",
    },
    {
      role: "user",
      content: JSON.stringify({
        language,
        recentMessages,
        structuredResponse: {
          rateCards: response.rateCards,
          glossary: response.glossary,
          bookingSteps: response.bookingSteps,
          warnings: response.warnings,
        },
      }),
    },
  ];

  try {
    const llmResponse = await invokeLlm(prompt, {
      temperature: 0.2,
      maxTokens: 900,
    });
    const parsed = llmResponse ? safeJsonParse(llmResponse, narrativeSchema) : null;

    if (!parsed) {
      return {
        messages: [new AIMessage(response.text)],
      };
    }

    const finalResponse: AdvisorResponse = {
      ...response,
      text: parsed.text,
      followUpPrompt: parsed.followUpPrompt ?? response.followUpPrompt,
      warnings: parsed.warnings ?? response.warnings,
    };

    return {
      response: finalResponse,
      messages: [new AIMessage(finalResponse.text)],
    };
  } catch {
    return {
      messages: [new AIMessage(response.text)],
    };
  }
}

const advisorGraph = new StateGraph(agentState)
  .addNode("detect_intent", detectIntentNode)
  .addNode("assemble_response", assembleResponseNode)
  .addNode("narrate", narrateNode)
  .addEdge(START, "detect_intent")
  .addEdge("detect_intent", "assemble_response")
  .addEdge("assemble_response", "narrate")
  .addEdge("narrate", END)
  .compile({ checkpointer });

export async function invokeFdAdvisor(input: ChatRequest) {
  const threadId = input.threadId || crypto.randomUUID();

  const result = await advisorGraph.invoke(
    {
      messages: [new HumanMessage(input.message)],
      language: input.language,
      requestedAmount: input.amount,
      requestedTenorMonths: input.tenorMonths,
      seniorCitizen: input.seniorCitizen,
      bankType: input.bankType,
    },
    {
      configurable: {
        thread_id: threadId,
      },
    }
  );

  return {
    threadId,
    response: result.response ?? (await buildDeterministicAdvisorResponse({
      language: input.language,
      amount: input.amount ?? DEFAULT_AMOUNT,
      tenorMonths: input.tenorMonths ?? DEFAULT_TENOR_MONTHS,
      seniorCitizen: input.seniorCitizen,
      bankType: input.bankType,
      glossaryTermIds: ["pa", "tenor", "dicgc"],
    })),
  };
}
