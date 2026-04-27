"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { LANGUAGE_META, type SupportedLanguage } from "@/lib/languages";

type VoiceAdvisorResponse = {
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
    }>;
    actions?: Array<{
      label: string;
      type: "primary" | "secondary";
      action: string;
      bankId?: string;
      url?: string;
      icon?: string;
    }>;
  };
};

const quickSuggestions = [
  "Best FD for Rs 50,000 for 12 months",
  "Is a small finance bank safe for my FD?",
  "Explain p.a. and maturity in simple words",
];

function getFriendlySpeechError(message: string | null) {
  return message || "Voice input did not work. You can still type your question below.";
}

export default function VoiceInputPage() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>("hi");
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
      const payload = (await response.json()) as
        | VoiceAdvisorResponse
        | { error?: string };

      if (!response.ok || !("response" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Unable to reach the advisor right now."
        );
      }

      setThreadId(payload.threadId);
      setAdvisorText(payload.response.text);
      setRateCards(payload.response.rateCards ?? []);
      setActions(payload.response.actions ?? []);
      setQuery(message);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to reach the advisor right now."
      );
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

  const handleAction = (action: NonNullable<typeof actions>[number]) => {
    const destination =
      action.url ||
      (action.action === "start_booking" && action.bankId
        ? `/book?bank=${encodeURIComponent(action.bankId)}`
        : action.action === "open_compare"
          ? "/compare"
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
      <main className="min-h-screen flex flex-col items-center justify-center px-5 pt-20 pb-24 waveform-bg">
        <div className="w-full max-w-4xl">
          <div className="flex gap-3 mb-10 flex-wrap justify-center">
            {(Object.keys(LANGUAGE_META) as SupportedLanguage[]).map((language) => (
              <button
                key={language}
                onClick={() => setSelectedLang(language)}
                className={`px-6 py-2.5 rounded-full text-base font-semibold border-2 transition-all ${
                  selectedLang === language
                    ? "bg-saffron text-white border-saffron shadow-md"
                    : "bg-white text-ink-light border-outline hover:border-saffron"
                }`}
              >
                {LANGUAGE_META[language].label}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center mb-8">
              {voice.isListening && (
                <>
                  <div className="absolute w-32 h-32 rounded-full border-2 border-saffron/20 animate-pulse-ring" />
                  <div
                    className="absolute w-40 h-40 rounded-full border-2 border-saffron/10 animate-pulse-ring"
                    style={{ animationDelay: "0.5s" }}
                  />
                  <div
                    className="absolute w-48 h-48 rounded-full border-2 border-saffron/5 animate-pulse-ring"
                    style={{ animationDelay: "1s" }}
                  />
                </>
              )}

              <button
                onClick={() =>
                  voice.isListening ? voice.stopListening() : void voice.startListening()
                }
                disabled={!voice.isSupported || voice.isProcessing || isSubmitting}
                className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-150 ${
                  voice.isListening ? "bg-forest animate-mic-pulse" : "bg-saffron"
                } ${!voice.isSupported ? "opacity-60 cursor-not-allowed" : "active:scale-95"}`}
                id="mic-button"
                aria-label="Mic dabao aur bol do"
              >
                <span className="material-symbols-outlined text-5xl">
                  {voice.isProcessing || isSubmitting ? "hourglass_top" : "mic"}
                </span>
              </button>
            </div>

            <div className="max-w-2xl w-full text-center space-y-3 mb-8">
              <p className="font-heading text-xl md:text-2xl text-ink opacity-90 leading-snug min-h-14">
                {transcriptPreview || "Press the mic and ask your FD question in your language."}
              </p>
              {voice.isListening && (
                <p className="text-ink-light italic animate-fade-in">
                  Listening...
                </p>
              )}
              {(voice.isProcessing || isSubmitting) && (
                <p className="text-ink-light italic animate-fade-in">
                  Processing your request...
                </p>
              )}
              {!voice.isListening && !voice.isProcessing && !isSubmitting && (
                <p className="text-ink-muted text-sm">
                  Browser speech is used first. If it is unavailable, the app falls back to Deepgram transcription.
                </p>
              )}
              {(voice.error || submitError) && (
                <p className="text-sm text-red-700">
                  {submitError ?? getFriendlySpeechError(voice.error)}
                </p>
              )}
            </div>

            <div className="w-full max-w-2xl relative mb-6">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-ink-muted">
                  keyboard
                </span>
              </div>
              <input
                className="w-full h-14 pl-12 pr-28 bg-white border border-outline/30 rounded-xl text-base text-ink focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all shadow-sm placeholder:text-ink-muted"
                placeholder="Or type here..."
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void submitQuery()}
                id="voice-text-input"
              />
              <button
                onClick={() => void submitQuery()}
                disabled={isSubmitting}
                className="absolute inset-y-2 right-2 px-5 bg-forest text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-colors disabled:opacity-60"
              >
                <span>Send</span>
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>

            <div className="mb-10 flex flex-wrap justify-center gap-3 max-w-3xl">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setQuery(suggestion);
                    void submitQuery(suggestion);
                  }}
                  className="rounded-full border border-outline/30 bg-white px-4 py-2 text-sm text-ink-light hover:border-saffron hover:text-saffron transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {(advisorText || rateCards.length > 0) && (
              <section className="w-full max-w-5xl rounded-3xl border border-outline/20 bg-white/95 p-6 shadow-lg">
                <div className="mb-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-forest">
                    Saathi Response
                  </p>
                  <p className="mt-2 text-base leading-7 text-ink">
                    {advisorText}
                  </p>
                </div>

                {rateCards.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {rateCards.map((card) => (
                      <div
                        key={card.bankId}
                        className="rounded-2xl border border-outline/20 bg-cream p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">{card.bankName}</p>
                            {card.bankNameLocal &&
                              card.bankNameLocal !== card.bankName && (
                                <p className="text-xs text-ink-muted">
                                  {card.bankNameLocal}
                                </p>
                              )}
                          </div>
                          {card.badge && (
                            <span className="rounded-full bg-gold-bg px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-gold-dark">
                              {card.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-4 font-mono text-3xl font-bold text-saffron">
                          {card.rate}
                        </p>
                        <p className="mt-1 text-sm text-ink-light">{card.tenorLabel}</p>
                        <p className="mt-3 text-sm font-medium text-forest">
                          {card.maturityPreview}
                        </p>
                        {card.safetyNote && (
                          <p className="mt-2 text-xs text-ink-muted">
                            {card.safetyNote}
                          </p>
                        )}
                        <button
                          onClick={() =>
                            startTransition(() => {
                              router.push(`/book?bank=${encodeURIComponent(card.bankId)}`);
                            })
                          }
                          className="mt-4 w-full rounded-xl bg-saffron px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                        >
                          Book this FD
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {actions.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {actions.map((action) => (
                      <button
                        key={`${action.action}-${action.label}`}
                        onClick={() => handleAction(action)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                          action.type === "primary"
                            ? "bg-saffron text-white hover:opacity-90"
                            : "border border-forest text-forest hover:bg-forest-bg"
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </>
  );
}
