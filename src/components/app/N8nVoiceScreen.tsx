"use client";

/**
 * N8nVoiceScreen — Voice agent interface backed by n8n webhook
 *
 * This is a streamlined voice screen that sends all processing
 * to the n8n workflow (AI + TTS + memory) and renders the response.
 * It replaces the multi-API orchestration in the original VoiceScreen
 * with a single n8n endpoint.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Globe,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import AppShell from "@/components/app/AppShell";
import AuthGate from "@/components/auth/AuthGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import {
  useN8nVoiceAgent,
  type N8nAgentResponse,
} from "@/hooks/useN8nVoiceAgent";
import { LANGUAGE_LABELS } from "@/lib/copy";
import { LANGUAGE_META } from "@/lib/languages";
import { ROUTES } from "@/lib/routes";
import type { AppLanguage } from "@/lib/server/advisor-schemas";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";

/* ------------------------------------------------------------------ */
/*  Supported languages                                                */
/* ------------------------------------------------------------------ */

const CALL_LANGUAGES: AppLanguage[] = ["en", "hi", "hinglish"];
type CallLanguage = "en" | "hi" | "hinglish";

/* ------------------------------------------------------------------ */
/*  Copy map                                                           */
/* ------------------------------------------------------------------ */

const COPY: Record<
  CallLanguage,
  {
    eyebrow: string;
    title: string;
    description: string;
    openChat: string;
    authTitle: string;
    authBody: string;
    ready: string;
    prompt: string;
    listening: string;
    thinking: string;
    speaking: string;
    retry: string;
    tryAgain: string;
    replay: string;
    lastHeard: string;
    poweredBy: string;
  }
> = {
  en: {
    eyebrow: "AI Voice Agent",
    title: "Nivesh Saathi Voice",
    description: "Speak naturally in English, Hindi, or Hinglish — AI processes your query and responds with voice.",
    openChat: "Open chat",
    authTitle: "Sign in to use voice advisor",
    authBody: "Your conversation history is tied to your secure profile.",
    ready: "Ready for your question",
    prompt: "Tap the mic and ask anything about FD rates, investments, or financial advice.",
    listening: "Listening now. Speak naturally.",
    thinking: "Processing your request with AI…",
    speaking: "Speaking the answer. Tap to stop.",
    retry: "I didn't catch that clearly. Please try again.",
    tryAgain: "Try again",
    replay: "Replay",
    lastHeard: "Last heard",
    poweredBy: "Powered by n8n AI Workflow",
  },
  hi: {
    eyebrow: "AI Voice Agent",
    title: "Nivesh Saathi Voice",
    description: "English, Hindi, या Hinglish में बोलें — AI आपकी query process करके voice में जवाब देगा।",
    openChat: "Chat खोलें",
    authTitle: "Voice advisor इस्तेमाल करने के लिए sign in करें",
    authBody: "आपकी conversation history आपके secure profile से जुड़ी रहेगी।",
    ready: "आपके सवाल के लिए ready",
    prompt: "Mic दबाइए और FD rates, investments, या financial advice के बारे में कुछ भी पूछिए।",
    listening: "सुन रहा हूं। आराम से बोलिए।",
    thinking: "AI से आपकी request process हो रही है…",
    speaking: "Answer सुना रहा हूं। रोकने के लिए tap कीजिए।",
    retry: "मैं साफ समझ नहीं पाया। कृपया फिर से बोलिए।",
    tryAgain: "फिर कोशिश करें",
    replay: "दोबारा सुनें",
    lastHeard: "आखिरी बात सुनी",
    poweredBy: "n8n AI Workflow से powered",
  },
  hinglish: {
    eyebrow: "AI Voice Agent",
    title: "Nivesh Saathi Voice",
    description: "English, Hindi, ya Hinglish mein bolo — AI aapki query process karke voice mein jawab dega.",
    openChat: "Open chat",
    authTitle: "Voice advisor use karne ke liye sign in karein",
    authBody: "Aapki conversation history aapke secure profile se linked rahegi.",
    ready: "Aapke sawal ke liye ready",
    prompt: "Mic tap karo aur FD rates, investments, ya financial advice ke baare mein kuch bhi poochho.",
    listening: "Listening. Aap naturally bol sakte hain.",
    thinking: "AI se aapki request process ho rahi hai…",
    speaking: "Answer bol raha hoon. Stop karne ke liye tap kijiye.",
    retry: "Clear nahi hua. Please ek baar phir boliye.",
    tryAgain: "Try again",
    replay: "Replay",
    lastHeard: "Last heard",
    poweredBy: "n8n AI Workflow se powered",
  },
};

function normalizeCallLanguage(language: AppLanguage): CallLanguage {
  return CALL_LANGUAGES.includes(language) ? (language as CallLanguage) : "en";
}

/* ------------------------------------------------------------------ */
/*  Phase type                                                         */
/* ------------------------------------------------------------------ */

type N8nPhase =
  | "ready"
  | "listening"
  | "thinking"
  | "speaking"
  | "responded"
  | "error";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function N8nVoiceScreen() {
  const user = useAuthStore((state) => state.user);
  const storedLanguage = useConversationStore((state) => state.language);
  const setLanguage = useConversationStore((state) => state.setLanguage);
  const language = normalizeCallLanguage(storedLanguage);
  const copy = COPY[language];

  const [phase, setPhase] = useState<N8nPhase>("ready");
  const [lastTranscript, setLastTranscript] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "user" | "agent"; text: string; timestamp: string }>
  >([]);

  const historyEndRef = useRef<HTMLDivElement | null>(null);

  // Ensure voice language is one of the call-supported ones
  useEffect(() => {
    if (!CALL_LANGUAGES.includes(storedLanguage)) {
      setLanguage("en");
    }
  }, [setLanguage, storedLanguage]);

  // Auto-scroll to latest message
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory]);

  /* ── n8n agent hook ───────────────────────────────────────────── */
  const agent = useN8nVoiceAgent({
    language,
    onReply: (response: N8nAgentResponse) => {
      setDisplayText(response.reply);
      setPhase("speaking");
      setConversationHistory((prev) => [
        ...prev,
        {
          role: "agent",
          text: response.reply,
          timestamp: response.timestamp,
        },
      ]);
    },
    onError: (err: string) => {
      setPhase("error");
      toast.error(err);
    },
    onSpeakingEnd: () => {
      setPhase("responded");
    },
  });

  /* ── Voice input hook ─────────────────────────────────────────── */
  const sendVoiceQuery = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim();
      if (!trimmed || agent.isSending) return;

      setLastTranscript(trimmed);
      setPhase("thinking");
      setDisplayText("");

      // Add user message to history
      setConversationHistory((prev) => [
        ...prev,
        {
          role: "user",
          text: trimmed,
          timestamp: new Date().toISOString(),
        },
      ]);

      await agent.sendMessage(trimmed);
    },
    [agent]
  );

  const voice = useVoiceInput({
    language,
    onTranscript: (transcript) => {
      void sendVoiceQuery(transcript);
    },
  });

  /* ── Derived state ────────────────────────────────────────────── */
  const displayPhase: N8nPhase = voice.error
    ? "error"
    : voice.isListening
      ? "listening"
      : phase;

  const callStatus = useMemo(() => {
    if (voice.isListening) return copy.listening;
    if (agent.isSending || phase === "thinking") return copy.thinking;
    if (agent.isSpeaking || phase === "speaking") return copy.speaking;
    if (displayPhase === "error") return voice.error ?? agent.error ?? copy.retry;
    return copy.ready;
  }, [agent.error, agent.isSending, agent.isSpeaking, copy, displayPhase, phase, voice.error, voice.isListening]);

  /* ── Mic button handler ───────────────────────────────────────── */
  const handleMicPress = () => {
    if (agent.isSpeaking || phase === "speaking") {
      agent.stopSpeaking();
      setPhase("responded");
      return;
    }
    if (voice.isListening) {
      voice.stopListening();
      return;
    }
    agent.stopSpeaking();
    voice.resetTranscript();
    void voice.startListening();
  };

  /* ── Reset handler ────────────────────────────────────────────── */
  const handleReset = () => {
    agent.resetConversation();
    setConversationHistory([]);
    setLastTranscript("");
    setDisplayText("");
    setPhase("ready");
    voice.resetTranscript();
  };

  return (
    <AppShell
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      actions={
        <Link href={ROUTES.CHAT} className="w-full tablet:w-auto">
          <Button variant="outline" className="w-full tablet:w-auto">
            {copy.openChat}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      }
    >
      <AuthGate title={copy.authTitle} body={copy.authBody}>
        <div className="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_360px]">
          {/* ── Main panel ─────────────────────────────────────── */}
          <section className="rounded-[var(--radius-card)] border border-outline bg-panel p-4 shadow-[var(--shadow-card)] tablet:p-6">
            {/* Language switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {copy.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-text-strong">
                  {callStatus}
                </h2>
              </div>
              <div className="flex rounded-full border border-outline bg-input-bg p-1">
                {CALL_LANGUAGES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      language === code
                        ? "bg-accent text-on-accent"
                        : "text-text-muted hover:text-text-strong"
                    )}
                  >
                    {LANGUAGE_LABELS[code]}
                  </button>
                ))}
              </div>
            </div>

            {/* Mic button */}
            <div className="mt-8 flex flex-col items-center text-center">
              <button
                type="button"
                onClick={handleMicPress}
                disabled={agent.isSending || voice.isProcessing}
                className={cn(
                  "relative flex h-36 w-36 items-center justify-center rounded-full border text-accent shadow-[0_24px_80px_rgba(0,0,0,0.32)] transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60",
                  voice.isListening
                    ? "animate-mic-pulse border-accent bg-accent text-on-accent"
                    : agent.isSpeaking || phase === "speaking"
                      ? "border-accent/35 bg-surface-dark text-on-dark"
                      : "border-accent/25 bg-accent-soft"
                )}
                aria-label={voice.isListening ? "Stop listening" : "Start voice call"}
              >
                {agent.isSending || voice.isProcessing ? (
                  <Loader2 className="h-14 w-14 animate-spin" />
                ) : voice.isListening ? (
                  <MicOff className="h-14 w-14" />
                ) : agent.isSpeaking || phase === "speaking" ? (
                  <VolumeX className="h-14 w-14" />
                ) : (
                  <Mic className="h-14 w-14" />
                )}
              </button>

              <p className="mt-5 max-w-xl text-base leading-7 text-text-muted">
                {voice.transcript || displayText || copy.prompt}
              </p>

              {/* Action buttons */}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {displayPhase === "error" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPhase("ready");
                      voice.resetTranscript();
                      void voice.startListening();
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {copy.tryAgain}
                  </Button>
                ) : null}
                {displayText ? (
                  <Button
                    variant="ghost"
                    onClick={() => agent.replayLastReply()}
                  >
                    <Volume2 className="h-4 w-4" />
                    {copy.replay}
                  </Button>
                ) : null}
                {conversationHistory.length > 0 ? (
                  <Button variant="ghost" onClick={handleReset}>
                    <RefreshCw className="h-4 w-4" />
                    Reset
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Last heard */}
            {lastTranscript ? (
              <div className="mt-6 rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {copy.lastHeard}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-strong">
                  {lastTranscript}
                </p>
              </div>
            ) : null}
          </section>

          {/* ── Sidebar ────────────────────────────────────────── */}
          <aside className="grid gap-5">
            {/* Conversation history */}
            {conversationHistory.length > 0 ? (
              <section className="max-h-[480px] overflow-y-auto rounded-[var(--radius-card)] border border-outline bg-panel p-4 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-outline">
                  <Bot className="h-4 w-4 text-accent" />
                  <h3 className="font-semibold text-text-strong">
                    Conversation
                  </h3>
                  {agent.conversationId ? (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {agent.conversationId.slice(0, 8)}…
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3">
                  {conversationHistory.map((msg, i) => (
                    <div
                      key={`${msg.role}-${i}`}
                      className={cn(
                        "rounded-[var(--radius-panel)] p-3 text-sm leading-6",
                        msg.role === "user"
                          ? "ml-6 border border-accent/20 bg-accent-soft text-text-strong"
                          : "mr-6 border border-outline bg-inner-panel text-text-muted"
                      )}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">
                        {msg.role === "user" ? "You" : "Saathi"}
                      </p>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ))}
                  <div ref={historyEndRef} />
                </div>
              </section>
            ) : (
              <section className="rounded-[var(--radius-card)] border border-outline bg-panel p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-accent" />
                  <h3 className="font-semibold text-text-strong">
                    How it works
                  </h3>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-text-muted">
                  {[
                    "Tap the mic and speak naturally",
                    "AI processes your query",
                    "Get voice + text response",
                    "Conversation is remembered",
                  ].map((step, index) => (
                    <div key={step} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Powered-by badge */}
            <div className="flex items-center justify-center gap-2 rounded-[var(--radius-panel)] border border-outline bg-inner-panel px-4 py-3 text-xs text-text-muted">
              <Bot className="h-3.5 w-3.5 text-accent" />
              {copy.poweredBy}
            </div>
          </aside>
        </div>
      </AuthGate>
    </AppShell>
  );
}
