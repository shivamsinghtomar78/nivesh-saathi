"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RotateCcw, Volume2, VolumeX, Mic, MicOff, Settings, Sparkles, MessageCircleMore } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import AuthGate from "@/components/auth/AuthGate";
import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura";
import AppShell from "@/components/app/AppShell";
import ConversationTimeline from "@/components/app/ConversationTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { withCsrfHeaders } from "@/lib/csrf";
import { LANGUAGE_LABELS } from "@/lib/copy";
import { LANGUAGE_META } from "@/lib/languages";
import { ROUTES } from "@/lib/routes";
import type { AdvisorResponse } from "@/lib/server/advisor-schemas";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useAuthStore } from "@/stores/authStore";
import { type ChatMessage, useChatStore } from "@/stores/chatStore";
import { useCompareStore } from "@/stores/compareStore";

type ChatApiPayload = {
  ok: boolean;
  threadId?: string;
  response?: AdvisorResponse;
  error?: string;
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

function createWelcomeMessage(languageLabel: string): ChatMessage {
  return {
    id: `welcome-${languageLabel}`,
    role: "bot",
    content:
      "Voice assistant is ready.\nTap the microphone below and ask me your fixed deposit questions naturally.",
    timestamp: getTimestamp(),
    language: languageLabel,
  };
}

function createBotMessage(languageLabel: string, response: AdvisorResponse): ChatMessage {
  return {
    id: createMessageId(),
    role: "bot",
    content: response.text,
    timestamp: getTimestamp(),
    language: languageLabel,
    rateCards: response.rateCards.map((card) => ({
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
    actions: response.actions,
    glossary: response.glossary.map((item) => ({
      term: item.term,
      plain: item.plain,
      example: item.example,
    })),
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function VoiceScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const language = useChatStore((state) => state.language);
  const shortlist = useCompareStore((state) => state.shortlist);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const visibleMessages = useMemo(
    () =>
      messages.length === 0
        ? [createWelcomeMessage(LANGUAGE_LABELS[language])]
        : messages,
    [language, messages]
  );

  const speakReply = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !autoSpeak) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANGUAGE_META[language].speechSynthesis;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [autoSpeak, language]);

  const sendVoicePrompt = async (transcript: string) => {
    const message = transcript.trim();
    if (!message || !user) {
      return;
    }

    setMessages((current) => {
      const seed =
        current.length === 0
          ? [createWelcomeMessage(LANGUAGE_LABELS[language])]
          : current;

      return [
        ...seed,
        {
          id: createMessageId(),
          role: "user",
          content: message,
          timestamp: getTimestamp(),
          language: LANGUAGE_LABELS[language],
        },
      ];
    });
    setIsThinking(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: withCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          message,
          language,
          threadId: threadId ?? undefined,
          shortlistBankIds: shortlist,
        }),
      });
      const payload = (await response.json()) as ChatApiPayload;

      if (!response.ok || !payload.ok || !payload.response) {
        throw new Error(payload.error || "Unable to get a voice answer right now.");
      }

      setThreadId(payload.threadId ?? null);
      setMessages((current) => [
        ...current,
        createBotMessage(LANGUAGE_LABELS[language], payload.response!),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Voice request failed.");
    } finally {
      setIsThinking(false);
    }
  };

  const voice = useVoiceInput({
    language,
    onTranscript: (transcript) => {
      void sendVoicePrompt(transcript);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: "smooth",
      });
    }
  }, [isThinking, messages]);

  useEffect(() => {
    const lastBotMessage = [...visibleMessages]
      .reverse()
      .find((message) => message.role === "bot");
    if (!lastBotMessage || lastBotMessage.id === lastSpokenIdRef.current) {
      return;
    }

    lastSpokenIdRef.current = lastBotMessage.id;
    speakReply(lastBotMessage.content);
  }, [speakReply, visibleMessages]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleAction = async (
    action: NonNullable<ChatMessage["actions"]>[number]
  ) => {
    if (action.action === "open_compare") {
      router.push(ROUTES.COMPARE);
      return;
    }

    if (action.action === "open_voice") {
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
        const response = await fetch(
          `/api/jargon/${action.termId}?language=${language}`
        );
        const payload = (await response.json()) as JargonPayload;

        if (!response.ok || !payload.ok || !payload.term || !payload.plain) {
          throw new Error(payload.error || "Unable to explain that term.");
        }

        const term = payload.term;
        const plain = payload.plain;
        const example = payload.example ?? "";

        setMessages((current) => [
          ...current,
          {
            id: createMessageId(),
            role: "bot",
            content: `Term: ${term}\nMeaning: ${plain}\nExample: ${example}`.trim(),
            timestamp: getTimestamp(),
            language: LANGUAGE_LABELS[language],
            glossary: [
              {
                term,
                plain,
                example,
              },
            ],
          },
        ]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to explain the term.");
      }
    }
  };

  const visualState = useMemo(() => {
    if (voice.isListening) {
      return "listening" as const;
    }
    if (voice.isProcessing || isThinking) {
      return "thinking" as const;
    }
    if (isSpeaking) {
      return "speaking" as const;
    }
    return "idle" as const;
  }, [isSpeaking, isThinking, voice.isListening, voice.isProcessing]);

  return (
    <AppShell
      eyebrow="Voice Assistant"
      title="Hands-free financial advice"
      description="Speak naturally to get answers, compare rates, and clarify complex terms without typing."
      actions={
        <div className="flex gap-3">
          <Link href={ROUTES.CHAT}>
            <Button size="sm" variant="outline" className="rounded-full bg-panel-glass">
              <MessageCircleMore className="mr-2 h-4 w-4" />
              Switch to Text
            </Button>
          </Link>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full shadow-sm"
            onClick={() => {
              setMessages([]);
              setThreadId(null);
              lastSpokenIdRef.current = null;
            }}
          >
            <RotateCcw className="mr-2 h-3 w-3" />
            New Call
          </Button>
        </div>
      }
    >
      <AuthGate
        title="Sign in for voice advice"
        body="Sign in to save your conversation history and keep your device settings in sync."
      >
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6 xl:grid-cols-[380px_1fr]"
        >
          <motion.div variants={itemVariants} className="grid gap-6 auto-rows-max">
            <Card className="p-6 border-outline bg-panel-glass shadow-sm flex flex-col items-center justify-center relative overflow-hidden min-h-[380px]">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
              <CardHeader className="text-center w-full pb-8 z-10">
                <Badge variant="accent" className="bg-accent/10 text-accent hover:bg-accent/20 mx-auto mb-3">
                  Voice Session
                </Badge>
                <CardTitle className="text-2xl font-medium tracking-tight">Active Call</CardTitle>
                <CardDescription className="text-sm mt-1">
                  {voice.error
                    ? "Connection error"
                    : voice.isListening
                      ? "I'm listening..."
                      : voice.isProcessing || isThinking
                        ? "Finding the best answer..."
                        : isSpeaking
                          ? "Saathi is speaking..."
                          : "Tap microphone to speak"}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex flex-col items-center justify-center w-full z-10">
                <div className="relative flex items-center justify-center w-32 h-32 mb-8">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <AgentAudioVisualizerAura state={visualState} color="#1f7a5b" />
                  </div>
                  <Button
                    size="icon"
                    variant={voice.isListening ? "default" : "secondary"}
                    className={`w-16 h-16 rounded-full shadow-md z-10 transition-all duration-300 ${voice.isListening ? 'bg-danger hover:bg-danger/90 scale-110 shadow-danger/20' : ''}`}
                    onClick={() =>
                      voice.isListening ? voice.stopListening() : void voice.startListening()
                    }
                    disabled={voice.isProcessing || isThinking}
                  >
                    {voice.isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </Button>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full bg-white/50 px-4"
                    onClick={() => setAutoSpeak((current) => !current)}
                  >
                    {autoSpeak ? (
                      <>
                        <Volume2 className="h-3.5 w-3.5 mr-2 text-accent" />
                        Speech: On
                      </>
                    ) : (
                      <>
                        <VolumeX className="h-3.5 w-3.5 mr-2 text-text-muted" />
                        Speech: Off
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="p-5 border-outline bg-panel shadow-sm">
              <CardHeader className="pb-4 px-0 pt-0">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-4 h-4 text-accent" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Context</span>
                </div>
                <CardTitle className="text-lg">Call Settings</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                  <p className="text-sm text-text-muted leading-relaxed">
                    Language is set to <strong className="text-text-strong font-medium">{LANGUAGE_LABELS[language]}</strong>. You can change this from the top menu.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                  <p className="text-sm text-text-muted leading-relaxed">
                    {shortlist.length > 0
                      ? `I can see your ${shortlist.length} shortlisted banks.`
                      : "No banks shortlisted. We'll start from scratch."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-col h-full min-h-[600px] max-h-[80vh]">
            <Card className="flex flex-col flex-1 shadow-sm border-outline bg-panel-glass overflow-hidden">
              <CardHeader className="border-b border-outline/50 pb-4 bg-panel/50 backdrop-blur-md z-10 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-dark flex items-center justify-center text-on-dark shadow-soft">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Live Transcript</CardTitle>
                      <CardDescription className="text-xs">
                        Real-time text of your conversation
                      </CardDescription>
                    </div>
                  </div>
                  {isThinking ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-outline bg-inner-panel px-3 py-1.5 text-[11px] font-medium text-text-muted">
                      <LoaderCircle className="h-3 w-3 animate-spin" />
                      Processing
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0 flex flex-col relative bg-gradient-to-b from-transparent to-app/20">
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar"
                >
                  <ConversationTimeline messages={visibleMessages} onAction={handleAction} />
                  
                  <AnimatePresence>
                    {isThinking && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex justify-start mt-4"
                      >
                        <div className="inline-flex items-center gap-3 rounded-2xl rounded-tl-sm border border-outline bg-panel px-4 py-3 text-sm text-text-muted shadow-sm">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          Finding information...
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </AuthGate>
    </AppShell>
  );
}
