"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  History,
  ListChecks,
  MessageCircleMore,
  PanelLeft,
  Mic,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import AdvisorComposer from "@/components/app/AdvisorComposer";
import AppShell from "@/components/app/AppShell";
import ConversationTimeline from "@/components/app/ConversationTimeline";
import AuthGate from "@/components/auth/AuthGate";
import { HistoryDrawer } from "@/components/chat/HistoryDrawer";
import { VoiceSummaryCard } from "@/components/voice/VoiceSummaryCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LANGUAGE_LABELS } from "@/lib/copy";
import { withCsrfHeaders } from "@/lib/csrf";
import { LANGUAGE_META } from "@/lib/languages";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { AppLanguage, ConversationMode } from "@/lib/server/advisor-schemas";
import { useStreamingChat, type StreamMeta } from "@/hooks/useStreamingChat";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useAuthStore } from "@/stores/authStore";
import { type ConversationMessage, useConversationStore } from "@/stores/conversationStore";
import { useCompareStore } from "@/stores/compareStore";
import { useLadderStore } from "@/stores/ladderStore";

type VoiceVisualState = "idle" | "listening" | "processing" | "speaking" | "error";

const SAMPLE_PROMPTS: Record<AppLanguage, string[]> = {
  en: [
    "Best 12 month FD for Rs 100000",
    "Is a small finance bank safe for FD?",
    "Calculate maturity for Rs 500000 over 2 years",
  ],
  hi: [
    "Rs 100000 ke liye 12 month FD best kaunsi hai",
    "Small finance bank FD surakshit hai kya",
    "Rs 500000 ka 2 saal maturity calculate kijiye",
  ],
  hinglish: [
    "1 lakh ke liye 12 month FD best kaunsi hai",
    "Small finance bank FD safe hai kya",
    "5 lakh ka 2 year maturity calculate karo",
  ],
  ta: [
    "Rs 100000-kku 12 month FD best edhu",
    "Small finance bank FD safe-aa",
    "Rs 500000-ku 2 years maturity calculate pannunga",
  ],
  bn: [
    "Rs 100000 er jonno 12 month FD best konta",
    "Small finance bank FD nirapod naki",
    "Rs 500000 er 2 bochor maturity calculate korun",
  ],
};

const ACKNOWLEDGMENTS: Record<AppLanguage, string[]> = {
  en: ["Let me check that for you.", "Looking into it.", "One moment."],
  hi: ["Dekhta hoon.", "Ek minute.", "Dhundh raha hoon."],
  hinglish: ["Dekhta hoon.", "Ek minute.", "Options check kar raha hoon."],
  ta: ["Paarkkiren.", "Oru nimidam.", "Check pannuren."],
  bn: ["Dekhchi.", "Ek moment.", "Khujchi."],
};

type JargonPayload = {
  ok: boolean;
  term?: string;
  plain?: string;
  example?: string;
  error?: string;
};

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getTimestamp() {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function getRandomAck(language: AppLanguage) {
  const acks = ACKNOWLEDGMENTS[language] ?? ACKNOWLEDGMENTS.en;
  return acks[Math.floor(Math.random() * acks.length)];
}

function createBotMessageFromStream(
  languageLabel: string,
  content: string,
  meta: StreamMeta | null,
  source: ConversationMode,
  id = createMessageId()
): ConversationMessage {
  return {
    id,
    role: "bot",
    content,
    timestamp: getTimestamp(),
    language: languageLabel,
    source,
    followUpPrompt: meta?.followUpPrompt,
    suggestedChips: meta?.suggestedChips ?? [],
    modeSwitchSuggested: !!meta?.modeSwitchSuggestion,
    tone: meta?.tone,
    rateCards: meta?.rateCards?.map((card) => ({
      bankId: card.bankId,
      bankName: card.bankName,
      bankNameLocal: card.bankNameLocal,
      tenor: card.tenorLabel,
      rate: card.rate,
      maturityPreview: card.maturityPreview,
      safetyNote: card.safetyNote,
      badge: card.badge,
      officialUrl: card.officialUrl,
    })),
    actions: meta?.actions,
    glossary: meta?.glossary?.map((item) => ({
      term: item.term,
      plain: item.plain,
      example: item.example,
    })),
    portfolioSplit: meta?.portfolioSplit,
    showCalculator: meta?.showCalculator,
    showTimeMachine: meta?.showTimeMachine,
  };
}

function getSpokenSummary(text: string) {
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return (sentences.slice(0, 2).join(" ") || text).slice(0, 260);
}

function extractAmount(text: string) {
  const normalized = text.toLowerCase().replace(/,/g, "");
  const lakh = normalized.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)/);
  if (lakh) return Math.round(Number(lakh[1]) * 100000);

  const crore = normalized.match(/(\d+(?:\.\d+)?)\s*crore/);
  if (crore) return Math.round(Number(crore[1]) * 10000000);

  const rupee = normalized.match(/(?:rs|inr|rupees?|₹)\s*(\d{4,})/i);
  if (rupee) return Number(rupee[1]);

  const plain = normalized.match(/\b(\d{5,8})\b/);
  return plain ? Number(plain[1]) : undefined;
}

export default function AdvisorWorkspace({ initialMode }: { initialMode: ConversationMode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const language = useConversationStore((state) => state.language);
  const messages = useConversationStore((state) => state.messages);
  const threadId = useConversationStore((state) => state.threadId);
  const isTyping = useConversationStore((state) => state.isTyping);
  const addMessage = useConversationStore((state) => state.addMessage);
  const markLastFailed = useConversationStore((state) => state.markLastFailed);
  const retryLastMessage = useConversationStore((state) => state.retryLastMessage);
  const setActiveMode = useConversationStore((state) => state.setActiveMode);
  const setThreadId = useConversationStore((state) => state.setThreadId);
  const setTyping = useConversationStore((state) => state.setTyping);
  const setVoiceAcknowledgment = useConversationStore((state) => state.setVoiceAcknowledgment);
  const updateMessage = useConversationStore((state) => state.updateMessage);
  const startNewChat = useConversationStore((state) => state.startNewChat);
  const voiceAcknowledgment = useConversationStore((state) => state.voiceAcknowledgment);
  const latestLadderPlan = useLadderStore((state) => state.latestPlan);
  const shortlist = useCompareStore((state) => state.shortlist);
  const lastCompareSnapshot = useCompareStore((state) => state.lastCompareSnapshot);

  const [pendingSource, setPendingSource] = useState<ConversationMode>(initialMode);
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<ConversationMessage | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenSummary, setSpokenSummary] = useState<string | null>(null);
  const [voiceSummary, setVoiceSummary] = useState<{
    summary: string;
    topRates: { bankName: string; rate: string }[];
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const latestStreamMeta = useRef<StreamMeta | null>(null);
  const streamingMessageId = useRef<string | null>(null);
  const pendingSourceRef = useRef<ConversationMode>(initialMode);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const handledPromptRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode, setActiveMode]);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speakReply = useCallback(
    (text: string, tone?: ConversationMessage["tone"]) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        return;
      }

      const summary = getSpokenSummary(text);
      setSpokenSummary(summary);
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(summary);
      utterance.lang = LANGUAGE_META[language].speechSynthesis;
      if (tone === "cautionary") {
        utterance.rate = 0.88;
        utterance.pitch = 0.92;
      } else if (tone === "celebratory") {
        utterance.rate = 1.04;
        utterance.pitch = 1.08;
      }
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [language]
  );

  const { sendStreamingMessage, isStreaming } = useStreamingChat({
    onMeta: (meta) => {
      latestStreamMeta.current = meta;
      if (meta.threadId) setThreadId(meta.threadId);
    },
    onToken: (_token, accumulated) => {
      const id = streamingMessageId.current ?? createMessageId();
      const source = pendingSourceRef.current;
      streamingMessageId.current = id;
      setStreamingMessage(
        createBotMessageFromStream(
          LANGUAGE_LABELS[language],
          accumulated,
          latestStreamMeta.current,
          source,
          id
        )
      );
      setTyping(false);
    },
    onDone: (fullText, meta) => {
      const source = pendingSourceRef.current;
      const botMessage = createBotMessageFromStream(
        LANGUAGE_LABELS[language],
        fullText,
        meta ?? latestStreamMeta.current,
        source,
        streamingMessageId.current ?? createMessageId()
      );

      addMessage(botMessage);
      if (source === "voice") {
        speakReply(botMessage.content, botMessage.tone);
        void fetch("/api/voice/summary", {
          method: "POST",
          headers: withCsrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            messages: [...messages, botMessage].slice(-12).map((message) => ({
              role: message.role,
              content: message.content,
              rateCards: message.rateCards?.map((card) => ({
                bankName: card.bankName,
                rate: card.rate,
              })),
            })),
          }),
        })
          .then((response) => response.json())
          .then((payload) => {
            if (payload?.ok) {
              setVoiceSummary({
                summary: payload.summary,
                topRates: payload.topRates ?? [],
              });
            }
          })
          .catch(() => undefined);
      }

      setTyping(false);
      setStreamingMessage(null);
      setVoiceAcknowledgment(null);
      latestStreamMeta.current = null;
      streamingMessageId.current = null;
    },
    onError: (error) => {
      setTyping(false);
      setStreamingMessage(null);
      setVoiceAcknowledgment(null);
      latestStreamMeta.current = null;
      streamingMessageId.current = null;
      markLastFailed();
      toast.error(error.message || "Saathi could not answer right now.");
    },
  });

  const sendAdvisorMessage = useCallback(
    async (
      rawMessage: string,
      source: ConversationMode = "chat",
      context?: { amount?: number; seniorCitizen?: boolean; tenorMonths?: number }
    ) => {
      const message = rawMessage.trim();
      if (!message) return;

      setActiveMode(source);

      if (source === "voice") {
        cancelSpeech();
        setVoiceAcknowledgment(getRandomAck(language));
      }

      const detectedAmount = context?.amount ?? extractAmount(message);

      if (editingMessageId) {
        updateMessage(editingMessageId, { edited: true, content: message });
        setEditingMessageId(null);
      }

      addMessage({
        id: createMessageId(),
        role: "user",
        content: message,
        timestamp: getTimestamp(),
        language: LANGUAGE_LABELS[language],
        source,
      });

      setDraft("");
      setTyping(true);
      setStreamingMessage(null);
      latestStreamMeta.current = null;
      streamingMessageId.current = null;
      pendingSourceRef.current = source;
      setPendingSource(source);

      await sendStreamingMessage({
        message,
        language,
        threadId: user ? threadId ?? undefined : undefined,
        shortlistBankIds: shortlist,
        ladderPlan: latestLadderPlan ?? undefined,
        compareSnapshot: lastCompareSnapshot ?? undefined,
        mode: source,
        amount: detectedAmount,
        tenorMonths: context?.tenorMonths,
        seniorCitizen: context?.seniorCitizen,
      });
    },
    [
      addMessage,
      cancelSpeech,
      editingMessageId,
      language,
      lastCompareSnapshot,
      latestLadderPlan,
      sendStreamingMessage,
      setActiveMode,
      setTyping,
      setVoiceAcknowledgment,
      shortlist,
      threadId,
      updateMessage,
      user,
    ]
  );

  const voice = useVoiceInput({
    language,
    onTranscript: (transcript) => {
      void sendAdvisorMessage(transcript, "voice");
    },
  });

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;

    const prompt = new URLSearchParams(window.location.search).get("prompt")?.trim();
    if (!prompt || handledPromptRef.current === prompt) return;

    handledPromptRef.current = prompt;
    router.replace(ROUTES.CHAT);
    void sendAdvisorMessage(prompt, "chat");
  }, [router, sendAdvisorMessage, user]);

  useEffect(() => {
    if (voice.isListening) {
      const frame = window.requestAnimationFrame(cancelSpeech);
      return () => window.cancelAnimationFrame(frame);
    }
  }, [cancelSpeech, voice.isListening]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingMessage, isTyping]);

  useEffect(() => {
    return () => cancelSpeech();
  }, [cancelSpeech]);

  const visibleMessages = streamingMessage ? [...messages, streamingMessage] : messages;
  const meaningfulMessages = messages.filter((message) => message.id !== "welcome");
  const showPromptChips = meaningfulMessages.length === 0;

  const voiceState: VoiceVisualState = useMemo(() => {
    if (voice.error) return "error";
    if (voice.isListening) return "listening";
    if (voice.isProcessing || (isTyping && pendingSource === "voice")) return "processing";
    if (isSpeaking) return "speaking";
    return "idle";
  }, [isSpeaking, isTyping, pendingSource, voice.error, voice.isListening, voice.isProcessing]);
  const voiceStatusLabel =
    voiceState === "listening"
      ? "Listening"
      : voiceState === "processing"
        ? "Processing voice"
        : voiceState === "speaking"
          ? "Speaking"
          : voiceState === "error"
            ? "Mic issue"
            : "Text + voice";

  const handleRetry = () => {
    const failedMessage = retryLastMessage();
    if (failedMessage) {
      void sendAdvisorMessage(failedMessage.content, failedMessage.source);
    }
  };

  const handleAction = async (
    action: NonNullable<ConversationMessage["actions"]>[number]
  ) => {
    if (!action.action && action.label) {
      void sendAdvisorMessage(action.label, "chat");
      return;
    }

    if (action.action === "open_compare") {
      router.push(ROUTES.COMPARE);
      return;
    }

    if (action.action === "open_voice" || action.action === "switch_to_voice") {
      handleMicPress();
      return;
    }

    if (action.action === "open_chat" || action.action === "switch_to_chat") {
      setActiveMode("chat");
      cancelSpeech();
      return;
    }

    if (action.action === "open_official_site" && action.url) {
      window.open(action.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (action.action === "sign_in") {
      router.push(ROUTES.LOGIN);
      return;
    }

    if (action.action === "explain_term" && action.termId) {
      try {
        const response = await fetch(`/api/jargon/${action.termId}?language=${language}`);
        const payload = (await response.json()) as JargonPayload;

        if (!response.ok || !payload.ok || !payload.term || !payload.plain) {
          throw new Error(payload.error || "Unable to explain that term.");
        }

        addMessage({
          id: createMessageId(),
          role: "bot",
          content: `Term: ${payload.term}\nMeaning: ${payload.plain}\nExample: ${payload.example ?? ""}`.trim(),
          timestamp: getTimestamp(),
          language: LANGUAGE_LABELS[language],
          source: "chat",
          glossary: [{ term: payload.term, plain: payload.plain, example: payload.example ?? "" }],
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to explain the term.");
      }
    }
  };

  const handleMicPress = () => {
    setActiveMode("voice");
    if (isSpeaking) {
      cancelSpeech();
      setSpokenSummary(null);
      return;
    }
    if (voice.isListening) {
      voice.stopListening();
      return;
    }
    voice.resetTranscript();
    void voice.startListening();
  };

  const resetConversation = () => {
    cancelSpeech();
    startNewChat();
    setShowMenu(false);
  };

  return (
    <AppShell
      eyebrow="AI Advisor"
      title="Nivesh Saathi"
      description="One multimodal advisor for fixed deposit decisions."
      workspace
    >
      <AuthGate
        title="Sign in to save your advisor"
        body="Sign in to access Saathi, save conversations, watch rates, and sync your FD context."
      >
        <HistoryDrawer open={showHistory} onClose={() => setShowHistory(false)} />

        <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#0A0A0A] text-[#EAEAEA]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(215,182,109,0.07),transparent_34rem)]"
            aria-hidden="true"
          />
          <div className="relative flex h-full min-h-0 min-w-0">
            <aside
              aria-hidden="true"
              className="hidden w-0 shrink-0 border-r border-[#1F1F1F]/70 laptop:block"
            />
            <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                <div className="mx-auto flex min-h-full w-full max-w-[900px] flex-col px-3 pb-6 pt-4 tablet:px-5 tablet:pt-6 laptop:px-8">
                  <header className="sticky top-0 z-20 -mx-3 mb-5 flex flex-wrap items-center justify-between gap-3 bg-[#0A0A0A]/95 px-3 pb-3 pt-3 backdrop-blur-xl tablet:-mx-5 tablet:mb-7 tablet:px-5 tablet:pb-4 laptop:-mx-8 laptop:px-8">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowHistory(true)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#1F1F1F] bg-[#121212] text-[#9CA3AF] transition hover:border-accent/30 hover:text-accent"
                        aria-label="Open chat history"
                      >
                        <PanelLeft className="h-4 w-4" />
                      </button>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#1F1F1F] bg-[#121212] text-accent">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="truncate text-base font-semibold tracking-normal text-[#EAEAEA]">
                            Saathi Advisor
                          </h1>
                          <Badge
                            variant="outline"
                            className="hidden rounded-full border-[#1F1F1F] bg-[#161616] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#9CA3AF] tablet:inline-flex"
                          >
                            {LANGUAGE_LABELS[language]}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-[#9CA3AF]">
                          {user
                            ? `${shortlist.length} shortlisted banks in context`
                            : "Sign in to access your advisor."}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div className="hidden min-h-9 items-center gap-2 rounded-full border border-[#1F1F1F] bg-[#121212]/80 px-3 py-1.5 text-xs font-medium text-[#9CA3AF] tablet:flex">
                        {voiceState === "listening" || voiceState === "speaking" ? (
                          <span className="wave-bars" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                          </span>
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                        )}
                        {voiceStatusLabel}
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1F1F1F] bg-[#121212]/80 text-[#9CA3AF] transition hover:border-accent/30 hover:bg-[#161616] hover:text-[#EAEAEA]"
                          onClick={() => setShowMenu((value) => !value)}
                          aria-label="Open advisor menu"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <AnimatePresence>
                          {showMenu ? (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.98 }}
                              className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-[14px] border border-[#1F1F1F] bg-[#121212] shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setShowHistory(true);
                                  setShowMenu(false);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#9CA3AF] transition hover:bg-white/[0.055] hover:text-[#EAEAEA]"
                              >
                                <History className="h-4 w-4" />
                                History
                              </button>
                              <Link
                                href={ROUTES.COMPARE}
                                onClick={() => setShowMenu(false)}
                                className="flex items-center gap-2 px-4 py-3 text-sm text-[#9CA3AF] transition hover:bg-white/[0.055] hover:text-[#EAEAEA]"
                              >
                                <ListChecks className="h-4 w-4" />
                                Shortlist and compare
                              </Link>
                              <button
                                type="button"
                                onClick={resetConversation}
                                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#9CA3AF] transition hover:bg-white/[0.055] hover:text-[#EAEAEA]"
                              >
                                <RotateCcw className="h-4 w-4" />
                                New conversation
                              </button>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </div>
                  </header>

                  {initialMode === "voice" ? (
                    <motion.section
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="mb-6 rounded-[20px] border border-[#1F1F1F] bg-[#121212]/78 px-3 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.26)] backdrop-blur-xl tablet:mb-8 tablet:rounded-[24px] tablet:px-5"
                    >
                      <div className="grid items-center gap-5 laptop:grid-cols-[auto_1fr_auto]">
                        <button
                          type="button"
                          onClick={handleMicPress}
                          disabled={voice.isProcessing || isStreaming || isTyping}
                          className={cn(
                            "relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#1F1F1F] bg-[#0F0F0F] text-accent transition hover:-translate-y-0.5 hover:border-accent/35 laptop:mx-0",
                            voiceState === "listening" && "animate-mic-pulse border-accent/35 bg-accent text-on-accent",
                            voiceState === "speaking" && "border-accent/25 bg-[#1A1A1A] text-[#EAEAEA]",
                            voiceState === "error" && "text-danger"
                          )}
                          aria-label={voiceStatusLabel}
                        >
                          {voiceState === "listening" ? (
                            <Mic className="h-8 w-8" />
                          ) : voiceState === "speaking" ? (
                            <VolumeX className="h-8 w-8" />
                          ) : (
                            <Mic className="h-8 w-8" />
                          )}
                        </button>

                        <div className="min-w-0 text-center laptop:text-left">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                            Voice advisor
                          </p>
                          <h2 className="mt-2 text-xl font-semibold text-[#EAEAEA]">
                            {voiceStatusLabel}
                          </h2>
                          <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                            {voiceState === "listening"
                              ? voice.transcript || "Speak naturally. Saathi will convert your question into this secure advisor thread."
                              : voiceState === "processing"
                                ? voiceAcknowledgment || "Checking rates and preparing a concise spoken summary."
                                : voiceState === "speaking"
                                  ? spokenSummary || "Saathi is reading the short answer aloud."
                                  : voice.error || "Tap the microphone, ask about rates, maturity, safety, or your shortlist."}
                          </p>
                          {voiceState === "speaking" ? (
                            <div className="wave-bars mt-4" aria-hidden="true">
                              <span /><span /><span /><span /><span />
                            </div>
                          ) : null}
                        </div>

                        <div className="grid gap-2 tablet:grid-cols-2 laptop:grid-cols-1">
                          <Button
                            variant="outline"
                            className="w-full border-[#1F1F1F] bg-[#161616] text-[#EAEAEA]"
                            onClick={cancelSpeech}
                            disabled={!isSpeaking}
                          >
                            <VolumeX className="h-4 w-4" />
                            Stop speaking
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full border-[#1F1F1F] bg-[#161616] text-[#EAEAEA]"
                            onClick={() => setActiveMode("chat")}
                          >
                            <MessageCircleMore className="h-4 w-4" />
                            Switch to chat
                          </Button>
                          <div className="flex min-h-11 items-center justify-between gap-3 rounded-full border border-[#1F1F1F] bg-[#161616] px-3 text-xs font-medium text-[#9CA3AF]">
                            <span className="inline-flex items-center gap-2"><Volume2 className="h-4 w-4" /> Auto-speak</span>
                            <span className="rounded-full bg-accent-soft px-2 py-1 text-accent">On</span>
                          </div>
                        </div>
                      </div>
                    </motion.section>
                  ) : null}

                  <ConversationTimeline
                    messages={visibleMessages}
                    onAction={handleAction}
                    onRetry={handleRetry}
                    onEdit={(message) => {
                      setDraft(message.content);
                      setEditingMessageId(message.id);
                    }}
                    onChipSelect={(chip) => void sendAdvisorMessage(chip, "chat")}
                    showSmartChips={!isTyping && !streamingMessage}
                    isTyping={isTyping || !!streamingMessage}
                    richContent="hidden"
                  />

                  <AnimatePresence>
                    {isTyping && !streamingMessage ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className="mt-6 flex items-center gap-3 pl-1 text-sm text-[#9CA3AF]"
                      >
                        <span className="wave-bars" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                          <span />
                          <span />
                        </span>
                        Saathi is thinking
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              <AdvisorComposer
                draft={draft}
                disabled={isTyping || isStreaming}
                editing={!!editingMessageId}
                language={language}
                prompts={SAMPLE_PROMPTS[language]}
                showPrompts={showPromptChips}
                spokenSummary={spokenSummary}
                voiceAcknowledgment={voiceAcknowledgment}
                voiceDisabled={voice.isProcessing || isStreaming || isTyping}
                voiceError={voice.error}
                voiceState={voiceState}
                voiceTranscript={voice.transcript}
                onCancelEdit={() => {
                  setEditingMessageId(null);
                  setDraft("");
                }}
                onChange={setDraft}
                onMicPress={handleMicPress}
                onPrompt={(prompt) => void sendAdvisorMessage(prompt, "chat")}
                onSubmit={() => void sendAdvisorMessage(draft, "chat")}
                onVoiceRetry={() => {
                  setActiveMode("voice");
                  voice.resetTranscript();
                  void voice.startListening();
                }}
              />
            </section>
          </div>
        </div>

        <AnimatePresence>
          {voiceSummary ? (
            <VoiceSummaryCard
              summary={voiceSummary.summary}
              topRates={voiceSummary.topRates}
              onClose={() => setVoiceSummary(null)}
            />
          ) : null}
        </AnimatePresence>

      </AuthGate>
    </AppShell>
  );
}
