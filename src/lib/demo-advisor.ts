import { calculateMaturity } from "@/lib/maturity";
import { formatCurrency } from "@/lib/utils";

export type DemoLanguage = "hi" | "bho" | "bn" | "mr" | "ta";
export type DemoStep = "welcome" | "amount" | "tenor" | "senior" | "handoff";

export type DemoChoice = {
  id: string;
  value: string;
  label: string;
  shortLabel: string;
};

export type DemoGlossaryKey =
  | "pa"
  | "tenor"
  | "maturity"
  | "premature"
  | "tds"
  | "dicgc";

type LocalizedSet = Record<DemoLanguage, string>;

type DemoBankSeed = {
  id: string;
  bankName: string;
  shortName: string;
  officialUrl: string;
  regularRate: number;
  seniorRate: number;
  tenorMonths: number;
  compounding: "quarterly" | "monthly" | "annual";
  meaning: LocalizedSet;
  trustNote: LocalizedSet;
  prematureRule: LocalizedSet;
  badge: LocalizedSet;
};

export type DemoBankOption = {
  id: string;
  bankName: string;
  shortName: string;
  officialUrl: string;
  rate: number;
  tenorMonths: number;
  expectedReturn: string;
  maturityAmount: string;
  meaning: string;
  trustNote: string;
  prematureRule: string;
  badge: string;
};

type DemoCopyShape = {
  label: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  heroHint: string;
  sampleQuestion: string;
  quickPrompt: string;
  voiceReady: string;
  voiceUnavailable: string;
  statusReady: string;
  statusListening: string;
  statusProcessing: string;
  statusSpeaking: string;
  typePlaceholder: string;
  repeatLabel: string;
  resetLabel: string;
  compareTitle: string;
  glossaryTitle: string;
  journeyTitle: string;
  docsTitle: string;
  handoffTitle: string;
  selectedBankLabel: string;
  trustLabel: string;
  prematureLabel: string;
  returnLabel: string;
  pressSayLabel: string;
  amountStep: string;
  tenorStep: string;
  seniorStep: string;
  handoffStep: string;
  kycCta: string;
  bankPageCta: string;
  agentCta: string;
  docsChecklist: string[];
  handoffNote: string;
  introReply: (amount: string, maturity: string) => string;
  askAmount: string;
  askTenor: (amount: string) => string;
  askSenior: (amount: string, tenorLabel: string) => string;
  docsReply: (bankName: string) => string;
  handoffReply: (bankName: string) => string;
};

const bankSeeds: DemoBankSeed[] = [
  {
    id: "suryoday",
    bankName: "Suryoday Small Finance Bank",
    shortName: "Suryoday SFB",
    officialUrl: "https://www.suryodaybank.com/fixed-deposit",
    regularRate: 8.5,
    seniorRate: 9.1,
    tenorMonths: 12,
    compounding: "quarterly",
    meaning: {
      hi: "ज्यादा रिटर्न, small finance bank वाला विकल्प।",
      bho: "जादे रिटर्न, small finance bank वाला विकल्प।",
      bn: "রিটার্ন বেশি, small finance bank-এর অপশন।",
      mr: "जास्त परतावा, small finance bank पर्याय.",
      ta: "அதிக வருமானம் தரும் small finance bank தேர்வு.",
    },
    trustNote: {
      hi: "DICGC सुरक्षा 5 लाख तक, लेकिन बैंक छोटा है इसलिए कुछ users को extra comfort चाहिए होता है.",
      bho: "DICGC सुरक्षा 5 लाख ले, बाकिर बैंक छोट बा, एह से कुछ लोगन के थोड़ी जादे तसल्ली चाहीं.",
      bn: "DICGC সুরক্ষা 5 লাখ পর্যন্ত, তবে ব্যাংকটি ছোট বলে কেউ কেউ বাড়তি ভরসা চান.",
      mr: "DICGC सुरक्षा 5 लाखांपर्यंत, पण बँक लहान असल्याने काहींना अधिक आरामदायी पर्याय हवा असतो.",
      ta: "DICGC பாதுகாப்பு 5 லட்சம் வரை உள்ளது, ஆனால் இது சிறிய வங்கி என்பதால் சிலருக்கு கூடுதல் நம்பிக்கை தேவைப்படும்.",
    },
    prematureRule: {
      hi: "समय से पहले तोड़ने पर ब्याज कम हो सकता है और penalty लग सकती है.",
      bho: "समय से पहिले तोड़ब त ब्याज घट सकेला आ penalty लाग सकेला.",
      bn: "মেয়াদপূর্তির আগে ভাঙলে সুদ কমতে পারে এবং penalty লাগতে পারে.",
      mr: "मुदतपूर्वी मोडल्यास व्याज कमी होऊ शकते आणि दंड लागू शकतो.",
      ta: "காலத்துக்கு முன் உடைத்தால் வட்டி குறையலாம், penaltyவும் இருக்கலாம்.",
    },
    badge: {
      hi: "उच्च रिटर्न",
      bho: "जादे रिटर्न",
      bn: "উচ্চ রিটার্ন",
      mr: "उच्च परतावा",
      ta: "அதிக வருமானம்",
    },
  },
  {
    id: "sbi",
    bankName: "State Bank of India",
    shortName: "SBI",
    officialUrl:
      "https://sbi.co.in/web/personal-banking/investments-deposits/deposits",
    regularRate: 7.25,
    seniorRate: 7.75,
    tenorMonths: 12,
    compounding: "quarterly",
    meaning: {
      hi: "रिटर्न थोड़ा कम, पर बड़ा public bank होने से comfort ज्यादा.",
      bho: "रिटर्न थोड़े कम, बाकिर बड़ा public bank होखे से भरोसा जादे.",
      bn: "রিটার্ন একটু কম, কিন্তু বড় public bank হওয়ায় স্বস্তি বেশি.",
      mr: "परतावा थोडा कमी, पण मोठा public bank असल्याने आराम जास्त.",
      ta: "வருமானம் கொஞ்சம் குறைவு, ஆனால் பெரிய public bank என்பதால் நிம்மதி அதிகம்.",
    },
    trustNote: {
      hi: "शाखाएं ज्यादा, परिचित नाम, और conservative users के लिए आसान choice.",
      bho: "शाखा जादे, नाम परिचित, आ conservative लोग खातिर आसान choice.",
      bn: "শাখা বেশি, পরিচিত নাম, আর conservative ব্যবহারকারীর জন্য সহজ পছন্দ.",
      mr: "शाखा जास्त, परिचित नाव, आणि conservative वापरकर्त्यांसाठी सोपा पर्याय.",
      ta: "கிளைகள் அதிகம், பரிச்சயமான பெயர், conservative பயனர்களுக்கு எளிய தேர்வு.",
    },
    prematureRule: {
      hi: "मध्य में तोड़ने पर rate रीसेट हो सकता है और छोटा penalty कट सकता है.",
      bho: "बीच में तोड़ला पर rate बदल सकेला आ हल्का penalty कट सकेला.",
      bn: "মাঝপথে ভাঙলে rate reset হতে পারে এবং ছোট penalty কাটা হতে পারে.",
      mr: "मध्ये मोडल्यास rate reset होऊ शकतो आणि थोडा penalty लागू शकतो.",
      ta: "நடுவில் உடைத்தால் rate reset ஆகலாம், சிறிய penalty இருக்கலாம்.",
    },
    badge: {
      hi: "भरोसेमंद",
      bho: "भरोसेमंद",
      bn: "ভরসার",
      mr: "विश्वासार्ह",
      ta: "நம்பகமானது",
    },
  },
  {
    id: "hdfc",
    bankName: "HDFC Bank",
    shortName: "HDFC",
    officialUrl: "https://www.hdfcbank.com/personal/save/deposits/fixed-deposit",
    regularRate: 7.75,
    seniorRate: 8.25,
    tenorMonths: 18,
    compounding: "quarterly",
    meaning: {
      hi: "थोड़ा लंबा lock-in, लेकिन return और comfort का balanced mix.",
      bho: "थोड़ा लंबा lock-in, बाकिर return आ comfort दुनो के balance.",
      bn: "কিছুটা বেশি lock-in, তবে return আর comfort-এর balanced mix.",
      mr: "थोडा जास्त lock-in, पण परतावा आणि comfort यांचा संतुलित पर्याय.",
      ta: "சிறிது நீண்ட lock-in, ஆனால் வருமானமும் நம்பிக்கையும் சமநிலையுடன்.",
    },
    trustNote: {
      hi: "Private bank comfort, digital journey आसान, लेकिन tenure लंबा है.",
      bho: "Private bank comfort, digital journey आसान, बाकिर tenure लंबा बा.",
      bn: "Private bank comfort, digital journey সহজ, তবে tenure একটু বেশি.",
      mr: "Private bank comfort, digital journey सोपी, पण tenure लांब आहे.",
      ta: "Private bank comfort, digital பயணம் எளிது, ஆனால் tenure நீளம் அதிகம்.",
    },
    prematureRule: {
      hi: "जल्दी निकालने पर applicable rate और penalty दोनों असर डाल सकते हैं.",
      bho: "जल्दी निकाले पर applicable rate आ penalty दुनो असर डाली.",
      bn: "আগে তুললে applicable rate আর penalty দুটোই প্রভাব ফেলতে পারে.",
      mr: "लवकर काढल्यास applicable rate आणि penalty दोन्ही लागू पडू शकतात.",
      ta: "முன்கூட்டியே எடுத்தால் applicable rate, penalty இரண்டும் பாதிக்கலாம்.",
    },
    badge: {
      hi: "संतुलित",
      bho: "संतुलित",
      bn: "সামঞ্জস্যপূর্ণ",
      mr: "संतुलित",
      ta: "சமநிலை",
    },
  },
];

const amountChoices: Record<DemoLanguage, DemoChoice[]> = {
  hi: [
    { id: "amount-10", value: "10000", label: "1. 10 हजार", shortLabel: "₹10,000" },
    { id: "amount-50", value: "50000", label: "2. 50 हजार", shortLabel: "₹50,000" },
    { id: "amount-100", value: "100000", label: "3. 1 लाख", shortLabel: "₹1,00,000" },
  ],
  bho: [
    { id: "amount-10", value: "10000", label: "1. 10 हजार", shortLabel: "₹10,000" },
    { id: "amount-50", value: "50000", label: "2. 50 हजार", shortLabel: "₹50,000" },
    { id: "amount-100", value: "100000", label: "3. 1 लाख", shortLabel: "₹1,00,000" },
  ],
  bn: [
    { id: "amount-10", value: "10000", label: "1. 10 হাজার", shortLabel: "₹10,000" },
    { id: "amount-50", value: "50000", label: "2. 50 হাজার", shortLabel: "₹50,000" },
    { id: "amount-100", value: "100000", label: "3. 1 লাখ", shortLabel: "₹1,00,000" },
  ],
  mr: [
    { id: "amount-10", value: "10000", label: "1. 10 हजार", shortLabel: "₹10,000" },
    { id: "amount-50", value: "50000", label: "2. 50 हजार", shortLabel: "₹50,000" },
    { id: "amount-100", value: "100000", label: "3. 1 लाख", shortLabel: "₹1,00,000" },
  ],
  ta: [
    { id: "amount-10", value: "10000", label: "1. 10 ஆயிரம்", shortLabel: "₹10,000" },
    { id: "amount-50", value: "50000", label: "2. 50 ஆயிரம்", shortLabel: "₹50,000" },
    { id: "amount-100", value: "100000", label: "3. 1 லட்சம்", shortLabel: "₹1,00,000" },
  ],
};

const tenorChoices: Record<DemoLanguage, DemoChoice[]> = {
  hi: [
    { id: "tenor-6", value: "6", label: "1. 6 महीने", shortLabel: "6M" },
    { id: "tenor-12", value: "12", label: "2. 12 महीने", shortLabel: "12M" },
    { id: "tenor-18", value: "18", label: "3. 18 महीने", shortLabel: "18M" },
  ],
  bho: [
    { id: "tenor-6", value: "6", label: "1. 6 महीना", shortLabel: "6M" },
    { id: "tenor-12", value: "12", label: "2. 12 महीना", shortLabel: "12M" },
    { id: "tenor-18", value: "18", label: "3. 18 महीना", shortLabel: "18M" },
  ],
  bn: [
    { id: "tenor-6", value: "6", label: "1. 6 মাস", shortLabel: "6M" },
    { id: "tenor-12", value: "12", label: "2. 12 মাস", shortLabel: "12M" },
    { id: "tenor-18", value: "18", label: "3. 18 মাস", shortLabel: "18M" },
  ],
  mr: [
    { id: "tenor-6", value: "6", label: "1. 6 महिने", shortLabel: "6M" },
    { id: "tenor-12", value: "12", label: "2. 12 महिने", shortLabel: "12M" },
    { id: "tenor-18", value: "18", label: "3. 18 महिने", shortLabel: "18M" },
  ],
  ta: [
    { id: "tenor-6", value: "6", label: "1. 6 மாதங்கள்", shortLabel: "6M" },
    { id: "tenor-12", value: "12", label: "2. 12 மாதங்கள்", shortLabel: "12M" },
    { id: "tenor-18", value: "18", label: "3. 18 மாதங்கள்", shortLabel: "18M" },
  ],
};

const seniorChoices: Record<DemoLanguage, DemoChoice[]> = {
  hi: [
    { id: "senior-yes", value: "yes", label: "1. हां, senior citizen", shortLabel: "हां" },
    { id: "senior-no", value: "no", label: "2. नहीं", shortLabel: "नहीं" },
  ],
  bho: [
    { id: "senior-yes", value: "yes", label: "1. हां, senior citizen", shortLabel: "हां" },
    { id: "senior-no", value: "no", label: "2. ना", shortLabel: "ना" },
  ],
  bn: [
    { id: "senior-yes", value: "yes", label: "1. হ্যাঁ, senior citizen", shortLabel: "হ্যাঁ" },
    { id: "senior-no", value: "no", label: "2. না", shortLabel: "না" },
  ],
  mr: [
    { id: "senior-yes", value: "yes", label: "1. हो, senior citizen", shortLabel: "हो" },
    { id: "senior-no", value: "no", label: "2. नाही", shortLabel: "नाही" },
  ],
  ta: [
    { id: "senior-yes", value: "yes", label: "1. ஆம், senior citizen", shortLabel: "ஆம்" },
    { id: "senior-no", value: "no", label: "2. இல்லை", shortLabel: "இல்லை" },
  ],
};

export const handoffChoices: Record<DemoLanguage, DemoChoice[]> = {
  hi: [
    { id: "handoff-kyc", value: "kyc", label: "1. KYC handoff", shortLabel: "KYC" },
    { id: "handoff-bank", value: "bank", label: "2. बैंक booking page", shortLabel: "बैंक" },
    { id: "handoff-agent", value: "agent", label: "3. एजेंट callback", shortLabel: "एजेंट" },
  ],
  bho: [
    { id: "handoff-kyc", value: "kyc", label: "1. KYC handoff", shortLabel: "KYC" },
    { id: "handoff-bank", value: "bank", label: "2. बैंक booking page", shortLabel: "बैंक" },
    { id: "handoff-agent", value: "agent", label: "3. एजेंट callback", shortLabel: "एजेंट" },
  ],
  bn: [
    { id: "handoff-kyc", value: "kyc", label: "1. KYC handoff", shortLabel: "KYC" },
    { id: "handoff-bank", value: "bank", label: "2. ব্যাংক booking page", shortLabel: "ব্যাংক" },
    { id: "handoff-agent", value: "agent", label: "3. এজেন্ট callback", shortLabel: "এজেন্ট" },
  ],
  mr: [
    { id: "handoff-kyc", value: "kyc", label: "1. KYC handoff", shortLabel: "KYC" },
    { id: "handoff-bank", value: "bank", label: "2. बँक booking page", shortLabel: "बँक" },
    { id: "handoff-agent", value: "agent", label: "3. एजंट callback", shortLabel: "एजंट" },
  ],
  ta: [
    { id: "handoff-kyc", value: "kyc", label: "1. KYC handoff", shortLabel: "KYC" },
    { id: "handoff-bank", value: "bank", label: "2. வங்கி booking page", shortLabel: "வங்கி" },
    { id: "handoff-agent", value: "agent", label: "3. ஏஜென்ட் callback", shortLabel: "ஏஜென்ட்" },
  ],
};

export const glossaryItems: Record<
  DemoLanguage,
  Array<{ key: DemoGlossaryKey; term: string; plain: string }>
> = {
  hi: [
    { key: "pa", term: "p.a.", plain: "हर साल मिलने वाला ब्याज प्रतिशत." },
    { key: "tenor", term: "Tenor", plain: "कितने समय के लिए पैसा लॉक रहेगा." },
    { key: "maturity", term: "Maturity", plain: "अवधि पूरी होने पर मिलने वाली कुल रकम." },
    { key: "premature", term: "Premature withdrawal", plain: "समय से पहले FD तोड़ना." },
    { key: "tds", term: "TDS", plain: "ब्याज पर लगने वाली टैक्स कटौती." },
    { key: "dicgc", term: "DICGC", plain: "बैंक जमा पर 5 लाख तक की बीमा सुरक्षा." },
  ],
  bho: [
    { key: "pa", term: "p.a.", plain: "हर साल मिले वाला ब्याज प्रतिशत." },
    { key: "tenor", term: "Tenor", plain: "कते दिन खातिर पैसा लॉक रही." },
    { key: "maturity", term: "Maturity", plain: "अवधि पूरा भइला पर कुल मिले वाली रकम." },
    { key: "premature", term: "Premature withdrawal", plain: "समय से पहिले FD तोड़े के." },
    { key: "tds", term: "TDS", plain: "ब्याज पर लागे वाली टैक्स कटौती." },
    { key: "dicgc", term: "DICGC", plain: "बैंक जमा पर 5 लाख ले बीमा सुरक्षा." },
  ],
  bn: [
    { key: "pa", term: "p.a.", plain: "প্রতি বছরে যত সুদ পাওয়া যায়." },
    { key: "tenor", term: "Tenor", plain: "কতদিন টাকা lock থাকবে." },
    { key: "maturity", term: "Maturity", plain: "মেয়াদ শেষে মোট যে টাকা পাবেন." },
    { key: "premature", term: "Premature withdrawal", plain: "মেয়াদের আগে FD ভাঙা." },
    { key: "tds", term: "TDS", plain: "সুদের উপর কাটা ট্যাক্স." },
    { key: "dicgc", term: "DICGC", plain: "ব্যাংক ডিপোজিটে 5 লাখ পর্যন্ত বিমা সুরক্ষা." },
  ],
  mr: [
    { key: "pa", term: "p.a.", plain: "दर वर्षी मिळणारा व्याजाचा टक्का." },
    { key: "tenor", term: "Tenor", plain: "पैसे किती काळासाठी लॉक राहतील." },
    { key: "maturity", term: "Maturity", plain: "मुदत पूर्ण झाल्यावर मिळणारी एकूण रक्कम." },
    { key: "premature", term: "Premature withdrawal", plain: "मुदतपूर्वी FD तोडणे." },
    { key: "tds", term: "TDS", plain: "व्याजावर होणारी कर कपात." },
    { key: "dicgc", term: "DICGC", plain: "बँक ठेवींवर 5 लाखांपर्यंत विमा संरक्षण." },
  ],
  ta: [
    { key: "pa", term: "p.a.", plain: "ஒவ்வோர் ஆண்டும் கிடைக்கும் வட்டி சதவீதம்." },
    { key: "tenor", term: "Tenor", plain: "பணம் எத்தனை காலம் lock ஆகும்." },
    { key: "maturity", term: "Maturity", plain: "காலம் முடிந்தபின் கிடைக்கும் மொத்த தொகை." },
    { key: "premature", term: "Premature withdrawal", plain: "காலத்திற்கு முன் FD உடைத்தல்." },
    { key: "tds", term: "TDS", plain: "வட்டியில் பிடிக்கப்படும் வரி." },
    { key: "dicgc", term: "DICGC", plain: "வங்கி வைப்பில் 5 லட்சம் வரை காப்பீடு." },
  ],
};

export const demoCopy: Record<DemoLanguage, DemoCopyShape> = {
  hi: {
    label: "हिंदी",
    heroBadge: "Voice-first FD advisor",
    heroTitle: "एफडी समझनी है? बात करके समझिए.",
    heroSubtitle:
      "हिंदी और regional voice में सवाल पूछिए, 3 बैंक विकल्प compare कीजिए, और KYC handoff तक guided flow पाइए.",
    heroCta: "डेमो चैट शुरू करें",
    heroHint: "Mic दबाइए या sample सवाल से शुरू कीजिए",
    sampleQuestion:
      "गोरखपुर में सूर्योदय बैंक का 8.5 प्रतिशत FD दिख रहा है, क्या करना चाहिए?",
    quickPrompt: "नमूना सवाल",
    voiceReady: "हिंदी voice ready",
    voiceUnavailable: "इस browser में mic support सीमित है",
    statusReady: "पूछिए, मैं FD को आसान भाषा में समझाऊंगा.",
    statusListening: "सुन रहा हूं...",
    statusProcessing: "जवाब तैयार कर रहा हूं...",
    statusSpeaking: "आवाज में जवाब दे रहा हूं...",
    typePlaceholder: "बोलकर या type करके पूछिए...",
    repeatLabel: "Repeat",
    resetLabel: "Reset",
    compareTitle: "आज के 3 आसान विकल्प",
    glossaryTitle: "सीधी भाषा में शब्द",
    journeyTitle: "अगले कदम",
    docsTitle: "KYC के लिए दस्तावेज",
    handoffTitle: "Booking से पहले handoff",
    selectedBankLabel: "फिलहाल सुझाया बैंक",
    trustLabel: "भरोसा note",
    prematureLabel: "Premature withdrawal",
    returnLabel: "Expected return",
    pressSayLabel: "press/say 1, 2, 3",
    amountStep: "राशि चुनें",
    tenorStep: "अवधि चुनें",
    seniorStep: "Senior citizen status",
    handoffStep: "KYC handoff",
    kycCta: "KYC handoff तैयार करें",
    bankPageCta: "Official bank page खोलें",
    agentCta: "Agent callback note",
    docsChecklist: [
      "आधार या अन्य KYC ID",
      "PAN कार्ड",
      "बैंक से जुड़ा mobile number",
      "एक हाल की फोटो",
    ],
    handoffNote:
      "यह prototype actual FD purchase नहीं करता. यह user को KYC या official booking journey तक confidently पहुंचाता है.",
    introReply: (amount, maturity) =>
      `यह Fixed Deposit है. अगर आप ${amount} को 12 महीनों के लिए रखें, तो 8.5% सालाना ब्याज पर maturity के समय लगभग ${maturity} मिल सकते हैं. मैंने नीचे 3 आसान विकल्प compare करके रखे हैं ताकि return और भरोसा दोनों साफ दिखें.`,
    askAmount:
      "अब बताइए, आप FD में कितना पैसा रखना चाहेंगे? 1. 10 हजार  2. 50 हजार  3. 1 लाख",
    askTenor: (amount) =>
      `ठीक है, ${amount} के लिए अगला कदम tenure चुनना है. 1. 6 महीने  2. 12 महीने  3. 18 महीने`,
    askSenior: (amount, tenorLabel) =>
      `समझ गया. ${amount} को ${tenorLabel} के लिए रखना है. क्या यह senior citizen FD होगी? 1. हां  2. नहीं`,
    docsReply: (bankName) =>
      `${bankName} के लिए KYC handoff ready है. आधार, PAN, linked mobile और फोटो पास रखिए. अगर ब्याज सीमा से ऊपर जाएगा तो TDS कट सकता है. DICGC सुरक्षा बैंक प्रति जमाकर्ता 5 लाख तक लागू होती है.`,
    handoffReply: (bankName) =>
      `अगला कदम साफ है. ${bankName} के official page, KYC desk, या agent callback में से कोई एक चुनिए. यह demo booking से पहले तक आपकी पूरी मदद करेगा.`,
  },
  bho: {
    label: "भोजपुरी",
    heroBadge: "Voice-first FD advisor",
    heroTitle: "एफडी बुझहीं? चलीं, बात करीं.",
    heroSubtitle:
      "आवाज में पूछीं, तीन बैंक विकल्प देखीं, आ KYC handoff ले guided flow पाईं.",
    heroCta: "चैट शुरू करीं",
    heroHint: "Mic दबाईं या sample सवाल उठाईं",
    sampleQuestion:
      "गोरखपुर में सूर्योदय बैंक के 8.5 प्रतिशत एफडी देखात बा, अब का करीं?",
    quickPrompt: "नमूना सवाल",
    voiceReady: "भोजपुरी voice ready",
    voiceUnavailable: "ए browser में mic support थोड़ा सीमित बा",
    statusReady: "पूछीं, हम FD के आसान भाषा में समझाइब.",
    statusListening: "सुनत बानी...",
    statusProcessing: "जवाब बनावत बानी...",
    statusSpeaking: "आवाज में जवाब देत बानी...",
    typePlaceholder: "बोलके या type करके पूछीं...",
    repeatLabel: "फेर सुनाईं",
    resetLabel: "फेर से",
    compareTitle: "आज के 3 आसान विकल्प",
    glossaryTitle: "सीधा मतलब",
    journeyTitle: "अगिला कदम",
    docsTitle: "KYC खातिर कागज",
    handoffTitle: "Booking से पहिले handoff",
    selectedBankLabel: "फिलहाल सुझावल बैंक",
    trustLabel: "भरोसा note",
    prematureLabel: "Premature withdrawal",
    returnLabel: "Expected return",
    pressSayLabel: "press/say 1, 2, 3",
    amountStep: "रकम चुनल",
    tenorStep: "अवधि चुनल",
    seniorStep: "Senior citizen status",
    handoffStep: "KYC handoff",
    kycCta: "KYC handoff तैयार करीं",
    bankPageCta: "Official bank page खोलीं",
    agentCta: "Agent callback note",
    docsChecklist: [
      "आधार या दुसरका KYC ID",
      "PAN कार्ड",
      "बैंक से जुड़ल mobile number",
      "एक हाल के फोटो",
    ],
    handoffNote:
      "ई prototype actual FD purchase नइखे करत. बस user के KYC या official booking journey ले पहुंचावत बा.",
    introReply: (amount, maturity) =>
      `ई Fixed Deposit बा. अगर रउआ ${amount} के 12 महीना खातिर रखब, त 8.5% सालाना ब्याज पर maturity पर करीब ${maturity} मिल सकेला. नीचे 3 आसान विकल्प रखले बानी ताकि return आ भरोसा दुनो साफ हो जाए.`,
    askAmount:
      "अब बताईं, रउआ FD में कतना पैसा रखे चाहब? 1. 10 हजार  2. 50 हजार  3. 1 लाख",
    askTenor: (amount) =>
      `ठीक बा, ${amount} खातिर अगिला कदम tenure चुने के बा. 1. 6 महीना  2. 12 महीना  3. 18 महीना`,
    askSenior: (amount, tenorLabel) =>
      `समझ गइल. ${amount} के ${tenorLabel} खातिर राखे के बा. का ई senior citizen FD होई? 1. हां  2. ना`,
    docsReply: (bankName) =>
      `${bankName} खातिर KYC handoff ready बा. आधार, PAN, linked mobile आ फोटो लगे राखीं. ब्याज सीमा ऊपर गइल त TDS कट सकेला. DICGC सुरक्षा 5 लाख ले लागू होला.`,
    handoffReply: (bankName) =>
      `अब अगिला कदम साफ बा. ${bankName} के official page, KYC desk, या agent callback में से एक चुन लीं. Demo booking से पहिले तक पूरा guide करी.`,
  },
  bn: {
    label: "বাংলা",
    heroBadge: "Voice-first FD advisor",
    heroTitle: "FD বুঝতে চান? কথা বলেই বুঝুন.",
    heroSubtitle:
      "ভয়েসে জিজ্ঞেস করুন, 3টি ব্যাংক অপশন তুলনা করুন, আর KYC handoff পর্যন্ত guided flow পান.",
    heroCta: "চ্যাট শুরু করুন",
    heroHint: "Mic চাপুন বা sample প্রশ্ন দিয়ে শুরু করুন",
    sampleQuestion:
      "গোরখপুরে সূর্যোদয় ব্যাংকের 8.5 শতাংশ FD দেখাচ্ছে, এখন কী করা উচিত?",
    quickPrompt: "নমুনা প্রশ্ন",
    voiceReady: "বাংলা voice ready",
    voiceUnavailable: "এই browser-এ mic support সীমিত",
    statusReady: "জিজ্ঞেস করুন, আমি FD সহজ ভাষায় বুঝিয়ে দেব.",
    statusListening: "শুনছি...",
    statusProcessing: "উত্তর তৈরি করছি...",
    statusSpeaking: "ভয়েসে উত্তর দিচ্ছি...",
    typePlaceholder: "বলুন বা type করে জিজ্ঞেস করুন...",
    repeatLabel: "আবার শুনুন",
    resetLabel: "রিসেট",
    compareTitle: "আজকের 3টি সহজ অপশন",
    glossaryTitle: "সহজ ভাষার শব্দ",
    journeyTitle: "পরের ধাপ",
    docsTitle: "KYC-এর জন্য কাগজপত্র",
    handoffTitle: "Booking-এর আগে handoff",
    selectedBankLabel: "এখনকার পছন্দের ব্যাংক",
    trustLabel: "ভরসার note",
    prematureLabel: "Premature withdrawal",
    returnLabel: "Expected return",
    pressSayLabel: "press/say 1, 2, 3",
    amountStep: "অর্থের পরিমাণ",
    tenorStep: "মেয়াদ নির্বাচন",
    seniorStep: "Senior citizen status",
    handoffStep: "KYC handoff",
    kycCta: "KYC handoff প্রস্তুত করুন",
    bankPageCta: "Official bank page খুলুন",
    agentCta: "Agent callback note",
    docsChecklist: [
      "আধার বা অন্য KYC ID",
      "PAN card",
      "ব্যাংকের সাথে যুক্ত mobile number",
      "একটি সাম্প্রতিক ছবি",
    ],
    handoffNote:
      "এই prototype actual FD purchase করে না. এটি user-কে KYC বা official booking journey পর্যন্ত আত্মবিশ্বাসের সাথে নিয়ে যায়.",
    introReply: (amount, maturity) =>
      `এটা Fixed Deposit. আপনি যদি ${amount} 12 মাসের জন্য রাখেন, 8.5% বার্ষিক সুদে maturity-তে প্রায় ${maturity} পেতে পারেন. নিচে 3টি সহজ অপশন রেখেছি যাতে return আর ভরসা দুটোই স্পষ্ট হয়.`,
    askAmount:
      "এখন বলুন, আপনি FD-তে কত টাকা রাখবেন? 1. 10 হাজার  2. 50 হাজার  3. 1 লাখ",
    askTenor: (amount) =>
      `ঠিক আছে, ${amount}-এর জন্য এখন tenure বেছে নিন. 1. 6 মাস  2. 12 মাস  3. 18 মাস`,
    askSenior: (amount, tenorLabel) =>
      `বুঝেছি. ${amount} ${tenorLabel} জন্য রাখতে চান. এটা কি senior citizen FD? 1. হ্যাঁ  2. না`,
    docsReply: (bankName) =>
      `${bankName}-এর জন্য KYC handoff ready. আধার, PAN, linked mobile আর photo কাছে রাখুন. সুদ বেশি হলে TDS কাটতে পারে. DICGC সুরক্ষা 5 লাখ পর্যন্ত প্রযোজ্য.`,
    handoffReply: (bankName) =>
      `এখন পরের ধাপ পরিষ্কার. ${bankName}-এর official page, KYC desk, বা agent callback-এর মধ্যে একটি বেছে নিন. Demo booking-এর আগে পর্যন্ত পুরো সাহায্য দেবে.`,
  },
  mr: {
    label: "मराठी",
    heroBadge: "Voice-first FD advisor",
    heroTitle: "FD समजून घ्यायची आहे? बोलून समजा.",
    heroSubtitle:
      "आवाजात विचारा, 3 बँक पर्याय compare करा, आणि KYC handoff पर्यंत guided flow मिळवा.",
    heroCta: "चॅट सुरू करा",
    heroHint: "Mic दाबा किंवा sample प्रश्नाने सुरुवात करा",
    sampleQuestion:
      "गोरखपूरमध्ये सूर्योदय बँकेचा 8.5 टक्के FD दिसतोय, आता काय करावे?",
    quickPrompt: "नमुना प्रश्न",
    voiceReady: "मराठी voice ready",
    voiceUnavailable: "या browser मध्ये mic support मर्यादित आहे",
    statusReady: "विचारा, मी FD सोप्या भाषेत समजावून सांगतो.",
    statusListening: "ऐकत आहे...",
    statusProcessing: "उत्तर तयार करत आहे...",
    statusSpeaking: "आवाजात उत्तर देत आहे...",
    typePlaceholder: "बोलून किंवा type करून विचारा...",
    repeatLabel: "पुन्हा ऐका",
    resetLabel: "रीसेट",
    compareTitle: "आजचे 3 सोपे पर्याय",
    glossaryTitle: "सोप्या भाषेतील शब्द",
    journeyTitle: "पुढचे पाऊल",
    docsTitle: "KYC साठी कागदपत्रे",
    handoffTitle: "Booking आधी handoff",
    selectedBankLabel: "सध्या निवडलेला बँक पर्याय",
    trustLabel: "विश्वास note",
    prematureLabel: "Premature withdrawal",
    returnLabel: "Expected return",
    pressSayLabel: "press/say 1, 2, 3",
    amountStep: "रक्कम निवडा",
    tenorStep: "कालावधी निवडा",
    seniorStep: "Senior citizen status",
    handoffStep: "KYC handoff",
    kycCta: "KYC handoff तयार करा",
    bankPageCta: "Official bank page उघडा",
    agentCta: "Agent callback note",
    docsChecklist: [
      "आधार किंवा इतर KYC ID",
      "PAN card",
      "बँकेशी जोडलेला mobile number",
      "एक अलीकडचा फोटो",
    ],
    handoffNote:
      "हा prototype actual FD purchase करत नाही. तो user ला KYC किंवा official booking journey पर्यंत आत्मविश्वासाने घेऊन जातो.",
    introReply: (amount, maturity) =>
      `हा Fixed Deposit आहे. तुम्ही ${amount} 12 महिन्यांसाठी ठेवल्यास 8.5% वार्षिक व्याजाने maturity वेळी सुमारे ${maturity} मिळू शकतात. खाली 3 सोपे पर्याय दिले आहेत जेणेकरून परतावा आणि विश्वास दोन्ही स्पष्ट दिसतील.`,
    askAmount:
      "आता सांगा, FD मध्ये किती रक्कम ठेवायची आहे? 1. 10 हजार  2. 50 हजार  3. 1 लाख",
    askTenor: (amount) =>
      `ठीक आहे, ${amount} साठी आता tenure निवडा. 1. 6 महिने  2. 12 महिने  3. 18 महिने`,
    askSenior: (amount, tenorLabel) =>
      `समजले. ${amount} ${tenorLabel} साठी ठेवायचे आहे. ही senior citizen FD आहे का? 1. हो  2. नाही`,
    docsReply: (bankName) =>
      `${bankName} साठी KYC handoff ready आहे. आधार, PAN, linked mobile आणि फोटो जवळ ठेवा. व्याज मर्यादा ओलांडल्यास TDS लागू होऊ शकतो. DICGC संरक्षण 5 लाखांपर्यंत लागू आहे.`,
    handoffReply: (bankName) =>
      `आता पुढचे पाऊल स्पष्ट आहे. ${bankName} चे official page, KYC desk, किंवा agent callback यापैकी एक निवडा. Demo booking आधीपर्यंत पूर्ण मदत करेल.`,
  },
  ta: {
    label: "தமிழ்",
    heroBadge: "Voice-first FD advisor",
    heroTitle: "FD புரியணுமா? பேசிப் புரிந்துகொள்ளுங்கள்.",
    heroSubtitle:
      "வாய்ஸில் கேளுங்கள், 3 வங்கி விருப்பங்களை compare செய்யுங்கள், KYC handoff வரை guided flow பெறுங்கள்.",
    heroCta: "சாட் தொடங்குங்கள்",
    heroHint: "Mic அழுத்துங்கள் அல்லது sample கேள்வியுடன் தொடங்குங்கள்",
    sampleQuestion:
      "கோரக்பூரில் சூர்யோதய வங்கியின் 8.5 சதவீத FD காட்டுகிறது, இப்போது என்ன செய்ய வேண்டும்?",
    quickPrompt: "மாதிரி கேள்வி",
    voiceReady: "தமிழ் voice ready",
    voiceUnavailable: "இந்த browser-ல் mic support குறைவு",
    statusReady: "கேளுங்கள், நான் FD-ஐ எளிய மொழியில் விளக்குகிறேன்.",
    statusListening: "கேட்கிறேன்...",
    statusProcessing: "பதில் தயார் செய்கிறேன்...",
    statusSpeaking: "குரலில் பதில் சொல்கிறேன்...",
    typePlaceholder: "பேசுங்கள் அல்லது type செய்து கேளுங்கள்...",
    repeatLabel: "மீண்டும்",
    resetLabel: "ரீசெட்",
    compareTitle: "இன்றைய 3 எளிய விருப்பங்கள்",
    glossaryTitle: "எளிய சொற்கள்",
    journeyTitle: "அடுத்த படி",
    docsTitle: "KYC ஆவணங்கள்",
    handoffTitle: "Booking முன் handoff",
    selectedBankLabel: "இப்போது பரிந்துரைக்கப்படும் வங்கி",
    trustLabel: "நம்பிக்கை note",
    prematureLabel: "Premature withdrawal",
    returnLabel: "Expected return",
    pressSayLabel: "press/say 1, 2, 3",
    amountStep: "தொகை தேர்வு",
    tenorStep: "காலம் தேர்வு",
    seniorStep: "Senior citizen status",
    handoffStep: "KYC handoff",
    kycCta: "KYC handoff தயார் செய்யுங்கள்",
    bankPageCta: "Official bank page திறக்கவும்",
    agentCta: "Agent callback note",
    docsChecklist: [
      "ஆதார் அல்லது மற்ற KYC ID",
      "PAN card",
      "வங்கியுடன் இணைந்த mobile number",
      "ஒரு சமீபத்திய புகைப்படம்",
    ],
    handoffNote:
      "இந்த prototype actual FD purchase செய்யாது. இது user-ஐ KYC அல்லது official booking journey வரை நம்பிக்கையுடன் அழைத்து செல்கிறது.",
    introReply: (amount, maturity) =>
      `இது Fixed Deposit. நீங்கள் ${amount} ஐ 12 மாதங்களுக்கு வைத்தால், 8.5% ஆண்டு வட்டியில் maturity-யில் சுமார் ${maturity} கிடைக்கலாம். கீழே return மற்றும் நம்பிக்கை இரண்டையும் தெளிவாக காட்ட 3 எளிய விருப்பங்கள் உள்ளன.`,
    askAmount:
      "இப்போது சொல்லுங்கள், FD-ல் எவ்வளவு பணம் வைக்க விரும்புகிறீர்கள்? 1. 10 ஆயிரம்  2. 50 ஆயிரம்  3. 1 லட்சம்",
    askTenor: (amount) =>
      `சரி, ${amount} க்கு இப்போது tenure தேர்வு செய்யுங்கள். 1. 6 மாதங்கள்  2. 12 மாதங்கள்  3. 18 மாதங்கள்`,
    askSenior: (amount, tenorLabel) =>
      `புரிந்தது. ${amount} ஐ ${tenorLabel} க்கு வைக்கிறீர்கள். இது senior citizen FD ஆ? 1. ஆம்  2. இல்லை`,
    docsReply: (bankName) =>
      `${bankName} க்கு KYC handoff ready. ஆதார், PAN, linked mobile, photo தயார் வைத்துக்கொள்ளுங்கள். வட்டி வரம்பை மீறினால் TDS இருக்கலாம். DICGC பாதுகாப்பு 5 லட்சம் வரை பொருந்தும்.`,
    handoffReply: (bankName) =>
      `அடுத்த படி தெளிவாக இருக்கிறது. ${bankName} official page, KYC desk, அல்லது agent callback ஆகியவற்றில் ஒன்றைத் தேர்வு செய்யுங்கள். Demo booking முன் வரை முழு வழிகாட்டுதலை தரும்.`,
  },
};

export const demoLanguages = Object.keys(demoCopy) as DemoLanguage[];

export function getAmountChoices(language: DemoLanguage) {
  return amountChoices[language];
}

export function getTenorChoices(language: DemoLanguage) {
  return tenorChoices[language];
}

export function getSeniorChoices(language: DemoLanguage) {
  return seniorChoices[language];
}

export function getAmountShortLabel(language: DemoLanguage, amount: number) {
  return (
    amountChoices[language].find((choice) => Number(choice.value) === amount)?.shortLabel ??
    formatCurrency(amount)
  );
}

export function getTenorShortLabel(language: DemoLanguage, months: number) {
  return (
    tenorChoices[language].find((choice) => Number(choice.value) === months)?.shortLabel ??
    `${months}M`
  );
}

export function buildComparisonOptions(params: {
  language: DemoLanguage;
  amount: number;
  tenorMonths: number;
  seniorCitizen: boolean;
}) {
  const { language, amount, seniorCitizen } = params;

  return bankSeeds.map((bank) => {
    const rate = seniorCitizen ? bank.seniorRate : bank.regularRate;
    const result = calculateMaturity({
      principal: amount,
      ratePercent: rate,
      tenorMonths: bank.tenorMonths,
      compounding: bank.compounding,
    });

    return {
      id: bank.id,
      bankName: bank.bankName,
      shortName: bank.shortName,
      officialUrl: bank.officialUrl,
      rate,
      tenorMonths: bank.tenorMonths,
      expectedReturn: formatCurrency(result.interestEarned),
      maturityAmount: formatCurrency(result.maturityAmount),
      meaning: bank.meaning[language],
      trustNote: bank.trustNote[language],
      prematureRule: bank.prematureRule[language],
      badge: bank.badge[language],
    } satisfies DemoBankOption;
  });
}

export function resolveAmountChoice(text: string) {
  const normalized = text.toLowerCase().replaceAll(",", "");
  if (/(^|\D)(10 ?000|10000|10 हजार|10 हजार|10 hazaar)(\D|$)/i.test(text)) {
    return 10000;
  }
  if (/(^|\D)(50 ?000|50000|50 हजार|50 hazaar)(\D|$)/i.test(text)) {
    return 50000;
  }
  if (/(^|\D)(100 ?000|100000|1 लाख|1 lakh|one lakh)(\D|$)/i.test(text)) {
    return 100000;
  }

  const numeric = Number(normalized.replace(/[^0-9]/g, ""));
  if ([10000, 50000, 100000].includes(numeric)) {
    return numeric;
  }

  return null;
}

export function resolveTenorChoice(text: string) {
  if (/(^|\D)6(\D|$)|6 month|6 मही|6 महि|6 মাস|6 महिने|6 மாத/i.test(text)) {
    return 6;
  }
  if (/(^|\D)12(\D|$)|12 month|12 मही|12 महि|12 মাস|12 महिने|12 மாத/i.test(text)) {
    return 12;
  }
  if (/(^|\D)18(\D|$)|18 month|18 मही|18 महि|18 মাস|18 महिने|18 மாத/i.test(text)) {
    return 18;
  }
  return null;
}

export function resolveSeniorChoice(text: string) {
  if (/(^|\s)(yes|haan|ha|हां|हाँ|हो|ஆம்|হ্যাঁ)(\s|$)/i.test(text)) {
    return true;
  }
  if (/(^|\s)(no|nahin|नहीं|ना|ন|না|नाही|இல்லை)(\s|$)/i.test(text)) {
    return false;
  }
  return null;
}

export function resolveBankChoice(text: string) {
  const normalized = text.toLowerCase();
  if (
    normalized.includes("option 1") ||
    normalized.includes("first bank") ||
    normalized.includes("suryoday")
  ) {
    return "suryoday";
  }
  if (
    normalized.includes("option 2") ||
    normalized.includes("sbi") ||
    normalized.includes("state bank")
  ) {
    return "sbi";
  }
  if (normalized.includes("option 3") || normalized.includes("hdfc")) {
    return "hdfc";
  }
  return null;
}
