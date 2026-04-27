"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AudioLines,
  Bot,
  ExternalLink,
  Languages,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Square,
  Volume2,
  Waves,
} from "lucide-react";
import { toast } from "sonner";

import AuthGate from "@/components/auth/AuthGate";
import BottomNav from "@/components/layout/BottomNav";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import StructuredAnswer from "@/components/shared/StructuredAnswer";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { APP_COPY } from "@/lib/copy";
import { withCsrfHeaders } from "@/lib/csrf";
import { LANGUAGE_META, type SupportedLanguage } from "@/lib/languages";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useCompareStore } from "@/stores/compareStore";

type VoiceAdvisorResponse = {
  ok: boolean;
  threadId: string;
  response: {
    text: string;
    rateCards?: Array<{
      bankId: string;
      bankName: string;
      bankNameLocal?: string;
      tenorLabel: string;
      rate: string;
      maturityPreview: string;
      badge?: string;
      safetyNote?: string;
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
      url?: string;
      icon?: string;
    }>;
  };
  error?: string;
};

const quickSuggestions = [
  "Best FD for Rs 50,000 for 12 months",
  "Is a small finance bank safe for my FD?",
  "Explain p.a., tenure, and maturity in simple words",
];

export default function VoiceInputPage() {
  const router = useRouter();
  const language = useChatStore((state) => state.language);
  const setLanguage = useChatStore((state) => state.setLanguage);
  const shortlist = useCompareStore((state) => state.shortlist);
  const user = useAuthStore((state) => state.user);
  const userId = user?.uid;
  const copy = APP_COPY[language];
  const [query, setQuery] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [advisorText, setAdvisorText] = useState("");
  const [rateCards, setRateCards] = useState<
    NonNullable<VoiceAdvisorResponse["response"]["rateCards"]>
  >([]);
  const [actions, setActions] = useState<
    NonNullable<VoiceAdvisorResponse["response"]["actions"]>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplexEnabled, setDuplexEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const duplexRef = useRef(false);
  const lastSpokenTextRef = useRef("");

  useEffect(() => {
    duplexRef.current = duplexEnabled;
  }, [duplexEnabled]);

  const submitQuery = useCallback(
    async (rawMessage?: string) => {
      const message = (rawMessage ?? query).trim();
      if (!message || isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

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
            userId,
            shortlistBankIds: shortlist,
          }),
        });
        const payload = (await response.json()) as VoiceAdvisorResponse;

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "Unable to reach the advisor right now.");
        }

        setThreadId(payload.threadId);
        setAdvisorText(payload.response.text);
        setRateCards(payload.response.rateCards ?? []);
        setActions(payload.response.actions ?? []);
        setQuery(message);
      } catch (error) {
        const nextError =
          error instanceof Error
            ? error.message
            : "Unable to reach the advisor right now.";
        setSubmitError(nextError);
        toast.error(nextError);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, language, query, shortlist, threadId, userId]
  );

  const voice = useVoiceInput({
    language,
    onTranscript: (transcript) => {
      setQuery(transcript);
      void submitQuery(transcript);
    },
  });

  const startListeningRef = useRef(voice.startListening);

  useEffect(() => {
    startListeningRef.current = voice.startListening;
  }, [voice.startListening]);

  useEffect(() => {
    if (!advisorText || typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    if (lastSpokenTextRef.current === advisorText) {
      return;
    }

    lastSpokenTextRef.current = advisorText;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(advisorText);
    utterance.lang = LANGUAGE_META[language].speechSynthesis;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (duplexRef.current) {
        window.setTimeout(() => {
          void startListeningRef.current();
        }, 450);
      }
    };
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);

    return () => {
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
    };
  }, [advisorText, language]);

  const stopConversation = useCallback(() => {
    setDuplexEnabled(false);
    voice.stopListening();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [voice]);

  const startDuplexConversation = () => {
    setDuplexEnabled(true);
    setSubmitError(null);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    void voice.startListening();
  };

  const handleAction = (
    action: NonNullable<VoiceAdvisorResponse["response"]["actions"]>[number]
  ) => {
    if (action.url?.startsWith("http")) {
      window.open(action.url, "_blank", "noopener,noreferrer");
      return;
    }

    const destination =
      action.url ||
      (action.action === "open_compare"
        ? ROUTES.COMPARE
        : action.action === "sign_in"
          ? ROUTES.LOGIN
          : action.action === "open_voice"
            ? ROUTES.VOICE
            : null);

    if (!destination) {
      return;
    }

    startTransition(() => {
      router.push(destination);
    });
  };

  const transcriptPreview = voice.transcript || query;
  const status = useMemo(() => {
    if (isSpeaking) {
      return {
        label: "Speaking",
        body: "Saathi is answering out loud. Duplex mode will listen again after this reply.",
      };
    }

    if (isSubmitting) {
      return {
        label: "Thinking",
        body: "Saathi is checking rates, safety context, and plain-language explanation.",
      };
    }

    if (voice.isProcessing) {
      return {
        label: "Transcribing",
        body: "Converting your voice into text before sending it to Saathi.",
      };
    }

    if (voice.isListening) {
      return {
        label: "Listening",
        body: "Ask your FD question naturally. Pause when you are done.",
      };
    }

    if (duplexEnabled) {
      return {
        label: "Ready",
        body: "Duplex mode is on. Tap the mic if your browser needs a manual restart.",
      };
    }

    return {
      label: "Idle",
      body: "Start a two-way voice conversation or ask one question by mic.",
    };
  }, [
    duplexEnabled,
    isSpeaking,
    isSubmitting,
    voice.isListening,
    voice.isProcessing,
  ]);

  return (
    <>
      <Navbar />
      <Sidebar />

      <main className="min-h-screen bg-app pb-24 pt-16 lg:ml-72 lg:pb-10">
        <section className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <AuthGate
            title="Voice guidance works best with a signed-in session"
            body="Firebase sign-in keeps your conversation context and lets the voice flow feel like a trusted advisor instead of a one-off recorder."
          >
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[32px] border border-outline bg-panel p-5 shadow-soft md:p-6"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-outline bg-panel-strong px-4 py-2 text-xs uppercase tracking-[0.2em] text-highlight">
                  <Sparkles className="h-4 w-4" />
                  Duplex voice agent
                </div>

                <h1 className="mt-5 text-3xl font-semibold leading-tight text-text-strong md:text-4xl">
                  Talk to Saathi, then hear the answer back.
                </h1>
                <p className="mt-4 text-sm leading-7 text-text-muted">
                  English is the default. Change the language before speaking if you
                  want Saathi to listen and respond in Hindi, Tamil, or Bengali.
                </p>

                <label className="mt-5 flex min-h-12 items-center gap-3 rounded-2xl border border-outline bg-app px-4 text-sm font-semibold text-text-strong focus-within:border-highlight">
                  <Languages className="h-4 w-4 text-highlight" />
                  <select
                    value={language}
                    onChange={(event) =>
                      setLanguage(event.target.value as SupportedLanguage)
                    }
                    className="w-full bg-transparent outline-none"
                    aria-label="Choose voice language"
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

                <div className="mt-8 flex justify-center">
                  <div className="relative flex h-56 w-56 items-center justify-center">
                    <AnimatePresence>
                      {(voice.isListening || isSpeaking) && (
                        <>
                          {[0, 1, 2].map((index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0.4, scale: 0.7 }}
                              animate={{ opacity: 0, scale: 1.35 + index * 0.2 }}
                              exit={{ opacity: 0 }}
                              transition={{
                                duration: 1.8,
                                repeat: Infinity,
                                delay: index * 0.32,
                              }}
                              className="absolute h-36 w-36 rounded-full border border-highlight/40"
                            />
                          ))}
                        </>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        voice.isListening
                          ? voice.stopListening()
                          : void voice.startListening()
                      }
                      disabled={!voice.isSupported || voice.isProcessing || isSubmitting}
                      className={`relative z-10 flex h-28 w-28 items-center justify-center rounded-full text-black shadow-soft transition ${
                        voice.isListening
                          ? "bg-emerald-400"
                          : isSpeaking
                            ? "bg-sky-300"
                            : "bg-highlight"
                      } disabled:opacity-60`}
                      aria-label={
                        voice.isListening ? "Stop listening" : "Start voice input"
                      }
                    >
                      {voice.isListening ? (
                        <MicOff className="h-10 w-10" />
                      ) : isSpeaking ? (
                        <Volume2 className="h-10 w-10" />
                      ) : (
                        <Mic className="h-10 w-10" />
                      )}
                    </motion.button>
                  </div>
                </div>

                <div className="mt-4 rounded-[26px] border border-outline bg-app p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-highlight/12 text-highlight">
                      <Waves className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-strong">
                        {status.label}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-text-muted">
                        {voice.error || status.body}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={startDuplexConversation}
                    disabled={!voice.isSupported || isSubmitting || isSpeaking}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-highlight px-5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
                  >
                    <AudioLines className="h-4 w-4" />
                    Start duplex
                  </button>
                  <button
                    type="button"
                    onClick={stopConversation}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-outline bg-panel-strong px-5 text-sm font-semibold text-text-strong transition hover:border-highlight hover:text-highlight"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="rounded-[32px] border border-outline bg-panel p-5 shadow-soft md:p-6"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-highlight text-black">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-highlight">
                      Voice workspace
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-text-strong">
                      Question, answer, and actions in one place
                    </h2>
                  </div>
                </div>

                <div className="mt-5 rounded-[26px] border border-outline bg-app p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    Current question
                  </p>
                  <p className="mt-3 min-h-14 text-base leading-7 text-text-strong">
                    {transcriptPreview || "Tap the mic or type your FD question."}
                  </p>
                </div>

                <div className="mt-4 rounded-[26px] border border-outline bg-app p-3">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <input
                      className="min-h-12 flex-1 rounded-2xl border border-outline bg-panel px-4 text-base text-text-strong outline-none transition focus:border-highlight"
                      placeholder="Or type here..."
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && void submitQuery()}
                      aria-label="Voice text fallback input"
                    />
                    <button
                      type="button"
                      onClick={() => void submitQuery()}
                      disabled={isSubmitting}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-highlight px-5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {copy.voice.send}
                    </button>
                  </div>

                  <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
                    {quickSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setQuery(suggestion);
                          void submitQuery(suggestion);
                        }}
                        className="min-h-10 shrink-0 snap-start rounded-full border border-outline bg-panel px-4 text-sm text-text-muted transition hover:border-highlight hover:text-text-strong"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {submitError ? (
                  <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {submitError}
                  </div>
                ) : null}

                {(advisorText || rateCards.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 rounded-[28px] border border-outline bg-panel-strong p-4"
                  >
                    {advisorText ? (
                      <StructuredAnswer text={advisorText} />
                    ) : null}

                    {rateCards.length > 0 && (
                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {rateCards.map((card) => (
                          <div
                            key={card.bankId}
                            className="rounded-[22px] border border-outline bg-app p-4"
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
                              {card.badge ? (
                                <span className="rounded-full border border-highlight/30 bg-highlight/12 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-highlight">
                                  {card.badge}
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-4 font-mono text-3xl font-semibold text-highlight">
                              {card.rate}
                            </p>
                            <p className="mt-1 text-sm text-text-muted">
                              {card.tenorLabel}
                            </p>
                            <p className="mt-3 text-sm font-medium text-emerald-300">
                              {card.maturityPreview}
                            </p>
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
                                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-highlight"
                              >
                                Official page
                                <ExternalLink className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}

                    {actions.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-3">
                        {actions.map((action) => (
                          <button
                            key={`${action.action}-${action.label}`}
                            type="button"
                            onClick={() => handleAction(action)}
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
                    )}
                  </motion.div>
                )}
              </motion.section>
            </div>
          </AuthGate>
        </section>
      </main>

      <BottomNav />
    </>
  );
}
