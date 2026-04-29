"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Send, MessageSquareText, Sparkles, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence, type Variants } from "framer-motion";

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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

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
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: "smooth",
      });
    }
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
      eyebrow="Text Assistant"
      title="Chat with Nivesh Saathi"
      description="Ask questions about fixed deposits, get recommendations based on your shortlist, and clarify financial jargon."
      actions={
        <div className="flex gap-3">
          <Link href={ROUTES.COMPARE}>
            <Button size="sm" variant="outline" className="rounded-full bg-panel-glass">
              View Shortlist
            </Button>
          </Link>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full shadow-sm"
            onClick={() => {
              clearMessages();
              setThreadId(null);
            }}
          >
            <RotateCcw className="mr-2 h-3 w-3" />
            New Chat
          </Button>
        </div>
      }
    >
      <AuthGate
        title="Sign in to use the text bot"
        body="Sign in to save your conversation history and get personalized recommendations based on your profile."
      >
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6 xl:grid-cols-[1fr_320px]"
        >
          <motion.div variants={itemVariants} className="flex flex-col h-full min-h-[600px] max-h-[80vh]">
            <Card className="flex flex-col flex-1 shadow-sm border-outline bg-panel-glass overflow-hidden">
              <CardHeader className="border-b border-outline/50 pb-4 bg-panel/50 backdrop-blur-md z-10 shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-dark flex items-center justify-center text-on-dark shadow-soft">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Financial Advisor</CardTitle>
                      <CardDescription className="text-xs">
                        {shortlist.length > 0 
                          ? `Context: ${shortlist.length} saved banks` 
                          : "Ready to answer your questions"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white/50 text-[10px] uppercase tracking-wider font-semibold">
                    {LANGUAGE_LABELS[language]}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-0 flex flex-col relative bg-gradient-to-b from-transparent to-app/20">
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar"
                >
                  <ConversationTimeline messages={messages} onAction={handleAction} />
                  
                  <AnimatePresence>
                    {isTyping && (
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
                          Thinking...
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="p-4 bg-panel/80 backdrop-blur-md border-t border-outline/50 shrink-0">
                  <div className="relative flex items-end gap-2 bg-input-bg border border-outline rounded-2xl p-2 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage(draft);
                        }
                      }}
                      placeholder={`Ask anything in ${LANGUAGE_LABELS[language]}...`}
                      rows={1}
                      className="w-full max-h-32 min-h-[44px] resize-none bg-transparent px-3 py-3 text-sm text-text-strong outline-none placeholder:text-text-muted custom-scrollbar"
                      style={{ height: 'auto' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                      }}
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => void sendMessage(draft)}
                      disabled={isTyping || !draft.trim()}
                      className="h-11 w-11 shrink-0 rounded-xl"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="grid gap-6 auto-rows-max">
            <Card className="p-5 border-outline bg-panel shadow-sm">
              <CardHeader className="pb-4 border-b border-outline/50 mb-4 px-0 pt-0">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquareText className="w-4 h-4 text-accent" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Suggestions</span>
                </div>
                <CardTitle className="text-lg">Try asking about</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 px-0 pb-0">
                {SAMPLE_PROMPTS[language].map((prompt, i) => (
                  <motion.button
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="text-left rounded-xl border border-outline bg-inner-panel p-3 text-sm text-text-strong transition-all hover:bg-panel hover:border-accent/40 hover:shadow-sm"
                  >
                    {prompt}
                  </motion.button>
                ))}
              </CardContent>
            </Card>

            <Card className="p-5 border-outline bg-panel shadow-sm">
              <CardHeader className="pb-4 px-0 pt-0">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Context</span>
                </div>
                <CardTitle className="text-lg">What AI Knows</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                  <p className="text-sm text-text-muted leading-relaxed">
                    It has access to your <strong className="text-text-strong font-medium">{shortlist.length} shortlisted banks</strong> to give tailored advice.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                  <p className="text-sm text-text-muted leading-relaxed">
                    It can explain complex financial terms automatically when requested.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </AuthGate>
    </AppShell>
  );
}

