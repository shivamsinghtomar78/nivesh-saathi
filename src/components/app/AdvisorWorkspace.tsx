"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  History,
  ListChecks,
  MoreHorizontal,
  PanelRightOpen,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import AdvisorComposer from "@/components/app/AdvisorComposer";
import AdvisorInsightPanel, { hasAdvisorInsights } from "@/components/app/AdvisorInsightPanel";
import AdvisorVoiceDock from "@/components/app/AdvisorVoiceDock";
import BestFdWizard from "@/components/app/BestFdWizard";
import AppShell from "@/components/app/AppShell";
import ConversationTimeline from "@/components/app/ConversationTimeline";
import AuthGate from "@/components/auth/AuthGate";
import { HistoryDrawer } from "@/components/chat/HistoryDrawer";
import ModeSwitchBanner from "@/components/shared/ModeSwitchBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LANGUAGE_LABELS } from "@/lib/copy";
import { LANGUAGE_META } from "@/lib/languages";
import { ROUTES } from "@/lib/routes";
import type { AppLanguage, ConversationMode } from "@/lib/server/advisor-schemas";
import { cn } from "@/lib/utils";
import { useStreamingChat, type StreamMeta } from "@/hooks/useStreamingChat";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useAuthStore } from "@/stores/authStore";
import { type ConversationMessage, useConversationStore } from "@/stores/conversationStore";
import { useCompareStore } from "@/stores/compareStore";

type RateCard = NonNullable<ConversationMessage["rateCards"]>[number];
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

function latestBotWithInsights(messages: ConversationMessage[]) {
  return [...messages]
    .reverse()
    .find((message) => message.role === "bot" && hasAdvisorInsights(message));
}

export default function AdvisorWorkspace({ initialMode }: { initialMode: ConversationMode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const language = useConversationStore((state) => state.language);
  const messages = useConversationStore((state) => state.messages);
  const threadId = useConversationStore((state) => state.threadId);
  const isTyping = useConversationStore((state) => state.isTyping);
  const addMessage = useConversationStore((state) => state.addMessage);
  const clearMessages = useConversationStore((state) => state.clearMessages);
  const markLastFailed = useConversationStore((state) => state.markLastFailed);
  const retryLastMessage = useConversationStore((state) => state.retryLastMessage);
  const setActiveMode = useConversationStore((state) => state.setActiveMode);
  const setThreadId = useConversationStore((state) => state.setThreadId);
  const setTyping = useConversationStore((state) => state.setTyping);
  const setVoiceAcknowledgment = useConversationStore((state) => state.setVoiceAcknowledgment);
  const updateMessage = useConversationStore((state) => state.updateMessage);
  const voiceAcknowledgment = useConversationStore((state) => state.voiceAcknowledgment);
  const shortlist = useCompareStore((state) => state.shortlist);

  const [mode, setMode] = useState<ConversationMode>(initialMode);
  const [pendingSource, setPendingSource] = useState<ConversationMode>(initialMode);
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showMobileInsights, setShowMobileInsights] = useState(false);
  const [selectedRateCard, setSelectedRateCard] = useState<RateCard | null>(null);
  const [contextPrincipal, setContextPrincipal] = useState<number | undefined>();
  const [modeSwitchInfo, setModeSwitchInfo] = useState<{ targetMode: ConversationMode; reason: string } | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<ConversationMessage | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenSummary, setSpokenSummary] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const latestStreamMeta = useRef<StreamMeta | null>(null);
  const streamingMessageId = useRef<string | null>(null);
  const pendingSourceRef = useRef<ConversationMode>(initialMode);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode, setActiveMode]);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("wizard") === "best-fd") {
      const timer = window.setTimeout(() => setShowWizard(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const switchMode = useCallback(
    (nextMode: ConversationMode, updateRoute = true) => {
      setMode(nextMode);
      setActiveMode(nextMode);
      if (updateRoute) {
        router.push(nextMode === "voice" ? ROUTES.VOICE : ROUTES.CHAT);
      }
    },
    [router, setActiveMode]
  );

  const cancelSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speakReply = useCallback(
    (text: string, tone?: ConversationMessage["tone"]) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !autoSpeak) {
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
    [autoSpeak, language]
  );

  const { sendStreamingMessage, isStreaming } = useStreamingChat({
    onMeta: (meta) => {
      latestStreamMeta.current = meta;
      if (meta.threadId) setThreadId(meta.threadId);
      if (meta.modeSwitchSuggestion) setModeSwitchInfo(meta.modeSwitchSuggestion);
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
      if (botMessage.rateCards?.[0]) setSelectedRateCard(botMessage.rateCards[0]);
      if (source === "voice") speakReply(botMessage.content, botMessage.tone);

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
      source: ConversationMode = mode,
      context?: { amount?: number; seniorCitizen?: boolean; tenorMonths?: number }
    ) => {
      const message = rawMessage.trim();
      if (!message) return;

      if (source === "voice") {
        cancelSpeech();
        setVoiceAcknowledgment(getRandomAck(language));
      }

      const detectedAmount = context?.amount ?? extractAmount(message);
      if (detectedAmount) setContextPrincipal(detectedAmount);

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
      setShowWizard(false);
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
      mode,
      sendStreamingMessage,
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
  }, [messages, streamingMessage, isTyping, showWizard]);

  useEffect(() => {
    return () => cancelSpeech();
  }, [cancelSpeech]);

  const visibleMessages = streamingMessage ? [...messages, streamingMessage] : messages;
  const meaningfulMessages = messages.filter((message) => message.id !== "welcome");
  const latestInsightMessage = latestBotWithInsights(visibleMessages) ?? null;
  const hasInsights = hasAdvisorInsights(latestInsightMessage);
  const showPromptChips =
    meaningfulMessages.length === 0 ||
    (messages.at(-1)?.role === "bot" && !isTyping && !streamingMessage);

  const voiceState: VoiceVisualState = useMemo(() => {
    if (voice.error) return "error";
    if (voice.isListening) return "listening";
    if (voice.isProcessing || (isTyping && pendingSource === "voice")) return "processing";
    if (isSpeaking) return "speaking";
    return "idle";
  }, [isSpeaking, isTyping, pendingSource, voice.error, voice.isListening, voice.isProcessing]);

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
      void sendAdvisorMessage(action.label, mode);
      return;
    }

    if (action.action === "open_compare") {
      router.push(ROUTES.COMPARE);
      return;
    }

    if (action.action === "open_voice" || action.action === "switch_to_voice") {
      switchMode("voice");
      return;
    }

    if (action.action === "open_chat" || action.action === "switch_to_chat") {
      switchMode("chat");
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
          source: mode,
          glossary: [{ term: payload.term, plain: payload.plain, example: payload.example ?? "" }],
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to explain the term.");
      }
    }
  };

  const handleMicPress = () => {
    switchMode("voice", false);
    if (isSpeaking) {
      cancelSpeech();
      return;
    }
    if (voice.isListening) {
      voice.stopListening();
      return;
    }
    void voice.startListening();
  };

  const resetConversation = () => {
    cancelSpeech();
    clearMessages();
    setThreadId(null);
    setSelectedRateCard(null);
    setModeSwitchInfo(null);
    setShowMenu(false);
    setShowWizard(false);
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
        body="You can browse rates as a guest. Sign in to save conversations, watch rates, and sync your FD context."
        allowGuest
      >
        <HistoryDrawer open={showHistory} onClose={() => setShowHistory(false)} />

        <div className="grid min-h-[calc(100vh-7rem)] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-outline bg-panel shadow-sm">
            <header className="border-b border-outline/60 bg-panel/95 p-4 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-panel)] bg-surface-dark text-on-dark shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h1 className="truncate text-lg font-semibold text-text-strong">
                        Saathi Advisor
                      </h1>
                      <Badge variant="outline" className="hidden bg-input-bg text-[10px] uppercase tracking-wider sm:inline-flex">
                        {LANGUAGE_LABELS[language]}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-text-muted">
                      {user
                        ? `${shortlist.length} shortlisted banks in context`
                        : "Guest mode. Sign in only when you want to save."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="grid grid-cols-2 rounded-full border border-outline bg-input-bg p-1">
                    {(["chat", "voice"] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => switchMode(item)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition",
                          mode === item ? "bg-surface-dark text-on-dark shadow-sm" : "text-text-muted hover:text-text-strong"
                        )}
                        aria-pressed={mode === item}
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 rounded-full bg-input-bg xl:hidden"
                    onClick={() => setShowMobileInsights(true)}
                    disabled={!hasInsights}
                    aria-label="Open insights"
                  >
                    <PanelRightOpen className="h-4 w-4" />
                  </Button>

                  <div className="relative">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-full bg-input-bg"
                      onClick={() => setShowMenu((value) => !value)}
                      aria-label="Open advisor menu"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    <AnimatePresence>
                      {showMenu ? (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-[var(--radius-panel)] border border-outline bg-panel shadow-lg"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setShowHistory(true);
                              setShowMenu(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-text-muted transition hover:bg-inner-panel hover:text-text-strong"
                          >
                            <History className="h-4 w-4" />
                            History
                          </button>
                          <Link
                            href={ROUTES.COMPARE}
                            onClick={() => setShowMenu(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-text-muted transition hover:bg-inner-panel hover:text-text-strong"
                          >
                            <ListChecks className="h-4 w-4" />
                            Shortlist and compare
                          </Link>
                          <button
                            type="button"
                            onClick={resetConversation}
                            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-text-muted transition hover:bg-inner-panel hover:text-text-strong"
                          >
                            <RotateCcw className="h-4 w-4" />
                            New conversation
                          </button>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </header>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 custom-scrollbar md:px-6">
              <AnimatePresence>
                {showWizard ? (
                  <BestFdWizard
                    onClose={() => setShowWizard(false)}
                    onSubmit={(payload) => {
                      void sendAdvisorMessage(payload.prompt, "chat", {
                        amount: payload.amount,
                        seniorCitizen: payload.seniorCitizen,
                        tenorMonths: payload.tenorMonths,
                      });
                    }}
                  />
                ) : null}
              </AnimatePresence>

              <ConversationTimeline
                messages={visibleMessages}
                onAction={handleAction}
                onRetry={handleRetry}
                onEdit={(message) => {
                  setDraft(message.content);
                  setEditingMessageId(message.id);
                }}
                onChipSelect={(chip) => void sendAdvisorMessage(chip, mode)}
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
                    className="mt-4 flex justify-start"
                  >
                    <div className="inline-flex items-center gap-3 rounded-[var(--radius-panel)] border border-outline bg-panel px-4 py-3 text-sm text-text-muted shadow-sm">
                      <span className="wave-bars" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </span>
                      Saathi is thinking
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {modeSwitchInfo ? (
                <ModeSwitchBanner
                  targetMode={modeSwitchInfo.targetMode}
                  reason={modeSwitchInfo.reason}
                  onDismiss={() => setModeSwitchInfo(null)}
                />
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {mode === "voice" ? (
                <AdvisorVoiceDock
                  acknowledgment={voiceAcknowledgment}
                  autoSpeak={autoSpeak}
                  disabled={voice.isProcessing || isStreaming}
                  error={voice.error}
                  isListening={voice.isListening}
                  isSpeaking={isSpeaking}
                  spokenSummary={spokenSummary}
                  state={voiceState}
                  transcript={voice.transcript}
                  onMicPress={handleMicPress}
                  onRetry={() => void voice.startListening()}
                  onToggleAutoSpeak={() => setAutoSpeak((value) => !value)}
                />
              ) : null}
            </AnimatePresence>

            <AdvisorComposer
              draft={draft}
              disabled={isTyping || isStreaming}
              editing={!!editingMessageId}
              language={language}
              mode={mode}
              prompts={SAMPLE_PROMPTS[language]}
              showPrompts={showPromptChips && !showWizard}
              onCancelEdit={() => {
                setEditingMessageId(null);
                setDraft("");
              }}
              onChange={setDraft}
              onOpenWizard={() => setShowWizard(true)}
              onPrompt={(prompt) => void sendAdvisorMessage(prompt, mode)}
              onSubmit={() => void sendAdvisorMessage(draft, mode)}
              onVoiceMode={() => switchMode("voice")}
            />
          </section>

          <AdvisorInsightPanel
            className="hidden xl:flex"
            contextPrincipal={contextPrincipal}
            latestMessage={latestInsightMessage}
            shortlistCount={shortlist.length}
            selectedRateCard={selectedRateCard}
            onSelectRateCard={setSelectedRateCard}
          />
        </div>

        <AnimatePresence>
          {showMobileInsights ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileInsights(false)}
                className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm xl:hidden"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 32 }}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[82vh] overflow-hidden rounded-t-[var(--radius-card)] border-t border-outline bg-panel shadow-lg xl:hidden"
              >
                <div className="flex items-center justify-between border-b border-outline p-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Insights</p>
                    <p className="text-base font-semibold text-text-strong">Financial context</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMobileInsights(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-input-bg text-text-muted"
                    aria-label="Close insights"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                </div>
                <AdvisorInsightPanel
                  className="max-h-[calc(82vh-72px)] rounded-none border-0"
                  contextPrincipal={contextPrincipal}
                  latestMessage={latestInsightMessage}
                  shortlistCount={shortlist.length}
                  selectedRateCard={selectedRateCard}
                  onSelectRateCard={setSelectedRateCard}
                />
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>
      </AuthGate>
    </AppShell>
  );
}
