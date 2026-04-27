import { calculateMaturity } from "@/lib/maturity";
import { FD_RATES, type FDRate } from "@/lib/fd-data";
import { formatCurrency } from "@/lib/utils";
import {
  type AdvisorAction,
  type AdvisorRateCard,
  type AdvisorResponse,
  type AppLanguage,
  type BankTypeFilter,
  type FDRatesQuery,
} from "@/lib/server/advisor-schemas";
import { cacheGet, cacheSet } from "@/lib/server/cache";
import { resolveGlossary } from "@/lib/server/jargon-catalog";

const SIX_HOURS_IN_SECONDS = 60 * 60 * 6;

const LOCALIZED_COPY: Record<
  AppLanguage,
  {
    compareLabel: string;
    bookLabel: string;
    explainLabel: string;
    kycLabel: string;
    followUp: string;
    noMatch: string;
    safety: string;
  }
> = {
  en: {
    compareLabel: "Compare more options",
    bookLabel: "Start booking",
    explainLabel: "Explain a term",
    kycLabel: "Show KYC steps",
    followUp: "Tell me your amount or preferred tenure and I will narrow this down further.",
    noMatch: "I could not find a matching FD in the current rate list.",
    safety: "Deposits up to Rs 5 lakh per bank are protected by DICGC.",
  },
  hi: {
    compareLabel: "और options compare करें",
    bookLabel: "Booking शुरू करें",
    explainLabel: "Term समझाएं",
    kycLabel: "KYC steps दिखाएं",
    followUp: "राशि या अवधि बताइए, मैं options और छोटा करके बता दूंगा.",
    noMatch: "मौजूदा rate list में इस filter के लिए FD नहीं मिली.",
    safety: "एक बैंक में Rs 5 लाख तक की जमा राशि DICGC से सुरक्षित रहती है.",
  },
  ta: {
    compareLabel: "மேலும் options பார்க்க",
    bookLabel: "Booking தொடங்கு",
    explainLabel: "Term விளக்கம்",
    kycLabel: "KYC படிகள்",
    followUp: "தொகை அல்லது காலத்தை சொல்லுங்கள், நான் இன்னும் சரியாக தேர்வு செய்து தருகிறேன்.",
    noMatch: "இந்த filter-க்கு தற்போதைய பட்டியலில் பொருத்தமான FD கிடைக்கவில்லை.",
    safety: "ஒரு வங்கிக்கு Rs 5 லட்சம் வரை வைப்பு DICGC பாதுகாப்பில் இருக்கும்.",
  },
  bn: {
    compareLabel: "আরও option তুলনা করুন",
    bookLabel: "Booking শুরু করুন",
    explainLabel: "Term বুঝিয়ে দিন",
    kycLabel: "KYC ধাপ দেখান",
    followUp: "আপনার পরিমাণ বা মেয়াদ বলুন, আমি আরও ঠিকমতো বেছে দেব.",
    noMatch: "এই filter-এর জন্য বর্তমান তালিকায় মানানসই FD পাওয়া গেল না.",
    safety: "একটি ব্যাংকে Rs 5 লাখ পর্যন্ত আমানত DICGC সুরক্ষায় থাকে.",
  },
};

const BANK_BOOKING_LABELS: Record<NonNullable<FDRate["badge"]>, string> = {
  "best-value": "Best Value",
  popular: "Popular",
  "safe-choice": "Safe Choice",
};

function buildRatesCacheKey(query: FDRatesQuery) {
  return [
    "fd-rates",
    query.bankId ?? "all-banks",
    query.tenorMonths ?? "all",
    query.amount ?? "all",
    query.bankType ?? "all",
    query.seniorCitizen ? "senior" : "regular",
    query.limit ?? "all",
  ].join(":");
}

export function getApplicableRate(rate: FDRate, seniorCitizen?: boolean) {
  return seniorCitizen ? rate.seniorRate : rate.regularRate;
}

export async function getFDRates(query: FDRatesQuery = {}) {
  const cacheKey = buildRatesCacheKey(query);
  const cached = await cacheGet<FDRate[]>(cacheKey);
  if (cached) {
    return cached;
  }

  let filtered = [...FD_RATES];

  if (query.bankId) {
    filtered = filtered.filter((rate) => rate.id === query.bankId);
  }

  if (query.tenorMonths) {
    filtered = filtered.filter(
      (rate) =>
        rate.tenorMinMonths <= query.tenorMonths! &&
        rate.tenorMaxMonths >= query.tenorMonths!
    );
  }

  if (query.amount) {
    filtered = filtered.filter(
      (rate) => rate.minAmount <= query.amount! && rate.maxAmount >= query.amount!
    );
  }

  if (query.bankType && query.bankType !== "all") {
    filtered = filtered.filter((rate) => rate.bankType === query.bankType);
  }

  filtered.sort(
    (left, right) =>
      getApplicableRate(right, query.seniorCitizen) -
      getApplicableRate(left, query.seniorCitizen)
  );

  if (query.limit) {
    filtered = filtered.slice(0, query.limit);
  }

  await cacheSet(cacheKey, filtered, SIX_HOURS_IN_SECONDS);
  return filtered;
}

export function getBankById(bankId: string) {
  return FD_RATES.find((rate) => rate.id === bankId) ?? null;
}

export function formatTenorLabel(months: number, language: AppLanguage) {
  const years = months / 12;

  if (months < 12) {
    if (language === "hi") {
      return `${months} महीने`;
    }
    if (language === "ta") {
      return `${months} மாதங்கள்`;
    }
    if (language === "bn") {
      return `${months} মাস`;
    }
    return `${months} months`;
  }

  if (Number.isInteger(years)) {
    if (language === "hi") {
      return `${years} साल`;
    }
    if (language === "ta") {
      return `${years} ஆண்டு`;
    }
    if (language === "bn") {
      return `${years} বছর`;
    }
    return `${years} year${years > 1 ? "s" : ""}`;
  }

  return `${months} months`;
}

export function createAdvisorRateCard(params: {
  rate: FDRate;
  amount: number;
  tenorMonths: number;
  language: AppLanguage;
  seniorCitizen?: boolean;
}): AdvisorRateCard {
  const { amount, language, rate, tenorMonths, seniorCitizen } = params;
  const applicableRate = getApplicableRate(rate, seniorCitizen);
  const maturity = calculateMaturity({
    principal: amount,
    ratePercent: applicableRate,
    tenorMonths,
    compounding: rate.compounding,
  });

  return {
    bankId: rate.id,
    bankName: rate.bankName,
    bankNameLocal:
      language === "hi" && rate.bankNameHi ? rate.bankNameHi : rate.bankName,
    bankType: rate.bankType,
    rate: `${applicableRate.toFixed(2)}% p.a.`,
    rateValue: applicableRate,
    tenorMonths,
    tenorLabel: formatTenorLabel(tenorMonths, language),
    maturityAmount: maturity.maturityAmount,
    interestEarned: maturity.interestEarned,
    minAmount: rate.minAmount,
    maxAmount: rate.maxAmount,
    maturityPreview: `${formatCurrency(amount)} -> ${formatCurrency(
      maturity.maturityAmount
    )}`,
    badge: rate.badge ? BANK_BOOKING_LABELS[rate.badge] : undefined,
    safetyNote: LOCALIZED_COPY[language].safety,
  };
}

export function buildKycSteps(
  language: AppLanguage,
  bankName: string,
  amount: number
) {
  if (language === "hi") {
    return [
      `${bankName} में FD खोलने के लिए PAN और Aadhaar साथ रखें.`,
      "अगर KYC पूरा नहीं है, तो nearest branch में verification कराएं.",
      `${formatCurrency(amount)} जमा करने से पहले tenure और payout option confirm करें.`,
      "Receipt या FD advice जरूर लें.",
    ];
  }

  if (language === "ta") {
    return [
      `${bankName} FD தொடங்க PAN மற்றும் Aadhaar தயார் வைத்துக்கொள்ளுங்கள்.`,
      "KYC முடியவில்லை என்றால் அருகிலுள்ள branch-ல் verification செய்யுங்கள்.",
      `${formatCurrency(amount)} செலுத்துவதற்கு முன் tenure மற்றும் payout option சரிபார்க்கவும்.`,
      "Receipt அல்லது FD advice எடுத்துக்கொள்ளுங்கள்.",
    ];
  }

  if (language === "bn") {
    return [
      `${bankName} FD খুলতে PAN এবং Aadhaar সঙ্গে রাখুন.`,
      "KYC সম্পূর্ণ না থাকলে নিকটস্থ branch-এ verification করুন.",
      `${formatCurrency(amount)} জমা দেওয়ার আগে tenure এবং payout option ঠিক করুন.`,
      "Receipt বা FD advice অবশ্যই নিন.",
    ];
  }

  return [
    `Keep your PAN and Aadhaar ready before opening the FD with ${bankName}.`,
    "If KYC is incomplete, finish verification at the nearest branch first.",
    `Confirm the tenure and payout option before depositing ${formatCurrency(
      amount
    )}.`,
    "Collect the receipt or FD advice for your records.",
  ];
}

export function buildAdvisorActions(params: {
  language: AppLanguage;
  topBankId?: string;
  glossaryTermId?: string;
}): AdvisorAction[] {
  const { glossaryTermId, language, topBankId } = params;
  const copy = LOCALIZED_COPY[language];

  return [
    {
      label: copy.compareLabel,
      type: "secondary",
      action: "open_compare",
      icon: "compare_arrows",
      url: "/compare",
    },
    {
      label: copy.bookLabel,
      type: "primary",
      action: "start_booking",
      icon: "add_task",
      bankId: topBankId,
      url: topBankId ? `/book?bank=${encodeURIComponent(topBankId)}` : "/book",
    },
    {
      label: copy.explainLabel,
      type: "secondary",
      action: "explain_term",
      icon: "school",
      termId: glossaryTermId,
    },
    {
      label: copy.kycLabel,
      type: "secondary",
      action: "open_kyc_help",
      icon: "verified_user",
    },
  ];
}

export function buildFallbackText(params: {
  language: AppLanguage;
  amount: number;
  tenorMonths: number;
  rateCards: AdvisorRateCard[];
}) {
  const { amount, language, rateCards, tenorMonths } = params;
  const topCard = rateCards[0];

  if (!topCard) {
    return LOCALIZED_COPY[language].noMatch;
  }

  if (language === "hi") {
    return `${topCard.bankName} ${formatTenorLabel(
      tenorMonths,
      language
    )} के लिए सबसे मजबूत option दिख रहा है. ${formatCurrency(
      amount
    )} पर maturity लगभग ${formatCurrency(
      topCard.maturityAmount
    )} बन रही है. नीचे 3 आसान options और जरूरी terms की explanation दी है.`;
  }

  if (language === "ta") {
    return `${topCard.bankName} ${formatTenorLabel(
      tenorMonths,
      language
    )} காலத்திற்கு நல்ல option ஆக தெரிகிறது. ${formatCurrency(
      amount
    )} மீது maturity சுமார் ${formatCurrency(
      topCard.maturityAmount
    )} ஆகும். கீழே 3 option-களும் முக்கிய term விளக்கங்களும் கொடுத்துள்ளேன்.`;
  }

  if (language === "bn") {
    return `${topCard.bankName} ${formatTenorLabel(
      tenorMonths,
      language
    )} মেয়াদের জন্য ভালো option মনে হচ্ছে. ${formatCurrency(
      amount
    )} এ maturity প্রায় ${formatCurrency(
      topCard.maturityAmount
    )} হবে. নিচে 3টি option আর দরকারি term-এর সহজ ব্যাখ্যা দিলাম.`;
  }

  return `${topCard.bankName} looks strongest for a ${formatTenorLabel(
    tenorMonths,
    language
  )} FD. On ${formatCurrency(amount)}, the maturity is about ${formatCurrency(
    topCard.maturityAmount
  )}. I have added three easy options plus simple jargon help below.`;
}

export async function buildDeterministicAdvisorResponse(params: {
  language: AppLanguage;
  amount: number;
  tenorMonths: number;
  seniorCitizen?: boolean;
  bankType?: BankTypeFilter;
  glossaryTermIds: string[];
  wantsBooking?: boolean;
}) {
  const {
    amount,
    bankType,
    glossaryTermIds,
    language,
    seniorCitizen,
    tenorMonths,
    wantsBooking,
  } = params;

  const rates = await getFDRates({
    amount,
    tenorMonths,
    seniorCitizen,
    bankType,
    limit: 3,
  });

  const rateCards = rates.map((rate) =>
    createAdvisorRateCard({
      rate,
      amount,
      tenorMonths,
      language,
      seniorCitizen,
    })
  );

  const glossary = resolveGlossary(
    glossaryTermIds.length > 0 ? glossaryTermIds : ["pa", "tenor", "dicgc"],
    language
  );
  const actions = buildAdvisorActions({
    language,
    topBankId: rateCards[0]?.bankId,
    glossaryTermId: glossary[0]?.termId,
  });
  const bookingSteps =
    wantsBooking && rateCards[0]
      ? buildKycSteps(language, rateCards[0].bankName, amount)
      : [];

  const response: AdvisorResponse = {
    text: buildFallbackText({ language, amount, tenorMonths, rateCards }),
    rateCards,
    actions,
    glossary,
    bookingSteps,
    followUpPrompt: LOCALIZED_COPY[language].followUp,
    warnings: rateCards.length === 0 ? [LOCALIZED_COPY[language].noMatch] : [],
  };

  return response;
}
