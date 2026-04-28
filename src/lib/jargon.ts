export interface JargonTerm {
  id: string;
  termEn: string;
  termHi: string;
  plainEn: string;
  plainHi: string;
  exampleEn: string;
  exampleHi: string;
  relatedTerms: string[];
  icon: string;
}

export const JARGON_DICTIONARY: JargonTerm[] = [
  {
    id: "compound-interest",
    termEn: "Compound Interest",
    termHi: "चक्रवृद्धि ब्याज",
    plainEn:
      'It means "interest on interest." When earned interest is added to your principal, the next interest calculation happens on the larger amount.',
    plainHi:
      'आसान भाषा में यह "ब्याज पर ब्याज" है। जब कमाया हुआ ब्याज मूल रकम में जुड़ जाता है, तो अगली बार बढ़ी हुई रकम पर भी ब्याज मिलता है।',
    exampleEn:
      "Rs 10,000 at 10% p.a. earns Rs 1,000 in year one. In year two, interest can be calculated on Rs 11,000.",
    exampleHi:
      "Rs 10,000 पर 10% सालाना ब्याज हो तो पहले साल Rs 1,000 ब्याज मिलता है। दूसरे साल Rs 11,000 पर ब्याज बन सकता है।",
    relatedTerms: ["pa", "maturity", "tenor"],
    icon: "trending_up",
  },
  {
    id: "pa",
    termEn: "p.a. (Per Annum)",
    termHi: "प्रति वर्ष (p.a.)",
    plainEn:
      'It stands for "per year." When a bank says 8.5% p.a., it means the yearly interest rate is 8.5%.',
    plainHi:
      "इसका मतलब साल भर में मिलने वाला ब्याज है। अगर बैंक 8.5% p.a. कहता है, तो सालाना ब्याज दर 8.5% है।",
    exampleEn: "Rs 10,000 at 8.5% p.a. means about Rs 850 interest in one year.",
    exampleHi: "Rs 10,000 पर 8.5% p.a. का मतलब एक साल में लगभग Rs 850 ब्याज।",
    relatedTerms: ["compound-interest", "maturity"],
    icon: "calendar_today",
  },
  {
    id: "tenor",
    termEn: "Tenor / Tenure",
    termHi: "अवधि (Tenor)",
    plainEn:
      "The duration for which your money stays locked in the FD. Different tenors can have different rates.",
    plainHi:
      "आप कितने समय के लिए पैसा FD में लॉक रखेंगे। अलग-अलग अवधि पर ब्याज दर अलग हो सकती है।",
    exampleEn: "A 12-month tenor means you get your money back after 1 year.",
    exampleHi: "12 महीने की अवधि का मतलब 1 साल बाद मूल रकम और ब्याज वापस।",
    relatedTerms: ["maturity", "pa"],
    icon: "hourglass_top",
  },
  {
    id: "maturity",
    termEn: "Maturity",
    termHi: "परिपक्वता (Maturity)",
    plainEn:
      "The date when your FD ends and the bank returns your principal plus earned interest.",
    plainHi:
      "जिस दिन आपकी FD की अवधि पूरी होती है और बैंक मूल रकम के साथ ब्याज वापस करता है।",
    exampleEn: "A 12-month FD opened on Jan 1 matures around Jan 1 next year.",
    exampleHi:
      "1 जनवरी को 12 महीने की FD शुरू करने पर परिपक्वता अगले साल 1 जनवरी के आसपास होगी।",
    relatedTerms: ["tenor", "compound-interest"],
    icon: "event_available",
  },
  {
    id: "tds",
    termEn: "TDS (Tax Deducted at Source)",
    termHi: "TDS (स्रोत पर कर कटौती)",
    plainEn:
      "The bank may deduct tax from your FD interest when it crosses the applicable limit. Eligible users can submit Form 15G/15H.",
    plainHi:
      "FD ब्याज तय सीमा से ऊपर जाने पर बैंक टैक्स काट सकता है। योग्य होने पर Form 15G/15H देकर TDS से बचा जा सकता है।",
    exampleEn: "Rs 850 interest with 10% TDS means about Rs 85 may be deducted.",
    exampleHi: "Rs 850 ब्याज पर 10% TDS हो तो लगभग Rs 85 कट सकते हैं।",
    relatedTerms: ["pa", "form-15g"],
    icon: "receipt_long",
  },
  {
    id: "dicgc",
    termEn: "DICGC Insurance",
    termHi: "DICGC बीमा",
    plainEn:
      "Deposit insurance that protects eligible bank deposits up to Rs 5 lakh per depositor per bank.",
    plainHi:
      "एक बैंक में प्रति जमाकर्ता Rs 5 लाख तक की योग्य जमा राशि DICGC बीमा से सुरक्षित रहती है।",
    exampleEn:
      "A Rs 2,00,000 FD in one covered bank is within the DICGC insurance limit.",
    exampleHi:
      "किसी एक कवर बैंक में Rs 2,00,000 की FD DICGC सीमा के अंदर आती है।",
    relatedTerms: ["small-finance-bank"],
    icon: "verified_user",
  },
  {
    id: "small-finance-bank",
    termEn: "Small Finance Bank",
    termHi: "स्मॉल फाइनेंस बैंक",
    plainEn:
      "An RBI-regulated bank that often offers higher FD rates and is also covered by DICGC deposit insurance limits.",
    plainHi:
      "RBI द्वारा नियंत्रित बैंक, जो कई बार अधिक FD दर देता है और DICGC बीमा सीमा के अंतर्गत आता है।",
    exampleEn:
      "A small finance bank may offer a higher FD rate while still staying within DICGC coverage limits.",
    exampleHi:
      "स्मॉल फाइनेंस बैंक अधिक FD दर दे सकता है, लेकिन जमा सुरक्षा सीमा फिर भी DICGC नियमों पर निर्भर रहती है।",
    relatedTerms: ["dicgc"],
    icon: "account_balance",
  },
  {
    id: "form-15g",
    termEn: "Form 15G / 15H",
    termHi: "फॉर्म 15G / 15H",
    plainEn:
      "A form you submit to the bank to avoid TDS deduction when you are eligible. 15G is usually for people under 60, 15H for senior citizens.",
    plainHi:
      "TDS से बचने के लिए बैंक में जमा किया जाने वाला फॉर्म। 15G आम तौर पर 60 वर्ष से कम लोगों के लिए और 15H वरिष्ठ नागरिकों के लिए होता है।",
    exampleEn:
      "If your total income is below the taxable limit, submitting the right form can prevent TDS.",
    exampleHi:
      "अगर आपकी आय टैक्स सीमा से कम है, तो सही फॉर्म जमा करने पर TDS नहीं कट सकता।",
    relatedTerms: ["tds"],
    icon: "description",
  },
];

export function getJargonTerm(id: string): JargonTerm | undefined {
  return JARGON_DICTIONARY.find((term) => term.id === id);
}
