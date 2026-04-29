"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

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
      "Voice bot ready.\nPress Start listening, ask your FD question naturally, and Saathi will answer aloud.",
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
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
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
      eyebrow="Voice bot"
      title="Use the voice-only advisor"
      description="This page keeps the microphone, transcript, and spoken reply loop separate from the typed chat experience."
      actions={
        <>
          <Link href={ROUTES.COMPARE}>
            <Button size="lg" variant="outline">
              Back to compare
            </Button>
          </Link>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              setMessages([]);
              setThreadId(null);
              lastSpokenIdRef.current = null;
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset voice bot
          </Button>
        </>
      }
    >
      <AuthGate
        title="Sign in to use the voice bot"
        body="Voice requests use the same protected advisor backend, but this screen keeps the experience voice-first."
      >
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="p-6 shadow-soft">
            <CardHeader>
              <Badge variant="accent" className="w-fit">
                Voice only
              </Badge>
              <CardTitle>Listen, ask, hear the reply</CardTitle>
              <CardDescription>
                No text input box here. Start listening and ask naturally.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <AgentAudioVisualizerAura state={visualState} color="#1f7a5b" />

              <div className="grid gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() =>
                    voice.isListening ? voice.stopListening() : void voice.startListening()
                  }
                  disabled={voice.isProcessing || isThinking}
                >
                  {voice.isListening ? "Stop listening" : "Start listening"}
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setAutoSpeak((current) => !current)}
                >
                  {autoSpeak ? (
                    <>
                      <Volume2 className="h-4 w-4" />
                      Voice replies on
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4 w-4" />
                      Voice replies off
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                  Status
                </p>
                <p className="mt-3 text-sm leading-6 text-text-strong">
                  {voice.error
                    ? voice.error
                    : voice.isListening
                      ? "Listening for your question"
                      : voice.isProcessing || isThinking
                        ? "Processing your audio"
                        : isSpeaking
                          ? "Speaking the answer"
                          : "Ready for the next voice question"}
                </p>
              </div>

              <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                  Shared shortlist
                </p>
                <p className="mt-3 text-sm leading-6 text-text-strong">
                  {shortlist.length > 0
                    ? `${shortlist.length} shortlisted bank${shortlist.length === 1 ? "" : "s"} will stay in context.`
                    : "No shortlist yet. Compare banks first for a more targeted voice answer."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="p-6 shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Badge variant="success" className="w-fit">
                    Transcript and replies
                  </Badge>
                  <CardTitle className="mt-3">Conversation</CardTitle>
                  <CardDescription>
                    You can review the transcript and the advisor reply without turning this into a typed workflow.
                  </CardDescription>
                </div>
                {isThinking ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-outline bg-inner-panel px-3 py-2 text-sm text-text-muted">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Thinking
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <div
                ref={scrollRef}
                className="custom-scrollbar max-h-[68vh] space-y-4 overflow-y-auto pr-2"
              >
                <ConversationTimeline messages={visibleMessages} onAction={handleAction} />
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthGate>
    </AppShell>
  );
}
