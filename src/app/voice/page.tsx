"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AudioLines, Languages, Mic, Square } from "lucide-react";
import { toast } from "sonner";

import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura";
import BottomNav from "@/components/layout/BottomNav";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import StructuredAnswer from "@/components/shared/StructuredAnswer";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { withCsrfHeaders } from "@/lib/csrf";
import { LANGUAGE_META, type SupportedLanguage } from "@/lib/languages";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useCompareStore } from "@/stores/compareStore";

type VoiceAdvisorResponse = {
  ok: boolean;
  threadId: string;
  response: {
    text: string;
  };
  error?: string;
};

export default function VoiceInputPage() {
  const language = useChatStore((state) => state.language);
  const setLanguage = useChatStore((state) => state.setLanguage);
  const shortlist = useCompareStore((state) => state.shortlist);
  const user = useAuthStore((state) => state.user);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const [advisorText, setAdvisorText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [duplexEnabled, setDuplexEnabled] = useState(false);
  const duplexRef = useRef(false);
  const lastSpokenTextRef = useRef("");

  useEffect(() => {
    duplexRef.current = duplexEnabled;
  }, [duplexEnabled]);

  const submitQuery = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      setLastQuestion(message);

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
            userId: user?.uid,
            shortlistBankIds: shortlist,
          }),
        });
        const payload = (await response.json()) as VoiceAdvisorResponse;

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "Unable to reach Saathi right now.");
        }

        setThreadId(payload.threadId);
        setAdvisorText(payload.response.text);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to reach Saathi right now.";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, language, shortlist, threadId, user?.uid]
  );

  const voice = useVoiceInput({
    language,
    onTranscript: (transcript) => {
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

  const startConversation = () => {
    setDuplexEnabled(true);
    setAdvisorText("");
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    void voice.startListening();
  };

  const agentState = useMemo(() => {
    if (isSpeaking) {
      return "speaking";
    }
    if (isSubmitting || voice.isProcessing) {
      return "thinking";
    }
    if (voice.isListening) {
      return "listening";
    }
    return "idle";
  }, [isSpeaking, isSubmitting, voice.isListening, voice.isProcessing]);

  const statusText = useMemo(() => {
    if (voice.error) {
      return voice.error;
    }
    if (agentState === "speaking") {
      return "Saathi is answering in voice.";
    }
    if (agentState === "thinking") {
      return "Saathi is preparing the reply.";
    }
    if (agentState === "listening") {
      return "Listening now. Ask your FD question naturally.";
    }
    return "Tap start and speak. Saathi will reply by voice.";
  }, [agentState, voice.error]);

  return (
    <>
      <Navbar />
      <Sidebar />

      <main className="min-h-screen bg-app pb-24 pt-16 lg:ml-64 lg:pb-8">
        <section className="mx-auto max-w-5xl px-4 py-5 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-outline bg-panel p-5 shadow-soft md:p-7"
          >
            <div className="flex flex-col gap-4 border-b border-outline pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-highlight">
                  Voice agent
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-text-strong md:text-3xl">
                  Speak with Saathi
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                  Voice in, voice out. No typing needed.
                </p>
              </div>

              <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline bg-app px-3 text-sm font-semibold text-text-strong focus-within:border-highlight">
                <Languages className="h-4 w-4 text-highlight" />
                <select
                  value={language}
                  onChange={(event) =>
                    setLanguage(event.target.value as SupportedLanguage)
                  }
                  className="bg-transparent outline-none"
                  aria-label="Choose voice language"
                >
                  {(Object.keys(LANGUAGE_META) as SupportedLanguage[]).map((code) => (
                    <option key={code} value={code} className="bg-slate-950">
                      {LANGUAGE_META[code].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-6 py-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div className="grid justify-items-center gap-5">
                <AgentAudioVisualizerAura
                  size="xl"
                  color="#00c3ff"
                  colorShift={0.84}
                  state={agentState}
                  className="w-full"
                />

                <div className="flex w-full max-w-sm gap-3">
                  <button
                    type="button"
                    onClick={startConversation}
                    disabled={!voice.isSupported || isSubmitting || isSpeaking}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-highlight px-5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
                  >
                    <Mic className="h-4 w-4" />
                    Start
                  </button>
                  <button
                    type="button"
                    onClick={stopConversation}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-outline bg-panel-strong px-5 text-sm font-semibold text-text-strong transition hover:border-highlight hover:text-highlight"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-lg border border-outline bg-app p-4">
                  <div className="flex items-center gap-2 text-highlight">
                    <AudioLines className="h-4 w-4" />
                    <p className="text-xs uppercase tracking-[0.2em]">Status</p>
                  </div>
                  <p className="mt-3 text-base font-semibold text-text-strong">
                    {statusText}
                  </p>
                </div>

                <div className="rounded-lg border border-outline bg-app p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    Last question
                  </p>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-text-strong">
                    {voice.transcript || lastQuestion || "Your spoken question will appear here."}
                  </p>
                </div>

                <div className="rounded-lg border border-outline bg-app p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    Spoken reply
                  </p>
                  <div className="mt-3 min-h-24 text-sm leading-6 text-text-strong">
                    {advisorText ? (
                      <StructuredAnswer text={advisorText} compact />
                    ) : (
                      "Saathi's voice answer will appear here after it is spoken."
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <BottomNav />
    </>
  );
}
