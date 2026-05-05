import type { AppLanguage } from "@/lib/server/advisor-schemas";

export type VoiceClarification = {
  field: "amount" | "tenor" | "amount_and_tenor";
  prompt: string;
  chips: string[];
};

export type VoiceCommand =
  | "recommend"
  | "select_option"
  | "book"
  | "confirm"
  | "continue_kyc"
  | "complete_kyc"
  | "repeat"
  | "stop"
  | "retry"
  | "start_over"
  | "unknown";

export type VoiceCommandParseResult = {
  rawText: string;
  command: VoiceCommand;
  detectedLanguage: AppLanguage;
  selectedOption?: 1 | 2 | 3;
  amount: number | null;
  tenorMonths: number | null;
};

export type RateFreshnessStatus = {
  asOf: string;
  sourceLabel: string;
  sourceUrl?: string;
  daysOld: number | null;
  stale: boolean;
};

type RateDisclosureCard = {
  asOf?: string;
  sourceLabel?: string;
  sourceUrl?: string;
};

const DEVANAGARI_PATTERN = /[\u0900-\u097F]/;
const HINGLISH_HINT_PATTERN =
  /\b(ka|ke|ki|hai|kya|batao|bataiye|liye|saal|mahine|paisa|rupay|lakh|crore|surakshit|karna|karo|chahiye)\b/i;
const INDIC_DIGIT_ZERO = "०".charCodeAt(0);
const RATE_STALE_AFTER_DAYS = 7;
const NUMBER_WORDS: Record<string, number> = {
  ek: 1,
  one: 1,
  pehla: 1,
  pahla: 1,
  do: 2,
  two: 2,
  dusra: 2,
  doosra: 2,
  teen: 3,
  three: 3,
  teesra: 3,
  char: 4,
  chaar: 4,
  four: 4,
  paanch: 5,
  panch: 5,
  five: 5,
  chhe: 6,
  che: 6,
  six: 6,
  saat: 7,
  seven: 7,
  aath: 8,
  eight: 8,
  nau: 9,
  nine: 9,
  das: 10,
  ten: 10,
  "एक": 1,
  "पहला": 1,
  "दो": 2,
  "दूसरा": 2,
  "तीन": 3,
  "तीसरा": 3,
  "चार": 4,
  "पांच": 5,
  "पाँच": 5,
  "छह": 6,
  "सात": 7,
  "आठ": 8,
  "नौ": 9,
  "दस": 10,
};

export function detectVoiceLanguageMode(text: string, selected: AppLanguage): AppLanguage {
  if (selected !== "en") return selected;
  if (DEVANAGARI_PATTERN.test(text)) return "hi";
  if (HINGLISH_HINT_PATTERN.test(text)) return "hinglish";
  return "en";
}

function parseNumber(value: string) {
  return Number(value.replaceAll(",", ""));
}

function normalizeIndicDigits(value: string) {
  return value.replace(/[\u0966-\u096F]/g, (digit) =>
    String(digit.charCodeAt(0) - INDIC_DIGIT_ZERO)
  );
}

function normalizeForVoiceMatch(text: string) {
  return normalizeIndicDigits(text)
    .toLowerCase()
    .replace(/[।,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumberToken(value: string) {
  const normalized = normalizeIndicDigits(value.toLowerCase().trim());
  if (/^\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized);
  return NUMBER_WORDS[normalized] ?? null;
}

function extractUnitAmount(text: string) {
  const tokens = normalizeForVoiceMatch(text).split(/\s+/).filter(Boolean);
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const value = parseNumberToken(tokens[index]);
    const unit = tokens[index + 1];
    if (!value) continue;
    if (/^(lakh|lac|laakh|लाख)$/.test(unit)) return Math.round(value * 100000);
    if (/^(crore|करोड़|करोड)$/.test(unit)) {
      return Math.round(value * 10000000);
    }
  }
  return null;
}

export function extractVoiceAmount(text: string) {
  const unitAmount = extractUnitAmount(text);
  if (unitAmount) return unitAmount;

  const normalized = normalizeForVoiceMatch(text);
  const unitMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|laakh|crore)\b/);
  if (unitMatch) {
    const value = Number(unitMatch[1]);
    return Math.round(value * (unitMatch[2] === "crore" ? 10000000 : 100000));
  }

  const currencyMatch = normalized.match(
    /(?:rs\.?|inr|rupees?|rupay|rupaye|rupee|\u20b9|रुपये|रुपए)\s*(\d{4,9})/
  );
  if (currencyMatch) return parseNumber(currencyMatch[1]);

  const trailingCurrencyMatch = normalized.match(
    /\b(\d{4,9})\s*(?:rs\.?|inr|rupees?|rupay|rupaye|rupee|रुपये|रुपए)\b/
  );
  if (trailingCurrencyMatch) return parseNumber(trailingCurrencyMatch[1]);

  const plainLargeNumber = normalized.match(/\b(\d{5,9})\b/);
  return plainLargeNumber ? parseNumber(plainLargeNumber[1]) : null;
}

export function extractVoiceTenorMonths(text: string) {
  const normalized = normalizeForVoiceMatch(text);
  const tokens = normalized.split(/\s+/).filter(Boolean);

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const value = parseNumberToken(tokens[index]);
    const unit = tokens[index + 1];
    if (!value) continue;
    if (/^(month|months|mahine|mahina|maheene|महीने|महीना|माह|mo)$/.test(unit)) {
      return Math.round(value);
    }
    if (/^(year|years|yr|yrs|saal|varsh|साल|वर्ष)$/.test(unit)) {
      return Math.round(value * 12);
    }
  }

  const monthMatch = normalized.match(
    /(\d+)\s*(month|months|mahine|mahina|maheene|महीने|महीना|माह|mo)\b/
  );
  if (monthMatch) return Number(monthMatch[1]);

  const yearMatch = normalized.match(
    /(\d+)\s*(year|years|yr|yrs|saal|varsh|साल|वर्ष)\b/
  );
  if (yearMatch) return Number(yearMatch[1]) * 12;

  if (/\bone year\b|ek saal|एक साल|1 saal|1 साल/i.test(normalized)) return 12;
  if (/\btwo years\b|do saal|दो साल|2 saal|2 साल/i.test(normalized)) return 24;
  if (/\bthree years\b|teen saal|तीन साल|3 saal|3 साल/i.test(normalized)) {
    return 36;
  }

  return null;
}

export function isFdRecommendationIntent(text: string) {
  return /(fd|fixed deposit|rate|compare|best|highest|recommend|suggest|kaunsi|konsa|return|maturity|ब्याज|दर|तुलना|बेहतर|सबसे|रिटर्न|मेच्योरिटी|फिक्स्ड|जमा)/i.test(
    normalizeForVoiceMatch(text)
  );
}

export function isBookingIntent(text: string) {
  return /(book|booking|open fd|continue|proceed|confirm|kar do|karna hai|khulwa|shuru|next step|kyc|बुक|खोल|आगे|कन्फर्म|पक्का|केवाईसी)/i.test(
    normalizeForVoiceMatch(text)
  );
}

function extractSelectedOption(text: string): 1 | 2 | 3 | undefined {
  const normalized = normalizeForVoiceMatch(text);
  const optionPatterns: Array<[1 | 2 | 3, RegExp]> = [
    [
      1,
      /(?:option|bank|fd|number|no|विकल्प|ऑप्शन|नंबर)\s*(?:1|one|first|ek|pehla|pahla|एक|पहला)\b/,
    ],
    [1, /\b(?:first|pehla|pahla|पहला)\s*(?:option|bank|fd|विकल्प|ऑप्शन)?\b/],
    [
      2,
      /(?:option|bank|fd|number|no|विकल्प|ऑप्शन|नंबर)\s*(?:2|two|second|do|dusra|doosra|दो|दूसरा)\b/,
    ],
    [2, /\b(?:second|dusra|doosra|दूसरा)\s*(?:option|bank|fd|विकल्प|ऑप्शन)?\b/],
    [2, /दूसरा\s*(?:विकल्प|ऑप्शन)?/],
    [
      3,
      /(?:option|bank|fd|number|no|विकल्प|ऑप्शन|नंबर)\s*(?:3|three|third|teen|teesra|तीन|तीसरा)\b/,
    ],
    [3, /\b(?:third|teesra|तीसरा)\s*(?:option|bank|fd|विकल्प|ऑप्शन)?\b/],
    [3, /तीसरा\s*(?:विकल्प|ऑप्शन)?/],
  ];

  return optionPatterns.find(([, pattern]) => pattern.test(normalized))?.[0];
}

export function parseVoiceCommand(
  text: string,
  selectedLanguage: AppLanguage
): VoiceCommandParseResult {
  const normalized = normalizeForVoiceMatch(text);
  const detectedLanguage = detectVoiceLanguageMode(text, selectedLanguage);
  const selectedOption = extractSelectedOption(text);
  const amount = extractVoiceAmount(text);
  const tenorMonths = extractVoiceTenorMonths(text);

  let command: VoiceCommand = "unknown";
  if (/(stop|cancel|pause|bas|roko|ruk|बंद|रोक|बस)/i.test(normalized)) {
    command = "stop";
  } else if (
    /(repeat|replay|again बोल|dobara bolo|phir se bolo|दोबारा बोल|फिर से बोल)/i.test(
      normalized
    )
  ) {
    command = "repeat";
  } else if (
    /(try again|retry|dobara suno|phir se suno|फिर से सुन|दोबारा सुन)/i.test(normalized)
  ) {
    command = "retry";
  } else if (
    /(start over|restart|reset|new search|naya|shuru se|शुरू से|नया)/i.test(normalized)
  ) {
    command = "start_over";
  } else if (
    /(complete kyc|finish kyc|kyc complete|handoff complete|केवाईसी पूरा)/i.test(
      normalized
    )
  ) {
    command = "complete_kyc";
  } else if (/(continue.*kyc|kyc|next step|aage|आगे|केवाईसी)/i.test(normalized)) {
    command = "continue_kyc";
  } else if (/(book|booking|open fd|book karo|kar do|khulwa|बुक|खोल)/i.test(normalized)) {
    command = "book";
  } else if (
    /\b(confirm|yes|okay|ok|haan|ha|han|theek hai)\b|पक्का|कन्फर्म|हाँ|ठीक है/i.test(
      normalized
    )
  ) {
    command = "confirm";
  } else if (
    selectedOption &&
    /(choose|select|pick|option|bank|chuno|चुन|विकल्प|ऑप्शन)/i.test(normalized)
  ) {
    command = "select_option";
  } else if (isFdRecommendationIntent(text) || amount || tenorMonths) {
    command = "recommend";
  }

  return {
    rawText: text,
    command,
    detectedLanguage,
    selectedOption,
    amount,
    tenorMonths,
  };
}

export function getVoiceClarification(
  text: string,
  language: AppLanguage
): VoiceClarification | null {
  if (!isFdRecommendationIntent(text) || isBookingIntent(text)) return null;

  const amount = extractVoiceAmount(text);
  const tenor = extractVoiceTenorMonths(text);
  if (amount && tenor) return null;

  const field =
    !amount && !tenor ? "amount_and_tenor" : !amount ? "amount" : "tenor";
  const isHindi = language === "hi";
  const isHinglish = language === "hinglish";

  const prompt = isHindi
    ? field === "amount"
      ? "राशि बताइए। जैसे, एक लाख या पांच लाख।"
      : field === "tenor"
        ? "अवधि बताइए। जैसे, एक साल या तीन साल।"
        : "राशि और अवधि बताइए। जैसे, एक लाख एक साल के लिए।"
    : isHinglish
      ? field === "amount"
        ? "Amount batayiye. Jaise, ek lakh ya paanch lakh."
        : field === "tenor"
          ? "Tenure batayiye. Jaise, ek saal ya teen saal."
          : "Amount aur tenure batayiye. Jaise, ek lakh ek saal ke liye."
      : field === "amount"
        ? "Please tell me the amount. For example, one lakh or five lakh."
        : field === "tenor"
          ? "Please tell me the tenure. For example, one year or three years."
          : "Please tell me the amount and tenure. For example, one lakh for one year.";

  return {
    field,
    prompt,
    chips: isHindi
      ? ["1 लाख 1 साल", "5 लाख 1 साल", "5 लाख 3 साल"]
      : isHinglish
        ? ["1 lakh 1 saal", "5 lakh 1 saal", "5 lakh 3 saal"]
        : ["Rs 1 lakh for 1 year", "Rs 5 lakh for 1 year", "Rs 5 lakh for 3 years"],
  };
}

export function buildVoiceComparisonPrompt(input: {
  text: string;
  amount?: number | null;
  tenorMonths?: number | null;
  language: AppLanguage;
}) {
  const amountText = input.amount ? ` Amount: Rs ${input.amount}.` : "";
  const tenorText = input.tenorMonths ? ` Tenure: ${input.tenorMonths} months.` : "";
  const languageText =
    input.language === "hi"
      ? "Answer in simple Hindi using Devanagari script."
      : input.language === "hinglish"
        ? "Answer in natural Hinglish."
        : "Answer in English.";

  return [
    input.text,
    amountText,
    tenorText,
    "Compare exactly 3 FD options.",
    "For each option mention bank, rate, tenure, maturity value or interest earned, and safety.",
    "Explain FD basics, interest rate, tenure, maturity value, DICGC cover, and risk in simple words.",
    "End by asking if the user wants to book one option and continue to KYC handoff.",
    languageText,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getRateFreshnessStatus(
  cards: RateDisclosureCard[],
  now = new Date()
): RateFreshnessStatus | null {
  const card = cards.find((candidate) => candidate.asOf || candidate.sourceLabel);
  if (!card?.asOf && !card?.sourceLabel) return null;

  const asOf = card.asOf ?? "unknown";
  const parsedAsOf = Date.parse(asOf);
  const daysOld = Number.isNaN(parsedAsOf)
    ? null
    : Math.max(0, Math.floor((now.getTime() - parsedAsOf) / 86_400_000));

  return {
    asOf,
    sourceLabel: card.sourceLabel ?? "FD rate source",
    sourceUrl: card.sourceUrl,
    daysOld,
    stale: daysOld !== null && daysOld >= RATE_STALE_AFTER_DAYS,
  };
}

export function buildRateSourceDisclosure(
  cards: RateDisclosureCard[],
  language: AppLanguage,
  now = new Date()
) {
  const status = getRateFreshnessStatus(cards, now);
  if (!status) return "";

  if (language === "hi") {
    return [
      `रेट ${status.sourceLabel} से ${status.asOf} तक के हैं।`,
      "बुकिंग से पहले बैंक की आधिकारिक साइट पर अंतिम रेट जरूर जांचें।",
      status.stale ? "यह रेट डेटा सात दिन या उससे ज्यादा पुराना हो सकता है।" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (language === "hinglish") {
    return [
      `Rates ${status.sourceLabel} se ${status.asOf} tak ke hain.`,
      "Booking se pehle bank ki official site par final rate verify kar lijiye.",
      status.stale ? "Yeh rate data 7 din ya usse zyada purana ho sakta hai." : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    `Rates are from ${status.sourceLabel} as of ${status.asOf}.`,
    "Please verify the final rate on the official bank site before booking.",
    status.stale ? "This rate data may be 7 days or more old." : "",
  ]
    .filter(Boolean)
    .join(" ");
}
