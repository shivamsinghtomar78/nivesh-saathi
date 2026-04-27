"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import BottomNav from "@/components/layout/BottomNav";
import Sidebar from "@/components/layout/Sidebar";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { LANGUAGE_META } from "@/lib/languages";
import { useChatStore, type ChatMessage } from "@/stores/chatStore";

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
  } = useChatStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: outgoingMessage,
          language,
          threadId: threadId ?? undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to process chat request");
      }

      setThreadId(payload.threadId);

      const botMsg: ChatMessage = {
        id: `${Date.now()}-bot`,
        role: "bot",
        content: payload.response.text,
        timestamp: getTimestamp(),
        language: language.toUpperCase(),
        rateCards: payload.response.rateCards?.map(
          (card: {
            bankId?: string;
            bankName?: string;
            bankNameLocal?: string;
            tenorLabel?: string;
            rate?: string;
            maturityPreview?: string;
            safetyNote?: string;
            badge?: string;
          }) => ({
            bankId: card.bankId,
            bankName: card.bankName,
            bankNameLocal: card.bankNameLocal,
            tenor: card.tenorLabel || "",
            rate: card.rate || "",
            maturityPreview: card.maturityPreview,
            safetyNote: card.safetyNote,
            badge: card.badge,
          })
        ),
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

  const handleActionClick = (action: NonNullable<ChatMessage["actions"]>[number]) => {
    if (action.url) {
      startTransition(() => {
        router.push(action.url!);
      });
      return;
    }

    if (action.action === "open_compare") {
      startTransition(() => {
        router.push("/compare");
      });
      return;
    }

    if (action.action === "start_booking") {
      startTransition(() => {
        router.push(
          action.bankId ? `/book?bank=${encodeURIComponent(action.bankId)}` : "/book"
        );
      });
    }
  };

  const langOptions = [
    { code: "en" as const, label: LANGUAGE_META.en.label },
    { code: "hi" as const, label: LANGUAGE_META.hi.label },
    { code: "ta" as const, label: LANGUAGE_META.ta.label },
    { code: "bn" as const, label: LANGUAGE_META.bn.label },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-6 h-16 bg-cream border-b border-ink/10 card-shadow">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-saffron-bg flex items-center justify-center">
            <span className="material-symbols-outlined text-saffron text-2xl">
              smart_toy
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-saffron font-heading">
              Nivesh Saathi
            </h1>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-forest" />
              <span className="text-[10px] font-semibold text-forest uppercase">
                Active
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as "en" | "hi" | "ta" | "bn")
              }
              className="appearance-none bg-white border border-outline/30 rounded-full pl-8 pr-4 py-1.5 text-sm font-semibold text-ink-light cursor-pointer"
            >
              {langOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-saffron text-lg pointer-events-none">
              translate
            </span>
          </div>
          <button className="material-symbols-outlined text-ink-muted p-2">
            notifications
          </button>
        </div>
      </header>

      <Sidebar />

      <main className="lg:ml-64 pt-16 min-h-screen flex flex-col bg-cream">
        <div
          className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-5 max-w-4xl mx-auto w-full custom-scrollbar"
          style={{ height: "calc(100vh - 64px - 80px)" }}
        >
          <div className="flex justify-center">
            <span className="px-4 py-1 bg-surface rounded-full text-[12px] font-semibold text-ink-muted">
              Today
            </span>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 max-w-[85%] animate-fade-in ${
                msg.role === "user" ? "items-end self-end" : "items-start"
              }`}
            >
              <div
                className={`p-4 ${
                  msg.role === "user"
                    ? "user-bubble bg-saffron-bg text-ink border border-saffron-light/30"
                    : "bot-bubble bg-white text-ink border border-outline/20"
                }`}
              >
                <p className="text-base leading-relaxed">{msg.content}</p>

                {msg.rateCards && (
                  <div className="mt-3 rounded-xl border border-outline/20 bg-surface overflow-hidden">
                    <div className="bg-forest p-3">
                      <p className="text-white font-semibold text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">
                          trending_up
                        </span>
                        Top Interest Rates
                      </p>
                    </div>
                    <div className="divide-y divide-outline/10">
                      {msg.rateCards.map((card, index) => (
                        <div key={index} className="px-4 py-3">
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <p className="text-sm font-semibold text-ink">
                                {card.bankName}
                              </p>
                              {card.bankNameLocal &&
                                card.bankNameLocal !== card.bankName && (
                                  <p className="text-[11px] text-ink-muted">
                                    {card.bankNameLocal}
                                  </p>
                                )}
                              <p className="text-ink-light text-sm mt-1">
                                {card.tenor}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-semibold text-saffron block">
                                {card.rate}
                              </span>
                              {card.badge && (
                                <span className="text-[10px] uppercase tracking-wide text-forest">
                                  {card.badge}
                                </span>
                              )}
                            </div>
                          </div>
                          {card.maturityPreview && (
                            <p className="text-xs text-forest mt-2">
                              {card.maturityPreview}
                            </p>
                          )}
                          {card.safetyNote && (
                            <p className="text-[11px] text-ink-muted mt-1">
                              {card.safetyNote}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {msg.actions && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleActionClick(action)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                          action.type === "primary"
                            ? "bg-saffron text-white hover:opacity-90"
                            : "border border-forest text-forest hover:bg-forest-bg"
                        }`}
                      >
                        {action.icon && (
                          <span className="material-symbols-outlined text-sm">
                            {action.icon}
                          </span>
                        )}
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                {msg.glossary && msg.glossary.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.glossary.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-outline/20 bg-cream px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-ink">{item.term}</p>
                        <p className="text-xs text-ink-light mt-1">{item.plain}</p>
                        <p className="text-xs text-forest mt-1">{item.example}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-0.5">
                {msg.role === "bot" && (
                  <span className="px-2 py-0.5 bg-forest-light text-forest-dark text-[10px] font-bold rounded uppercase">
                    {msg.language}
                  </span>
                )}
                <span className="text-[10px] text-ink-muted font-mono">
                  {msg.timestamp}
                </span>
                {msg.role === "user" && (
                  <span className="px-2 py-0.5 bg-cream-dark text-ink-muted text-[10px] font-bold rounded uppercase">
                    {msg.language}
                  </span>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex flex-col gap-1 max-w-[85%] animate-fade-in items-start">
              <div className="p-4 bot-bubble bg-white text-ink border border-outline/20">
                <p className="text-base leading-relaxed">
                  Saathi is checking the best option...
                </p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 bg-forest-light text-forest-dark text-[10px] font-bold rounded uppercase">
                  {language.toUpperCase()}
                </span>
                <span className="text-[10px] text-ink-muted font-mono">
                  {getTimestamp()}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="bg-cream p-4 lg:px-8 border-t border-ink/10">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button className="w-11 h-11 flex items-center justify-center rounded-full bg-cream-dark text-ink-muted hover:text-saffron transition-colors shrink-0">
              <span className="material-symbols-outlined">attach_file</span>
            </button>

            <div className="flex-1 relative">
              <input
                className="w-full h-12 bg-white border border-outline/30 rounded-full px-5 pr-12 focus:ring-2 focus:ring-forest focus:border-forest transition-all text-base placeholder:text-ink-muted"
                placeholder="Type your message here..."
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void sendMessage()}
                id="chat-input"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-ink-muted">
                <span className="material-symbols-outlined">
                  sentiment_satisfied
                </span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  voice.isListening ? voice.stopListening() : void voice.startListening()
                }
                disabled={!voice.isSupported || voice.isProcessing || isTyping}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-forest-light text-forest hover:shadow-md transition-all shrink-0 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">
                  {voice.isProcessing ? "hourglass_top" : "mic"}
                </span>
              </button>
              <button
                onClick={() => void sendMessage()}
                disabled={isTyping}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-saffron text-white shadow-lg hover:opacity-90 active:scale-95 transition-all shrink-0"
                id="chat-send"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  send
                </span>
              </button>
            </div>
          </div>

          {(voice.error || voice.isListening || voice.isProcessing) && (
            <div className="max-w-4xl mx-auto mt-2 px-2 text-xs text-ink-muted">
              {voice.error
                ? voice.error
                : voice.isProcessing
                  ? "Transcribing your voice..."
                  : "Listening... tap the mic again to stop."}
            </div>
          )}
        </div>

        <footer className="w-full flex flex-col md:flex-row justify-between items-center px-8 py-3 gap-2 border-t border-ink/10 bg-cream">
          <p className="text-[10px] text-ink-muted font-semibold uppercase tracking-widest">
            © 2026 Nivesh Saathi. Regulated by the Government of India.
          </p>
          <div className="flex gap-6">
            <a
              className="text-ink-muted hover:text-ink text-[10px] font-semibold uppercase"
              href="#"
            >
              Security
            </a>
            <a
              className="text-ink-muted hover:text-ink text-[10px] font-semibold uppercase"
              href="#"
            >
              Terms &amp; Conditions
            </a>
          </div>
        </footer>
      </main>

      <BottomNav />
    </>
  );
}
