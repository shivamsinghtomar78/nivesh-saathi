"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Landmark,
  LoaderCircle,
  Mic,
  MicOff,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import AppShell from "@/components/app/AppShell";
import AuthGate from "@/components/auth/AuthGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStreamingChat, type StreamMeta } from "@/hooks/useStreamingChat";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { LANGUAGE_LABELS } from "@/lib/copy";
import { withCsrfHeaders } from "@/lib/csrf";
import { LANGUAGE_META } from "@/lib/languages";
import { ROUTES } from "@/lib/routes";
import type { AdvisorRateCard, AppLanguage } from "@/lib/server/advisor-schemas";
import { cn, formatCurrency } from "@/lib/utils";
import {
  buildRateSourceDisclosure,
  buildVoiceComparisonPrompt,
  getRateFreshnessStatus,
  getVoiceClarification,
  parseVoiceCommand,
} from "@/lib/voice-flow";
import type { VoiceBookingDraft } from "@/lib/voice-booking";
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";

type VoicePhase =
  | "ready"
  | "listening"
  | "clarifying"
  | "thinking"
  | "speaking"
  | "result"
  | "booking"
  | "kyc"
  | "completed"
  | "error";

const CALL_LANGUAGES: AppLanguage[] = ["en", "hi", "hinglish"];
type CallLanguage = "en" | "hi" | "hinglish";

const COPY: Record<
  CallLanguage,
  {
    appEyebrow: string;
    appTitle: string;
    appDescription: string;
    openChat: string;
    authTitle: string;
    authBody: string;
    phoneCallStyle: string;
    simpleFlow: string;
    flowSteps: string[];
    ready: string;
    prompt: string;
    listening: string;
    thinking: string;
    speaking: string;
    retry: string;
    tryAgain: string;
    replay: string;
    tts: string;
    lastHeard: string;
    threeOptions: string;
    spokenVisual: string;
    option: string;
    selected: string;
    tenure: string;
    maturity: string;
    interest: string;
    source: string;
    asOf: string;
    verifyWarning: string;
    staleWarning: string;
    book: string;
    kyc: string;
    bookingDraft: string;
    bookingDisclaimer: string;
    kycHandoff: string;
    completeKyc: string;
    journeyComplete: string;
    noOption: string;
    stopped: string;
    repeatMissing: string;
    startOverDone: string;
    bookingDraftReady: (bankName: string, option: number) => string;
    selectedMessage: (card: AdvisorRateCard, option: number) => string;
    resumedDraft: (draft: VoiceBookingDraft) => string;
  }
> = {
  en: {
    appEyebrow: "Voice FD Advisor",
    appTitle: "Saathi Voice Call",
    appDescription:
      "Speak in English, Hindi, or Hinglish to compare FD options, choose one, and continue to mock KYC.",
    openChat: "Open chat",
    authTitle: "Sign in to use voice advisor",
    authBody:
      "Voice comparisons, booking drafts, and KYC handoff stay tied to your secure profile.",
    phoneCallStyle: "Phone-call style",
    simpleFlow: "Simple call flow",
    flowSteps: ["Ask by voice", "Compare 3 options", "Book selected FD", "Mock KYC handoff"],
    ready: "Ready for your FD call",
    prompt: "Tap the mic and ask about FD rates, safety, maturity, or booking.",
    listening: "Listening now. Speak naturally.",
    thinking: "Checking FD options and preparing a spoken answer.",
    speaking: "Speaking the answer. Tap to stop.",
    retry: "I did not catch that clearly. Please try again.",
    tryAgain: "Try again",
    replay: "Replay",
    tts: "TTS",
    lastHeard: "Last heard",
    threeOptions: "Three FD options",
    spokenVisual: "Spoken and visual comparison",
    option: "Option",
    selected: "Selected",
    tenure: "Tenure",
    maturity: "Maturity",
    interest: "Interest",
    source: "Source",
    asOf: "As of",
    verifyWarning: "Verify the final rate on the official bank site before booking.",
    staleWarning: "Rate data may be 7 days or more old.",
    book: "Book this FD",
    kyc: "Continue to mock KYC",
    bookingDraft: "Booking draft",
    bookingDisclaimer:
      "This prototype will not collect real KYC documents. It hands off at a mock KYC screen showing PAN, Aadhaar, and OTP requirements.",
    kycHandoff: "Mock KYC handoff",
    completeKyc: "Complete mock KYC",
    journeyComplete: "Journey complete",
    noOption: "Please compare FD options first, then say book option 1, 2, or 3.",
    stopped: "Voice stopped.",
    repeatMissing: "There is no spoken answer to replay yet.",
    startOverDone: "Starting over. Ask your FD question again.",
    bookingDraftReady: (bankName, option) =>
      `Booking draft is ready for option ${option}, ${bankName}. Say confirm or tap continue to move to mock KYC.`,
    selectedMessage: (card, option) =>
      `Option ${option} selected: ${card.bankName}, ${card.rate}, ${card.tenorLabel}, maturity about ${formatCurrency(card.maturityAmount)}. Say book this FD to continue.`,
    resumedDraft: (draft) =>
      `Your previous booking draft for ${draft.selectedBank.bankName} is ready. Say confirm to continue to mock KYC.`,
  },
  hi: {
    appEyebrow: "Voice FD Advisor",
    appTitle: "Saathi Voice Call",
    appDescription:
      "English, Hindi, या Hinglish में बोलकर FD compare करें, एक option चुनें, और mock KYC तक जाएं।",
    openChat: "Chat खोलें",
    authTitle: "Voice advisor इस्तेमाल करने के लिए sign in करें",
    authBody: "Voice comparison, booking draft, और KYC handoff आपके secure profile से जुड़े रहेंगे।",
    phoneCallStyle: "Phone-call style",
    simpleFlow: "सरल call flow",
    flowSteps: ["Voice से पूछें", "3 options compare करें", "चुनी हुई FD book करें", "Mock KYC handoff"],
    ready: "FD voice call के लिए ready",
    prompt: "Mic दबाइए और FD rate, safety, maturity या booking के बारे में पूछिए।",
    listening: "सुन रहा हूं। आराम से बोलिए।",
    thinking: "FD options check करके spoken answer तैयार कर रहा हूं।",
    speaking: "Answer सुना रहा हूं। रोकने के लिए tap कीजिए।",
    retry: "मैं साफ समझ नहीं पाया। कृपया फिर से बोलिए।",
    tryAgain: "फिर कोशिश करें",
    replay: "दोबारा सुनें",
    tts: "TTS",
    lastHeard: "आखिरी बात सुनी",
    threeOptions: "तीन FD options",
    spokenVisual: "Spoken और visual comparison",
    option: "Option",
    selected: "Selected",
    tenure: "अवधि",
    maturity: "Maturity",
    interest: "ब्याज",
    source: "Source",
    asOf: "As of",
    verifyWarning: "बुकिंग से पहले official bank site पर final rate जरूर verify करें।",
    staleWarning: "Rate data सात दिन या उससे ज्यादा पुराना हो सकता है।",
    book: "यह FD book करें",
    kyc: "Mock KYC पर जाएं",
    bookingDraft: "Booking draft",
    bookingDisclaimer:
      "यह prototype असली KYC documents collect नहीं करेगा। यह PAN, Aadhaar, और OTP requirements वाला mock KYC screen दिखाएगा।",
    kycHandoff: "Mock KYC handoff",
    completeKyc: "Mock KYC पूरा करें",
    journeyComplete: "Journey complete",
    noOption: "पहले FD options compare करें, फिर बोलें option 1, 2, या 3 book करें।",
    stopped: "Voice रोक दी गई।",
    repeatMissing: "अभी replay करने के लिए कोई spoken answer नहीं है।",
    startOverDone: "फिर से शुरू कर रहे हैं। अपना FD सवाल दोबारा पूछिए।",
    bookingDraftReady: (bankName, option) =>
      `Option ${option}, ${bankName} के लिए booking draft ready है। Mock KYC पर जाने के लिए confirm बोलिए या button दबाइए।`,
    selectedMessage: (card, option) =>
      `Option ${option} selected: ${card.bankName}, ${card.rate}, ${card.tenorLabel}, maturity लगभग ${formatCurrency(card.maturityAmount)}। Book this FD बोलकर आगे बढ़ें।`,
    resumedDraft: (draft) =>
      `${draft.selectedBank.bankName} के लिए आपका previous booking draft ready है। Mock KYC पर जाने के लिए confirm बोलिए।`,
  },
  hinglish: {
    appEyebrow: "Voice FD Advisor",
    appTitle: "Saathi Voice Call",
    appDescription:
      "English, Hindi, ya Hinglish mein bolkar FD compare karein, option choose karein, aur mock KYC tak jaayein.",
    openChat: "Open chat",
    authTitle: "Voice advisor use karne ke liye sign in karein",
    authBody: "Voice comparisons, booking drafts, aur KYC handoff aapke secure profile se linked rahenge.",
    phoneCallStyle: "Phone-call style",
    simpleFlow: "Simple call flow",
    flowSteps: ["Voice se poochho", "3 options compare karo", "Selected FD book karo", "Mock KYC handoff"],
    ready: "FD voice call ready hai",
    prompt: "Mic tap karke FD rates, safety, maturity ya booking poochhiye.",
    listening: "Listening. Aap naturally bol sakte hain.",
    thinking: "FD options check karke spoken answer bana raha hoon.",
    speaking: "Answer bol raha hoon. Stop karne ke liye tap kijiye.",
    retry: "Clear nahi hua. Please ek baar phir boliye.",
    tryAgain: "Try again",
    replay: "Replay",
    tts: "TTS",
    lastHeard: "Last heard",
    threeOptions: "Teen FD options",
    spokenVisual: "Spoken aur visual comparison",
    option: "Option",
    selected: "Selected",
    tenure: "Tenure",
    maturity: "Maturity",
    interest: "Interest",
    source: "Source",
    asOf: "As of",
    verifyWarning: "Booking se pehle official bank site par final rate verify kar lijiye.",
    staleWarning: "Rate data 7 din ya usse zyada purana ho sakta hai.",
    book: "Is FD ko book karo",
    kyc: "Mock KYC continue karo",
    bookingDraft: "Booking draft",
    bookingDisclaimer:
      "Yeh prototype real KYC documents collect nahi karega. Yeh PAN, Aadhaar, aur OTP requirements wala mock KYC screen dikhata hai.",
    kycHandoff: "Mock KYC handoff",
    completeKyc: "Mock KYC complete karo",
    journeyComplete: "Journey complete",
    noOption: "Pehle FD options compare karein, phir boliye book option 1, 2, ya 3.",
    stopped: "Voice stop ho gayi.",
    repeatMissing: "Abhi replay karne ke liye spoken answer nahi hai.",
    startOverDone: "Start over kar rahe hain. Apna FD question phir se poochhiye.",
    bookingDraftReady: (bankName, option) =>
      `Option ${option}, ${bankName} ke liye booking draft ready hai. Mock KYC par jaane ke liye confirm boliye ya button tap kijiye.`,
    selectedMessage: (card, option) =>
      `Option ${option} selected: ${card.bankName}, ${card.rate}, ${card.tenorLabel}, maturity approx ${formatCurrency(card.maturityAmount)}. Book this FD bolkar continue karein.`,
    resumedDraft: (draft) =>
      `${draft.selectedBank.bankName} ke liye aapka previous booking draft ready hai. Mock KYC continue karne ke liye confirm boliye.`,
  },
};

function normalizeCallLanguage(language: AppLanguage): CallLanguage {
  return CALL_LANGUAGES.includes(language) ? (language as CallLanguage) : "en";
}

function getRateCardPayload(card: AdvisorRateCard) {
  return {
    bankId: card.bankId,
    bankName: card.bankName,
    bankNameLocal: card.bankNameLocal,
    officialUrl: card.officialUrl,
    rate: card.rate,
    rateValue: card.rateValue,
    tenorMonths: card.tenorMonths,
    tenorLabel: card.tenorLabel,
    maturityAmount: card.maturityAmount,
    interestEarned: card.interestEarned,
    maturityPreview: card.maturityPreview,
    safetyNote: card.safetyNote,
    sourceLabel: card.sourceLabel,
    sourceUrl: card.sourceUrl,
    asOf: card.asOf,
  };
}

function buildSpokenComparison(params: {
  text: string;
  cards: AdvisorRateCard[];
  language: "en" | "hi" | "hinglish";
}) {
  const topCards = params.cards.slice(0, 3);
  if (topCards.length < 3) return params.text;
  const sourceDisclosure = buildRateSourceDisclosure(topCards, params.language);

  if (params.language === "hi") {
    return [
      "FD में आप चुनी हुई अवधि के लिए पैसा lock करते हैं। Rate सालाना ब्याज बताता है, और maturity principal plus interest होती है। Risk यह है कि final bank terms बदल सकते हैं और एक bank में Rs 5 lakh से ऊपर DICGC cover पूरा नहीं होता। मैंने तीन FD options compare किए हैं।",
      ...topCards.map(
        (card, index) =>
          `Option ${index + 1}: ${card.bankName}, rate ${card.rate}, tenure ${card.tenorLabel}, maturity लगभग ${formatCurrency(card.maturityAmount)}. Safety: ${card.safetyNote}`
      ),
      sourceDisclosure,
      "आप option 1, 2, या 3 बोलकर चुन सकते हैं, फिर book this FD बोलकर mock KYC handoff तक जा सकते हैं।",
    ].join(" ");
  }

  if (params.language === "hinglish") {
    return [
      "FD mein aap selected tenure ke liye paisa lock karte hain. Rate annual interest batata hai, aur maturity principal plus interest hoti hai. Risk yeh hai ki final bank terms change ho sakte hain aur ek bank mein Rs 5 lakh se upar DICGC cover complete nahi hota. Maine top 3 FD options compare kiye hain.",
      ...topCards.map(
        (card, index) =>
          `Option ${index + 1}: ${card.bankName}, ${card.rate}, tenure ${card.tenorLabel}, maturity approx ${formatCurrency(card.maturityAmount)}. Safety: ${card.safetyNote}`
      ),
      sourceDisclosure,
      "Aap option 1, 2, ya 3 bolkar choose kar sakte hain, phir book this FD bolkar mock KYC handoff tak continue kar sakte hain.",
    ].join(" ");
  }

  return [
    "An FD locks your money for a chosen tenure. The rate is annual interest, and maturity is principal plus interest. Key risk: final bank terms can change, and deposits above Rs 5 lakh per bank are not fully covered by DICGC. I compared three FD options.",
    ...topCards.map(
      (card, index) =>
        `Option ${index + 1}: ${card.bankName}, ${card.rate}, tenure ${card.tenorLabel}, maturity about ${formatCurrency(card.maturityAmount)}. Safety: ${card.safetyNote}`
    ),
    sourceDisclosure,
    "You can say option 1, 2, or 3 to choose, then say book this FD to continue to mock KYC handoff.",
  ].join(" ");
}

function phaseForDraft(draft: VoiceBookingDraft): VoicePhase {
  if (draft.status === "completed") return "completed";
  if (draft.status === "kyc_handoff") return "kyc";
  return "booking";
}

function localizeVoiceError(message: string | null, language: CallLanguage) {
  if (!message) return null;
  const copy = COPY[language];
  if (/microphone blocked|not allowed|mic access/i.test(message)) {
    if (language === "hi") {
      return "Microphone block है। Browser में mic allow करें या chat इस्तेमाल करें।";
    }
    if (language === "hinglish") {
      return "Microphone blocked hai. Browser mein mic allow karein ya chat use karein.";
    }
    return "Microphone is blocked. Allow mic access in your browser, or continue in chat.";
  }
  if (/no speech|no audio/i.test(message)) return copy.retry;
  if (/transcribe|recognition|understand/i.test(message)) return copy.retry;
  return message;
}

export default function VoiceScreen() {
  const user = useAuthStore((state) => state.user);
  const storedLanguage = useConversationStore((state) => state.language);
  const setLanguage = useConversationStore((state) => state.setLanguage);
  const setThreadId = useConversationStore((state) => state.setThreadId);
  const threadId = useConversationStore((state) => state.threadId);
  const language = normalizeCallLanguage(storedLanguage);
  const copy = COPY[language];

  const [phase, setPhase] = useState<VoicePhase>("ready");
  const [lastTranscript, setLastTranscript] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [rateCards, setRateCards] = useState<AdvisorRateCard[]>([]);
  const [clarificationChips, setClarificationChips] = useState<string[]>([]);
  const [bookingDraft, setBookingDraft] = useState<VoiceBookingDraft | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [lastQueryContext, setLastQueryContext] = useState<{
    amount?: number | null;
    tenorMonths?: number | null;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [audioProvider, setAudioProvider] = useState<"elevenlabs" | "browser-fallback" | "browser">("browser");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const latestCardsRef = useRef<AdvisorRateCard[]>([]);
  const bookingDraftRef = useRef<VoiceBookingDraft | null>(null);
  const selectedOptionRef = useRef(0);
  const speechLanguageRef = useRef<CallLanguage>(language);

  useEffect(() => {
    latestCardsRef.current = rateCards;
    if (rateCards.length > 0 && selectedOptionRef.current >= Math.min(rateCards.length, 3)) {
      selectedOptionRef.current = 0;
      setSelectedOptionIndex(0);
    }
  }, [rateCards]);

  useEffect(() => {
    bookingDraftRef.current = bookingDraft;
  }, [bookingDraft]);

  useEffect(() => {
    selectedOptionRef.current = selectedOptionIndex;
  }, [selectedOptionIndex]);

  useEffect(() => {
    speechLanguageRef.current = language;
  }, [language]);

  useEffect(() => {
    if (!CALL_LANGUAGES.includes(storedLanguage)) {
      setLanguage("en");
    }
  }, [setLanguage, storedLanguage]);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;

    async function loadActiveDraft() {
      try {
        const response = await fetch("/api/voice/booking");
        const payload = (await response.json()) as {
          draft?: VoiceBookingDraft | null;
        };
        if (!response.ok || !payload.draft || cancelled) return;
        setBookingDraft(payload.draft);
        setPhase(phaseForDraft(payload.draft));
        setSpokenText(COPY[normalizeCallLanguage(payload.draft.language)].resumedDraft(payload.draft));
      } catch {
        // Resume is best-effort; users can still start a fresh voice flow.
      }
    }

    void loadActiveDraft();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setPhase((current) => (current === "speaking" ? "result" : current));
  }, []);

  const speakWithBrowser = useCallback(
    (text: string, nextPhase: VoicePhase = "result") => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setPhase(nextPhase);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const speechLanguage = speechLanguageRef.current;
      utterance.lang = LANGUAGE_META[speechLanguage].speechSynthesis;
      utterance.rate = speechLanguage === "en" ? 0.95 : 0.9;
      utterance.pitch = 1;
      utterance.onend = () => setPhase(nextPhase);
      utterance.onerror = () => setPhase(nextPhase);
      utteranceRef.current = utterance;
      setAudioProvider("browser");
      setPhase("speaking");
      window.speechSynthesis.speak(utterance);
    },
    []
  );

  const speak = useCallback(
    async (text: string, nextPhase: VoicePhase = "result") => {
      setSpokenText(text);
      stopSpeaking();
      setAudioProvider("browser-fallback");
      speakWithBrowser(text, nextPhase);
    },
    [speakWithBrowser, stopSpeaking]
  );

  const { sendStreamingMessage, isStreaming } = useStreamingChat({
    onMeta: (meta: StreamMeta) => {
      if (meta.threadId) {
        setThreadId(meta.threadId);
      }
      setRateCards(meta.rateCards ?? []);
    },
    onToken: (_token, accumulated) => {
      setSpokenText(accumulated);
    },
    onDone: (fullText, meta) => {
      const cards = meta?.rateCards ?? latestCardsRef.current;
      setRateCards(cards);
      const spoken = buildSpokenComparison({
        text: fullText,
        cards,
        language: speechLanguageRef.current,
      });
      void speak(spoken, "result");
    },
    onError: (caught) => {
      setError(caught.message || "Voice advisor could not answer right now.");
      setPhase("error");
    },
  });

  const createBooking = useCallback(
    async (card: AdvisorRateCard, optionIndex = selectedOptionRef.current) => {
      setPhase("booking");
      setError(null);
      const selectedOption = Math.min(Math.max(optionIndex + 1, 1), 3);
      setSelectedOptionIndex(selectedOption - 1);
      try {
        const response = await fetch("/api/voice/booking", {
          method: "POST",
          headers: withCsrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            language,
            selectedOption,
            rateCard: getRateCardPayload(card),
            customer: {
              name: user?.displayName ?? null,
              phoneNumber: user?.phoneNumber ?? null,
              email: user?.email ?? null,
            },
          }),
        });
        const payload = (await response.json()) as {
          draft?: VoiceBookingDraft;
          error?: string;
        };
        if (!response.ok || !payload.draft) {
          throw new Error(payload.error || "Unable to create booking draft");
        }
        setBookingDraft(payload.draft);
        const message = copy.bookingDraftReady(
          payload.draft.selectedBank.bankName,
          payload.draft.selectedOption
        );
        void speak(message, "booking");
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Unable to create booking draft";
        setError(message);
        setPhase("error");
        toast.error(message);
      }
    },
    [copy, language, speak, user]
  );

  const continueToKyc = useCallback(async () => {
    const draft = bookingDraftRef.current;
    if (!draft) return;
    try {
      const response = await fetch("/api/voice/booking", {
        method: "PATCH",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          draftId: draft.draftId,
          consentAccepted: true,
          confirmationState: "confirmed",
          status: "kyc_handoff",
        }),
      });
      const payload = (await response.json()) as {
        draft?: VoiceBookingDraft;
        error?: string;
      };
      if (!response.ok || !payload.draft) {
        throw new Error(payload.error || "Unable to continue to KYC");
      }
      setBookingDraft(payload.draft);
      setPhase("kyc");
      void speak(payload.draft.kyc.handoffMessage, "kyc");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to continue to KYC";
      setError(message);
      setPhase("error");
      toast.error(message);
    }
  }, [speak]);

  const completeKyc = useCallback(async () => {
    const draft = bookingDraftRef.current;
    if (!draft) return;
    try {
      const response = await fetch("/api/voice/booking/kyc", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ draftId: draft.draftId }),
      });
      const payload = (await response.json()) as {
        draft?: VoiceBookingDraft;
        error?: string;
      };
      if (!response.ok || !payload.draft) {
        throw new Error(payload.error || "Unable to complete mock KYC");
      }
      setBookingDraft(payload.draft);
      setPhase("completed");
      const message =
        language === "en"
          ? "Mock KYC handoff is complete. Your FD booking prototype journey is finished."
          : language === "hi"
            ? "Mock KYC handoff पूरा हो गया। FD booking prototype journey complete है।"
            : "Mock KYC handoff complete ho gaya. FD booking prototype journey finish ho gayi.";
      void speak(message, "completed");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to complete mock KYC";
      setError(message);
      setPhase("error");
      toast.error(message);
    }
  }, [language, speak]);

  const sendVoiceQuery = useCallback(
    async (rawTranscript: string) => {
      const transcript = rawTranscript.trim();
      if (!transcript || isStreaming) return;

      setLastTranscript(transcript);
      setClarificationChips([]);
      setError(null);
      const parsed = parseVoiceCommand(transcript, language);
      const detectedLanguage = normalizeCallLanguage(parsed.detectedLanguage);
      speechLanguageRef.current = detectedLanguage;
      if (detectedLanguage !== language && CALL_LANGUAGES.includes(detectedLanguage)) {
        setLanguage(detectedLanguage);
      }
      const detectedCopy = COPY[detectedLanguage];
      const selectedIndex =
        parsed.selectedOption !== undefined
          ? parsed.selectedOption - 1
          : selectedOptionRef.current;
      const selectedCard = latestCardsRef.current[selectedIndex] ?? latestCardsRef.current[0];

      if (parsed.command === "stop") {
        stopSpeaking();
        setPhase("result");
        setSpokenText(detectedCopy.stopped);
        return;
      }

      if (parsed.command === "repeat") {
        if (spokenText) {
          await speak(spokenText, phase === "booking" ? "booking" : phase === "kyc" ? "kyc" : "result");
          return;
        }
        await speak(detectedCopy.repeatMissing, "ready");
        return;
      }

      if (parsed.command === "retry" || parsed.command === "start_over") {
        setBookingDraft(null);
        setRateCards([]);
        setSelectedOptionIndex(0);
        setLastQueryContext({});
        const message =
          parsed.command === "start_over" ? detectedCopy.startOverDone : detectedCopy.prompt;
        await speak(message, "ready");
        return;
      }

      if (parsed.command === "select_option") {
        if (selectedCard && selectedIndex >= 0 && selectedIndex < 3) {
          setSelectedOptionIndex(selectedIndex);
          await speak(
            detectedCopy.selectedMessage(selectedCard, selectedIndex + 1),
            "result"
          );
          return;
        }
        await speak(detectedCopy.noOption, "ready");
        return;
      }

      if (
        parsed.command === "confirm" ||
        parsed.command === "continue_kyc" ||
        parsed.command === "complete_kyc"
      ) {
        if (phase === "booking" && bookingDraftRef.current) {
          await continueToKyc();
          return;
        }
        if ((phase === "kyc" || phase === "completed") && bookingDraftRef.current) {
          await completeKyc();
          return;
        }
        if (selectedCard) {
          await createBooking(selectedCard, selectedIndex);
          return;
        }
        await speak(detectedCopy.noOption, "ready");
        return;
      }

      if (parsed.command === "book") {
        if (selectedCard) {
          await createBooking(selectedCard, selectedIndex);
          return;
        }
        await speak(detectedCopy.noOption, "ready");
        return;
      }

      const clarification = getVoiceClarification(transcript, detectedLanguage);
      if (clarification) {
        setPhase("clarifying");
        setClarificationChips(clarification.chips);
        await speak(clarification.prompt, "clarifying");
        return;
      }

      const message = buildVoiceComparisonPrompt({
        text: transcript,
        amount: parsed.amount,
        tenorMonths: parsed.tenorMonths,
        language: detectedLanguage,
      });

      setPhase("thinking");
      setSpokenText("");
      setRateCards([]);
      setSelectedOptionIndex(0);
      setLastQueryContext({
        amount: parsed.amount,
        tenorMonths: parsed.tenorMonths,
      });
      await sendStreamingMessage({
        message,
        language: detectedLanguage,
        threadId: threadId ?? undefined,
        mode: "voice",
        amount: parsed.amount ?? undefined,
        tenorMonths: parsed.tenorMonths ?? undefined,
      });
    },
    [
      completeKyc,
      continueToKyc,
      createBooking,
      isStreaming,
      language,
      phase,
      sendStreamingMessage,
      setLanguage,
      speak,
      spokenText,
      stopSpeaking,
      threadId,
    ]
  );

  const voice = useVoiceInput({
    language,
    onTranscript: (transcript) => {
      void sendVoiceQuery(transcript);
    },
  });

  useEffect(() => {
    return () => stopSpeaking();
  }, [stopSpeaking]);

  const displayPhase: VoicePhase = voice.error
    ? "error"
    : voice.isListening
      ? "listening"
      : phase;
  const displayError = localizeVoiceError(voice.error ?? error, language);

  const callStatus = useMemo(() => {
    if (voice.isListening) return copy.listening;
    if (phase === "thinking") return copy.thinking;
    if (phase === "speaking") return copy.speaking;
    if (displayPhase === "error") return displayError || copy.retry;
    if (phase === "booking") return copy.bookingDraft;
    if (phase === "kyc") return copy.kycHandoff;
    if (phase === "completed") return copy.journeyComplete;
    return copy.ready;
  }, [copy, displayError, displayPhase, phase, voice.isListening]);

  const visibleRateCards = rateCards.slice(0, 3);
  const rateFreshness = useMemo(
    () => getRateFreshnessStatus(visibleRateCards),
    [visibleRateCards]
  );
  const sourceDisclosure = useMemo(
    () => buildRateSourceDisclosure(visibleRateCards, language),
    [language, visibleRateCards]
  );

  const handleMicPress = () => {
    if (phase === "speaking") {
      stopSpeaking();
      return;
    }
    if (voice.isListening) {
      voice.stopListening();
      return;
    }
    stopSpeaking();
    voice.resetTranscript();
    void voice.startListening();
  };

  return (
    <AppShell
      eyebrow={copy.appEyebrow}
      title={copy.appTitle}
      description={copy.appDescription}
      actions={
        <Link href={ROUTES.CHAT} className="w-full tablet:w-auto">
          <Button variant="outline" className="w-full tablet:w-auto">
            {copy.openChat}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      }
    >
      <AuthGate
        title={copy.authTitle}
        body={copy.authBody}
      >
        <div className="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[var(--radius-card)] border border-outline bg-panel p-4 shadow-[var(--shadow-card)] tablet:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {copy.phoneCallStyle}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-text-strong">
                  {callStatus}
                </h2>
              </div>
              <div className="flex rounded-full border border-outline bg-input-bg p-1">
                {CALL_LANGUAGES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      language === code
                        ? "bg-accent text-on-accent"
                        : "text-text-muted hover:text-text-strong"
                    )}
                  >
                    {LANGUAGE_LABELS[code]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center text-center">
              <button
                type="button"
                onClick={handleMicPress}
                disabled={phase === "thinking" || isStreaming || voice.isProcessing}
                className={cn(
                  "relative flex h-36 w-36 items-center justify-center rounded-full border text-accent shadow-[0_24px_80px_rgba(0,0,0,0.32)] transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60",
                  voice.isListening
                    ? "animate-mic-pulse border-accent bg-accent text-on-accent"
                    : phase === "speaking"
                      ? "border-accent/35 bg-surface-dark text-on-dark"
                      : "border-accent/25 bg-accent-soft"
                )}
                aria-label={voice.isListening ? "Stop listening" : "Start voice call"}
              >
                {phase === "thinking" || voice.isProcessing ? (
                  <LoaderCircle className="h-14 w-14 animate-spin" />
                ) : voice.isListening ? (
                  <MicOff className="h-14 w-14" />
                ) : phase === "speaking" ? (
                  <VolumeX className="h-14 w-14" />
                ) : (
                  <Mic className="h-14 w-14" />
                )}
              </button>

              <p className="mt-5 max-w-xl text-base leading-7 text-text-muted">
                {voice.transcript || spokenText || copy.prompt}
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {displayPhase === "error" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setPhase("ready");
                      voice.resetTranscript();
                      void voice.startListening();
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {copy.tryAgain}
                  </Button>
                ) : null}
                {spokenText ? (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      void speak(
                        spokenText,
                        phase === "booking" ? "booking" : phase === "kyc" ? "kyc" : "result"
                      )
                    }
                  >
                    <Volume2 className="h-4 w-4" />
                    {copy.replay}
                  </Button>
                ) : null}
                <Badge variant="outline" className="rounded-full bg-input-bg">
                  {copy.tts}: {audioProvider}
                </Badge>
              </div>
            </div>

            {clarificationChips.length > 0 ? (
              <div className="mt-8 grid gap-3 tablet:grid-cols-3">
                {clarificationChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => void sendVoiceQuery(`Compare FD for ${chip}`)}
                    className="min-h-16 rounded-[var(--radius-panel)] border border-outline bg-input-bg px-4 text-sm font-semibold text-text-strong transition hover:border-accent/35 hover:bg-panel-strong"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            ) : null}

            {lastTranscript ? (
              <div className="mt-6 rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {copy.lastHeard}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-strong">{lastTranscript}</p>
              </div>
            ) : null}
          </section>

          <aside className="grid gap-5">
            <section className="rounded-[var(--radius-card)] border border-outline bg-panel p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-accent" />
                <h3 className="font-semibold text-text-strong">{copy.simpleFlow}</h3>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-text-muted">
                {copy.flowSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        {visibleRateCards.length > 0 ? (
          <section className="mt-5 rounded-[var(--radius-card)] border border-outline bg-panel p-4 shadow-sm tablet:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {copy.threeOptions}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-text-strong">
                  {copy.spokenVisual}
                </h2>
                {lastQueryContext.amount || lastQueryContext.tenorMonths ? (
                  <p className="mt-2 text-sm text-text-muted">
                    {lastQueryContext.amount ? formatCurrency(lastQueryContext.amount) : ""}
                    {lastQueryContext.amount && lastQueryContext.tenorMonths ? " · " : ""}
                    {lastQueryContext.tenorMonths ? `${lastQueryContext.tenorMonths} months` : ""}
                  </p>
                ) : null}
              </div>
              <Button onClick={() => void createBooking(visibleRateCards[selectedOptionIndex] ?? visibleRateCards[0], selectedOptionIndex)}>
                <Landmark className="h-4 w-4" />
                {copy.book}
              </Button>
            </div>
            {sourceDisclosure ? (
              <div className="mt-4 rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-3 text-xs leading-5 text-text-muted">
                {sourceDisclosure}
              </div>
            ) : null}
            <div className="mt-5 grid gap-3 laptop:grid-cols-3">
              {visibleRateCards.map((card, index) => (
                <article
                  key={card.bankId}
                  className={cn(
                    "rounded-[var(--radius-panel)] border bg-inner-panel p-4",
                    selectedOptionIndex === index
                      ? "border-accent/60 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
                      : "border-outline"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant={index === 0 ? "accent" : "outline"}>
                        {copy.option} {index + 1}
                      </Badge>
                      {selectedOptionIndex === index ? (
                        <Badge variant="outline" className="ml-2 bg-accent-soft">
                          {copy.selected}
                        </Badge>
                      ) : null}
                      <h3 className="mt-3 text-lg font-semibold text-text-strong">
                        {card.bankName}
                      </h3>
                    </div>
                    <p className="financial-value text-2xl font-bold text-accent">
                      {card.rate}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm">
                    <p className="flex justify-between gap-3 border-b border-outline pb-2">
                      <span className="text-text-muted">{copy.tenure}</span>
                      <span className="font-semibold text-text-strong">{card.tenorLabel}</span>
                    </p>
                    <p className="flex justify-between gap-3 border-b border-outline pb-2">
                      <span className="text-text-muted">{copy.maturity}</span>
                      <span className="font-semibold text-text-strong">
                        {formatCurrency(card.maturityAmount)}
                      </span>
                    </p>
                    <p className="flex justify-between gap-3 border-b border-outline pb-2">
                      <span className="text-text-muted">{copy.interest}</span>
                      <span className="font-semibold text-text-strong">
                        {formatCurrency(card.interestEarned)}
                      </span>
                    </p>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-text-muted">{card.safetyNote}</p>
                  <div className="mt-4 rounded-[var(--radius-panel)] border border-outline bg-panel p-3 text-xs leading-5 text-text-muted">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        {copy.source}: {card.sourceLabel}
                      </span>
                      <span>
                        {copy.asOf}: {card.asOf}
                      </span>
                      {card.sourceUrl ? (
                        <a
                          href={card.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-accent"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Bank
                        </a>
                      ) : null}
                    </div>
                    <p className="mt-2">{copy.verifyWarning}</p>
                    {rateFreshness?.stale ? (
                      <p className="mt-1 font-semibold text-danger">{copy.staleWarning}</p>
                    ) : null}
                  </div>
                  <Button
                    variant={index === 0 ? "primary" : "outline"}
                    className="mt-4 w-full"
                    onClick={() => void createBooking(card, index)}
                  >
                    {copy.book}
                  </Button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {bookingDraft && (phase === "booking" || phase === "kyc" || phase === "completed") ? (
          <section className="mt-5 rounded-[var(--radius-card)] border border-accent/25 bg-panel p-4 shadow-sm tablet:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {copy.bookingDraft}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-text-strong">
                  {bookingDraft.selectedBank.bankName}
                </h2>
                <p className="mt-2 text-sm text-text-muted">
                  {copy.option} {bookingDraft.selectedOption}. {bookingDraft.rate} ·{" "}
                  {bookingDraft.tenorLabel}. {copy.maturity}:{" "}
                  {formatCurrency(bookingDraft.maturityAmount)}.
                </p>
                {bookingDraft.rateSource?.sourceLabel ? (
                  <p className="mt-1 text-xs text-text-muted">
                    {copy.source}: {bookingDraft.rateSource.sourceLabel}
                    {bookingDraft.rateSource.asOf ? ` · ${copy.asOf}: ${bookingDraft.rateSource.asOf}` : ""}
                  </p>
                ) : null}
              </div>
              <Badge variant="accent">{bookingDraft.status.replace("_", " ")}</Badge>
            </div>

            {phase === "booking" ? (
              <div className="mt-5 grid gap-4 laptop:grid-cols-[1fr_auto] laptop:items-end">
                <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4 text-sm leading-6 text-text-muted">
                  {copy.bookingDisclaimer}
                </div>
                <Button onClick={() => void continueToKyc()} className="w-full laptop:w-auto">
                  <FileCheck2 className="h-4 w-4" />
                  {copy.kyc}
                </Button>
              </div>
            ) : null}

            {(phase === "kyc" || phase === "completed") ? (
              <div className="mt-5 grid gap-4 laptop:grid-cols-[1fr_auto] laptop:items-end">
                <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-strong">
                    <ShieldCheck className="h-4 w-4 text-accent" />
                    {copy.kycHandoff}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    {bookingDraft.kyc.handoffMessage}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {bookingDraft.kyc.requiredDocuments.map((doc) => (
                      <div key={doc} className="flex items-center gap-2 text-sm text-text-strong">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        {doc}
                      </div>
                    ))}
                  </div>
                </div>
                {phase === "kyc" ? (
                  <Button onClick={() => void completeKyc()} className="w-full laptop:w-auto">
                    <CheckCircle2 className="h-4 w-4" />
                    {copy.completeKyc}
                  </Button>
                ) : (
                  <Badge variant="accent" className="justify-center rounded-full px-4 py-3">
                    {copy.journeyComplete}
                  </Badge>
                )}
              </div>
            ) : null}
          </section>
        ) : null}
      </AuthGate>
    </AppShell>
  );
}
