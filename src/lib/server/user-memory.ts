import type {
  AdvisorResponse,
  AppLanguage,
  BankTypeFilter,
} from "@/lib/server/advisor-schemas";
import { formatCurrency } from "@/lib/utils";

export type MemoryBankSnapshot = {
  bankId: string;
  bankName: string;
  rate?: string;
  tenorMonths?: number;
  maturityPreview?: string;
  consideredAt: string;
};

export type UserMemory = {
  uid: string;
  investmentGoals?: string;
  preferredTenorMonths?: number;
  riskTolerance?: "safety_first" | "balanced" | "yield_first" | string;
  bankTypePreference?: BankTypeFilter;
  pastBanksConsidered?: string[];
  lastRecommendedBanks?: MemoryBankSnapshot[];
  seniorCitizen?: boolean;
  amount?: number;
  compactSummary?: string;
  lastThreadId?: string;
  lastAskedAt?: string;
  lastUserMessage?: string;
  lastAssistantSummary?: string;
  interactionCount?: number;
  languagePreference?: AppLanguage;
  lastVoiceFlow?: {
    status: "started" | "recommended" | "booking_started" | "kyc_handoff" | "completed";
    updatedAt: string;
    lastTranscript?: string;
  };
  bookingDraft?: {
    draftId: string;
    bankId: string;
    bankName: string;
    amount: number;
    tenorMonths: number;
    rate: string;
    maturityAmount: number;
    status: "draft" | "confirmed" | "kyc_handoff" | "completed";
    updatedAt: string;
  };
  kycHandoffState?: {
    status: "not_started" | "ready" | "handoff_shown" | "completed";
    draftId?: string;
    updatedAt: string;
  };
  themePreference?: "light" | "dark" | "system";
  updatedAt: string;
};

const MEMORY_TOKEN_BUDGET = 500;
const APPROX_CHARS_PER_TOKEN = 4;
const MAX_MEMORY_CHARS = MEMORY_TOKEN_BUDGET * APPROX_CHARS_PER_TOKEN;

function trimText(value: string | undefined, maxLength: number) {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength
    ? `${cleaned.slice(0, maxLength - 1).trim()}...`
    : cleaned;
}

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  );
}

function humanizeGoal(goal?: string) {
  if (!goal) return undefined;
  return goal.replace(/_/g, " ");
}

function inferGoal(message: string, existingGoal?: string) {
  if (/(tax|80c|tax saver|tax-saving)/i.test(message)) return "tax_saving";
  if (/(emergency|liquid|liquidity|break|withdraw)/i.test(message)) {
    return "emergency_fund";
  }
  if (/(safe|safety|public bank|sbi|dicgc|insured)/i.test(message)) {
    return "safe_returns";
  }
  if (/(grow|growth|wealth|highest|best return|maximum return|yield)/i.test(message)) {
    return "wealth_creation";
  }
  return existingGoal;
}

function inferRiskTolerance(message: string, bankType?: BankTypeFilter, existing?: string) {
  if (/(safe|safety|public bank|sbi|dicgc|insured|low risk)/i.test(message)) {
    return "safety_first";
  }
  if (
    bankType === "small-finance" ||
    /(highest|maximum|best return|yield|small finance)/i.test(message)
  ) {
    return "yield_first";
  }
  return existing ?? "balanced";
}

export function buildCompactMemorySummary(memory: Partial<UserMemory>) {
  const parts = [
    memory.investmentGoals
      ? `Goal: ${humanizeGoal(memory.investmentGoals)}`
      : undefined,
    memory.amount ? `Typical amount: ${formatCurrency(memory.amount)}` : undefined,
    memory.preferredTenorMonths
      ? `Preferred tenor: ${memory.preferredTenorMonths} months`
      : undefined,
    memory.riskTolerance
      ? `Risk preference: ${memory.riskTolerance.replace(/_/g, " ")}`
      : undefined,
    memory.bankTypePreference && memory.bankTypePreference !== "all"
      ? `Bank type preference: ${memory.bankTypePreference.replace("-", " ")}`
      : undefined,
    typeof memory.seniorCitizen === "boolean"
      ? `Senior citizen: ${memory.seniorCitizen ? "yes" : "no"}`
      : undefined,
    memory.languagePreference ? `Language: ${memory.languagePreference}` : undefined,
    memory.bookingDraft
      ? `Booking draft: ${memory.bookingDraft.bankName} ${memory.bookingDraft.rate} for ${formatCurrency(memory.bookingDraft.amount)}`
      : undefined,
    memory.lastRecommendedBanks?.[0]
      ? `Last top FD discussed: ${memory.lastRecommendedBanks[0].bankName}${
          memory.lastRecommendedBanks[0].rate
            ? ` at ${memory.lastRecommendedBanks[0].rate}`
            : ""
        }${
          memory.lastRecommendedBanks[0].tenorMonths
            ? ` for ${memory.lastRecommendedBanks[0].tenorMonths} months`
            : ""
        }${
          memory.lastRecommendedBanks[0].maturityPreview
            ? ` (${memory.lastRecommendedBanks[0].maturityPreview})`
            : ""
        }`
      : undefined,
    memory.pastBanksConsidered?.length
      ? `Banks considered: ${memory.pastBanksConsidered.slice(0, 8).join(", ")}`
      : undefined,
    memory.lastUserMessage
      ? `Last user ask: ${trimText(memory.lastUserMessage, 180)}`
      : undefined,
  ].filter(Boolean);

  return trimText(parts.join(". "), MAX_MEMORY_CHARS);
}

export function buildMemoryPromptContext(memory: UserMemory | null): string {
  if (!memory) return "";
  const summary = memory.compactSummary ?? buildCompactMemorySummary(memory);
  if (!summary) return "";

  const context = [
    "Persistent user memory. Use this as private context; do not claim certainty beyond it.",
    summary,
    "If the user is greeting, vague, or asking for recommendations, briefly acknowledge the remembered context.",
  ].join(" ");

  return trimText(context, MAX_MEMORY_CHARS) ?? "";
}

export function shouldSurfaceMemoryRecall(params: {
  message: string;
  memory: UserMemory | null | undefined;
  explicitAmount?: number | null;
  explicitTenorMonths?: number | null;
}) {
  const { explicitAmount, explicitTenorMonths, memory, message } = params;
  const hasUsableMemory = Boolean(
    memory?.compactSummary ||
      memory?.lastRecommendedBanks?.length ||
      memory?.investmentGoals ||
      memory?.amount ||
      memory?.preferredTenorMonths ||
      memory?.pastBanksConsidered?.length
  );

  if (!hasUsableMemory) {
    return false;
  }

  const normalized = message.toLowerCase().trim();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const isGreeting = /^(hi|hii|hello|hey|namaste|namaskar|hola)$/i.test(normalized);
  const isVagueFdAsk = /(best fd|recommend|suggest|which fd|safe fd|highest rate)/i.test(
    normalized
  );

  return (
    isGreeting ||
    isVagueFdAsk ||
    (wordCount <= 5 && (!explicitAmount || !explicitTenorMonths))
  );
}

export function buildMemoryRecallLine(memory: UserMemory, language: AppLanguage) {
  const topBank = memory.lastRecommendedBanks?.[0];
  const amount = memory.amount ? formatCurrency(memory.amount) : null;
  const tenor = memory.preferredTenorMonths
    ? `${memory.preferredTenorMonths} months`
    : null;

  if (language === "hi" || language === "hinglish") {
    return [
      "Welcome back.",
      amount || tenor
        ? `Mujhe yaad hai aap ${amount ?? "apni amount"} ko ${tenor ?? "preferred tenor"} ke liye dekh rahe the.`
        : "Mujhe aapka pichhla FD context yaad hai.",
      topBank
        ? `Last top option ${topBank.bankName}${topBank.rate ? ` (${topBank.rate})` : ""} tha.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (language === "te") {
    return [
      "Welcome back.",
      amount || tenor
        ? `Meeru ${amount ?? "mee saved amount"} ni ${tenor ?? "mee preferred tenor"} kosam chustunnaru ani naaku gurthu undi.`
        : "Mee previous FD context naaku gurthu undi.",
      topBank
        ? `Last time, ${topBank.bankName}${topBank.rate ? ` at ${topBank.rate}` : ""} top option ga discuss chesam.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    "Welcome back.",
    amount || tenor
      ? `I remember you were looking at ${amount ?? "your saved amount"} for ${tenor ?? "your preferred tenor"}.`
      : "I remember your previous FD context.",
    topBank
      ? `Last time, ${topBank.bankName}${topBank.rate ? ` at ${topBank.rate}` : ""} was the top option we discussed.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildMemoryUpdateFromTurn(params: {
  existingMemory: UserMemory | null;
  userId: string;
  threadId: string;
  language: AppLanguage;
  userMessage: string;
  assistantMessage: string;
  response?: AdvisorResponse;
  amount?: number;
  tenorMonths?: number;
  seniorCitizen?: boolean;
  bankType?: BankTypeFilter;
}): UserMemory {
  const now = new Date().toISOString();
  const {
    amount,
    assistantMessage,
    bankType,
    existingMemory,
    response,
    seniorCitizen,
    tenorMonths,
    threadId,
    userId,
    userMessage,
  } = params;
  const bankSnapshots =
    response?.rateCards.slice(0, 3).map((card) => ({
      bankId: card.bankId,
      bankName: card.bankName,
      rate: card.rate,
      tenorMonths: card.tenorMonths,
      maturityPreview: card.maturityPreview,
      consideredAt: now,
    })) ?? [];
  const nextPastBanks = uniqueValues([
    ...bankSnapshots.map((bank) => bank.bankId),
    ...(existingMemory?.pastBanksConsidered ?? []),
  ]).slice(0, 10);

  const nextMemory: UserMemory = {
    uid: userId,
    investmentGoals: inferGoal(userMessage, existingMemory?.investmentGoals),
    preferredTenorMonths: tenorMonths ?? existingMemory?.preferredTenorMonths,
    riskTolerance: inferRiskTolerance(
      userMessage,
      bankType,
      existingMemory?.riskTolerance
    ),
    bankTypePreference:
      bankType && bankType !== "all"
        ? bankType
        : existingMemory?.bankTypePreference,
    pastBanksConsidered: nextPastBanks,
    lastRecommendedBanks:
      bankSnapshots.length > 0
        ? bankSnapshots
        : existingMemory?.lastRecommendedBanks,
    seniorCitizen: seniorCitizen ?? existingMemory?.seniorCitizen,
    amount: amount ?? existingMemory?.amount,
    lastThreadId: threadId,
    lastAskedAt: now,
    lastUserMessage: trimText(userMessage, 280),
    lastAssistantSummary: trimText(assistantMessage, 420),
    interactionCount: (existingMemory?.interactionCount ?? 0) + 1,
    languagePreference: params.language,
    lastVoiceFlow: existingMemory?.lastVoiceFlow,
    bookingDraft: existingMemory?.bookingDraft,
    kycHandoffState: existingMemory?.kycHandoffState,
    themePreference: existingMemory?.themePreference,
    updatedAt: now,
  };

  nextMemory.compactSummary = buildCompactMemorySummary(nextMemory);
  return nextMemory;
}

export function sanitizeMemoryForFirestore<T extends Record<string, unknown>>(
  value: T
): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}
