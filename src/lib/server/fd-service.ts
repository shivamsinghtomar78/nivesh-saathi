import { FD_RATES, type FDRate } from "@/lib/fd-data";
import { buildAffiliateBookingUrl } from "@/lib/affiliate";
import { calculateMaturity } from "@/lib/maturity";
import { formatCurrency } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import {
  type AdvisorAction,
  type AdvisorRateCard,
  type AdvisorResponse,
  type AppLanguage,
  type BankTypeFilter,
  type FDRatesQuery,
  type PortfolioSplit,
  type PortfolioSplitAllocation,
} from "@/lib/server/advisor-schemas";
import { cacheGet, cacheSet } from "@/lib/server/cache";
import { resolveGlossary } from "@/lib/server/jargon-catalog";

const ONE_HOUR_IN_SECONDS = 60 * 60;
const RATES_CACHE_VERSION = "v2";

const LOCALIZED_COPY: Record<
  AppLanguage,
  {
    compareLabel: string;
    explainLabel: string;
    officialLabel: string;
    followUp: string;
    noMatch: string;
    safety: string;
  }
> = {
  en: {
    compareLabel: "Compare more rates",
    explainLabel: "Explain a term",
    officialLabel: "Official bank page",
    followUp:
      "Share your amount, tenure, or safety concern and I will narrow the options further.",
    noMatch: "I could not find a matching FD in the current rate list.",
    safety:
      "Deposits up to Rs 5 lakh per bank are typically protected by DICGC cover.",
  },
  hi: {
    compareLabel: "Aur rates compare kijiye",
    explainLabel: "Koi term samjhaiye",
    officialLabel: "Bank ki official site",
    followUp:
      "Rashi, avadhi ya suraksha concern batayiye, main aur theek options dikhaunga.",
    noMatch: "Is filter ke liye current list mein koi matching FD nahi mili.",
    safety:
      "Ek bank mein Rs 5 lakh tak ki deposit amount par aam taur par DICGC cover rehta hai.",
  },
  ta: {
    compareLabel: "Innum rates compare pannunga",
    explainLabel: "Oru term-ai vilakkunga",
    officialLabel: "Bank official page",
    followUp:
      "Thogai, tenure, allathu safety concern sollunga, naan innum sariyana options theruven.",
    noMatch: "Indha filter-kku porundhiya FD current list-il illai.",
    safety:
      "Oru bank-il Rs 5 lakh varai deposits-ku DICGC paadhukaappu irukkum.",
  },
  bn: {
    compareLabel: "Aro rate tulona korun",
    explainLabel: "Ekta term bujhiye din",
    officialLabel: "Banker official page",
    followUp:
      "Poriman, meyad ba safety niye bolun, ami aro bhalo kore chhoto kore option debo.",
    noMatch: "Ei filter-er jonno current list-e kono matching FD pelam na.",
    safety:
      "Ek bank-e Rs 5 lakh porjonto deposit-e sadharonoto DICGC cover thake.",
  },
};

const BADGE_LABELS: Record<NonNullable<FDRate["badge"]>, string> = {
  "best-value": "Best Value",
  popular: "Popular",
  "safe-choice": "Safe Choice",
};

function buildRatesCacheKey(query: FDRatesQuery) {
  return [
    "fd-rates",
    RATES_CACHE_VERSION,
    query.bankId ?? "all-banks",
    query.tenorMonths ?? "all",
    query.amount ?? "all",
    query.bankType ?? "all",
    query.seniorCitizen ? "senior" : "regular",
    query.limit ?? "all",
  ].join(":");
}

function withRuntimeRateDefaults(rate: FDRate): FDRate {
  return {
    ...rate,
    officialUrl:
      rate.officialUrl ||
      `https://www.google.com/search?q=${encodeURIComponent(
        `${rate.bankName} fixed deposit`
      )}`,
  };
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

  const adminRates = await cacheGet<FDRate[]>("admin:fd-rates");
  let filtered = adminRates ? [...adminRates] : [...FD_RATES];

  if (query.bankId) {
    filtered = filtered.filter((rate) => rate.id === query.bankId);
  }

  if (query.tenorMonths) {
    const tenorMonths = query.tenorMonths;
    filtered = filtered.filter(
      (rate) =>
        rate.tenorMinMonths <= tenorMonths && rate.tenorMaxMonths >= tenorMonths
    );
  }

  if (query.amount) {
    const amount = query.amount;
    filtered = filtered.filter(
      (rate) => rate.minAmount <= amount && rate.maxAmount >= amount
    );
  }

  if (query.bankType && query.bankType !== "all") {
    filtered = filtered.filter((rate) => rate.bankType === query.bankType);
  }

  // F-03 Personalised FD Ranking Algorithm
  const DICGC_LIMIT = 500000;
  
  filtered.sort((left, right) => {
    const rateLeft = getApplicableRate(left, query.seniorCitizen);
    const rateRight = getApplicableRate(right, query.seniorCitizen);
    
    // Base score is the interest rate itself (e.g. 7.5 = 7.5 points)
    let scoreLeft = rateLeft;
    let scoreRight = rateRight;

    // Weight 1: DICGC Safety (Penalize non-public banks if amount > 5L)
    if (query.amount && query.amount > DICGC_LIMIT) {
      if (left.bankType !== "public") scoreLeft -= 0.5;
      if (right.bankType !== "public") scoreRight -= 0.5;
    }

    // Weight 2: Bank Type Preference (Boost preferred bank type by 1.0)
    // Note: If query.bankType is set, we already filtered, but just in case we add this as a soft boost
    // if we change it to soft filtering later.
    
    // Weight 3: Badges (Boost best-value or popular)
    if (left.badge === "best-value") scoreLeft += 0.2;
    if (right.badge === "best-value") scoreRight += 0.2;
    if (left.badge === "safe-choice") scoreLeft += 0.1;
    if (right.badge === "safe-choice") scoreRight += 0.1;

    return scoreRight - scoreLeft;
  });

  if (query.limit) {
    filtered = filtered.slice(0, query.limit);
  }

  const normalized = filtered.map(withRuntimeRateDefaults);

  await cacheSet(cacheKey, normalized, ONE_HOUR_IN_SECONDS);
  return normalized;
}

export async function getBankById(bankId: string) {
  const adminRates = await cacheGet<FDRate[]>("admin:fd-rates");
  const dataset = adminRates ? adminRates : FD_RATES;
  return dataset.find((rate) => rate.id === bankId) ?? null;
}

export function formatTenorLabel(months: number, language: AppLanguage) {
  const years = months / 12;

  if (months < 12) {
    if (language === "hi") {
      return `${months} mahine`;
    }
    if (language === "ta") {
      return `${months} maadham`;
    }
    if (language === "bn") {
      return `${months} mash`;
    }
    return `${months} months`;
  }

  if (Number.isInteger(years)) {
    if (language === "hi") {
      return `${years} saal`;
    }
    if (language === "ta") {
      return `${years} aandu`;
    }
    if (language === "bn") {
      return `${years} bochor`;
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
    badge: rate.badge ? BADGE_LABELS[rate.badge] : undefined,
    safetyNote: LOCALIZED_COPY[language].safety,
    officialUrl: buildAffiliateBookingUrl(rate, "advisor_card"),
    sourceLabel: rate.sourceLabel,
    sourceUrl: rate.sourceUrl,
    asOf: rate.asOf,
  };
}

export function buildAdvisorActions(params: {
  language: AppLanguage;
  topRateCard?: AdvisorRateCard;
  glossaryTermId?: string;
}): AdvisorAction[] {
  const { glossaryTermId, language, topRateCard } = params;
  const copy = LOCALIZED_COPY[language];

  return [
    {
      label: copy.compareLabel,
      type: "primary",
      action: "open_compare",
      icon: "shield",
      url: ROUTES.COMPARE,
    },
    {
      label: copy.explainLabel,
      type: "secondary",
      action: "explain_term",
      icon: "book-open",
      termId: glossaryTermId,
    },
    ...(topRateCard
      ? [
          {
            label: copy.officialLabel,
            type: "secondary",
            action: "open_official_site",
            icon: "external-link",
            bankId: topRateCard.bankId,
            url: topRateCard.officialUrl,
          } satisfies AdvisorAction,
        ]
      : []),
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
    return `Summary:
- ${topCard.bankName} ${formatTenorLabel(
      tenorMonths,
      language
    )} ke liye sabse strong option dikh raha hai.

Top options:
- ${formatCurrency(
      amount
    )} par maturity lagbhag ${formatCurrency(
      topCard.maturityAmount
    )} ho sakti hai.
- Neeche 3 compare options aur simple jargon help di gayi hai.

Safety:
- Ek bank mein Rs 5 lakh tak ki deposit amount par aam taur par DICGC cover rehta hai.

Next step:
- Amount, tenure, ya safety concern batayiye aur main options aur narrow kar dunga.`;
  }

  if (language === "ta") {
    return `Summary:
- ${topCard.bankName} ${formatTenorLabel(
      tenorMonths,
      language
    )} kaalathukku nalla option-aa therigiradhu.

Top options:
- ${formatCurrency(
      amount
    )} meedhu maturity summaaru ${formatCurrency(
      topCard.maturityAmount
    )} aagum.
- Keezhe 3 compare options-um simple jargon help-um irukku.

Safety:
- Oru bank-il Rs 5 lakh varai deposits-ku DICGC paadhukaappu irukkum.

Next step:
- Thogai, tenure, allathu safety concern sollunga; naan options-ai innum narrow seyyuven.`;
  }

  if (language === "bn") {
    return `Summary:
- ${topCard.bankName} ${formatTenorLabel(
      tenorMonths,
      language
    )} meyader jonno bhalo option mone hocche.

Top options:
- ${formatCurrency(
      amount
    )} e maturity prai ${formatCurrency(
      topCard.maturityAmount
    )} hobe.
- Niche 3 ta compare option aar shohoj jargon help deya holo.

Safety:
- Ek bank-e Rs 5 lakh porjonto deposit-e sadharonoto DICGC cover thake.

Next step:
- Poriman, meyad ba safety concern bolun; ami options aro narrow kore debo.`;
  }

  return `Summary:
- ${topCard.bankName} looks strongest for a ${formatTenorLabel(
    tenorMonths,
    language
  )} FD.

Top options:
- On ${formatCurrency(amount)}, maturity is about ${formatCurrency(
    topCard.maturityAmount
  )}.
- I added three clear options below so you can compare return and safety quickly.

Safety:
- Deposits up to Rs 5 lakh per bank are typically protected by DICGC cover.

Next step:
- Share your amount, tenure, or safety concern and I will narrow this further.`;
}

export function calculatePortfolioDiversification(params: {
  amount: number;
  rates: FDRate[];
  tenorMonths: number;
  seniorCitizen?: boolean;
}): PortfolioSplit | undefined {
  const DICGC_LIMIT = 500000;
  
  if (params.amount <= DICGC_LIMIT || params.rates.length === 0) {
    return undefined; // No need to diversify
  }

  let remainingAmount = params.amount;
  const allocations: PortfolioSplitAllocation[] = [];
  let totalMaturity = 0;

  // Assume rates are already sorted by highest rate
  for (const rate of params.rates) {
    if (remainingAmount <= 0) break;
    
    // Allocate up to DICGC limit per bank
    const allocationAmount = Math.min(remainingAmount, DICGC_LIMIT);
    const applicableRate = getApplicableRate(rate, params.seniorCitizen);
    
    const maturity = calculateMaturity({
      principal: allocationAmount,
      ratePercent: applicableRate,
      tenorMonths: params.tenorMonths,
      compounding: rate.compounding,
    });

    allocations.push({
      bankId: rate.id,
      bankName: rate.bankName,
      allocationAmount,
      rate: applicableRate,
      maturityAmount: maturity.maturityAmount,
    });

    totalMaturity += maturity.maturityAmount;
    remainingAmount -= allocationAmount;
  }

  // If there's still remaining amount, we loop back through the top banks
  // (Meaning they are investing > DICGC limit across all banks available, so we just distribute remaining)
  if (remainingAmount > 0 && allocations.length > 0) {
    let i = 0;
    while (remainingAmount > 0) {
      const bankIdx = i % allocations.length;
      const rate = params.rates[bankIdx];
      const chunk = Math.min(remainingAmount, DICGC_LIMIT);
      
      const applicableRate = getApplicableRate(rate, params.seniorCitizen);
      const maturity = calculateMaturity({
        principal: chunk,
        ratePercent: applicableRate,
        tenorMonths: params.tenorMonths,
        compounding: rate.compounding,
      });

      allocations[bankIdx].allocationAmount += chunk;
      allocations[bankIdx].maturityAmount += maturity.maturityAmount;
      totalMaturity += maturity.maturityAmount;
      
      remainingAmount -= chunk;
      i++;
    }
  }

  const blendedRate = allocations.reduce((acc, a) => acc + (a.rate * (a.allocationAmount / params.amount)), 0);

  return {
    totalAmount: params.amount,
    allocations,
    totalMaturity,
    blendedRate,
  };
}

export async function buildDeterministicAdvisorResponse(params: {
  language: AppLanguage;
  amount: number;
  tenorMonths: number;
  seniorCitizen?: boolean;
  bankType?: BankTypeFilter;
  preferredBankIds?: string[];
  glossaryTermIds: string[];
}) {
  const {
    amount,
    bankType,
    glossaryTermIds,
    language,
    preferredBankIds,
    seniorCitizen,
    tenorMonths,
  } = params;

  const rates = await getFDRates({
    amount,
    tenorMonths,
    seniorCitizen,
    bankType,
  });
  const preferredBankSet = new Set(preferredBankIds ?? []);
  const candidateRates =
    preferredBankSet.size > 0
      ? rates.filter((rate) => preferredBankSet.has(rate.id))
      : rates;
  const topRates = candidateRates.slice(0, 3);

  const rateCards = topRates.map((rate, index) => {
    const card = createAdvisorRateCard({
      rate,
      amount,
      tenorMonths,
      language,
      seniorCitizen,
    });
    
    // F-03: The top result of our personalized scoring algorithm is highlighted
    if (index === 0 && !card.badge) {
      card.badge = "Top Pick For You";
    }
    return card;
  });

  const glossary = resolveGlossary(
    glossaryTermIds.length > 0 ? glossaryTermIds : ["pa", "tenor", "dicgc"],
    language
  );

  // Determine if we should include portfolio diversification advice
  const portfolioSplit = calculatePortfolioDiversification({
    amount,
    rates: candidateRates,
    tenorMonths,
    seniorCitizen,
  });

  const response: AdvisorResponse = {
    text: buildFallbackText({ language, amount, tenorMonths, rateCards }),
    rateCards,
    actions: buildAdvisorActions({
      language,
      topRateCard: rateCards[0],
      glossaryTermId: glossary[0]?.termId,
    }),
    glossary,
    followUpPrompt: LOCALIZED_COPY[language].followUp,
    warnings: rateCards.length === 0 ? [LOCALIZED_COPY[language].noMatch] : [],
    tone: rateCards.length === 0 ? "cautionary" : "informative",
    suggestedChips: [],
    portfolioSplit,
  };

  return response;
}
