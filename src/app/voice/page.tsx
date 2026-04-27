"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AudioLines,
  ExternalLink,
  Mic,
  Send,
  Waves,
} from "lucide-react";
import { toast } from "sonner";

import AuthGate from "@/components/auth/AuthGate";
import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { APP_COPY } from "@/lib/copy";
import { LANGUAGE_META, type SupportedLanguage } from "@/lib/languages";
import { ROUTES } from "@/lib/routes";

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
  "Explain p.a. and maturity in simple words",
];

export default function VoiceInputPage() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>("hi");
  const copy = APP_COPY[selectedLang];
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

  const submitQuery = async (rawMessage?: string) => {
    const message = (rawMessage ?? query).trim();
    if (!message || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          language: selectedLang,
          threadId: threadId ?? undefined,
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
  };

  const voice = useVoiceInput({
    language: selectedLang,
    onTranscript: (transcript) => {
      setQuery(transcript);
      void submitQuery(transcript);
    },
  });

  useEffect(() => {
    if (!advisorText || typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(advisorText);
    utterance.lang = LANGUAGE_META[selectedLang].speechSynthesis;
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [advisorText, selectedLang]);

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

  return (
    <>
      <Navbar />
      <Sidebar />

      <main className="min-h-screen pt-16 lg:ml-72">
        <section className="relative overflow-hidden px-4 py-8 md:px-6">
          <div className="relative mx-auto max-w-5xl">
            <AuthGate
              title="Voice guidance works best with a signed-in session"
              body="Firebase sign-in keeps your conversation context and lets the voice flow fit naturally into the compare-to-chat journey."
            >
              <div className="rounded-[36px] border border-outline bg-panel p-6 shadow-soft md:p-8">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.24em] text-highlight">
                    Voice advisor
                  </p>
                  <h1 className="mt-3 text-4xl font-semibold text-text-strong md:text-5xl">
                    {copy.voice.title}
                  </h1>
                  <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-text-muted">
                    {copy.voice.subtitle}
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {(Object.keys(LANGUAGE_META) as SupportedLanguage[]).map((language) => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => setSelectedLang(language)}
                      className={`min-h-12 rounded-full px-5 text-sm font-semibold transition ${
                        selectedLang === language
                          ? "bg-highlight text-black"
                          : "border border-outline bg-panel-strong text-text-strong hover:border-highlight hover:text-highlight"
                      }`}
                    >
                      {LANGUAGE_META[language].label}
                    </button>
                  ))}
                </div>

                <div className="mt-10 flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    {voice.isListening && (
                      <>
                        <div className="absolute h-32 w-32 rounded-full border border-highlight/30 animate-pulse-ring" />
                        <div
                          className="absolute h-44 w-44 rounded-full border border-highlight/20 animate-pulse-ring"
                          style={{ animationDelay: "0.4s" }}
                        />
                        <div
                          className="absolute h-56 w-56 rounded-full border border-highlight/10 animate-pulse-ring"
                          style={{ animationDelay: "0.8s" }}
                        />
                      </>
                    )}

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() =>
                        voice.isListening
                          ? voice.stopListening()
                          : void voice.startListening()
                      }
                      disabled={!voice.isSupported || voice.isProcessing || isSubmitting}
                      className={`relative z-10 flex h-28 w-28 items-center justify-center rounded-full text-black shadow-soft transition ${
                        voice.isListening ? "bg-emerald-400" : "bg-highlight"
                      } disabled:opacity-60`}
                      aria-label="Mic dabao aur bol do"
                    >
                      <Mic className="h-10 w-10" />
                    </motion.button>
                  </div>

                  <div className="mt-8 max-w-3xl text-center">
                    <p className="min-h-16 text-xl leading-8 text-text-strong md:text-2xl">
                      {transcriptPreview ||
                        "Press the mic and ask your FD question in your language."}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-3 text-sm text-text-muted">
                      <Waves className="h-4 w-4 text-highlight" />
                      <span>
                        {voice.error
                          ? voice.error
                          : voice.isProcessing || isSubmitting
                            ? "Processing your request..."
                            : voice.isListening
                              ? "Listening..."
                              : "Browser speech runs first. Deepgram handles the fallback."}
                      </span>
                    </div>
                    {submitError ? (
                      <p className="mt-3 text-sm text-red-300">{submitError}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-8 rounded-[28px] border border-outline bg-app p-4">
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

                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    {quickSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setQuery(suggestion);
                          void submitQuery(suggestion);
                        }}
                        className="rounded-full border border-outline bg-panel px-4 py-2 text-sm text-text-muted transition hover:border-highlight hover:text-text-strong"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {(advisorText || rateCards.length > 0) && (
                  <motion.section
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 rounded-[32px] border border-outline bg-panel-strong p-5"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-highlight">
                        Saathi response
                      </p>
                      <p className="mt-3 text-base leading-7 text-text-strong">
                        {advisorText}
                      </p>
                    </div>

                    {rateCards.length > 0 && (
                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        {rateCards.map((card) => (
                          <div
                            key={card.bankId}
                            className="rounded-[24px] border border-outline bg-app p-4"
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
                                <span className="rounded-full border border-highlight/30 bg-highlight/12 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-highlight">
                                  {card.badge}
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-4 font-mono text-3xl font-semibold text-highlight">
                              {card.rate}
                            </p>
                            <p className="mt-1 text-sm text-text-muted">{card.tenorLabel}</p>
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

                    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-outline bg-panel px-4 py-3 text-sm text-text-muted">
                      <AudioLines className="h-4 w-4 text-highlight" />
                      Spoken reply is enabled for the selected language when your browser supports it.
                    </div>
                  </motion.section>
                )}
              </div>
            </AuthGate>
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />
    </>
  );
}
