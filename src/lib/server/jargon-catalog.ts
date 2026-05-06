import type { AppLanguage, GlossaryItem } from "@/lib/server/advisor-schemas";

type LocalizedText = Record<Exclude<AppLanguage, "hinglish">, string> & {
  hinglish?: string;
};

type JargonEntry = {
  id: string;
  relatedTerms: string[];
  term: LocalizedText;
  plain: LocalizedText;
  example: LocalizedText;
};

const JARGON_CATALOG: Record<string, JargonEntry> = {
  pa: {
    id: "pa",
    relatedTerms: ["tenor", "maturity"],
    term: {
      en: "p.a. (per annum)",
      hi: "p.a. (à¤ªà¥à¤°à¤¤à¤¿ à¤µà¤°à¥à¤·)",
      ta: "p.a. (à®†à®£à¯à®Ÿà¯à®•à¯à®•à¯)",
      te: "p.a. (samvatsaraniki)",
    },
    plain: {
      en: "This is the yearly interest rate on your deposit.",
      hi: "à¤‡à¤¸à¤•à¤¾ à¤®à¤¤à¤²à¤¬ à¤à¤• à¤¸à¤¾à¤² à¤®à¥‡à¤‚ à¤®à¤¿à¤²à¤¨à¥‡ à¤µà¤¾à¤²à¥€ à¤¬à¥à¤¯à¤¾à¤œ à¤¦à¤° à¤¹à¥ˆà¥¤",
      ta: "à®‡à®¤à¯ à®‰à®™à¯à®•à®³à¯ à®µà¯ˆà®ªà¯à®ªà®¿à®±à¯à®•à¯ à®•à®¿à®Ÿà¯ˆà®•à¯à®•à¯à®®à¯ à®†à®£à¯à®Ÿà¯ à®µà®Ÿà¯à®Ÿà®¿ à®µà®¿à®•à®¿à®¤à®®à¯.",
      te: "Idi mee deposit pai yearly interest rate.",
    },
    example: {
      en: "Rs 10,000 at 8.5% p.a. means about Rs 850 interest in one year.",
      hi: "Rs 10,000 à¤ªà¤° 8.5% p.a. à¤•à¤¾ à¤®à¤¤à¤²à¤¬ à¤à¤• à¤¸à¤¾à¤² à¤®à¥‡à¤‚ à¤²à¤—à¤­à¤— Rs 850 à¤¬à¥à¤¯à¤¾à¤œà¥¤",
      ta: "Rs 10,000 à®®à¯€à®¤à¯ 8.5% p.a. à®Žà®©à¯à®±à®¾à®²à¯ à®’à®°à¯ à®†à®£à¯à®Ÿà®¿à®²à¯ à®šà¯à®®à®¾à®°à¯ Rs 850 à®µà®Ÿà¯à®Ÿà®¿.",
      te: "Rs 10,000 at 8.5% p.a. ante oka samvatsaram lo approx Rs 850 interest.",
    },
  },
  tenor: {
    id: "tenor",
    relatedTerms: ["maturity", "pa"],
    term: {
      en: "Tenor / tenure",
      hi: "Tenor / à¤…à¤µà¤§à¤¿",
      ta: "Tenor / à®•à®¾à®²à®®à¯",
      te: "Tenor / gaduvu",
    },
    plain: {
      en: "This is how long your money stays locked in the FD.",
      hi: "à¤¯à¤¹ à¤µà¤¹ à¤…à¤µà¤§à¤¿ à¤¹à¥ˆ à¤œà¤¿à¤¤à¤¨à¥‡ à¤¸à¤®à¤¯ à¤¤à¤• à¤†à¤ªà¤•à¤¾ à¤ªà¥ˆà¤¸à¤¾ FD à¤®à¥‡à¤‚ à¤²à¥‰à¤• à¤°à¤¹à¤¤à¤¾ à¤¹à¥ˆà¥¤",
      ta: "à®‰à®™à¯à®•à®³à¯ à®ªà®£à®®à¯ FD-à®¯à®¿à®²à¯ à®Žà®µà¯à®µà®³à®µà¯ à®•à®¾à®²à®®à¯ à®‡à®°à¯à®•à¯à®•à¯à®®à¯ à®Žà®©à¯à®ªà®¤à¯‡ à®‡à®¤à¯.",
      te: "Mee dabbu FD lo entha kalam lock avutundo adi.",
    },
    example: {
      en: "12 months tenor means you get your money back after 1 year.",
      hi: "12 à¤®à¤¹à¥€à¤¨à¥‡ à¤•à¥€ à¤…à¤µà¤§à¤¿ à¤•à¤¾ à¤®à¤¤à¤²à¤¬ 1 à¤¸à¤¾à¤² à¤¬à¤¾à¤¦ à¤ªà¥ˆà¤¸à¤¾ à¤µà¤¾à¤ªà¤¸ à¤®à¤¿à¤²à¥‡à¤—à¤¾à¥¤",
      ta: "12 à®®à®¾à®¤ tenor à®Žà®©à¯à®±à®¾à®²à¯ 1 à®†à®£à¯à®Ÿà¯à®•à¯à®•à¯à®ªà¯ à®ªà®¿à®±à®•à¯ à®ªà®£à®®à¯ à®¤à®¿à®°à¯à®®à¯à®ª à®•à®¿à®Ÿà¯ˆà®•à¯à®•à¯à®®à¯.",
      te: "12 months tenor ante 1 year tarvata mee dabbu back vastundi.",
    },
  },
  maturity: {
    id: "maturity",
    relatedTerms: ["tenor", "compound-interest"],
    term: {
      en: "Maturity",
      hi: "Maturity / à¤ªà¤°à¤¿à¤ªà¤•à¥à¤µà¤¤à¤¾",
      ta: "Maturity / à®®à¯à®¤à®¿à®°à¯à®µà¯ à®¤à¯‡à®¤à®¿",
      te: "Maturity / gaduvu mugimpu date",
    },
    plain: {
      en: "This is the date when the FD ends and your money comes back.",
      hi: "à¤¯à¤¹ à¤µà¤¹ à¤¦à¤¿à¤¨ à¤¹à¥ˆ à¤œà¤¬ FD à¤ªà¥‚à¤°à¥€ à¤¹à¥‹à¤¤à¥€ à¤¹à¥ˆ à¤”à¤° à¤ªà¥ˆà¤¸à¤¾ à¤µà¤¾à¤ªà¤¸ à¤®à¤¿à¤²à¤¤à¤¾ à¤¹à¥ˆà¥¤",
      ta: "FD à®®à¯à®Ÿà®¿à®¨à¯à®¤à¯ à®‰à®™à¯à®•à®³à¯ à®ªà®£à®®à¯ à®¤à®¿à®°à¯à®®à¯à®ª à®µà®°à¯à®®à¯ à®¤à¯‡à®¤à®¿à®¤à®¾à®©à¯ à®‡à®¤à¯.",
      te: "FD end ayi mee dabbu tirigi vacche date.",
    },
    example: {
      en: "If you start today for 12 months, maturity comes after 1 year.",
      hi: "à¤…à¤—à¤° à¤†à¤œ 12 à¤®à¤¹à¥€à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤¶à¥à¤°à¥‚ à¤•à¤°à¥‡à¤‚, à¤¤à¥‹ maturity 1 à¤¸à¤¾à¤² à¤¬à¤¾à¤¦ à¤¹à¥‹à¤—à¥€à¥¤",
      ta: "à®‡à®©à¯à®±à¯ 12 à®®à®¾à®¤à®™à¯à®•à®³à¯à®•à¯à®•à¯ à®¤à¯Šà®Ÿà®™à¯à®•à®¿à®©à®¾à®²à¯, maturity 1 à®†à®£à¯à®Ÿà¯à®•à¯à®•à¯à®ªà¯ à®ªà®¿à®±à®•à¯ à®µà®°à¯à®®à¯.",
      te: "Ippudu 12 months start chesthe maturity 1 year tarvata vastundi.",
    },
  },
  tds: {
    id: "tds",
    relatedTerms: ["form-15g", "pa"],
    term: {
      en: "TDS",
      hi: "TDS",
      ta: "TDS",
      te: "TDS",
    },
    plain: {
      en: "This is tax that the bank may deduct from your FD interest.",
      hi: "à¤¯à¤¹ à¤µà¤¹ à¤Ÿà¥ˆà¤•à¥à¤¸ à¤¹à¥ˆ à¤œà¥‹ à¤¬à¥ˆà¤‚à¤• à¤†à¤ªà¤•à¥‡ FD à¤¬à¥à¤¯à¤¾à¤œ à¤¸à¥‡ à¤•à¤¾à¤Ÿ à¤¸à¤•à¤¤à¤¾ à¤¹à¥ˆà¥¤",
      ta: "à®‰à®™à¯à®•à®³à¯ FD à®µà®Ÿà¯à®Ÿà®¿à®¯à®¿à®²à¯ à®‡à®°à¯à®¨à¯à®¤à¯ à®µà®™à¯à®•à®¿ à®•à®´à®¿à®•à¯à®•à®•à¯à®•à¯‚à®Ÿà®¿à®¯ à®µà®°à®¿ à®‡à®¤à¯.",
      te: "Bank mee FD interest nunchi deduct cheyagalige tax.",
    },
    example: {
      en: "If interest is Rs 850 and TDS is 10%, about Rs 85 may be deducted.",
      hi: "à¤…à¤—à¤° à¤¬à¥à¤¯à¤¾à¤œ Rs 850 à¤¹à¥ˆ à¤”à¤° TDS 10% à¤¹à¥ˆ, à¤¤à¥‹ à¤²à¤—à¤­à¤— Rs 85 à¤•à¤Ÿ à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤",
      ta: "à®µà®Ÿà¯à®Ÿà®¿ Rs 850, TDS 10% à®Žà®©à¯à®±à®¾à®²à¯ à®šà¯à®®à®¾à®°à¯ Rs 85 à®•à®´à®¿à®•à¯à®•à®ªà¯à®ªà®Ÿà®²à®¾à®®à¯.",
      te: "Interest Rs 850 and TDS 10% ante approx Rs 85 deduct avvachu.",
    },
  },
  dicgc: {
    id: "dicgc",
    relatedTerms: ["small-finance-bank"],
    term: {
      en: "DICGC insurance",
      hi: "DICGC à¤¬à¥€à¤®à¤¾",
      ta: "DICGC à®•à®¾à®ªà¯à®ªà¯€à®Ÿà¯",
      te: "DICGC insurance",
    },
    plain: {
      en: "Eligible deposits up to Rs 5 lakh per depositor per bank are protected.",
      hi: "à¤à¤• à¤¬à¥ˆà¤‚à¤• à¤®à¥‡à¤‚ à¤ªà¥à¤°à¤¤à¤¿ à¤œà¤®à¤¾à¤•à¤°à¥à¤¤à¤¾ Rs 5 à¤²à¤¾à¤– à¤¤à¤• à¤•à¥€ à¤¯à¥‹à¤—à¥à¤¯ à¤œà¤®à¤¾ à¤°à¤¾à¤¶à¤¿ à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤°à¤¹à¤¤à¥€ à¤¹à¥ˆà¥¤",
      ta: "à®’à®°à¯ à®µà®™à¯à®•à®¿à®¯à®¿à®²à¯ à®’à®°à¯ à®µà¯ˆà®ªà¯à®ªà®¾à®³à®°à¯à®•à¯à®•à¯ Rs 5 à®²à®Ÿà¯à®šà®®à¯ à®µà®°à¯ˆ à®¤à®•à¯à®¤à®¿ à®‰à®³à¯à®³ à®µà¯ˆà®ªà¯à®ªà¯ à®ªà®¾à®¤à¯à®•à®¾à®•à¯à®•à®ªà¯à®ªà®Ÿà¯à®®à¯.",
      te: "Oka bank lo depositor ki Rs 5 lakh varaku eligible deposits protected ga untayi.",
    },
    example: {
      en: "If you invest Rs 2 lakh in one covered bank, that amount is within the cover limit.",
      hi: "à¤…à¤—à¤° à¤†à¤ª à¤à¤• à¤•à¤µà¤° à¤¬à¥ˆà¤‚à¤• à¤®à¥‡à¤‚ Rs 2 à¤²à¤¾à¤– à¤°à¤–à¤¤à¥‡ à¤¹à¥ˆà¤‚, à¤¤à¥‹ à¤µà¤¹ à¤°à¤¾à¤¶à¤¿ à¤¸à¥€à¤®à¤¾ à¤•à¥‡ à¤…à¤‚à¤¦à¤° à¤¹à¥ˆà¥¤",
      ta: "à®’à®°à¯ à®•à®µà®°à¯ à®µà®™à¯à®•à®¿à®¯à®¿à®²à¯ Rs 2 à®²à®Ÿà¯à®šà®®à¯ à®µà¯ˆà®¤à¯à®¤à®¾à®²à¯, à®…à®¤à¯ à®•à®¾à®ªà¯à®ªà¯€à®Ÿà¯à®Ÿà¯ à®µà®°à®®à¯à®ªà¯à®•à¯à®•à¯à®³à¯ à®‡à®°à¯à®•à¯à®•à¯à®®à¯.",
      te: "Meeru covered bank lo Rs 2 lakh invest chesthe adi cover limit lo untundi.",
    },
  },
  "small-finance-bank": {
    id: "small-finance-bank",
    relatedTerms: ["dicgc"],
    term: {
      en: "Small Finance Bank",
      hi: "à¤¸à¥à¤®à¥‰à¤² à¤«à¤¾à¤‡à¤¨à¥‡à¤‚à¤¸ à¤¬à¥ˆà¤‚à¤•",
      ta: "à®¸à¯à®®à®¾à®²à¯ à®ƒà®ªà¯ˆà®©à®¾à®©à¯à®¸à¯ à®µà®™à¯à®•à®¿",
      te: "Small Finance Bank",
    },
    plain: {
      en: "This is an RBI-regulated bank that often offers higher FD rates.",
      hi: "à¤¯à¤¹ RBI à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤¨à¤¿à¤¯à¤‚à¤¤à¥à¤°à¤¿à¤¤ à¤¬à¥ˆà¤‚à¤• à¤¹à¥ˆ, à¤œà¥‹ à¤•à¤ˆ à¤¬à¤¾à¤° à¤…à¤§à¤¿à¤• FD à¤¦à¤° à¤¦à¥‡à¤¤à¤¾ à¤¹à¥ˆà¥¤",
      ta: "à®‡à®¤à¯ RBI à®•à®Ÿà¯à®Ÿà¯à®ªà¯à®ªà®¾à®Ÿà¯à®Ÿà®¿à®²à¯ à®‡à®°à¯à®•à¯à®•à¯à®®à¯ à®µà®™à¯à®•à®¿; à®ªà®² à®¨à¯‡à®°à®™à¯à®•à®³à®¿à®²à¯ à®…à®¤à®¿à®• FD à®µà®Ÿà¯à®Ÿà®¿ à®¤à®°à¯à®®à¯.",
      te: "Idi RBI-regulated bank; konni sarlu higher FD rates istundi.",
    },
    example: {
      en: "A small finance bank can offer a higher rate while still having DICGC cover.",
      hi: "à¤¸à¥à¤®à¥‰à¤² à¤«à¤¾à¤‡à¤¨à¥‡à¤‚à¤¸ à¤¬à¥ˆà¤‚à¤• à¤…à¤§à¤¿à¤• à¤¦à¤° à¤¦à¥‡ à¤¸à¤•à¤¤à¤¾ à¤¹à¥ˆ à¤”à¤° DICGC à¤•à¤µà¤° à¤­à¥€ à¤¹à¥‹ à¤¸à¤•à¤¤à¤¾ à¤¹à¥ˆà¥¤",
      ta: "à®¸à¯à®®à®¾à®²à¯ à®ƒà®ªà¯ˆà®©à®¾à®©à¯à®¸à¯ à®µà®™à¯à®•à®¿ à®…à®¤à®¿à®• à®µà®Ÿà¯à®Ÿà®¿ à®¤à®°à®²à®¾à®®à¯; DICGC à®•à®µà®°à¯à®®à¯ à®‡à®°à¯à®•à¯à®•à®²à®¾à®®à¯.",
      te: "Small finance bank higher rate ivvachu, DICGC cover kuda undachu.",
    },
  },
  "compound-interest": {
    id: "compound-interest",
    relatedTerms: ["pa", "maturity"],
    term: {
      en: "Compound interest",
      hi: "à¤šà¤•à¥à¤°à¤µà¥ƒà¤¦à¥à¤§à¤¿ à¤¬à¥à¤¯à¤¾à¤œ",
      ta: "à®•à¯‚à®Ÿà¯à®Ÿà¯ à®µà®Ÿà¯à®Ÿà®¿",
      te: "Compound interest",
    },
    plain: {
      en: "It means you start earning interest on earlier interest too.",
      hi: "à¤‡à¤¸à¤•à¤¾ à¤®à¤¤à¤²à¤¬ à¤¹à¥ˆ à¤•à¤¿ à¤ªà¤¹à¤²à¥‡ à¤®à¤¿à¤²à¥‡ à¤¬à¥à¤¯à¤¾à¤œ à¤ªà¤° à¤­à¥€ à¤†à¤—à¥‡ à¤¬à¥à¤¯à¤¾à¤œ à¤®à¤¿à¤²à¤¨à¤¾ à¤¶à¥à¤°à¥‚ à¤¹à¥‹à¤¤à¤¾ à¤¹à¥ˆà¥¤",
      ta: "à®®à¯à®©à¯à®ªà¯ à®•à®¿à®Ÿà¯ˆà®¤à¯à®¤ à®µà®Ÿà¯à®Ÿà®¿à®¯à®¿à®²à¯à®®à¯ à®®à¯€à®£à¯à®Ÿà¯à®®à¯ à®µà®Ÿà¯à®Ÿà®¿ à®•à®¿à®Ÿà¯ˆà®ªà¯à®ªà®¤à¯à®¤à®¾à®©à¯ à®‡à®¤à®©à¯ à®ªà¯Šà®°à¯à®³à¯.",
      te: "Mundu vachina interest pai kuda interest earn avvadam.",
    },
    example: {
      en: "Rs 10,000 grows faster over years because earned interest also starts earning.",
      hi: "Rs 10,000 à¤•à¤ˆ à¤¸à¤¾à¤² à¤®à¥‡à¤‚ à¤¤à¥‡à¤œà¥€ à¤¸à¥‡ à¤¬à¤¢à¤¼à¤¤à¤¾ à¤¹à¥ˆ à¤•à¥à¤¯à¥‹à¤‚à¤•à¤¿ à¤•à¤®à¤¾à¤¯à¤¾ à¤—à¤¯à¤¾ à¤¬à¥à¤¯à¤¾à¤œ à¤­à¥€ à¤•à¤®à¤¾à¤¨à¥‡ à¤²à¤—à¤¤à¤¾ à¤¹à¥ˆà¥¤",
      ta: "Rs 10,000 à®ªà®² à®†à®£à¯à®Ÿà¯à®•à®³à®¿à®²à¯ à®µà¯‡à®•à®®à®¾à®• à®µà®³à®°à¯à®®à¯; à®•à®¿à®Ÿà¯ˆà®¤à¯à®¤ à®µà®Ÿà¯à®Ÿà®¿à®¯à¯à®®à¯ à®®à¯€à®£à¯à®Ÿà¯à®®à¯ à®µà®Ÿà¯à®Ÿà®¿ à®ˆà®Ÿà¯à®Ÿà¯à®®à¯.",
      te: "Rs 10,000 years lo faster ga grow avvachu because earned interest kuda earn chestundi.",
    },
  },
  kyc: {
    id: "kyc",
    relatedTerms: ["dicgc"],
    term: {
      en: "KYC",
      hi: "KYC",
      ta: "KYC",
      te: "KYC",
    },
    plain: {
      en: "KYC means the bank verifies your identity with documents like PAN and Aadhaar.",
      hi: "KYC à¤®à¥‡à¤‚ à¤¬à¥ˆà¤‚à¤• PAN à¤”à¤° Aadhaar à¤œà¥ˆà¤¸à¥‡ à¤¦à¤¸à¥à¤¤à¤¾à¤µà¥‡à¤œà¥‹à¤‚ à¤¸à¥‡ à¤†à¤ªà¤•à¥€ à¤ªà¤¹à¤šà¤¾à¤¨ verify à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆà¥¤",
      ta: "KYC à®Žà®©à¯à®ªà®¤à¯ PAN, Aadhaar à®ªà¯‹à®©à¯à®± à®†à®µà®£à®™à¯à®•à®³à®¾à®²à¯ à®µà®™à¯à®•à®¿ à®‰à®™à¯à®•à®³à¯ à®…à®Ÿà¯ˆà®¯à®¾à®³à®¤à¯à®¤à¯ˆ à®šà®°à®¿à®ªà®¾à®°à¯à®ªà¯à®ªà®¤à¯.",
      te: "KYC ante bank PAN and Aadhaar lanti documents tho mee identity verify cheyadam.",
    },
    example: {
      en: "If your KYC is complete, opening an FD becomes much faster.",
      hi: "à¤…à¤—à¤° à¤†à¤ªà¤•à¤¾ KYC à¤ªà¥‚à¤°à¤¾ à¤¹à¥ˆ, à¤¤à¥‹ FD à¤–à¥‹à¤²à¤¨à¤¾ à¤œà¤²à¥à¤¦à¥€ à¤¹à¥‹ à¤œà¤¾à¤¤à¤¾ à¤¹à¥ˆà¥¤",
      ta: "KYC à®®à¯à®Ÿà®¿à®¨à¯à®¤à®¿à®°à¯à®¨à¯à®¤à®¾à®²à¯, FD à®¤à¯Šà®Ÿà®™à¯à®•à¯à®µà®¤à¯ à®µà¯‡à®•à®®à®¾à®•à¯à®®à¯.",
      te: "Mee KYC complete ayithe FD open cheyadam chala fast avutundi.",
    },
  },
};

export function getJargonEntry(termId: string) {
  return JARGON_CATALOG[termId];
}

export function localizeJargonEntry(
  termId: string,
  language: AppLanguage
): GlossaryItem | null {
  const entry = getJargonEntry(termId);
  if (!entry) {
    return null;
  }

  return {
    termId: entry.id,
    term: entry.term[language] ?? entry.term.hi ?? entry.term.en,
    plain: entry.plain[language] ?? entry.plain.hi ?? entry.plain.en,
    example: entry.example[language] ?? entry.example.hi ?? entry.example.en,
  };
}

export function resolveGlossary(
  termIds: string[],
  language: AppLanguage
): GlossaryItem[] {
  const seen = new Set<string>();
  const resolved: GlossaryItem[] = [];

  for (const termId of termIds) {
    if (seen.has(termId)) {
      continue;
    }

    const localized = localizeJargonEntry(termId, language);
    if (!localized) {
      continue;
    }

    seen.add(termId);
    resolved.push(localized);
  }

  return resolved;
}
