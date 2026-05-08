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
      hi: "p.a. (प्रति वर्ष)",
      ta: "p.a. (ஆண்டுக்கு)",
      te: "p.a. (samvatsaraniki)",
    },
    plain: {
      en: "This is the yearly interest rate on your deposit.",
      hi: "इसका मतलब एक साल में मिलने वाली ब्याज दर है।",
      ta: "இது உங்கள் வைப்பிற்கு கிடைக்கும் ஆண்டு வட்டி விகிதம்.",
      te: "Idi mee deposit pai yearly interest rate.",
    },
    example: {
      en: "Rs 10,000 at 8.5% p.a. means about Rs 850 interest in one year.",
      hi: "Rs 10,000 पर 8.5% p.a. का मतलब एक साल में लगभग Rs 850 ब्याज।",
      ta: "Rs 10,000 மீது 8.5% p.a. என்றால் ஒரு ஆண்டில் சுமார் Rs 850 வட்டி.",
      te: "Rs 10,000 at 8.5% p.a. ante oka samvatsaram lo approx Rs 850 interest.",
    },
  },
  tenor: {
    id: "tenor",
    relatedTerms: ["maturity", "pa"],
    term: {
      en: "Tenor / tenure",
      hi: "Tenor / अवधि",
      ta: "Tenor / காலம்",
      te: "Tenor / gaduvu",
    },
    plain: {
      en: "This is how long your money stays locked in the FD.",
      hi: "यह वह अवधि है जितने समय तक आपका पैसा FD में लॉक रहता है।",
      ta: "உங்கள் பணம் FD-யில் எவ்வளவு காலம் இருக்கும் என்பதே இது.",
      te: "Mee dabbu FD lo entha kalam lock avutundo adi.",
    },
    example: {
      en: "12 months tenor means you get your money back after 1 year.",
      hi: "12 महीने की अवधि का मतलब 1 साल बाद पैसा वापस मिलेगा।",
      ta: "12 மாத tenor என்றால் 1 ஆண்டுக்குப் பிறகு பணம் திரும்ப கிடைக்கும்.",
      te: "12 months tenor ante 1 year tarvata mee dabbu back vastundi.",
    },
  },
  maturity: {
    id: "maturity",
    relatedTerms: ["tenor", "compound-interest"],
    term: {
      en: "Maturity",
      hi: "Maturity / परिपक्वता",
      ta: "Maturity / முதிர்வு தேதி",
      te: "Maturity / gaduvu mugimpu date",
    },
    plain: {
      en: "This is the date when the FD ends and your money comes back.",
      hi: "यह वह दिन है जब FD पूरी होती है और पैसा वापस मिलता है।",
      ta: "FD முடிந்து உங்கள் பணம் திரும்ப வரும் தேதிதான் இது.",
      te: "FD end ayi mee dabbu tirigi vacche date.",
    },
    example: {
      en: "If you start today for 12 months, maturity comes after 1 year.",
      hi: "अगर आज 12 महीने के लिए शुरू करें, तो maturity 1 साल बाद होगी।",
      ta: "இன்று 12 மாதங்களுக்கு தொடங்கினால், maturity 1 ஆண்டுக்குப் பிறகு வரும்.",
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
      hi: "यह वह टैक्स है जो बैंक आपके FD ब्याज से काट सकता है।",
      ta: "உங்கள் FD வட்டியில் இருந்து வங்கி கழிக்கக்கூடிய வரி இது.",
      te: "Bank mee FD interest nunchi deduct cheyagalige tax.",
    },
    example: {
      en: "If interest is Rs 850 and TDS is 10%, about Rs 85 may be deducted.",
      hi: "अगर ब्याज Rs 850 है और TDS 10% है, तो लगभग Rs 85 कट सकते हैं।",
      ta: "வட்டி Rs 850, TDS 10% என்றால் சுமார் Rs 85 கழிக்கப்படலாம்.",
      te: "Interest Rs 850 and TDS 10% ante approx Rs 85 deduct avvachu.",
    },
  },
  dicgc: {
    id: "dicgc",
    relatedTerms: ["small-finance-bank"],
    term: {
      en: "DICGC insurance",
      hi: "DICGC बीमा",
      ta: "DICGC காப்பீடு",
      te: "DICGC insurance",
    },
    plain: {
      en: "Eligible deposits up to Rs 5 lakh per depositor per bank are protected.",
      hi: "एक बैंक में प्रति जमाकर्ता Rs 5 लाख तक की योग्य जमा राशि सुरक्षित रहती है।",
      ta: "ஒரு வங்கியில் ஒரு வைப்பாளருக்கு Rs 5 லட்சம் வரை தகுதி உள்ள வைப்பு பாதுகாக்கப்படும்.",
      te: "Oka bank lo depositor ki Rs 5 lakh varaku eligible deposits protected ga untayi.",
    },
    example: {
      en: "If you invest Rs 2 lakh in one covered bank, that amount is within the cover limit.",
      hi: "अगर आप एक कवर बैंक में Rs 2 लाख रखते हैं, तो वह राशि सीमा के अंदर है।",
      ta: "ஒரு கவர் வங்கியில் Rs 2 லட்சம் வைத்தால், அது காப்பீட்டு வரம்புக்குள் இருக்கும்.",
      te: "Meeru covered bank lo Rs 2 lakh invest chesthe adi cover limit lo untundi.",
    },
  },
  "small-finance-bank": {
    id: "small-finance-bank",
    relatedTerms: ["dicgc"],
    term: {
      en: "Small Finance Bank",
      hi: "स्मॉल फाइनेंस बैंक",
      ta: "ஸ்மால் ஃபைனான்ஸ் வங்கி",
      te: "Small Finance Bank",
    },
    plain: {
      en: "This is an RBI-regulated bank that often offers higher FD rates.",
      hi: "यह RBI द्वारा नियंत्रित बैंक है, जो कई बार अधिक FD दर देता है।",
      ta: "இது RBI கட்டுப்பாட்டில் இருக்கும் வங்கி; பல நேரங்களில் அதிக FD வட்டி தரும்.",
      te: "Idi RBI-regulated bank; konni sarlu higher FD rates istundi.",
    },
    example: {
      en: "A small finance bank can offer a higher rate while still having DICGC cover.",
      hi: "स्मॉल फाइनेंस बैंक अधिक दर दे सकता है और DICGC कवर भी हो सकता है।",
      ta: "ஸ்மால் ஃபைனான்ஸ் வங்கி அதிக வட்டி தரலாம்; DICGC கவரும் இருக்கலாம்.",
      te: "Small finance bank higher rate ivvachu, DICGC cover kuda undachu.",
    },
  },
  "compound-interest": {
    id: "compound-interest",
    relatedTerms: ["pa", "maturity"],
    term: {
      en: "Compound interest",
      hi: "चक्रवृद्धि ब्याज",
      ta: "கூட்டு வட்டி",
      te: "Compound interest",
    },
    plain: {
      en: "It means you start earning interest on earlier interest too.",
      hi: "इसका मतलब है कि पहले मिले ब्याज पर भी आगे ब्याज मिलना शुरू होता है।",
      ta: "முன்பு கிடைத்த வட்டியிலும் மீண்டும் வட்டி கிடைப்பதுதான் இதன் பொருள்.",
      te: "Mundu vachina interest pai kuda interest earn avvadam.",
    },
    example: {
      en: "Rs 10,000 grows faster over years because earned interest also starts earning.",
      hi: "Rs 10,000 कई साल में तेजी से बढ़ता है क्योंकि कमाया गया ब्याज भी कमाने लगता है।",
      ta: "Rs 10,000 பல ஆண்டுகளில் வேகமாக வளரும்; கிடைத்த வட்டியும் மீண்டும் வட்டி ஈட்டும்.",
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
      hi: "KYC में बैंक PAN और Aadhaar जैसे दस्तावेजों से आपकी पहचान verify करता है।",
      ta: "KYC என்பது PAN, Aadhaar போன்ற ஆவணங்களால் வங்கி உங்கள் அடையாளத்தை சரிபார்ப்பது.",
      te: "KYC ante bank PAN and Aadhaar lanti documents tho mee identity verify cheyadam.",
    },
    example: {
      en: "If your KYC is complete, opening an FD becomes much faster.",
      hi: "अगर आपका KYC पूरा है, तो FD खोलना जल्दी हो जाता है।",
      ta: "KYC முடிந்திருந்தால், FD தொடங்குவது வேகமாகும்.",
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
    if (seen.has(termId)) continue;
    const entry = localizeJargonEntry(termId, language);
    if (entry) {
      resolved.push(entry);
      seen.add(termId);
    }
  }

  return resolved;
}
