"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AudioLines,
  BookOpen,
  ExternalLink,
  Languages,
  Mic,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import BottomNav from "@/components/layout/BottomNav";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import StructuredAnswer from "@/components/shared/StructuredAnswer";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { APP_COPY } from "@/lib/copy";
import { withCsrfHeaders } from "@/lib/csrf";
import { FD_RATES } from "@/lib/fd-data";
import { LANGUAGE_META, type SupportedLanguage } from "@/lib/languages";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore, type ChatMessage } from "@/stores/chatStore";
import { useCompareStore } from "@/stores/compareStore";

type ChatApiResponse = {
  ok: boolean;
  threadId: string;
  response: {
    text: string;
    rateCards?: Array<{
      bankId?: string;
      bankName?: string;
      bankNameLocal?: string;
      tenorLabel?: string;
      rate?: string;
      maturityPreview?: string;
      safetyNote?: string;
      badge?: string;
      officialUrl?: string;
    }>;
    actions?: Array<{
      label: string;
      type: "primary" | "secondary";
      action:
        | "open_compare"
        | "explain_term"
        | "switch_language"
        | "open_voice"
        | "open_official_site"
        | "sign_in";
      bankId?: string;
      termId?: string;
      url?: string;
      icon?: string;
    }>;
    glossary?: Array<{
      term: string;
      plain: string;
      example: string;
    }>;
  };
  error?: string;
};

function TypingIndicator() {
  return (
    <div className="rounded-[24px] border border-outline bg-panel px-5 py-4">
      <div className="wave-bars">
        <span />
        <span />
        <span />
      </div>
      <p className="mt-3 text-sm text-text-muted">Saathi is checking your options...</p>
    </div>
  );
}

export default function ChatInterfacePage() {
  const router = useRouter();
  const {
    messages,
    language,
    threadId,
    isTyping,
    setLanguage,
    setThreadId,
    setTyping,
    addMessage,
    clearMessages,
  } = useChatStore();
  const shortlist = useCompareStore((state) => state.shortlist);
  const user = useAuthStore((state) => state.user);
  const shortlistBanks = useMemo(
    () => FD_RATES.filter((rate) => shortlist.includes(rate.id)),
    [shortlist]
  );
  const copy = APP_COPY[language];
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const getTimestamp = () =>
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const sendMessage = async (messageOverride?: string) => {
    const outgoingMessage = (messageOverride ?? input).trim();
    if (!outgoingMessage || isTyping) {
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: outgoingMessage,
      timestamp: getTimestamp(),
      language: language.toUpperCase(),
    };
    addMessage(userMsg);
    setInput("");
    setTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: withCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          message: outgoingMessage,
          language,
          threadId: threadId ?? undefined,
          userId: user?.uid,
          shortlistBankIds: shortlist,
        }),
      });

      const payload = (await response.json()) as ChatApiResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to process chat request");
      }

      setThreadId(payload.threadId);

      const botMsg: ChatMessage = {
        id: `${Date.now()}-bot`,
        role: "bot",
        content: payload.response.text,
        timestamp: getTimestamp(),
        language: language.toUpperCase(),
        rateCards: payload.response.rateCards?.map((card) => ({
          bankId: card.bankId,
          bankName: card.bankName,
          bankNameLocal: card.bankNameLocal,
          tenor: card.tenorLabel || "",
          rate: card.rate || "",
          maturityPreview: card.maturityPreview,
          safetyNote: card.safetyNote,
          badge: card.badge,
          officialUrl: card.officialUrl,
        })),
        actions: payload.response.actions,
        glossary: payload.response.glossary,
      };

      addMessage(botMsg);

      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(payload.response.text);
        utterance.lang = LANGUAGE_META[language].speechSynthesis;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to reach the advisor right now.";

      addMessage({
        id: `${Date.now()}-error`,
        role: "bot",
        content: errorMessage,
        timestamp: getTimestamp(),
        language: language.toUpperCase(),
      });
      toast.error(errorMessage);
    } finally {
      setTyping(false);
    }
  };

  const voice = useVoiceInput({
    language,
    onTranscript: (transcript) => {
      setInput(transcript);
      void sendMessage(transcript);
    },
  });

  const handleActionClick = async (
    action: NonNullable<ChatMessage["actions"]>[number]
  ) => {
    if (action.action === "explain_term" && action.termId) {
      try {
        const response = await fetch(
          `/api/jargon/${encodeURIComponent(action.termId)}?language=${language}`
        );
        const payload = (await response.json()) as
          | {
              ok?: boolean;
              term?: string;
              plain?: string;
              example?: string;
              error?: string;
            }
          | undefined;

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Unable to explain that term");
        }

        addMessage({
          id: `glossary-${action.termId}-${messages.length}`,
          role: "bot",
          content: `${payload?.term}: ${payload?.plain}`,
          timestamp: getTimestamp(),
          language: language.toUpperCase(),
          glossary: payload?.example
            ? [
                {
                  term: payload.term || action.termId,
                  plain: payload.plain || "",
                  example: payload.example,
                },
              ]
            : undefined,
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to explain that term"
        );
      }
      return;
    }

    if (action.action === "open_compare") {
      startTransition(() => {
        router.push(ROUTES.COMPARE);
      });
      return;
    }

    if (action.action === "open_voice") {
      startTransition(() => {
        router.push(ROUTES.VOICE);
      });
      return;
    }

    if (action.action === "sign_in") {
      startTransition(() => {
        router.push(ROUTES.LOGIN);
      });
      return;
    }

    if (action.url) {
      if (action.url.startsWith("http")) {
        window.open(action.url, "_blank", "noopener,noreferrer");
      } else {
        startTransition(() => {
          router.push(action.url!);
        });
      }
    }
  };

  const analyzeShortlist = () => {
    if (shortlistBanks.length === 0) {
      toast.info("Shortlist a few banks first from the compare page.");
      return;
    }

    const prompt = `Please compare my shortlisted banks for ${language} guidance: ${shortlistBanks
      .map((rate) => rate.bankName)
      .join(", ")}. Explain safety, returns, and who each is best for.`;
    void sendMessage(prompt);
  };

  return (
    <>
      <Navbar />
      <Sidebar />

      <main className="min-h-screen bg-app pt-16 lg:ml-64">
        <div className="border-b border-outline bg-panel-glass px-4 py-4 backdrop-blur-xl md:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-highlight">
                Saathi chat
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-text-strong md:text-3xl">
                Ask what actually changes your FD decision
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
                Use text or voice to compare rates, understand jargon, and
                pressure-test the shortlist you built on the compare page.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline bg-panel px-4 py-2 text-sm font-semibold text-text-strong transition focus-within:border-highlight">
                <Languages className="h-4 w-4" />
                <select
                  value={language}
                  onChange={(event) =>
                    setLanguage(event.target.value as SupportedLanguage)
                  }
                  className="bg-transparent text-sm font-semibold text-text-strong outline-none"
                  aria-label="Choose response language"
                >
                  {(Object.keys(LANGUAGE_META) as SupportedLanguage[]).map(
                    (code) => (
                      <option key={code} value={code} className="bg-slate-950">
                        {LANGUAGE_META[code].label}
                      </option>
                    )
                  )}
                </select>
              </label>
              <button
                type="button"
                onClick={clearMessages}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline bg-panel px-4 py-2 text-sm font-semibold text-text-strong transition hover:border-highlight hover:text-highlight"
                aria-label="Clear chat history"
              >
                <Trash2 className="h-4 w-4" />
                Reset chat
              </button>
            </div>
          </div>
        </div>

        <section className="mx-auto max-w-5xl px-4 py-5 md:px-6">
            <div className="grid gap-4">
              {shortlistBanks.length > 0 && (
                <div className="rounded-lg border border-outline bg-panel p-4 shadow-soft">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-highlight">
                        Shortlist context
                      </p>
                      <p className="mt-2 text-sm leading-6 text-text-muted">
                        {shortlistBanks.map((rate) => rate.bankName).join(", ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={analyzeShortlist}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-highlight px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110"
                    >
                      <Sparkles className="h-4 w-4" />
                      Analyze shortlist
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-outline bg-panel p-4 shadow-soft">
                <div className="max-h-[60vh] space-y-4 overflow-y-auto px-1 py-2">
                  {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[90%] rounded-lg px-4 py-3 md:max-w-[75%] ${
                            msg.role === "user"
                              ? "bg-highlight text-black"
                              : "border border-outline bg-panel-strong text-text-strong"
                          }`}
                        >
                          {msg.role === "bot" ? (
                            <StructuredAnswer text={msg.content} compact />
                          ) : (
                            <p className="text-sm leading-7">{msg.content}</p>
                          )}

                          {msg.rateCards?.length ? (
                            <div className="mt-4 grid gap-3">
                              {msg.rateCards.map((card, index) => (
                                <div
                                  key={`${card.bankId}-${index}`}
                                  className="rounded-lg border border-outline bg-app px-4 py-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-text-strong">
                                        {card.bankName}
                                      </p>
                                      {card.bankNameLocal &&
                                      card.bankNameLocal !== card.bankName ? (
                                        <p className="mt-1 text-xs text-text-muted">
                                          {card.bankNameLocal}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-mono text-lg font-semibold text-highlight">
                                        {card.rate}
                                      </p>
                                      {card.badge ? (
                                        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-text-muted">
                                          {card.badge}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                  <p className="mt-2 text-sm text-text-muted">
                                    {card.tenor}
                                  </p>
                                  {card.maturityPreview ? (
                                    <p className="mt-2 text-sm font-medium text-emerald-300">
                                      {card.maturityPreview}
                                    </p>
                                  ) : null}
                                  {card.safetyNote ? (
                                    <p className="mt-2 text-xs leading-5 text-text-muted">
                                      {card.safetyNote}
                                    </p>
                                  ) : null}
                                  {card.officialUrl ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        window.open(
                                          card.officialUrl,
                                          "_blank",
                                          "noopener,noreferrer"
                                        )
                                      }
                                      className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-highlight"
                                    >
                                      Official page
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </button>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {msg.actions?.length ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {msg.actions.map((action, index) => (
                                <button
                                  key={`${action.label}-${index}`}
                                  type="button"
                                  onClick={() => void handleActionClick(action)}
                                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                    action.type === "primary"
                                      ? "bg-highlight text-black hover:brightness-110"
                                      : "border border-outline bg-panel text-text-strong hover:border-highlight hover:text-highlight"
                                  }`}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          ) : null}

                          {msg.glossary?.length ? (
                            <div className="mt-4 grid gap-3">
                              {msg.glossary.map((item, index) => (
                                <div
                                  key={`${item.term}-${index}`}
                                  className="rounded-lg border border-outline bg-app px-4 py-3"
                                >
                                  <div className="flex items-center gap-2 text-highlight">
                                    <BookOpen className="h-4 w-4" />
                                    <p className="text-sm font-semibold text-text-strong">
                                      {item.term}
                                    </p>
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-text-muted">
                                    {item.plain}
                                  </p>
                                  <p className="mt-2 text-xs leading-5 text-emerald-300">
                                    {item.example}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {msg.language}
                            <span className="opacity-50">|</span>
                            <span>{msg.timestamp}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                  {isTyping ? <TypingIndicator /> : null}
                  <div ref={messagesEndRef} />
                </div>

                <div className="mt-4 rounded-lg border border-outline bg-app p-3">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <div className="relative flex-1">
                      <input
                        className="min-h-12 w-full rounded-lg border border-outline bg-panel px-4 pr-12 text-base text-text-strong outline-none transition focus:border-highlight"
                        placeholder="Ask about rates, safety, maturity, or your shortlist..."
                        type="text"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={(event) =>
                          event.key === "Enter" && void sendMessage()
                        }
                        aria-label="Chat input"
                      />
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">
                        <AudioLines className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          voice.isListening
                            ? voice.stopListening()
                            : void voice.startListening()
                        }
                        disabled={!voice.isSupported || voice.isProcessing || isTyping}
                        className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg px-4 transition ${
                          voice.isListening
                            ? "bg-emerald-400 text-black shadow-soft"
                            : "border border-outline bg-panel text-text-strong hover:border-highlight hover:text-highlight"
                        } disabled:opacity-60`}
                        aria-label="Start voice input"
                      >
                        <Mic className={`h-5 w-5 ${voice.isListening ? "animate-pulse" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void sendMessage()}
                        disabled={isTyping}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-highlight px-5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
                      >
                        <Send className="h-4 w-4" />
                        {copy.voice.send}
                      </button>
                    </div>
                  </div>

                  {(voice.error || voice.isListening || voice.isProcessing) && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-outline bg-panel px-4 py-3 text-sm text-text-muted">
                      <div className="wave-bars">
                        <span />
                        <span />
                        <span />
                      </div>
                      <span>
                        {voice.error
                          ? voice.error
                          : voice.isProcessing
                            ? "Transcribing your voice..."
                            : "Listening. Tap the mic again to stop."}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
        </section>
      </main>

      <BottomNav />
    </>
  );
}
