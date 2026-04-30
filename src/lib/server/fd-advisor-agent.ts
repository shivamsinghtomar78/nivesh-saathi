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

import { cacheGet, cacheSet } from "@/lib/server/cache";
import {
  advisorResponseSchema,
  type AdvisorResponse,
  type AppLanguage,
  type BankTypeFilter,
  type ChatRequest,
  type ConversationMode,
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
    "general_fd",
  ]),
  amount: z.number().int().positive().nullable(),
  tenorMonths: z.number().int().positive().nullable(),
  bankType: z.enum(["all", "public", "private", "small-finance"]),
  seniorCitizen: z.boolean(),
  termsToExplain: z.array(z.string()),
});

const narrativeSchema = z.object({
  text: z.string().min(1),
  followUpPrompt: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});

const agentState = new StateSchema({
  messages: MessagesValue,
  language: z.enum(["en", "hi", "ta", "bn"]).optional(),
  mode: z.enum(["chat", "voice"]).optional(),
  requestedAmount: z.number().optional(),
  requestedTenorMonths: z.number().optional(),
  seniorCitizen: z.boolean().optional(),
  bankType: z.enum(["all", "public", "private", "small-finance"]).optional(),
  shortlistBankIds: z.array(z.string()).optional(),
  intent: detectedIntentSchema.optional(),
  response: advisorResponseSchema.optional(),
});

// Custom persistence via Upstash/Redis cache

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

  if (/(p\.a\.|per annum|prati varsh|oru aandukku|proti bochor)/i.test(message)) {
    terms.push("pa");
  }
  if (/(tenor|tenure|avadhi|meyad|kaalam)/i.test(message)) {
    terms.push("tenor");
  }
  if (/(tds|tax deducted)/i.test(normalized)) {
    terms.push("tds");
  }
  if (/(dicgc|insured|insurance|safe|surakshit|nirapod|paadhukaappu)/i.test(message)) {
    terms.push("dicgc");
  }
  if (/(small finance|small-finance)/i.test(message)) {
    terms.push("small-finance-bank");
  }
  if (/(maturity|paripakwata)/i.test(message)) {
    terms.push("maturity");
  }
  if (/(compound|chakravriddhi|koottu vatti)/i.test(message)) {
    terms.push("compound-interest");
  }
  if (/(kyc|aadhaar|aadhar|pan)/i.test(normalized)) {
    terms.push("kyc");
  }

  return terms;
}

function extractAmount(message: string) {
  const normalizedMessage = message.replace(/[०-९০-৯௧-௯]/g, (match) => {
    const charCode = match.charCodeAt(0);
    if (charCode >= 0x0966 && charCode <= 0x096F) return String(charCode - 0x0966);
    if (charCode >= 0x09E6 && charCode <= 0x09EF) return String(charCode - 0x09E6);
    if (charCode >= 0x0BE6 && charCode <= 0x0BEF) return String(charCode - 0x0BE6);
    return match;
  });

  const explicitCurrencyMatch =
    normalizedMessage.match(/(?:\u20b9|rs\.?|inr|rupees?|rupay|rupaye|₹)\s*([0-9][0-9,]*)/i) ??
    normalizedMessage.match(/([0-9][0-9,]*)\s*(?:rupees?|rupay|rupaye|lakh|laakh)/i);

  if (!explicitCurrencyMatch) {
    const lakhMatch = normalizedMessage.match(/(\d+)\s*(lakh|laakh)/i);
    if (lakhMatch) {
      return Number(lakhMatch[1]) * 100000;
    }
    return null;
  }

  return Number(explicitCurrencyMatch[1].replaceAll(",", ""));
}

function extractTenorMonths(message: string) {
  const monthMatch = message.match(/(\d+)\s*(?:month|months|mo|mahine|maadham|mash)/i);
  if (monthMatch) {
    return Number(monthMatch[1]);
  }

  const yearMatch = message.match(/(\d+)\s*(?:year|years|yr|yrs|saal|aandu|bochor)/i);
  if (yearMatch) {
    return Number(yearMatch[1]) * 12;
  }

  return null;
}

function inferObjective(message: string, terms: string[]) {
  const normalized = message.toLowerCase();

  if (
    /(what is|explain|samjhao|vilakk|bujhiye|meaning|matlab)/i.test(message) &&
    terms.length > 0
  ) {
    return "understand_term" as const;
  }

  if (/(safe|safety|insured|surakshit|nirapod|paadhukaappu)/i.test(message)) {
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
      /(senior citizen|senior|varishth|boyoshko|mooththa)/i.test(input.message),
    termsToExplain,
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

  return { intent: heuristicIntent };
}

async function assembleResponseNode(state: typeof agentState.State) {
  const intent = state.intent ?? detectIntentHeuristically({ message: "" });
  const amount = intent.amount ?? state.requestedAmount ?? DEFAULT_AMOUNT;
  const tenorMonths =
    intent.tenorMonths ?? state.requestedTenorMonths ?? DEFAULT_TENOR_MONTHS;
  const language = (state.language ?? "en") as AppLanguage;

  const response = await buildDeterministicAdvisorResponse({
    language,
    amount,
    tenorMonths,
    seniorCitizen: intent.seniorCitizen || state.seniorCitizen,
    bankType: intent.bankType,
    preferredBankIds: state.shortlistBankIds,
    glossaryTermIds: intent.termsToExplain,
  });

  return { response };
}

/**
 * Generate smart follow-up chip suggestions based on response content.
 */
function generateSuggestedChips(response: AdvisorResponse, language: AppLanguage): string[] {
  const chips: string[] = [];
  const isHindi = language === "hi";

  if (response.rateCards.length > 0) {
    chips.push(
      isHindi ? "Senior citizen rate batao" : "Show senior citizen rates",
      isHindi ? "Kaunsa bank sabse safe hai?" : "Which bank is safest?",
    );
  }

  if (response.glossary.length > 0) {
    chips.push(
      isHindi ? "Aur example dijiye" : "Give me a real example",
    );
  }

  if (response.rateCards.length === 0 && response.glossary.length === 0) {
    chips.push(
      isHindi ? "FD rates compare karo" : "Compare FD rates",
      isHindi ? "Maturity kitni hogi?" : "Calculate my maturity",
    );
  }

  return chips.slice(0, 3);
}

/**
 * Detect if the response content is better suited for a different mode.
 * E.g., data-heavy rate comparisons should suggest switching to chat from voice.
 */
function detectModeSwitchSuggestion(
  response: AdvisorResponse,
  currentMode: ConversationMode,
  language: AppLanguage
): AdvisorResponse["modeSwitchSuggestion"] {
  // In voice mode, suggest switching to chat for data-heavy responses
  if (currentMode === "voice" && response.rateCards.length > 1) {
    return {
      targetMode: "chat",
      reason: language === "hi"
        ? "Rates compare karne ke liye chat mode better rahega — table dikhega."
        : "This comparison has detailed data — switch to chat to see the full table.",
    };
  }

  // In chat mode, suggest voice for simple Q&A
  if (
    currentMode === "chat" &&
    response.rateCards.length === 0 &&
    response.glossary.length <= 1 &&
    response.text.length < 150
  ) {
    return {
      targetMode: "voice",
      reason: language === "hi"
        ? "Is tarah ke sawaalon ke liye voice mode try kijiye — zyada natural lagega."
        : "For quick questions like this, try voice mode — it feels more natural.",
    };
  }

  return undefined;
}

async function narrateNode(state: typeof agentState.State) {
  const response = state.response;
  const language = (state.language ?? "en") as AppLanguage;
  const mode = (state.mode ?? "chat") as ConversationMode;

  if (!response) {
    const fallback = await buildDeterministicAdvisorResponse({
      language,
      amount: DEFAULT_AMOUNT,
      tenorMonths: DEFAULT_TENOR_MONTHS,
      preferredBankIds: state.shortlistBankIds,
      glossaryTermIds: ["pa", "tenor", "dicgc"],
    });

    // Enrich with smart chips and mode-switch
    fallback.suggestedChips = generateSuggestedChips(fallback, language);
    fallback.modeSwitchSuggestion = detectModeSwitchSuggestion(fallback, mode, language);

    return {
      response: fallback,
      messages: [new AIMessage(fallback.text)],
    };
  }

  if (!hasLlmConfig) {
    // Enrich response before returning
    response.suggestedChips = generateSuggestedChips(response, language);
    response.modeSwitchSuggestion = detectModeSwitchSuggestion(response, mode, language);

    return {
      messages: [new AIMessage(response.text)],
    };
  }

  const recentMessages = state.messages.slice(-6).map((message) => ({
    role: getMessageRole(message),
    content: getMessageText(message.content),
  }));

  let languagePrompt = "If language is en, answer in English only.";
  if (language === "hi") languagePrompt = "You MUST answer entirely in conversational Hindi.";
  if (language === "ta") languagePrompt = "You MUST answer entirely in conversational Tamil.";
  if (language === "bn") languagePrompt = "You MUST answer entirely in conversational Bengali.";

  // P0: Response length adaptation — voice gets concise, chat gets rich
  const modeInstruction = mode === "voice"
    ? "IMPORTANT: This response will be SPOKEN ALOUD. Keep it under 3 sentences maximum. Use simple, conversational phrasing. Do NOT use bullet points, headings, or structured formatting. Speak as if talking to a friend. If there are multiple rate cards, mention only the top 1-2."
    : "Structure text with short labelled sections and hyphen bullets. You may be detailed.";

  const prompt: LlmMessage[] = [
    {
      role: "system",
      content:
        `You are Nivesh Saathi, a warm fixed deposit guide for India. Keep the tone simple, do not invent rates, do not mention internal tools, and return raw JSON only with keys text, followUpPrompt, warnings. Use plain text only: no markdown bold markers, no asterisks, and no tables. ${modeInstruction} ${languagePrompt}`,
    },
    {
      role: "user",
      content: JSON.stringify({
        language,
        mode,
        recentMessages,
        structuredResponse: {
          rateCards: response.rateCards,
          glossary: response.glossary,
          warnings: response.warnings,
        },
      }),
    },
  ];

  try {
    const llmResponse = await invokeLlm(prompt, {
      temperature: 0.2,
      maxTokens: mode === "voice" ? 300 : 900,
    });
    const parsed = llmResponse ? safeJsonParse(llmResponse, narrativeSchema) : null;

    if (!parsed) {
      response.suggestedChips = generateSuggestedChips(response, language);
      response.modeSwitchSuggestion = detectModeSwitchSuggestion(response, mode, language);
      return {
        messages: [new AIMessage(response.text)],
      };
    }

    // Rate hallucination check
    const mentionedRates = parsed.text.match(/\b\d+\.\d{1,2}%\b/g);
    if (mentionedRates) {
      const validRates = response.rateCards.map((c) => `${c.rateValue.toFixed(2)}%`);
      const hasHallucination = mentionedRates.some((r) => !validRates.includes(r));
      if (hasHallucination) {
        response.suggestedChips = generateSuggestedChips(response, language);
        response.modeSwitchSuggestion = detectModeSwitchSuggestion(response, mode, language);
        return {
          messages: [new AIMessage(response.text)],
        };
      }
    }

    const finalResponse: AdvisorResponse = {
      ...response,
      text: parsed.text,
      followUpPrompt: parsed.followUpPrompt ?? response.followUpPrompt,
      warnings: parsed.warnings ?? response.warnings,
      suggestedChips: generateSuggestedChips(response, language),
      modeSwitchSuggestion: detectModeSwitchSuggestion(response, mode, language),
    };

    return {
      response: finalResponse,
      messages: [new AIMessage(finalResponse.text)],
    };
  } catch {
    response.suggestedChips = generateSuggestedChips(response, language);
    response.modeSwitchSuggestion = detectModeSwitchSuggestion(response, mode, language);
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
  .compile();

type ThreadPreferences = {
  amount?: number;
  tenorMonths?: number;
  seniorCitizen?: boolean;
  bankType?: BankTypeFilter;
};

export async function invokeFdAdvisor(input: ChatRequest) {
  const threadId = input.threadId || crypto.randomUUID();
  const historyKey = `chat_history:${threadId}`;
  const prefsKey = `chat_prefs:${threadId}`;
  
  const [rawHistory, cachedPrefs] = await Promise.all([
    cacheGet<Array<{ role: string; content: string }>>(historyKey),
    cacheGet<ThreadPreferences>(prefsKey)
  ]);
  
  const prefs = cachedPrefs || {};
  let historyMessages = rawHistory || [];
  
  // Context summarization: truncate if > 6
  if (historyMessages.length > 6) {
    const recent = historyMessages.slice(-6);
    const summary = "Previous context summarized: User was discussing FDs.";
    historyMessages = [
      { role: "assistant", content: summary },
      ...recent
    ];
  }
  
  const history = historyMessages.map((msg) =>
    msg.role === "user" ? new HumanMessage(msg.content) : new AIMessage(msg.content)
  );

  const result = await advisorGraph.invoke(
    {
      messages: [...history, new HumanMessage(input.message)],
      language: input.language,
      mode: input.mode ?? "chat",
      requestedAmount: input.amount ?? prefs.amount,
      requestedTenorMonths: input.tenorMonths ?? prefs.tenorMonths,
      seniorCitizen: input.seniorCitizen ?? prefs.seniorCitizen,
      bankType: input.bankType ?? prefs.bankType,
      shortlistBankIds: input.shortlistBankIds,
    },
    {
      configurable: {
        thread_id: threadId,
      },
    }
  );

  const newHistory = (result.messages || []).map((m: unknown) => ({
    role: getMessageRole(m),
    content: getMessageText((m as { content?: unknown }).content),
  }));
  await cacheSet(historyKey, newHistory, 86400 * 5); // 5 days persistence
  
  if (result.intent) {
    const newPrefs = {
      amount: result.intent.amount ?? prefs.amount,
      tenorMonths: result.intent.tenorMonths ?? prefs.tenorMonths,
      seniorCitizen: result.intent.seniorCitizen ?? prefs.seniorCitizen,
      bankType: result.intent.bankType ?? prefs.bankType,
    };
    await cacheSet(prefsKey, newPrefs, 86400 * 5);
  }

  return {
    threadId,
    response:
      result.response ??
      (await buildDeterministicAdvisorResponse({
        language: input.language,
        amount: input.amount ?? DEFAULT_AMOUNT,
        tenorMonths: input.tenorMonths ?? DEFAULT_TENOR_MONTHS,
        seniorCitizen: input.seniorCitizen,
        bankType: input.bankType,
        preferredBankIds: input.shortlistBankIds,
        glossaryTermIds: ["pa", "tenor", "dicgc"],
      })),
  };
}
