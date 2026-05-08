"use client";

import { useEffect, useRef, useState } from "react";

import type { SupportedLanguage } from "@/lib/languages";
import { LANGUAGE_META } from "@/lib/languages";
import {
  getEndpointDecision,
  TranscriptStabilizer,
} from "@/lib/voice-transcript";

type VoiceStatus = "idle" | "listening" | "processing" | "error";

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal?: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

type VoiceHookOptions = {
  language: SupportedLanguage;
  onTranscript?: (transcript: string) => void;
};

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  const candidate = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

export function useVoiceInput(options: VoiceHookOptions) {
  const { language, onTranscript } = options;
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const endpointTimerRef = useRef<number | null>(null);
  const manualStopRef = useRef(false);
  const submittedRef = useRef(false);
  const stabilizerRef = useRef(new TranscriptStabilizer());

  const speechRecognitionSupported = Boolean(getSpeechRecognitionConstructor());
  const isSupported = speechRecognitionSupported;
  const isListening = status === "listening";
  const isProcessing = status === "processing";

  const resetTranscript = () => {
    transcriptRef.current = "";
    submittedRef.current = false;
    stabilizerRef.current.reset();
    if (endpointTimerRef.current) {
      window.clearTimeout(endpointTimerRef.current);
      endpointTimerRef.current = null;
    }
    setTranscript("");
    setError(null);
    if (status !== "processing") {
      setStatus("idle");
    }
  };

  const startListening = async () => {
    setError(null);
    manualStopRef.current = false;
    submittedRef.current = false;
    const Recognition = getSpeechRecognitionConstructor();

    if (Recognition) {
      const recognition = new Recognition();
      let recognitionErrored = false;
      recognition.lang = LANGUAGE_META[language].speechRecognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      const submitTranscript = () => {
        if (submittedRef.current) return;
        const finalTranscript = transcriptRef.current.trim();
        if (!finalTranscript) return;
        submittedRef.current = true;
        recognition.stop();
        setStatus("idle");
        onTranscript?.(finalTranscript);
      };
      const scheduleEndpoint = (text: string) => {
        if (endpointTimerRef.current) {
          window.clearTimeout(endpointTimerRef.current);
        }
        const decision = getEndpointDecision(text);
        endpointTimerRef.current = window.setTimeout(
          submitTranscript,
          Math.min(decision.waitMs, 2200)
        );
      };
      recognition.onresult = (event) => {
        const results = Array.from(event.results);
        const finalText = results
          .filter((result) => result.isFinal)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ");
        const interimText = results
          .filter((result) => !result.isFinal)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ");
        const nextTranscript = [finalText, interimText].filter(Boolean).join(" ").trim();
        const stabilized = stabilizerRef.current.accept({
          isFinal: results.some((result) => result.isFinal),
          text: nextTranscript,
        });

        if (stabilized.accepted && stabilized.text) {
          transcriptRef.current = stabilized.text;
          setTranscript(stabilized.text);
          scheduleEndpoint(stabilized.text);
        }
      };
      recognition.onerror = (event) => {
        recognitionErrored = true;
        setError(
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "Microphone blocked. Allow mic access in your browser, or continue in chat."
            : "Voice recognition could not understand you clearly. You can try again or type instead."
        );
        setStatus("error");
      };
      recognition.onend = () => {
        if (recognitionErrored) return;
        if (endpointTimerRef.current) {
          window.clearTimeout(endpointTimerRef.current);
          endpointTimerRef.current = null;
        }
        const finalTranscript = transcriptRef.current.trim();
        if (finalTranscript && (manualStopRef.current || submittedRef.current)) {
          if (!submittedRef.current) onTranscript?.(finalTranscript);
          setStatus("idle");
          return;
        }
        if (finalTranscript && !manualStopRef.current) {
          window.setTimeout(() => {
            try {
              recognition.start();
            } catch {
              submitTranscript();
            }
          }, 120);
          return;
        }
        setError("No speech was detected. Please try again.");
        setStatus("error");
      };

      recognitionRef.current = recognition;
      setTranscript("");
      transcriptRef.current = "";
      stabilizerRef.current.reset();
      setStatus("listening");
      recognition.start();
      return;
    }

    setError("Voice input is not supported in this browser.");
    setStatus("error");
  };

  const stopListening = () => {
    manualStopRef.current = true;
    if (endpointTimerRef.current) {
      window.clearTimeout(endpointTimerRef.current);
      endpointTimerRef.current = null;
    }
    recognitionRef.current?.stop();
  };

  useEffect(() => {
    return () => {
      if (endpointTimerRef.current) window.clearTimeout(endpointTimerRef.current);
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    transcript,
    status,
    error,
    isSupported,
    isListening,
    isProcessing,
    startListening,
    stopListening,
    resetTranscript,
  };
}
