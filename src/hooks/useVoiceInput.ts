"use client";

import { useEffect, useRef, useState } from "react";

import type { SupportedLanguage } from "@/lib/languages";
import { LANGUAGE_META } from "@/lib/languages";

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

  const speechRecognitionSupported = Boolean(getSpeechRecognitionConstructor());
  const isSupported = speechRecognitionSupported;
  const isListening = status === "listening";
  const isProcessing = status === "processing";

  const resetTranscript = () => {
    transcriptRef.current = "";
    setTranscript("");
    setError(null);
    if (status !== "processing") {
      setStatus("idle");
    }
  };

  const startListening = async () => {
    setError(null);
    const Recognition = getSpeechRecognitionConstructor();

    if (Recognition) {
      const recognition = new Recognition();
      let recognitionErrored = false;
      recognition.lang = LANGUAGE_META[language].speechRecognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        const nextTranscript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();

        if (nextTranscript) {
          transcriptRef.current = nextTranscript;
          setTranscript(nextTranscript);
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
        const finalTranscript = transcriptRef.current.trim();
        if (finalTranscript) {
          setStatus("idle");
          onTranscript?.(finalTranscript);
          return;
        }
        setError("No speech was detected. Please try again.");
        setStatus("error");
      };

      recognitionRef.current = recognition;
      setTranscript("");
      setStatus("listening");
      recognition.start();
      return;
    }

    setError("Voice input is not supported in this browser.");
    setStatus("error");
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  useEffect(() => {
    return () => {
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
