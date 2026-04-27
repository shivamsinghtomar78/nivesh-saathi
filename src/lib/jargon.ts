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
      'It means "interest on interest." When the interest you earn gets added to your principal, the next time you earn interest on the increased amount too.',
    plainHi:
      'आसान भाषा में कहें तो, यह "ब्याज पर ब्याज" है। जब आपका कमाया हुआ ब्याज आपके मुख्य पैसे में जुड़ जाता है, तो अगली बार आपको उस बढ़े हुए पैसे पर भी ब्याज मिलता है।',
    exampleEn:
      "Deposit ₹10,000 at 10% p.a. → Year 1: ₹1,000 interest → Year 2: ₹1,100 interest (extra ₹100 because interest earned interest!)",
    exampleHi:
      "जमा राशि ₹10,000, साल 1 का ब्याज (10%) = ₹1,000 → साल 2 का निवेश ₹11,000 → साल 2 का ब्याज = ₹1,100",
    relatedTerms: ["pa", "maturity", "tenor"],
    icon: "trending_up",
  },
  {
    id: "pa",
    termEn: "p.a. (Per Annum)",
    termHi: "प्रति वर्ष (p.a.)",
    plainEn:
      'It stands for "per year." When a bank says 8.5% p.a., it means you earn 8.5% interest every year on your deposit.',
    plainHi:
      "साल भर में मिलने वाला ब्याज। जब बैंक कहे 8.5% p.a. तो मतलब हर साल ₹100 पर ₹8.50 ब्याज मिलेगा।",
    exampleEn: "₹10,000 at 8.5% p.a. = ₹850 interest per year",
    exampleHi: "₹10,000 पर 8.5% p.a. = साल में ₹850 ब्याज",
    relatedTerms: ["compound-interest", "maturity"],
    icon: "calendar_today",
  },
  {
    id: "tenor",
    termEn: "Tenor / Tenure",
    termHi: "अवधि (Tenor)",
    plainEn:
      "The duration for which you lock in your money in the FD. Longer tenor usually means higher interest rates.",
    plainHi:
      "आप कितने समय के लिए पैसा जमा रखेंगे। ज़्यादा अवधि = ज़्यादा ब्याज।",
    exampleEn:
      "12 month tenor = you get your money back after 1 year with interest",
    exampleHi: "12 महीने का tenor = 1 साल बाद पैसा + ब्याज वापस",
    relatedTerms: ["maturity", "pa"],
    icon: "hourglass_top",
  },
  {
    id: "maturity",
    termEn: "Maturity",
    termHi: "परिपक्वता (Maturity)",
    plainEn:
      "The date when your FD period ends and you get back your money with all the interest earned.",
    plainHi:
      "जिस दिन आपकी FD की अवधि पूरी होती है और आपको मूल राशि + पूरा ब्याज मिल जाता है।",
    exampleEn:
      "FD starts Jan 1 + 12 month tenor = Maturity on Jan 1 next year",
    exampleHi: "FD शुरू 1 जनवरी + 12 महीने = परिपक्वता 1 जनवरी अगले साल",
    relatedTerms: ["tenor", "compound-interest"],
    icon: "event_available",
  },
  {
    id: "tds",
    termEn: "TDS (Tax Deducted at Source)",
    termHi: "TDS (स्रोत पर कर कटौती)",
    plainEn:
      "The bank automatically deducts 10% tax on your interest if it exceeds ₹40,000/year (₹50,000 for seniors). You can avoid it by submitting Form 15G/15H.",
    plainHi:
      "ब्याज पर कटने वाला टैक्स — ₹40,000 से ज़्यादा ब्याज पर 10% TDS कटता है। Form 15G भरकर बचा सकते हैं।",
    exampleEn: "₹850 interest → TDS 10% = ₹85 deducted",
    exampleHi: "₹850 ब्याज → TDS 10% = ₹85 कटेगा",
    relatedTerms: ["pa", "form-15g"],
    icon: "receipt_long",
  },
  {
    id: "dicgc",
    termEn: "DICGC Insurance",
    termHi: "DICGC बीमा",
    plainEn:
      "Government guarantee on your deposit up to ₹5 Lakhs per bank. Even if the bank shuts down, you get your money back — guaranteed by RBI.",
    plainHi:
      "₹5 लाख तक सरकारी गारंटी — बैंक बंद हो जाए तो भी आपका पैसा सुरक्षित, RBI की गारंटी।",
    exampleEn: "Your ₹2,00,000 FD is 100% insured by DICGC",
    exampleHi: "आपकी ₹2,00,000 की FD पूरी तरह DICGC द्वारा बीमित है",
    relatedTerms: ["small-finance-bank"],
    icon: "verified_user",
  },
  {
    id: "small-finance-bank",
    termEn: "Small Finance Bank",
    termHi: "स्मॉल फाइनेंस बैंक",
    plainEn:
      "An RBI-licensed bank that offers higher FD rates. Equally safe — your money is DICGC insured just like SBI or HDFC.",
    plainHi:
      "RBI से मान्यता प्राप्त छोटा बैंक — ज़्यादा ब्याज देता है, लेकिन उतना ही सुरक्षित जितना SBI या HDFC।",
    exampleEn: "AU SFB gives 8.0% vs SBI 7.1% — both DICGC insured",
    exampleHi: "AU SFB: 8.0% vs SBI: 7.1% — दोनों DICGC बीमित",
    relatedTerms: ["dicgc"],
    icon: "account_balance",
  },
  {
    id: "form-15g",
    termEn: "Form 15G / 15H",
    termHi: "फॉर्म 15G / 15H",
    plainEn:
      "A form you submit to the bank to avoid TDS deduction. 15G is for people under 60, 15H is for senior citizens.",
    plainHi:
      "TDS बचाने के लिए बैंक में जमा किया जाने वाला फॉर्म। 15G: 60 साल से कम, 15H: वरिष्ठ नागरिकों के लिए।",
    exampleEn:
      "If your total income is below tax slab, submit Form 15G → zero TDS",
    exampleHi:
      "अगर आपकी आय टैक्स सीमा से कम है, तो Form 15G दें → कोई TDS नहीं कटेगा",
    relatedTerms: ["tds"],
    icon: "description",
  },
];

export function getJargonTerm(id: string): JargonTerm | undefined {
  return JARGON_DICTIONARY.find((t) => t.id === id);
}
