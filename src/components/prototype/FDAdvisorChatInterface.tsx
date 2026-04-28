"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronLeft,
  CircleDot,
  Languages,
  MessageCircleMore,
  Mic,
  PhoneCall,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

import { useVoiceInput } from "@/hooks/useVoiceInput";
import {
  buildComparisonOptions,
  demoCopy,
  demoLanguages,
  getAmountChoices,
  getAmountShortLabel,
  getSeniorChoices,
  getTenorChoices,
  getTenorShortLabel,
  glossaryItems,
  handoffChoices,
  resolveAmountChoice,
  resolveBankChoice,
  resolveSeniorChoice,
  resolveTenorChoice,
  type DemoChoice,
  type DemoLanguage,
  type DemoStep,
} from "@/lib/demo-advisor";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ViewMode = "home" | "chat" | "voice";

type PrototypeMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  options?: DemoChoice[];
};

type HandoffMode = "kyc" | "bank" | "agent" | null;

const quickLanguageBubbles = ["Hindi", "Bhojpuri", "Bangla", "Marathi", "Tamil"];

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function MessageBubble({
  message,
  onOptionSelect,
}: {
  message: PrototypeMessage;
  onOptionSelect: (choice: DemoChoice) => void;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[86%] rounded-[24px] px-4 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.18)]",
          isUser
            ? "rounded-br-[10px] bg-[#f4f2eb] text-[#111113]"
            : "rounded-bl-[10px] bg-[#17171a] text-[#f7f6f2]"
        )}
      >
        <p className="whitespace-pre-line text-[15px] leading-6">{message.text}</p>

        {message.options?.length ? (
          <div className="mt-3 grid gap-2">
            {message.options.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => onOptionSelect(choice)}
                className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-medium text-[#f7f6f2] transition hover:border-white/20 hover:bg-white/10"
              >
                {choice.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

export default function FDAdvisorChatInterface({
  mode = "home",
}: {
  mode?: ViewMode;
}) {
  const [language, setLanguage] = useState<DemoLanguage>("hi");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<PrototypeMessage[]>([]);
  const [step, setStep] = useState<DemoStep>("welcome");
  const [amount, setAmount] = useState(100000);
  const [tenorMonths, setTenorMonths] = useState(12);
  const [seniorCitizen, setSeniorCitizen] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState("suryoday");
  const [handoffMode, setHandoffMode] = useState<HandoffMode>(null);
  const [draft, setDraft] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const autoStartedRef = useRef(false);

  const copy = demoCopy[language];
  const amountChoices = useMemo(() => getAmountChoices(language), [language]);
  const tenorChoices = useMemo(() => getTenorChoices(language), [language]);
  const seniorChoices = useMemo(() => getSeniorChoices(language), [language]);
  const glossary = useMemo(() => glossaryItems[language], [language]);

  const comparisonOptions = useMemo(
    () =>
      buildComparisonOptions({
        language,
        amount,
        tenorMonths,
        seniorCitizen,
      }),
    [amount, language, seniorCitizen, tenorMonths]
  );

  const selectedBank =
    comparisonOptions.find((option) => option.id === selectedBankId) ??
    comparisonOptions[0];
  const speechRecognitionReady =
    typeof window !== "undefined" &&
    Boolean(
      (window as Window & {
        SpeechRecognition?: unknown;
        webkitSpeechRecognition?: unknown;
      }).SpeechRecognition ||
        (window as Window & {
          SpeechRecognition?: unknown;
          webkitSpeechRecognition?: unknown;
        }).webkitSpeechRecognition
    );

  const speakText = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !autoSpeak) {
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "bho" ? "hi-IN" : `${language}-IN`;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [autoSpeak, language]
  );

  function pushMessage(message: PrototypeMessage) {
    setMessages((current) => [...current, message]);
  }

  const startConversation = useCallback(
    (question: string) => {
      const introMessage = copy.introReply(
        amountChoices[2].shortLabel,
        comparisonOptions[0].maturityAmount
      );

      setStarted(true);
      setStep("amount");
      setMessages([
        {
          id: createId(),
          role: "user",
          text: question,
        },
        {
          id: createId(),
          role: "assistant",
          text: `${introMessage}\n\n${copy.askAmount}`,
          options: amountChoices,
        },
      ]);
    },
    [amountChoices, comparisonOptions, copy]
  );

  function handleHandoffAction(action: HandoffMode) {
    if (!selectedBank) {
      return;
    }

    setHandoffMode(action);
    if (action === "bank" && typeof window !== "undefined") {
      window.open(selectedBank.officialUrl, "_blank", "noopener,noreferrer");
    }

    pushMessage({
      id: createId(),
      role: "assistant",
      text: copy.handoffReply(selectedBank.bankName),
    });
  }

  function handleTurn(rawInput: string, displayText?: string) {
    const trimmed = rawInput.trim();
    const shortcut = trimmed.match(/^[123]$/)?.[0] ?? null;
    if (!trimmed) {
      return;
    }

    if (!started) {
      startConversation(trimmed);
      setDraft("");
      return;
    }

    pushMessage({
      id: createId(),
      role: "user",
      text: displayText ?? trimmed,
    });

    const bankChoice = resolveBankChoice(trimmed);
    if (bankChoice) {
      setSelectedBankId(bankChoice);
    }

    if (step === "amount") {
      const nextAmount = shortcut
        ? Number(amountChoices[Number(shortcut) - 1]?.value ?? 0)
        : resolveAmountChoice(trimmed);
      if (!nextAmount) {
        pushMessage({
          id: createId(),
          role: "assistant",
          text: `${copy.pressSayLabel}. ${copy.askAmount}`,
          options: amountChoices,
        });
        return;
      }

      setAmount(nextAmount);
      setStep("tenor");
      pushMessage({
        id: createId(),
        role: "assistant",
        text: copy.askTenor(getAmountShortLabel(language, nextAmount)),
        options: tenorChoices,
      });
      setDraft("");
      return;
    }

    if (step === "tenor") {
      const nextTenor = shortcut
        ? Number(tenorChoices[Number(shortcut) - 1]?.value ?? 0)
        : resolveTenorChoice(trimmed);
      if (!nextTenor) {
        pushMessage({
          id: createId(),
          role: "assistant",
          text: `${copy.pressSayLabel}. ${copy.askTenor(
            getAmountShortLabel(language, amount)
          )}`,
          options: tenorChoices,
        });
        return;
      }

      setTenorMonths(nextTenor);
      setStep("senior");
      pushMessage({
        id: createId(),
        role: "assistant",
        text: copy.askSenior(
          getAmountShortLabel(language, amount),
          getTenorShortLabel(language, nextTenor)
        ),
        options: seniorChoices,
      });
      setDraft("");
      return;
    }

    if (step === "senior") {
      const isSenior =
        shortcut === "1"
          ? true
          : shortcut === "2"
            ? false
            : resolveSeniorChoice(trimmed);
      if (isSenior === null) {
        pushMessage({
          id: createId(),
          role: "assistant",
          text: `${copy.pressSayLabel}. ${copy.askSenior(
            getAmountShortLabel(language, amount),
            getTenorShortLabel(language, tenorMonths)
          )}`,
          options: seniorChoices,
        });
        return;
      }

      setSeniorCitizen(isSenior);
      setStep("handoff");
      pushMessage({
        id: createId(),
        role: "assistant",
        text: `${copy.docsReply(
          selectedBank?.bankName ?? "Suryoday Small Finance Bank"
        )}\n\n${copy.kycCta} / ${copy.bankPageCta} / ${copy.agentCta}`,
        options: handoffChoices[language],
      });
      setDraft("");
      return;
    }

    if (step === "handoff") {
      const normalized = trimmed.toLowerCase();
      if (
        shortcut === "1" ||
        normalized.includes("kyc") ||
        normalized.includes("start")
      ) {
        handleHandoffAction("kyc");
      } else if (
        shortcut === "2" ||
        normalized.includes("bank") ||
        normalized.includes("page")
      ) {
        handleHandoffAction("bank");
      } else if (
        shortcut === "3" ||
        normalized.includes("agent") ||
        normalized.includes("call")
      ) {
        handleHandoffAction("agent");
      } else {
        pushMessage({
          id: createId(),
          role: "assistant",
          text: `${copy.pressSayLabel}. ${copy.handoffReply(
            selectedBank?.bankName ?? "Suryoday Small Finance Bank"
          )}`,
          options: handoffChoices[language],
        });
      }
      setDraft("");
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    if (!lastAssistant || lastSpokenIdRef.current === lastAssistant.id) {
      return;
    }

    lastSpokenIdRef.current = lastAssistant.id;
    speakText(lastAssistant.text);
  }, [autoSpeak, language, messages, speakText]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (mode === "home" || autoStartedRef.current) {
      return;
    }

    autoStartedRef.current = true;
    startConversation(copy.sampleQuestion);
  }, [amountChoices, comparisonOptions, copy, mode, startConversation]);

  const voice = useVoiceInput({
    language,
    onTranscript: (transcript) => {
      setDraft(transcript);
      handleTurn(transcript, transcript);
    },
  });

  const statusText = useMemo(() => {
    if (!speechRecognitionReady) {
      return copy.voiceUnavailable;
    }
    if (voice.isProcessing) {
      return copy.statusProcessing;
    }
    if (voice.isListening) {
      return copy.statusListening;
    }
    if (isSpeaking) {
      return copy.statusSpeaking;
    }
    return copy.statusReady;
  }, [
    copy.statusListening,
    copy.statusProcessing,
    copy.statusReady,
    copy.statusSpeaking,
    copy.voiceUnavailable,
    isSpeaking,
    speechRecognitionReady,
    voice.isListening,
    voice.isProcessing,
  ]);

  const resetConversation = () => {
    setStarted(false);
    setMessages([]);
    setStep("welcome");
    setAmount(100000);
    setTenorMonths(12);
    setSeniorCitizen(false);
    setSelectedBankId("suryoday");
    setHandoffMode(null);
    setDraft("");
    lastSpokenIdRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const journeySteps = [
    {
      label: copy.amountStep,
      done: step === "tenor" || step === "senior" || step === "handoff" || Boolean(handoffMode),
    },
    {
      label: copy.tenorStep,
      done: step === "senior" || step === "handoff",
    },
    {
      label: copy.seniorStep,
      done: step === "handoff",
    },
    {
      label: copy.handoffStep,
      done: Boolean(handoffMode),
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#f2efe8] text-[#111113]">
      <div className="absolute inset-x-0 top-0 h-[240px] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0))]" />
      <div className="absolute inset-x-0 top-[18%] h-[320px] bg-[linear-gradient(90deg,rgba(227,223,224,0.95)_0%,rgba(227,223,224,0.95)_22%,rgba(247,196,219,0.95)_22%,rgba(247,196,219,0.95)_78%,rgba(223,223,223,0.95)_78%,rgba(223,223,223,0.95)_100%)] opacity-80" />

      <div className="relative mx-auto flex max-w-7xl flex-col px-4 pb-8 pt-6 md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#111113] text-[#f5f4ef] shadow-[0_18px_40px_rgba(17,17,19,0.18)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6c6f76]">
                {copy.heroBadge}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111113] md:text-3xl">
                Nivesh Saathi
              </h1>
            </div>
          </div>

          <div className="hidden flex-wrap items-center gap-2 md:flex">
            {[
              { href: "/", label: "Home", current: mode === "home" },
              { href: "/chat", label: "Chat", current: mode === "chat" },
              { href: "/voice", label: "Voice", current: mode === "voice" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  item.current
                    ? "bg-[#111113] text-[#f5f4ef]"
                    : "bg-white/70 text-[#34363b] hover:bg-white"
                )}
              >
                {item.label}
              </Link>
            ))}

            <div className="ml-0 flex rounded-full bg-white/70 p-1 shadow-[0_8px_18px_rgba(0,0,0,0.06)] md:ml-2">
              {demoLanguages.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLanguage(option)}
                  className={cn(
                    "rounded-full px-3 py-2 text-xs font-semibold transition",
                    language === option
                      ? "bg-[#111113] text-[#f5f4ef]"
                      : "text-[#50535a] hover:text-[#111113]"
                  )}
                >
                  {demoCopy[option].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,340px)] xl:items-start">
          <div className="order-2 grid gap-4 xl:order-1">
            <Card className="border-white/60 bg-white/66 p-5">
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  {copy.glossaryTitle}
                </Badge>
                <CardTitle>{copy.heroTitle}</CardTitle>
                <CardDescription>{copy.heroSubtitle}</CardDescription>
              </CardHeader>
              <CardContent className="mt-5 grid gap-3">
                {glossary.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-[20px] border border-black/8 bg-white/70 p-4"
                  >
                    <p className="text-sm font-semibold text-[#111113]">{item.term}</p>
                    <p className="mt-1 text-sm leading-6 text-[#5f6269]">{item.plain}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/60 bg-white/66 p-5">
              <CardHeader>
                <Badge variant="success" className="w-fit">
                  {copy.docsTitle}
                </Badge>
                <CardTitle>{copy.handoffTitle}</CardTitle>
                <CardDescription>{copy.handoffNote}</CardDescription>
              </CardHeader>
              <CardContent className="mt-5 grid gap-3">
                {copy.docsChecklist.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[18px] bg-white/70 px-4 py-3">
                    <Check className="mt-0.5 h-4 w-4 text-[#0d9467]" />
                    <span className="text-sm text-[#44464c]">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="order-1 flex justify-center xl:order-2">
            <div className="relative w-full max-w-[450px]">
              <div className="absolute inset-x-[10%] top-0 h-full rounded-[42px] bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06))]" />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-[44px] bg-[#0b0b0d] p-3 shadow-[0_30px_90px_rgba(17,17,19,0.22)]"
              >
                <div className="relative flex min-h-[760px] flex-col overflow-hidden rounded-[34px] bg-[#09090b] px-4 pb-4 pt-3">
                  <div className="mx-auto mb-2 h-1.5 w-28 rounded-full bg-white/10" />
                  <div className="flex items-center justify-between px-1 pb-4 pt-1 text-[#f7f6f2]">
                    <button
                      type="button"
                      onClick={resetConversation}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/6 transition hover:bg-white/10"
                      aria-label={copy.resetLabel}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="text-center">
                      <p className="text-sm font-semibold">Nivesh Saathi</p>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        {copy.voiceReady}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoSpeak((current) => !current)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/6 transition hover:bg-white/10"
                        aria-label={autoSpeak ? "Mute voice replies" : "Enable voice replies"}
                      >
                        {autoSpeak ? (
                          <Volume2 className="h-4 w-4" />
                        ) : (
                          <VolumeX className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {!started ? (
                      <motion.div
                        key="welcome"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="flex flex-1 flex-col items-center justify-center px-3 text-center text-[#f7f6f2]"
                      >
                        <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
                          <div className="absolute inset-6 rounded-full bg-[radial-gradient(circle,rgba(221,166,203,0.9),rgba(112,84,206,0.36))]" />
                          <div className="absolute left-0 top-5 rounded-full bg-[#f2f9a1] px-4 py-2 text-sm font-semibold text-[#111113]">
                            नमस्ते
                          </div>
                          <div className="absolute right-0 top-10 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#111113]">
                            Hello
                          </div>
                          <div className="absolute bottom-10 left-2 rounded-full bg-[#d8a7ea] px-4 py-2 text-sm font-semibold text-[#111113]">
                            FD
                          </div>
                          <div className="absolute bottom-5 right-4 rounded-full bg-[#d6f88f] px-4 py-2 text-sm font-semibold text-[#111113]">
                            Voice
                          </div>
                          <Languages className="relative h-12 w-12 text-white" />
                        </div>

                        <div className="mt-7 flex flex-wrap justify-center gap-2">
                          {quickLanguageBubbles.map((item) => (
                            <Badge key={item} variant="soft">
                              {item}
                            </Badge>
                          ))}
                        </div>

                        <h2 className="mt-8 text-[34px] font-semibold leading-[1.08] tracking-tight">
                          {copy.heroTitle}
                        </h2>
                        <p className="mt-4 max-w-[280px] text-sm leading-6 text-white/66">
                          {copy.heroSubtitle}
                        </p>

                        <Button
                          size="lg"
                          className="mt-8 w-full max-w-[280px]"
                          onClick={() => startConversation(copy.sampleQuestion)}
                        >
                          <MessageCircleMore className="h-4 w-4" />
                          {copy.heroCta}
                        </Button>

                        <button
                          type="button"
                          onClick={() => startConversation(copy.sampleQuestion)}
                          className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/76 transition hover:bg-white/8"
                        >
                          {copy.quickPrompt}: {copy.sampleQuestion}
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="chat"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-1 flex-col"
                      >
                        <div className="mb-3 flex items-center justify-between rounded-[22px] border border-white/8 bg-white/4 px-4 py-3 text-white/82">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8d8e5] text-[#111113]">
                              <AudioLines className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{copy.voiceReady}</p>
                              <p className="text-xs text-white/48">{statusText}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const lastAssistant = [...messages]
                                  .reverse()
                                  .find((message) => message.role === "assistant");
                                if (lastAssistant) {
                                  speakText(lastAssistant.text);
                                }
                              }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/6 transition hover:bg-white/10"
                              aria-label={copy.repeatLabel}
                            >
                              <Volume2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={resetConversation}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/6 transition hover:bg-white/10"
                              aria-label={copy.resetLabel}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div
                          ref={scrollRef}
                          className="flex-1 space-y-3 overflow-y-auto pr-1"
                        >
                          {messages.map((message) => (
                            <MessageBubble
                              key={message.id}
                              message={message}
                              onOptionSelect={(choice) => handleTurn(choice.value, choice.shortLabel)}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-4 rounded-[24px] border border-white/8 bg-white/5 p-3">
                    <div className="flex items-end gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          voice.isListening
                            ? voice.stopListening()
                            : void voice.startListening()
                        }
                        disabled={!speechRecognitionReady || voice.isProcessing}
                        className={cn(
                          "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition",
                          voice.isListening
                            ? "bg-[#f8d8e5] text-[#111113]"
                            : "bg-white/10 text-[#f7f6f2] hover:bg-white/14",
                          !speechRecognitionReady && "opacity-50"
                        )}
                        aria-label="Toggle microphone"
                      >
                        <Mic className={cn("h-5 w-5", voice.isListening && "animate-pulse")} />
                      </button>

                      <div className="min-w-0 flex-1 rounded-[20px] border border-white/8 bg-[#0f0f11] px-4 py-3">
                        <input
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              handleTurn(draft, draft);
                              setDraft("");
                            }
                          }}
                          placeholder={copy.typePlaceholder}
                          className="w-full bg-transparent text-sm text-[#f7f6f2] outline-none placeholder:text-white/30"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleTurn(draft, draft);
                          setDraft("");
                        }}
                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f4f2eb] text-[#111113] transition hover:brightness-95"
                        aria-label="Send message"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between px-1 text-[11px] uppercase tracking-[0.18em] text-white/36">
                      <span>{copy.heroHint}</span>
                      <span>{copy.pressSayLabel}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="order-3 grid gap-4">
            <Card className="border-white/60 bg-white/66 p-5">
              <CardHeader>
                <Badge variant="accent" className="w-fit">
                  {copy.compareTitle}
                </Badge>
                <CardTitle>{selectedBank ? selectedBank.bankName : "FD options"}</CardTitle>
                <CardDescription>{copy.selectedBankLabel}</CardDescription>
              </CardHeader>
              <CardContent className="mt-5 grid gap-3">
                {comparisonOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedBankId(option.id)}
                    className={cn(
                      "rounded-[22px] border px-4 py-4 text-left transition",
                      option.id === selectedBankId
                        ? "border-[#111113] bg-[#111113] text-[#f7f6f2]"
                        : "border-black/8 bg-white/76 text-[#111113] hover:bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{option.shortName}</p>
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            option.id === selectedBankId ? "text-white/56" : "text-[#666973]"
                          )}
                        >
                          {option.tenorMonths}M
                        </p>
                      </div>
                      <Badge variant={option.id === selectedBankId ? "soft" : "outline"}>
                        {option.badge}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-semibold">{option.rate.toFixed(2)}%</p>
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            option.id === selectedBankId ? "text-white/56" : "text-[#666973]"
                          )}
                        >
                          p.a.
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em]">
                          {copy.returnLabel}
                        </p>
                        <p className="mt-1 text-sm font-semibold">{option.expectedReturn}</p>
                      </div>
                    </div>

                    <p
                      className={cn(
                        "mt-4 text-sm leading-6",
                        option.id === selectedBankId ? "text-white/76" : "text-[#50535a]"
                      )}
                    >
                      {option.meaning}
                    </p>

                    <div
                      className={cn(
                        "mt-4 rounded-[18px] px-3 py-3 text-sm leading-6",
                        option.id === selectedBankId
                          ? "bg-white/8 text-white/72"
                          : "bg-[#f7f4ee] text-[#5c5f67]"
                      )}
                    >
                      <p className="font-semibold">{copy.trustLabel}</p>
                      <p className="mt-1">{option.trustNote}</p>
                      <p className="mt-3 font-semibold">{copy.prematureLabel}</p>
                      <p className="mt-1">{option.prematureRule}</p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/60 bg-white/66 p-5">
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  {copy.journeyTitle}
                </Badge>
                <CardTitle>{copy.pressSayLabel}</CardTitle>
                <CardDescription>
                  {selectedBank ? `${selectedBank.bankName} • ${selectedBank.maturityAmount}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-5 grid gap-3">
                {journeySteps.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-[18px] border border-black/8 bg-white/76 px-4 py-3"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        item.done ? "bg-[#daf5e8] text-[#15714e]" : "bg-[#ece7df] text-[#8f918f]"
                      )}
                    >
                      {item.done ? <Check className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium text-[#313338]">{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/60 bg-white/66 p-5">
              <CardHeader>
                <Badge variant="success" className="w-fit">
                  {copy.handoffTitle}
                </Badge>
                <CardTitle>{selectedBank ? selectedBank.bankName : "KYC handoff"}</CardTitle>
                <CardDescription>{copy.handoffNote}</CardDescription>
              </CardHeader>
              <CardContent className="mt-5 grid gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  disabled={!started}
                  onClick={() => handleHandoffAction("kyc")}
                  className="justify-between rounded-[20px] bg-[#111113] text-[#f5f4ef]"
                >
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    {copy.kycCta}
                  </span>
                  <ArrowUpRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  disabled={!started}
                  onClick={() => handleHandoffAction("bank")}
                  className="justify-between rounded-[20px]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {copy.bankPageCta}
                  </span>
                  <ArrowUpRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  disabled={!started}
                  onClick={() => handleHandoffAction("agent")}
                  className="justify-between rounded-[20px]"
                >
                  <span className="inline-flex items-center gap-2">
                    <PhoneCall className="h-4 w-4" />
                    {copy.agentCta}
                  </span>
                  <ArrowUpRight className="h-4 w-4" />
                </Button>

                {handoffMode ? (
                  <div className="rounded-[20px] bg-[#111113] px-4 py-4 text-sm leading-6 text-[#f5f4ef]">
                    {copy.handoffReply(selectedBank?.bankName ?? "Suryoday Small Finance Bank")}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
