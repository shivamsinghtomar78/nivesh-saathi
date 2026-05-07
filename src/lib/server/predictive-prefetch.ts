import { createHash } from "node:crypto";
import { z } from "zod";

import { FD_RATES, type FDRate } from "@/lib/fd-data";
import {
  advisorUiSchema,
  appLanguageSchema,
  bankTypeFilterSchema,
  chatCompareSnapshotSchema,
  chatLadderPlanSchema,
  type AdvisorResponse,
  type AdvisorUi,
  type AppLanguage,
  type BankTypeFilter,
  type ConversationalUiMode,
} from "@/lib/server/advisor-schemas";
import { cacheGet, cacheSet } from "@/lib/server/cache";
import { buildDeterministicAdvisorResponse } from "@/lib/server/fd-service";

const DEFAULT_AMOUNT = 100000;
const DEFAULT_TENOR_MONTHS = 12;
const PREFETCH_TTL_SECONDS = 120;

export const predictivePrefetchRequestSchema = z.object({
  transcript: z.string().trim().min(2).max(1000),
  language: appLanguageSchema.default("en"),
  turnId: z.string().trim().min(1).max(100),
  sequence: z.number().int().nonnegative(),
  threadId: z.string().trim().optional(),
  shortlistBankIds: z.array(z.string().trim().min(1)).max(10).optional(),
  ladderPlan: chatLadderPlanSchema.optional(),
  compareSnapshot: chatCompareSnapshotSchema.optional(),
});

export type PredictivePrefetchRequest = z.infer<typeof predictivePrefetchRequestSchema>;

export type PredictionConfidence = "low" | "medium" | "high";

export type PredictedIntent =
  | "compare_banks"
  | "calculate_returns"
  | "ask_rates"
  | "tax_question"
  | "senior_citizen"
  | "investment_duration"
  | "best_bank"
  | "safety"
  | "general";

export type BankEntity = {
  bankId: string;
  bankName: string;
  bankCode: string;
};

export type PredictiveIntent = {
  transcript: string;
  normalizedTranscript: string;
  intent: PredictedIntent;
  confidence: PredictionConfidence;
  confidenceScore: number;
  ui: AdvisorUi;
  entities: BankEntity[];
  amount?: number;
  tenorMonths?: number;
  comparisonTenors: number[];
  seniorCitizen: boolean;
  bankType: BankTypeFilter;
};

export type PredictivePrefetchData = {
  filters: {
    amount: number;
    tenorMonths: number;
    seniorCitizen: boolean;
    bankType: BankTypeFilter;
    bankIds: string[];
  };
  rateCards: AdvisorResponse["rateCards"];
  portfolioSplit?: AdvisorResponse["portfolioSplit"];
  warnings: string[];
  sourceAsOf?: string;
};

export type PredictivePrefetchResult = {
  turnId: string;
  sequence: number;
  prefetchKey: string;
  cacheHit: boolean;
  prediction: PredictiveIntent;
  ui: AdvisorUi;
  data: PredictivePrefetchData;
  advisorResponse?: AdvisorResponse;
};

type CachedPredictivePrefetch = Omit<PredictivePrefetchResult, "cacheHit">;

const BANK_ALIASES: Record<string, string[]> = {
  "au-sfb": ["au", "au bank", "au small finance", "au small finance bank"],
  hdfc: ["hdfc", "hdfc bank"],
  sbi: ["sbi", "state bank", "state bank of india"],
  kotak: ["kotak", "kotak bank", "kotak mahindra", "kotak mahindra bank"],
  icici: ["icici", "icici bank"],
  axis: ["axis", "axis bank"],
  pnb: ["pnb", "punjab national", "punjab national bank"],
  bob: ["bob", "baroda", "bank of baroda"],
};

function normalizeTranscript(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.%]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashPayload(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 28);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseNumber(value: string) {
  return Number(value.replaceAll(",", ""));
}

export function extractPredictiveAmount(transcript: string) {
  const normalized = transcript
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.,%]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const unitMatch = normalized.match(
    /\b(\d[\d,]*(?:\.\d+)?)\s*(lakh|laakh|lac|crore)\b/
  );
  if (unitMatch) {
    const amount = parseNumber(unitMatch[1]);
    return Math.round(
      amount * (/crore/.test(unitMatch[2]) ? 10000000 : 100000)
    );
  }

  const currencyMatch = normalized.match(
    /\b(?:rs|inr|rupees?|rupay|rupaye)\s*(\d[\d,]*(?:\.\d+)?)\b/
  );
  if (currencyMatch) return Math.round(parseNumber(currencyMatch[1]));

  const plain = normalized.match(/\b(\d{5,8})\b/);
  return plain ? Math.round(parseNumber(plain[1])) : undefined;
}

export function extractPredictiveTenors(transcript: string) {
  const normalized = normalizeTranscript(transcript);
  const tenors: number[] = [];

  for (const match of normalized.matchAll(
    /\b(\d{1,2})\s*(year|years|yr|yrs|saal|aandu|samvatsaram|samvatsaralu)\b/g
  )) {
    tenors.push(Number(match[1]) * 12);
  }

  for (const match of normalized.matchAll(
    /\b(\d{1,3})\s*(month|months|mo|mahine|maadham|nelalu)\b/g
  )) {
    tenors.push(Number(match[1]));
  }

  return Array.from(new Set(tenors)).filter((value) => value > 0);
}

function detectBankEntities(transcript: string, rates: FDRate[] = FD_RATES) {
  const normalized = normalizeTranscript(transcript);
  const found = new Map<string, BankEntity>();

  for (const rate of rates) {
    const aliases = new Set([
      rate.id,
      rate.bankCode,
      rate.bankName,
      rate.bankNameHi,
      ...(BANK_ALIASES[rate.id] ?? []),
    ]);

    for (const alias of aliases) {
      const candidate = normalizeTranscript(alias);
      if (!candidate) continue;
      const pattern = new RegExp(`(^|\\s)${escapeRegExp(candidate)}(?=\\s|$)`, "i");
      if (!pattern.test(normalized)) continue;

      found.set(rate.id, {
        bankId: rate.id,
        bankName: rate.bankName,
        bankCode: rate.bankCode,
      });
      break;
    }
  }

  return Array.from(found.values());
}

function inferBankType(transcript: string): BankTypeFilter {
  if (/small finance|sfb/.test(transcript)) return "small-finance";
  if (/public|psu|government|sarkari/.test(transcript)) return "public";
  if (/private/.test(transcript)) return "private";
  return "all";
}

function scoreToConfidence(score: number): PredictionConfidence {
  if (score >= 0.74) return "high";
  if (score >= 0.42) return "medium";
  return "low";
}

function inferIntent(params: {
  normalizedTranscript: string;
  entities: BankEntity[];
  comparisonTenors: number[];
}) {
  const { comparisonTenors, entities, normalizedTranscript } = params;
  const hasCompare = /\b(compare|vs|versus|between|against|better)\b/.test(
    normalizedTranscript
  );
  const hasTop = /\b(top|best|highest|recommend|suggest|which bank)\b/.test(
    normalizedTranscript
  );
  const hasCalculator =
    /\b(calculate|calculator|maturity|return|interest earned|kitni|how much)\b/.test(
      normalizedTranscript
    );
  const hasRate = /\b(fd|fixed deposit|rate|rates|interest)\b/.test(normalizedTranscript);
  const hasSenior = /\b(senior|senior citizen|elder|varishth)\b/.test(
    normalizedTranscript
  );
  const hasTax = /\b(tax|tds|80c|deduction)\b/.test(normalizedTranscript);
  const hasSafety = /\b(safe|safety|insured|dicgc|risk)\b/.test(normalizedTranscript);
  const hasAnalytics = /\b(breakdown|split|portfolio|trend|history|timeline)\b/.test(
    normalizedTranscript
  );

  if (hasTax) return "tax_question" as const;
  if (hasSafety) return "safety" as const;
  if (hasSenior) return "senior_citizen" as const;
  if (hasCompare || entities.length >= 2 || comparisonTenors.length >= 2) {
    return "compare_banks" as const;
  }
  if (hasCalculator) return "calculate_returns" as const;
  if (hasTop) return "best_bank" as const;
  if (comparisonTenors.length === 1) return "investment_duration" as const;
  if (hasAnalytics) return "ask_rates" as const;
  if (hasRate) return "ask_rates" as const;
  return "general" as const;
}

function uiModeForIntent(intent: PredictedIntent, transcript: string): ConversationalUiMode {
  if (/breakdown|split|portfolio|trend|history|timeline/.test(transcript)) {
    return "analytics";
  }
  if (intent === "compare_banks") return "comparison";
  if (intent === "calculate_returns") return "calculator";
  if (intent === "best_bank" || intent === "ask_rates" || intent === "senior_citizen") {
    return "recommendation";
  }
  if (intent === "tax_question" || intent === "safety" || intent === "investment_duration") {
    return "exploration";
  }
  return transcript.length < 6 ? "onboarding" : "conversational";
}

function buildUi(params: {
  intent: PredictedIntent;
  normalizedTranscript: string;
  entities: BankEntity[];
  confidence: PredictionConfidence;
  prefetchKey?: string;
}): AdvisorUi {
  const { confidence, entities, intent, normalizedTranscript, prefetchKey } = params;
  const mode = uiModeForIntent(intent, normalizedTranscript);
  const visualizations: AdvisorUi["visualizations"] = [];
  const componentHints: string[] = [];

  if (mode === "comparison") {
    visualizations.push("comparison_table", "rate_cards", "maturity_chart");
    componentHints.push("side-by-side bank comparison", "animated yield deltas");
  } else if (mode === "calculator") {
    visualizations.push("calculator", "maturity_chart");
    componentHints.push("interactive principal and tenor controls");
  } else if (mode === "recommendation") {
    visualizations.push("recommendation_cards", "rate_cards");
    componentHints.push("ranked top FD options", "safety and source reminders");
  } else if (mode === "analytics") {
    visualizations.push("insight_panel", "portfolio_split", "trend_chart");
    componentHints.push("portfolio-style analysis", "timeline visualization");
  } else if (mode === "exploration") {
    visualizations.push("insight_panel");
    componentHints.push("plain-language context panel");
  }

  return advisorUiSchema.parse({
    mode,
    expand: mode !== "conversational" && mode !== "onboarding",
    entities: entities.map((entity) => entity.bankName),
    dataType:
      intent === "calculate_returns"
        ? "maturity_projection"
        : intent === "tax_question"
          ? "tax"
          : intent === "safety"
            ? "bank_safety"
            : mode === "analytics"
              ? "portfolio"
              : intent === "general"
                ? "general"
                : "fd_rates",
    visualizations,
    componentHints,
    actionButtons:
      mode === "calculator"
        ? [
            {
              label: "Adjust calculator",
              type: "primary",
              action: "run_calculator",
            },
          ]
        : mode === "comparison"
          ? [
              {
                label: "Compare more rates",
                type: "primary",
                action: "open_compare",
              },
            ]
          : [],
    prefetchKey,
    confidence,
  });
}

export function classifyPredictiveIntent(input: {
  transcript: string;
  language?: AppLanguage;
  rates?: FDRate[];
}): PredictiveIntent {
  const transcript = input.transcript.trim();
  const normalizedTranscript = normalizeTranscript(transcript);
  const entities = detectBankEntities(normalizedTranscript, input.rates);
  const amount = extractPredictiveAmount(normalizedTranscript);
  const comparisonTenors = extractPredictiveTenors(normalizedTranscript);
  const tenorMonths = comparisonTenors[0];
  const seniorCitizen = /\b(senior|senior citizen|varishth)\b/.test(normalizedTranscript);
  const bankType = inferBankType(normalizedTranscript);
  const intent = inferIntent({ normalizedTranscript, entities, comparisonTenors });

  let score = 0.12;
  if (/\bfd|fixed deposit|rate|interest|bank\b/.test(normalizedTranscript)) score += 0.22;
  if (/\b(compare|vs|top|best|highest|calculate|maturity|return)\b/.test(normalizedTranscript)) {
    score += 0.25;
  }
  if (entities.length > 0) score += Math.min(0.24, entities.length * 0.12);
  if (amount) score += 0.08;
  if (tenorMonths) score += 0.08;
  if (normalizedTranscript.split(" ").length >= 4) score += 0.08;

  const confidenceScore = Math.min(0.98, Number(score.toFixed(2)));
  const confidence = scoreToConfidence(confidenceScore);
  const ui = buildUi({
    intent,
    normalizedTranscript,
    entities,
    confidence,
  });

  return {
    transcript,
    normalizedTranscript,
    intent,
    confidence,
    confidenceScore,
    ui,
    entities,
    amount,
    tenorMonths,
    comparisonTenors,
    seniorCitizen,
    bankType,
  };
}

function buildStablePrefetchKey(params: {
  userId: string;
  prediction: PredictiveIntent;
  shortlistBankIds?: string[];
}) {
  return `predictive-prefetch:${hashPayload({
    userId: params.userId,
    intent: params.prediction.intent,
    mode: params.prediction.ui.mode,
    amount: params.prediction.amount ?? DEFAULT_AMOUNT,
    tenorMonths: params.prediction.tenorMonths ?? DEFAULT_TENOR_MONTHS,
    seniorCitizen: params.prediction.seniorCitizen,
    bankType: params.prediction.bankType,
    bankIds: params.prediction.entities.map((entity) => entity.bankId).sort(),
    shortlistBankIds: [...(params.shortlistBankIds ?? [])].sort(),
  })}`;
}

function buildPrefetchData(params: {
  response: AdvisorResponse;
  prediction: PredictiveIntent;
}) {
  return {
    filters: {
      amount: params.prediction.amount ?? DEFAULT_AMOUNT,
      tenorMonths: params.prediction.tenorMonths ?? DEFAULT_TENOR_MONTHS,
      seniorCitizen: params.prediction.seniorCitizen,
      bankType: params.prediction.bankType,
      bankIds: params.prediction.entities.map((entity) => entity.bankId),
    },
    rateCards: params.response.rateCards,
    portfolioSplit: params.response.portfolioSplit,
    warnings: params.response.warnings,
    sourceAsOf: params.response.rateCards[0]?.asOf,
  } satisfies PredictivePrefetchData;
}

export async function preparePredictivePrefetch(params: {
  userId: string;
  input: PredictivePrefetchRequest;
}): Promise<PredictivePrefetchResult> {
  const prediction = classifyPredictiveIntent({
    transcript: params.input.transcript,
    language: params.input.language,
  });
  const prefetchKey = buildStablePrefetchKey({
    userId: params.userId,
    prediction,
    shortlistBankIds: params.input.shortlistBankIds,
  });

  const cached = await cacheGet<CachedPredictivePrefetch>(prefetchKey);
  if (cached) {
    return {
      ...cached,
      turnId: params.input.turnId,
      sequence: params.input.sequence,
      cacheHit: true,
    };
  }

  const preferredBankIds =
    prediction.entities.length > 0
      ? prediction.entities.map((entity) => entity.bankId)
      : params.input.shortlistBankIds;
  const response =
    prediction.confidence === "low"
      ? await buildDeterministicAdvisorResponse({
          language: params.input.language,
          amount: DEFAULT_AMOUNT,
          tenorMonths: DEFAULT_TENOR_MONTHS,
          preferredBankIds,
          glossaryTermIds: ["pa", "tenor", "dicgc"],
        })
      : await buildDeterministicAdvisorResponse({
          language: params.input.language,
          amount: prediction.amount ?? DEFAULT_AMOUNT,
          tenorMonths: prediction.tenorMonths ?? DEFAULT_TENOR_MONTHS,
          seniorCitizen: prediction.seniorCitizen,
          bankType: prediction.bankType,
          preferredBankIds,
          glossaryTermIds: ["pa", "tenor", "dicgc"],
        });

  const ui = {
    ...prediction.ui,
    prefetchKey,
  };
  const result: CachedPredictivePrefetch = {
    turnId: params.input.turnId,
    sequence: params.input.sequence,
    prefetchKey,
    prediction: {
      ...prediction,
      ui,
    },
    ui,
    data: buildPrefetchData({ response, prediction }),
    advisorResponse: {
      ...response,
      ui,
    },
  };

  await cacheSet(prefetchKey, result, PREFETCH_TTL_SECONDS);

  return {
    ...result,
    cacheHit: false,
  };
}

export async function getCachedPredictivePrefetch(prefetchKey?: string) {
  if (!prefetchKey) return null;
  return cacheGet<CachedPredictivePrefetch>(prefetchKey);
}

export function buildAdvisorUiFromResponse(params: {
  message: string;
  response: AdvisorResponse;
  hint?: Partial<AdvisorUi>;
  prefetchKey?: string;
}) {
  const prediction = classifyPredictiveIntent({ transcript: params.message });
  const hintMode = params.hint?.mode;
  const mode =
    hintMode ??
    (params.response.showCalculator
      ? "calculator"
      : params.response.showTimeMachine || params.response.portfolioSplit
        ? "analytics"
        : prediction.ui.mode);

  return advisorUiSchema.parse({
    ...prediction.ui,
    ...params.hint,
    mode,
    expand:
      params.hint?.expand ??
      (mode !== "conversational" &&
        mode !== "onboarding" &&
        ((params.response.rateCards?.length ?? 0) > 0 ||
          Boolean(params.response.portfolioSplit) ||
          Boolean(params.response.showCalculator) ||
          Boolean(params.response.showTimeMachine))),
    entities:
      params.hint?.entities && params.hint.entities.length > 0
        ? params.hint.entities
        : prediction.entities.map((entity) => entity.bankName),
    visualizations:
      params.hint?.visualizations && params.hint.visualizations.length > 0
        ? params.hint.visualizations
        : buildUi({
            intent: prediction.intent,
            normalizedTranscript: prediction.normalizedTranscript,
            entities: prediction.entities,
            confidence: prediction.confidence,
          }).visualizations,
    prefetchKey: params.prefetchKey ?? params.hint?.prefetchKey,
    confidence: params.hint?.confidence ?? prediction.confidence,
  });
}
