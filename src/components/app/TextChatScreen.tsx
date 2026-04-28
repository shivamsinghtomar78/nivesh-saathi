"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";

import AuthGate from "@/components/auth/AuthGate";
import AppShell from "@/components/app/AppShell";
import ConversationTimeline from "@/components/app/ConversationTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { withCsrfHeaders } from "@/lib/csrf";
import { ROUTES } from "@/lib/routes";
import type { AdvisorResponse } from "@/lib/server/advisor-schemas";
import { LANGUAGE_LABELS } from "@/lib/copy";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore, type ChatMessage } from "@/stores/chatStore";
import { useCompareStore } from "@/stores/compareStore";

const SAMPLE_PROMPTS = {
  en: [
    "Best 12 month FD for Rs 100000",
    "Is a small finance bank safe for FD?",
    "Explain p.a. and maturity in simple words",
  ],
  hi: [
    "Rs 100000 ke liye 12 month FD best kaunsi hai",
    "Small finance bank FD surakshit hai kya",
    "p.a. aur maturity seedhi bhasha mein samjhaiye",
  ],
  ta: [
    "Rs 100000-kku 12 month FD best edhu",
    "Small finance bank FD safe-aa",
    "p.a. matrum maturity-ai simple-aa sollunga",
  ],
  bn: [
    "Rs 100000 er jonno 12 month FD best konta",
    "Small finance bank FD nirapod naki",
    "p.a. aar maturity sohoje bujhiye din",
  ],
} as const;

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

export default function TextChatScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const language = useChatStore((state) => state.language);
  const messages = useChatStore((state) => state.messages);
  const threadId = useChatStore((state) => state.threadId);
  const isTyping = useChatStore((state) => state.isTyping);
  const addMessage = useChatStore((state) => state.addMessage);
  const clearMessages = useChatStore((state) => state.clearMessages);
  const setThreadId = useChatStore((state) => state.setThreadId);
  const setTyping = useChatStore((state) => state.setTyping);
  const shortlist = useCompareStore((state) => state.shortlist);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [isTyping, messages]);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || !user) {
      return;
    }

    addMessage({
      id: createMessageId(),
      role: "user",
      content: message,
      timestamp: getTimestamp(),
      language: LANGUAGE_LABELS[language],
    });
    setDraft("");
    setTyping(true);

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
        throw new Error(payload.error || "Unable to get an answer right now.");
      }

      setThreadId(payload.threadId ?? null);
      addMessage(createBotMessage(LANGUAGE_LABELS[language], payload.response));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chat failed.");
    } finally {
      setTyping(false);
    }
  };

  const handleAction = async (
    action: NonNullable<ChatMessage["actions"]>[number]
  ) => {
    if (action.action === "open_compare") {
      router.push(ROUTES.COMPARE);
      return;
    }

    if (action.action === "open_voice") {
      router.push(ROUTES.VOICE);
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

        addMessage({
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
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to explain the term.");
      }
    }
  };

  return (
    <AppShell
      eyebrow="Text bot"
      title="Chat with the text-only advisor"
      description="This screen is strictly for typed questions. It keeps the shortlist in context, returns bank comparisons, and leaves microphone controls to the voice bot page."
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
              clearMessages();
              setThreadId(null);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset chat
          </Button>
        </>
      }
    >
      <AuthGate
        title="Sign in to use the text bot"
        body="The text bot uses your signed-in session so it can stay aligned with the rest of the product flow."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="p-6 shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Badge variant="accent" className="w-fit">
                    Text only
                  </Badge>
                  <CardTitle className="mt-3">Ask anything about FD choices</CardTitle>
                  <CardDescription>
                    The advisor can compare banks, explain jargon, and use the current shortlist.
                  </CardDescription>
                </div>
                {shortlist.length > 0 ? (
                  <Badge variant="success">{shortlist.length} shortlisted</Badge>
                ) : null}
              </div>
            </CardHeader>

            <CardContent>
              <div
                ref={scrollRef}
                className="custom-scrollbar max-h-[62vh] space-y-4 overflow-y-auto pr-2"
              >
                <ConversationTimeline messages={messages} onAction={handleAction} />
                {isTyping ? (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-full border border-outline bg-white/78 px-4 py-3 text-sm text-text-muted">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Saathi is thinking
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 rounded-[24px] border border-outline bg-app/72 p-3">
                <div className="flex items-end gap-3">
                  <div className="min-w-0 flex-1 rounded-[20px] border border-outline bg-white/78 px-4 py-3">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage(draft);
                        }
                      }}
                      placeholder="Type your FD question here"
                      rows={3}
                      className="w-full resize-none bg-transparent text-sm leading-7 text-text-strong outline-none placeholder:text-text-muted"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => void sendMessage(draft)}
                    disabled={isTyping || !draft.trim()}
                    className="h-12 w-12"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="p-6 shadow-soft">
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  Quick start
                </Badge>
                <CardTitle>Sample prompts</CardTitle>
                <CardDescription>
                  English is the default, but the top-bar switch changes the advisor language.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {SAMPLE_PROMPTS[language].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-[18px] border border-outline bg-app/72 px-4 py-3 text-left text-sm leading-6 text-text-strong transition hover:bg-white"
                  >
                    {prompt}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="p-6 shadow-soft">
              <CardHeader>
                <Badge variant="success" className="w-fit">
                  Shared context
                </Badge>
                <CardTitle>What the text bot sees</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-6 text-text-muted">
                <div className="rounded-[18px] border border-outline bg-app/72 px-4 py-3">
                  Signed-in session keeps the advisor route protected.
                </div>
                <div className="rounded-[18px] border border-outline bg-app/72 px-4 py-3">
                  Shortlist from compare: {shortlist.length} bank{shortlist.length === 1 ? "" : "s"}.
                </div>
                <div className="rounded-[18px] border border-outline bg-app/72 px-4 py-3">
                  Voice controls stay out of this page so the text flow remains focused.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthGate>
    </AppShell>
  );
}
