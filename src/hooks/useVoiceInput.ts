"use client";

import { useEffect, useRef, useState } from "react";

import { withCsrfHeaders } from "@/lib/csrf";
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

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const speechRecognitionSupported = Boolean(getSpeechRecognitionConstructor());
  const recorderSupported =
    typeof window !== "undefined" &&
    "MediaRecorder" in window &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const isSupported = speechRecognitionSupported || recorderSupported;
  const isListening = status === "listening";
  const isProcessing = status === "processing";

  const stopMediaTracks = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const resetTranscript = () => {
    transcriptRef.current = "";
    setTranscript("");
    setError(null);
    if (status !== "processing") {
      setStatus("idle");
    }
  };

  const transcribeWithDeepgram = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "voice-input.webm");
    formData.append("language", language);

    const response = await fetch("/api/voice/transcribe", {
      method: "POST",
      headers: withCsrfHeaders(),
      body: formData,
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to transcribe audio");
    }

    const nextTranscript = String(payload.transcript ?? "").trim();
    transcriptRef.current = nextTranscript;
    setTranscript(nextTranscript);
    setStatus("idle");
    setError(null);
    onTranscript?.(nextTranscript);
  };

  const startRecorderFallback = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    chunksRef.current = [];

    const preferredMimeType =
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
    const recorder = new MediaRecorder(
      stream,
      preferredMimeType ? { mimeType: preferredMimeType } : undefined
    );

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onerror = () => {
      setError("Unable to capture audio from the microphone.");
      setStatus("error");
      stopMediaTracks();
    };

    recorder.onstop = async () => {
      stopMediaTracks();
      const audioBlob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      chunksRef.current = [];

      if (audioBlob.size === 0) {
        setError("No audio was captured. Please try again.");
        setStatus("error");
        return;
      }

      try {
        setStatus("processing");
        await transcribeWithDeepgram(audioBlob);
      } catch (transcriptionError) {
        setError(
          transcriptionError instanceof Error
            ? transcriptionError.message
            : "Unable to transcribe audio."
        );
        setStatus("error");
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setStatus("listening");
    setError(null);
  };

  const startListening = async () => {
    setError(null);
    const Recognition = getSpeechRecognitionConstructor();

    if (Recognition) {
      const recognition = new Recognition();
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
      recognition.onerror = () => {
        setError("Voice recognition could not understand you clearly.");
        setStatus("error");
      };
      recognition.onend = () => {
        const finalTranscript = transcriptRef.current.trim();
        setStatus("idle");
        if (finalTranscript) {
          onTranscript?.(finalTranscript);
        }
      };

      recognitionRef.current = recognition;
      setTranscript("");
      setStatus("listening");
      recognition.start();
      return;
    }

    if (!recorderSupported) {
      setError("Voice input is not supported in this browser.");
      setStatus("error");
      return;
    }

    transcriptRef.current = "";
    setTranscript("");
    await startRecorderFallback();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      stopMediaTracks();
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
