import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  END,
  MessagesValue,
  START,
  StateGraph,
  StateSchema,
} from "@langchain/langgraph";
import { z } from "zod";

import { cacheGet, cacheSet } from "@/lib/server/cache";
import {
  advisorUiSchema,
  advisorResponseSchema,
  type AdvisorResponse,
  type AppLanguage,
  type BankTypeFilter,
  type ChatRequest,
  type ConversationMode,
} from "@/lib/server/advisor-schemas";
import { buildDeterministicAdvisorResponse } from "@/lib/server/fd-service";
import {
  buildAdvisorUiFromResponse,
  getCachedPredictivePrefetch,
} from "@/lib/server/predictive-prefetch";
import { hasLlmConfig } from "@/lib/server/env";
import { buildAdvisorAppContext } from "@/lib/server/advisor-context";
import { buildAssistantRetrievalContext } from "@/lib/server/assistant-memory";
import { getFdDashboard } from "@/lib/server/fd-tracker-service";
import { invokeLlm, type LlmMessage } from "@/lib/server/llm-client";
import { withTracing } from "@/lib/server/langsmith";
import { getUserMemory, updateUserMemory } from "@/lib/server/persistence";
import {
  buildMemoryPromptContext,
  buildMemoryRecallLine,
  buildMemoryUpdateFromTurn,
  shouldSurfaceMemoryRecall,
  type UserMemory,
} from "@/lib/server/user-memory";

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
  needsClarification: z.boolean(),
  clarificationChips: z.array(z.string()),
});

const narrativeSchema = z.object({
  text: z.string().min(1),
  followUpPrompt: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  showCalculator: z.boolean().optional(),
  showTimeMachine: z.boolean().optional(),
  tone: z.enum(["informative", "celebratory", "cautionary"]).optional(),
  ui: advisorUiSchema.partial().optional(),
});

const agentState = new StateSchema({
  messages: MessagesValue,
  language: z.enum(["en", "hi", "hinglish", "ta", "te"]).optional(),
  mode: z.enum(["chat", "voice"]).optional(),
  requestedAmount: z.number().optional(),
  requestedTenorMonths: z.number().optional(),
  seniorCitizen: z.boolean().optional(),
  bankType: z.enum(["all", "public", "private", "small-finance"]).optional(),
  shortlistBankIds: z.array(z.string()).optional(),
  appContext: z.string().optional(),
  intent: detectedIntentSchema.optional(),
  response: advisorResponseSchema.optional(),
  prefetchKey: z.string().optional(),
  uiIntentHint: advisorUiSchema.partial().optional(),
  userMemory: z.any().optional(),
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

  if (/(p\.a\.|per annum|prati varsh|oru aandukku|samvatsaraniki)/i.test(message)) {
    terms.push("pa");
  }
  if (/(tenor|tenure|avadhi|kaalam|avadhi|gaduvu)/i.test(message)) {
    terms.push("tenor");
  }
  if (/(tds|tax deducted)/i.test(normalized)) {
    terms.push("tds");
  }
  if (/(dicgc|insured|insurance|safe|surakshit|paadhukaappu|rakshana)/i.test(message)) {
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

function extractInvestmentAmount(message: string) {
  const parseNumber = (value: string) => Number(value.replaceAll(",", ""));
  const applyUnit = (value: number, unit?: string) => {
    if (!unit) return value;
    if (/^(lakh|laakh|lac)$/i.test(unit)) return value * 100000;
    if (/^crore$/i.test(unit)) return value * 10000000;
    return value;
  };

  const unitMatch = message.match(
    /([0-9][0-9,]*(?:\.\d+)?)\s*(lakh|laakh|lac|crore)\b/i
  );
  if (unitMatch) {
    return Math.round(applyUnit(parseNumber(unitMatch[1]), unitMatch[2]));
  }

  const prefixedCurrencyMatch = message.match(
    /(?:\u20b9|rs\.?|inr|rupees?|rupay|rupaye)\s*([0-9][0-9,]*(?:\.\d+)?)(?:\s*(lakh|laakh|lac|crore))?/i
  );
  if (prefixedCurrencyMatch) {
    return Math.round(
      applyUnit(parseNumber(prefixedCurrencyMatch[1]), prefixedCurrencyMatch[2])
    );
  }

  const suffixedCurrencyMatch = message.match(
    /([0-9][0-9,]*(?:\.\d+)?)\s*(?:rupees?|rupay|rupaye|inr)\b/i
  );
  return suffixedCurrencyMatch
    ? Math.round(parseNumber(suffixedCurrencyMatch[1]))
    : null;
}

function extractTenorMonths(message: string) {
  const monthMatch = message.match(/(\d+)\s*(?:month|months|mo|mahine|maadham|nelalu)/i);
  if (monthMatch) {
    return Number(monthMatch[1]);
  }

  const yearMatch = message.match(/(\d+)\s*(?:year|years|yr|yrs|saal|aandu|samvatsaram|samvatsaralu)/i);
  if (yearMatch) {
    return Number(yearMatch[1]) * 12;
  }

  return null;
}

function inferObjective(message: string, terms: string[]) {
  const normalized = message.toLowerCase();

  if (
    /(what is|explain|samjhao|vilakk|cheppandi|meaning|matlab)/i.test(message) &&
    terms.length > 0
  ) {
    return "understand_term" as const;
  }

  if (/(safe|safety|insured|surakshit|paadhukaappu|rakshana)/i.test(message)) {
    return "check_safety" as const;
  }

  if (/(compare|best|highest|rate|fd)/i.test(normalized)) {
    return "compare_rates" as const;
  }

  return "general_fd" as const;
}

function getClarificationChips(language: AppLanguage) {
  if (language === "hi") {
    return ["1 saal ke liye best FD", "Sabse safe bank", "Rs 5 lakh ka split plan"];
  }
  if (language === "hinglish") {
    return ["1 saal ke liye best FD", "Safest bank", "Rs 5 lakh split plan"];
  }
  if (language === "ta") {
    return ["Best 1 year FD", "Safest bank", "Rs 5 lakh split plan"];
  }
  if (language === "te") {
    return ["Best 1 year FD", "Safest bank", "Rs 5 lakh split plan"];
  }
  return ["Best 1 year FD", "Safest bank", "Split Rs 5 lakh safely"];
}

function needsIntentClarification(input: {
  message: string;
  objective: "compare_rates" | "understand_term" | "check_safety" | "general_fd";
  amount: number | null;
  tenorMonths: number | null;
}) {
  const normalized = input.message.toLowerCase().trim();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const isVagueAsk =
    /(best fd|safe investment|best investment|highest rate|fd rates?|which fd|kaunsi fd|best)/i.test(
      normalized
    ) || wordCount <= 4;

  return (
    isVagueAsk &&
    (input.objective === "compare_rates" || input.objective === "general_fd") &&
    (!input.amount || !input.tenorMonths)
  );
}

function detectIntentHeuristically(input: {
  message: string;
  requestedAmount?: number;
  requestedTenorMonths?: number;
  seniorCitizen?: boolean;
  bankType?: BankTypeFilter;
}) {
  const termsToExplain = detectTerms(input.message);
  const amount = input.requestedAmount ?? extractInvestmentAmount(input.message) ?? extractAmount(input.message);
  const tenorMonths =
    input.requestedTenorMonths ?? extractTenorMonths(input.message);
  const objective = inferObjective(input.message, termsToExplain);
  const clarificationNeeded = needsIntentClarification({
    message: input.message,
    objective,
    amount,
    tenorMonths,
  });

  return detectedIntentSchema.parse({
    objective,
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
    needsClarification: clarificationNeeded,
    clarificationChips: clarificationNeeded
      ? getClarificationChips("en")
      : [],
  });
}

const detectIntentNode = withTracing(async function detectIntentNode(state: typeof agentState.State) {
  const latestMessage = state.messages.at(-1);
  const messageText = getMessageText(latestMessage?.content);
  const language = (state.language ?? "en") as AppLanguage;

  const heuristicIntent = detectIntentHeuristically({
    message: messageText,
    requestedAmount: state.requestedAmount,
    requestedTenorMonths: state.requestedTenorMonths,
    seniorCitizen: state.seniorCitizen,
    bankType: state.bankType,
  });

  return {
    intent: {
      ...heuristicIntent,
      clarificationChips: heuristicIntent.needsClarification
        ? getClarificationChips(language)
        : [],
    },
  };
}, { name: "detect_intent", run_type: "chain" });

const assembleResponseNode = withTracing(async function assembleResponseNode(state: typeof agentState.State) {
  if (state.response) {
    return { response: state.response };
  }

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
}, { name: "assemble_response", run_type: "chain" });

/**
 * Generate smart follow-up chip suggestions based on response content.
 */
function generateSuggestedChips(response: AdvisorResponse, language: AppLanguage): string[] {
  const chips: string[] = [];
  const isHindi = language === "hi" || language === "hinglish";

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

function shouldShowCalculator(message: string) {
  return /(calculate|calculator|maturity|return|interest earned|kitni hogi|mature)/i.test(
    message
  );
}

function shouldShowTimeMachine(message: string) {
  return /(historical|history|trend|past rate|last year|time machine|rates higher)/i.test(
    message
  );
}

function getClarificationPrompt(language: AppLanguage) {
  if (language === "hi") {
    return "Goal choose kijiye: highest return, safest bank, ya amount-tenure based recommendation.";
  }
  if (language === "hinglish") {
    return "Goal choose kijiye: highest return, safest bank, ya amount-tenure based recommendation.";
  }
  if (language === "ta") {
    return "Highest return, safest bank, or amount-tenure recommendation - edhai paarkkalam?";
  }
  if (language === "te") {
    return "Highest return, safest bank, or amount-tenure recommendation - emi chudali?";
  }
  return "Choose a direction: highest return, safest bank, or a recommendation based on your amount and tenure.";
}

function applyMemoryRecall(params: {
  text: string;
  language: AppLanguage;
  messageText: string;
  intent?: z.infer<typeof detectedIntentSchema>;
  userMemory?: UserMemory | null;
}) {
  const { intent, language, messageText, text, userMemory } = params;
  if (
    !userMemory ||
    !shouldSurfaceMemoryRecall({
      message: messageText,
      memory: userMemory,
      explicitAmount: intent?.amount,
      explicitTenorMonths: intent?.tenorMonths,
    })
  ) {
    return text;
  }

  if (/welcome back|i remember|mujhe yaad/i.test(text)) {
    return text;
  }

  return `${buildMemoryRecallLine(userMemory, language)}\n\n${text}`;
}

function enrichResponse(params: {
  response: AdvisorResponse;
  language: AppLanguage;
  mode: ConversationMode;
  messageText: string;
  intent?: z.infer<typeof detectedIntentSchema>;
  prefetchKey?: string;
  uiIntentHint?: Partial<NonNullable<AdvisorResponse["ui"]>>;
  userMemory?: UserMemory | null;
}) {
  const {
    response,
    language,
    mode,
    messageText,
    intent,
    prefetchKey,
    uiIntentHint,
    userMemory,
  } = params;
  const clarificationChips =
    intent?.needsClarification && intent.clarificationChips.length > 0
      ? intent.clarificationChips
      : null;

  const baseResponse: AdvisorResponse = {
    ...response,
    text: applyMemoryRecall({
      text: response.text,
      language,
      messageText,
      intent,
      userMemory,
    }),
    followUpPrompt: intent?.needsClarification
      ? getClarificationPrompt(language)
      : response.followUpPrompt,
    showCalculator: response.showCalculator || shouldShowCalculator(messageText),
    showTimeMachine: response.showTimeMachine || shouldShowTimeMachine(messageText),
    suggestedChips: clarificationChips ?? generateSuggestedChips(response, language),
    modeSwitchSuggestion: detectModeSwitchSuggestion(response, mode, language),
    tone:
      response.warnings.length > 0
        ? ("cautionary" as const)
        : response.portfolioSplit
          ? ("celebratory" as const)
          : response.tone,
  };

  return {
    ...baseResponse,
    ui: buildAdvisorUiFromResponse({
      message: messageText,
      response: baseResponse,
      hint: uiIntentHint ?? response.ui,
      prefetchKey: prefetchKey ?? response.ui?.prefetchKey,
    }),
  } satisfies AdvisorResponse;
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
      reason: language === "hi" || language === "hinglish"
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
      reason: language === "hi" || language === "hinglish"
        ? "Is tarah ke sawaalon ke liye voice mode try kijiye — zyada natural lagega."
        : "For quick questions like this, try voice mode — it feels more natural.",
    };
  }

  return undefined;
}

const narrateNode = withTracing(async function narrateNode(state: typeof agentState.State) {
  const response = state.response;
  const language = (state.language ?? "en") as AppLanguage;
  const mode = (state.mode ?? "chat") as ConversationMode;
  const latestMessage = state.messages.at(-1);
  const messageText = getMessageText(latestMessage?.content);
  const userMemory = (state.userMemory ?? null) as UserMemory | null;

  if (!response) {
    const fallback = await buildDeterministicAdvisorResponse({
      language,
      amount: DEFAULT_AMOUNT,
      tenorMonths: DEFAULT_TENOR_MONTHS,
      preferredBankIds: state.shortlistBankIds,
      glossaryTermIds: ["pa", "tenor", "dicgc"],
    });

    const enrichedFallback = enrichResponse({
      response: fallback,
      language,
      mode,
      messageText,
      intent: state.intent,
      prefetchKey: state.prefetchKey,
      uiIntentHint: state.uiIntentHint,
      userMemory,
    });

    return {
      response: enrichedFallback,
      messages: [new AIMessage(enrichedFallback.text)],
    };
  }

  if (!hasLlmConfig) {
    const enrichedResponse = enrichResponse({
      response,
      language,
      mode,
      messageText,
      intent: state.intent,
      prefetchKey: state.prefetchKey,
      uiIntentHint: state.uiIntentHint,
      userMemory,
    });

    return {
      response: enrichedResponse,
      messages: [new AIMessage(enrichedResponse.text)],
    };
  }

  const recentMessages = state.messages.slice(-6).map((message) => ({
    role: getMessageRole(message),
    content: getMessageText(message.content),
  }));

  let languagePrompt = "If language is en, answer in English only.";
  if (language === "hi") languagePrompt = "You MUST answer entirely in conversational Hindi.";
  if (language === "hinglish") languagePrompt = "You MUST answer in natural Hinglish: simple English financial words with Hindi sentence flow, written in Latin script.";
  if (language === "ta") languagePrompt = "You MUST answer entirely in conversational Tamil.";
  if (language === "te") languagePrompt = "You MUST answer entirely in conversational Telugu.";

  // P0: Response length adaptation — voice gets concise, chat gets rich
  const modeInstruction = mode === "voice"
    ? "IMPORTANT: This response will be SPOKEN ALOUD. Keep it under 5 short sentences. Use simple, conversational phrasing. Do NOT use bullet points, headings, or structured formatting. Speak as if talking to a friend. If there are multiple rate cards, mention exactly the top 3 options with bank name, rate, tenure, maturity or return, and one safety note."
    : "Structure text with short labelled sections and hyphen bullets. You may be detailed.";

  const memoryContext = buildMemoryPromptContext(userMemory);
  const appContext = state.appContext
    ? `Read-only app context for this user: ${state.appContext} Use this when the user asks about their own saved FDs, dashboard, maturity timeline, ladder plan, shortlist, or recent comparisons. Do not expose this context as a dump; answer naturally and concisely.`
    : "";

  const prompt: LlmMessage[] = [
    {
      role: "system",
      content:
        `You are Nivesh Saathi, a warm fixed deposit guide for India. ${memoryContext ? `${memoryContext} ` : ""}${appContext ? `${appContext} ` : ""}Keep the tone simple, do not invent rates, do not mention internal tools, and return raw JSON only with keys text, followUpPrompt, warnings, showCalculator, showTimeMachine, tone, ui. The optional ui object may only describe layout intent, entities, visualizations, component hints, and actions; rates and math come only from structuredResponse. Use plain text only: no markdown bold markers, no asterisks, and no tables. ${modeInstruction} ${languagePrompt}\nSet showCalculator=true if the user asks to calculate returns, maturity, or uses words like 'calculator' or 'calculate'. Set showTimeMachine=true if the user asks for historical rate trends, past rates, or 'time machine'. Tone must be one of informative, celebratory, cautionary.`,
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

    const validateLlmResponse = withTracing(async (text: string | null) => {
      const parsed = text ? safeJsonParse(text, narrativeSchema) : null;
      if (!parsed) {
        throw new Error("JSON parse failure");
      }
      
      const mentionedRates = parsed.text.match(/\b\d+\.\d{1,2}%\b/g);
      if (mentionedRates) {
        const validRates = response.rateCards.map((card) => `${card.rateValue.toFixed(2)}%`);
        const hasHallucination = mentionedRates.some((rate) => !validRates.includes(rate));
        if (hasHallucination) {
          throw new Error("Hallucination fallback decision");
        }
      }
      
      return parsed;
    }, { name: "validate_llm_response", run_type: "parser" });

    const parsed = await validateLlmResponse(llmResponse);

    const finalResponse = enrichResponse({
      response: {
        ...response,
        text: parsed.text,
        followUpPrompt: parsed.followUpPrompt ?? response.followUpPrompt,
        warnings: parsed.warnings ?? response.warnings,
        showCalculator: parsed.showCalculator ?? false,
        showTimeMachine: parsed.showTimeMachine ?? false,
        tone: parsed.tone ?? response.tone,
        ui: parsed.ui ? advisorUiSchema.parse({ ...response.ui, ...parsed.ui }) : response.ui,
      },
      language,
      mode,
      messageText,
      intent: state.intent,
      prefetchKey: state.prefetchKey,
      uiIntentHint: state.uiIntentHint,
      userMemory,
    });

    return {
      response: finalResponse,
      messages: [new AIMessage(finalResponse.text)],
    };
  } catch {
    const enrichedResponse = enrichResponse({
      response,
      language,
      mode,
      messageText,
      intent: state.intent,
      prefetchKey: state.prefetchKey,
      uiIntentHint: state.uiIntentHint,
      userMemory,
    });
    return {
      response: enrichedResponse,
      messages: [new AIMessage(enrichedResponse.text)],
    };
  }
}, { name: "narrate", run_type: "chain" });

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

async function getSafeFdDashboard(userId?: string) {
  if (!userId) return null;

  try {
    return await getFdDashboard(userId);
  } catch {
    return null;
  }
}

export const invokeFdAdvisor = withTracing(async function invokeFdAdvisor(input: ChatRequest) {
  const threadId = input.threadId || crypto.randomUUID();
  const historyKey = `chat_history:${threadId}`;
  const prefsKey = `chat_prefs:${threadId}`;
  
  const [
    rawHistory,
    cachedPrefs,
    userMemory,
    dashboard,
    assistantContext,
    cachedPrefetch,
  ] = await Promise.all([
    cacheGet<Array<{ role: string; content: string }>>(historyKey),
    cacheGet<ThreadPreferences>(prefsKey),
    input.userId ? getUserMemory(input.userId) : Promise.resolve(null),
    getSafeFdDashboard(input.userId),
    input.userId
      ? buildAssistantRetrievalContext({
          userId: input.userId,
          conversationId: threadId,
          query: input.message,
        }).catch(() => null)
      : Promise.resolve(null),
    input.prefetchKey
      ? getCachedPredictivePrefetch(input.prefetchKey).catch(() => null)
      : Promise.resolve(null),
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

  const appContext = [
    buildAdvisorAppContext({
      dashboard,
      ladderPlan: input.ladderPlan,
      compareSnapshot: input.compareSnapshot,
    }),
    assistantContext?.context
      ? `Assistant retrieval context:\n${assistantContext.context}`
      : "",
    cachedPrefetch
      ? `Predictive prefetch context already prepared from interim speech. Intent: ${cachedPrefetch.prediction.intent}; confidence: ${cachedPrefetch.prediction.confidence}; filters: ${JSON.stringify(cachedPrefetch.data.filters)}; topCards: ${JSON.stringify(cachedPrefetch.data.rateCards.slice(0, 3).map((card) => ({
          bankName: card.bankName,
          rate: card.rate,
          maturityAmount: card.maturityAmount,
          tenorLabel: card.tenorLabel,
        })))}. Use this only as verified deterministic FD context.`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await advisorGraph.invoke(
    {
      messages: [...history, new HumanMessage(input.message)],
      language: input.language,
      mode: input.mode ?? "chat",
      requestedAmount:
        input.amount ?? cachedPrefetch?.data.filters.amount ?? prefs.amount ?? userMemory?.amount,
      requestedTenorMonths:
        input.tenorMonths ??
        cachedPrefetch?.data.filters.tenorMonths ??
        prefs.tenorMonths ??
        userMemory?.preferredTenorMonths,
      seniorCitizen:
        input.seniorCitizen ??
        cachedPrefetch?.data.filters.seniorCitizen ??
        prefs.seniorCitizen ??
        userMemory?.seniorCitizen,
      bankType:
        input.bankType ??
        cachedPrefetch?.data.filters.bankType ??
        prefs.bankType ??
        userMemory?.bankTypePreference,
      shortlistBankIds: input.shortlistBankIds ?? userMemory?.pastBanksConsidered,
      appContext,
      response: cachedPrefetch?.advisorResponse,
      prefetchKey: input.prefetchKey ?? cachedPrefetch?.prefetchKey,
      uiIntentHint: input.uiIntentHint ?? cachedPrefetch?.ui,
      userMemory,
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
  
  const newPrefs = result.intent
    ? {
        amount: result.intent.amount ?? prefs.amount,
        tenorMonths: result.intent.tenorMonths ?? prefs.tenorMonths,
        seniorCitizen: result.intent.seniorCitizen ?? prefs.seniorCitizen,
        bankType: result.intent.bankType ?? prefs.bankType,
      }
    : prefs;

  if (result.intent) {
    await cacheSet(prefsKey, newPrefs, 86400 * 5);
  }

  if (input.userId && result.response) {
    await updateUserMemory(
      input.userId,
      buildMemoryUpdateFromTurn({
        existingMemory: userMemory,
        userId: input.userId,
        threadId,
        language: input.language,
        userMessage: input.message,
        assistantMessage: result.response.text,
        response: result.response,
        amount: input.amount ?? newPrefs.amount ?? userMemory?.amount,
        tenorMonths:
          input.tenorMonths ??
          newPrefs.tenorMonths ??
          userMemory?.preferredTenorMonths,
        seniorCitizen:
          input.seniorCitizen ?? newPrefs.seniorCitizen ?? userMemory?.seniorCitizen,
        bankType: input.bankType ?? newPrefs.bankType ?? userMemory?.bankTypePreference,
      })
    );
  }

  const response =
    result.response ??
    (await buildDeterministicAdvisorResponse({
        language: input.language,
        amount: input.amount ?? newPrefs.amount ?? userMemory?.amount ?? DEFAULT_AMOUNT,
        tenorMonths:
          input.tenorMonths ??
          newPrefs.tenorMonths ??
          userMemory?.preferredTenorMonths ??
          DEFAULT_TENOR_MONTHS,
        seniorCitizen:
          input.seniorCitizen ?? newPrefs.seniorCitizen ?? userMemory?.seniorCitizen,
        bankType: input.bankType ?? newPrefs.bankType ?? userMemory?.bankTypePreference,
        preferredBankIds: input.shortlistBankIds ?? userMemory?.pastBanksConsidered,
        glossaryTermIds: ["pa", "tenor", "dicgc"],
      }));

  return {
    threadId,
    response: response.ui
      ? response
      : {
          ...response,
          ui: buildAdvisorUiFromResponse({
            message: input.message,
            response,
            hint: input.uiIntentHint ?? cachedPrefetch?.ui,
            prefetchKey: input.prefetchKey ?? cachedPrefetch?.prefetchKey,
          }),
        },
  };
}, { name: "invokeFdAdvisor", run_type: "chain" });
