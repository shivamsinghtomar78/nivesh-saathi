"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { withCsrfHeaders } from "@/lib/csrf";
import { LANGUAGE_META } from "@/lib/languages";
import type { AdvisorUi, AppLanguage } from "@/lib/server/advisor-schemas";

export type DuplexVoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "interrupted"
  | "reconnecting"
  | "error";

type VoiceHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type VoiceSessionOptions = {
  language: AppLanguage;
  threadId?: string | null;
  recentMessages?: VoiceHistoryMessage[];
  onThreadId?: (threadId: string) => void;
  onUserTranscript?: (transcript: string) => void;
  onInterimTranscript?: (transcript: string) => void;
  onAssistantReply?: (reply: string) => void;
  onError?: (message: string) => void;
  getPredictiveContext?: () =>
    | {
        prefetchKey?: string;
        uiIntentHint?: AdvisorUi;
      }
    | null;
};

type SessionResponse = {
  ok?: boolean;
  accessToken?: string;
  expiresIn?: number;
  error?: string;
};

type DeepgramResultEvent = {
  type?: string;
  is_final?: boolean;
  speech_final?: boolean;
  channel?: {
    alternatives?: Array<{
      transcript?: string;
    }>;
  };
};

type VoiceRespondEvent =
  | {
      type: "meta";
      threadId?: string;
      conversationId?: string;
      voiceSessionId?: string;
      prefetchKey?: string;
      ui?: AdvisorUi;
    }
  | { type: "user"; transcript: string }
  | { type: "token"; token: string }
  | { type: "thinking"; text: string }
  | {
      type: "audio";
      text: string;
      audioUrl: string;
      provider: string;
      fallbackLanguage?: string;
      isFiller?: boolean;
    }
  | {
      type: "audio_fallback";
      text: string;
      provider: string;
      fallbackLanguage?: string;
      isFiller?: boolean;
    }
  | {
      type: "done";
      reply: string;
      threadId?: string;
      conversationId?: string;
      voiceSessionId?: string;
      prefetchKey?: string;
      ui?: AdvisorUi;
    }
  | { type: "error"; error: string };

type PlaybackItem =
  | { kind: "audio"; audioUrl: string; text: string; isFiller?: boolean }
  | { kind: "speech"; text: string; language: string; isFiller?: boolean };

function normalizeVoiceLanguage(language: AppLanguage): "en" | "hi" | "hinglish" {
  if (language === "en" || language === "hi" || language === "hinglish") return language;
  return "hinglish";
}

function createClientTurnId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getMediaRecorderOptions() {
  if (typeof MediaRecorder === "undefined") return undefined;

  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return { mimeType: "audio/webm;codecs=opus" };
  }

  if (MediaRecorder.isTypeSupported("audio/webm")) {
    return { mimeType: "audio/webm" };
  }

  return undefined;
}

export function useDuplexVoiceSession(options: VoiceSessionOptions) {
  const [status, setStatus] = useState<DuplexVoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lastUserTranscript, setLastUserTranscript] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [level, setLevel] = useState(0);

  const optionsRef = useRef(options);
  const statusRef = useRef<DuplexVoiceStatus>("idle");
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const keepAliveRef = useRef<number | null>(null);
  const responseAbortRef = useRef<AbortController | null>(null);
  const playbackQueueRef = useRef<PlaybackItem[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const responseDoneRef = useRef(true);
  const assistantAccumulatedRef = useRef("");
  const finalSegmentsRef = useRef<string[]>([]);
  const lastSentTranscriptRef = useRef("");
  const reconnectAttemptsRef = useRef(0);
  const voiceSessionIdRef = useRef<string | null>(null);
  const activeRef = useRef(false);
  const startRef = useRef<() => void>(() => undefined);
  const playNextRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const setVoiceError = useCallback((message: string) => {
    setError(message);
    setStatus("error");
    optionsRef.current.onError?.(message);
  }, []);

  const stopPlayback = useCallback(() => {
    playbackQueueRef.current = [];
    currentAudioRef.current?.pause();
    currentAudioRef.current = null;

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    currentUtteranceRef.current = null;
  }, []);

  const playNext = useCallback(() => {
    if (!activeRef.current) return;

    const next = playbackQueueRef.current.shift();
    if (!next) {
      currentAudioRef.current = null;
      currentUtteranceRef.current = null;
      if (responseDoneRef.current && statusRef.current !== "interrupted") {
        setStatus("listening");
      }
      return;
    }

    setStatus("speaking");

    if (next.kind === "audio") {
      const audio = new Audio(next.audioUrl);
      currentAudioRef.current = audio;
      audio.onended = () => playNextRef.current();
      audio.onerror = () => playNextRef.current();
      void audio.play().catch(() => playNextRef.current());
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      playNextRef.current();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(next.text);
    utterance.lang = next.language;
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onend = () => playNextRef.current();
    utterance.onerror = () => playNextRef.current();
    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const enqueuePlayback = useCallback(
    (item: PlaybackItem) => {
      playbackQueueRef.current.push(item);
      if (!currentAudioRef.current && !currentUtteranceRef.current) {
        playNext();
      }
    },
    [playNext]
  );

  const interruptAssistant = useCallback(() => {
    responseAbortRef.current?.abort();
    responseAbortRef.current = null;
    responseDoneRef.current = true;
    stopPlayback();
    setStatus("interrupted");
    window.setTimeout(() => {
      if (activeRef.current && statusRef.current === "interrupted") {
        setStatus("listening");
      }
    }, 420);
  }, [stopPlayback]);

  const parseVoiceResponse = useCallback(
    async (response: Response) => {
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Voice response stream is unavailable.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n");
        buffer = messages.pop() ?? "";

        for (const message of messages) {
          const trimmed = message.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const event = JSON.parse(trimmed.slice(6)) as VoiceRespondEvent;

          if (event.type === "meta") {
            const nextThreadId = event.threadId ?? event.conversationId;
            if (nextThreadId) optionsRef.current.onThreadId?.(nextThreadId);
            if (event.voiceSessionId) voiceSessionIdRef.current = event.voiceSessionId;
          } else if (event.type === "thinking") {
            setAssistantText(event.text);
          } else if (event.type === "token") {
            assistantAccumulatedRef.current += event.token;
            setAssistantText(assistantAccumulatedRef.current);
          } else if (event.type === "audio") {
            enqueuePlayback({
              kind: "audio",
              audioUrl: event.audioUrl,
              text: event.text,
              isFiller: event.isFiller,
            });
          } else if (event.type === "audio_fallback") {
            enqueuePlayback({
              kind: "speech",
              text: event.text,
              language: event.fallbackLanguage ?? "en-IN",
              isFiller: event.isFiller,
            });
          } else if (event.type === "done") {
            responseDoneRef.current = true;
            const nextThreadId = event.threadId ?? event.conversationId;
            if (nextThreadId) optionsRef.current.onThreadId?.(nextThreadId);
            if (event.voiceSessionId) voiceSessionIdRef.current = event.voiceSessionId;
            const reply = (event.reply || assistantAccumulatedRef.current).trim();
            if (reply) optionsRef.current.onAssistantReply?.(reply);
            if (playbackQueueRef.current.length === 0 && !currentAudioRef.current && !currentUtteranceRef.current) {
              setStatus("listening");
            }
          } else if (event.type === "error") {
            throw new Error(event.error);
          }
        }
      }
    },
    [enqueuePlayback]
  );

  const sendUtterance = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.replace(/\s+/g, " ").trim();
      if (!trimmed || trimmed === lastSentTranscriptRef.current) return;

      lastSentTranscriptRef.current = trimmed;
      setLastUserTranscript(trimmed);
      setInterimTranscript("");
      setAssistantText("");
      assistantAccumulatedRef.current = "";
      responseDoneRef.current = false;
      setStatus("processing");
      optionsRef.current.onUserTranscript?.(trimmed);

      const controller = new AbortController();
      responseAbortRef.current = controller;
      const voiceLanguage = normalizeVoiceLanguage(optionsRef.current.language);
      const predictiveContext = optionsRef.current.getPredictiveContext?.() ?? null;

      try {
        const response = await fetch("/api/voice/respond", {
          method: "POST",
          headers: withCsrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            transcript: trimmed,
            language: voiceLanguage,
            threadId: optionsRef.current.threadId ?? undefined,
            conversationId: optionsRef.current.threadId ?? undefined,
            voiceSessionId: voiceSessionIdRef.current ?? undefined,
            clientTurnId: createClientTurnId(),
            prefetchKey: predictiveContext?.prefetchKey,
            uiIntentHint: predictiveContext?.uiIntentHint,
            recentMessages: optionsRef.current.recentMessages ?? [],
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "Voice agent could not respond.");
        }

        await parseVoiceResponse(response);
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setVoiceError(caught instanceof Error ? caught.message : "Voice response failed.");
      } finally {
        responseAbortRef.current = null;
        responseDoneRef.current = true;
      }
    },
    [parseVoiceResponse, setVoiceError]
  );

  const handleDeepgramMessage = useCallback(
    (raw: string) => {
      let event: DeepgramResultEvent;
      try {
        event = JSON.parse(raw) as DeepgramResultEvent;
      } catch {
        return;
      }

      if (event.type === "SpeechStarted") {
        if (statusRef.current === "speaking" || statusRef.current === "processing") {
          interruptAssistant();
        }
        return;
      }

      const transcript = event.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
      if (!transcript) return;

      if (event.is_final) {
        finalSegmentsRef.current.push(transcript);
      } else {
        setInterimTranscript(transcript);
        optionsRef.current.onInterimTranscript?.(transcript);
      }

      if (event.speech_final) {
        const utterance = (finalSegmentsRef.current.join(" ") || transcript).trim();
        finalSegmentsRef.current = [];
        if (utterance) void sendUtterance(utterance);
      }
    },
    [interruptAssistant, sendUtterance]
  );

  const stopLevelMeter = useCallback(() => {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setLevel(0);
  }, []);

  const startLevelMeter = useCallback((stream: MediaStream) => {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length;
      setLevel(Math.min(1, average / 120));
      animationRef.current = window.requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const cleanup = useCallback(() => {
    activeRef.current = false;
    responseAbortRef.current?.abort();
    responseAbortRef.current = null;
    stopPlayback();
    stopLevelMeter();

    if (keepAliveRef.current !== null) {
      window.clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    socketRef.current?.close();
    socketRef.current = null;

    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    analyserRef.current = null;
    finalSegmentsRef.current = [];
    responseDoneRef.current = true;
  }, [stopLevelMeter, stopPlayback]);

  const start = useCallback(async () => {
    cleanup();
    activeRef.current = true;
    setError(null);
    setStatus(reconnectAttemptsRef.current > 0 ? "reconnecting" : "connecting");

    try {
      const sessionResponse = await fetch("/api/voice/session", {
        method: "POST",
        headers: withCsrfHeaders(),
      });
      const session = (await sessionResponse.json()) as SessionResponse;
      if (!sessionResponse.ok || !session.accessToken) {
        throw new Error(session.error || "Unable to create a voice session.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      startLevelMeter(stream);

      const voiceLanguage = normalizeVoiceLanguage(optionsRef.current.language);
      const deepgramLanguage = LANGUAGE_META[voiceLanguage].deepgram;
      const params = new URLSearchParams({
        model: "nova-2",
        interim_results: "true",
        smart_format: "true",
        punctuate: "true",
        endpointing: "320",
        utterance_end_ms: "900",
        language: deepgramLanguage,
      });
      const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, [
        "bearer",
        session.accessToken,
      ]);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setStatus("listening");

        const recorder = new MediaRecorder(stream, getMediaRecorderOptions());
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };
        recorder.onerror = () => {
          setVoiceError("Unable to capture microphone audio.");
        };
        recorder.start(250);

        keepAliveRef.current = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "KeepAlive" }));
          }
        }, 8000);
      };

      socket.onmessage = (event) => {
        if (typeof event.data === "string") {
          handleDeepgramMessage(event.data);
        }
      };

      socket.onerror = () => {
        setVoiceError("Live transcription connection failed.");
      };

      socket.onclose = () => {
        if (!activeRef.current || statusRef.current === "error") return;
        if (reconnectAttemptsRef.current < 2) {
          reconnectAttemptsRef.current += 1;
          setStatus("reconnecting");
          window.setTimeout(() => {
            if (activeRef.current) startRef.current();
          }, 900 * reconnectAttemptsRef.current);
        } else {
          setVoiceError("Voice connection dropped. Please try again.");
        }
      };
    } catch (caught) {
      const message =
        caught instanceof DOMException && caught.name === "NotAllowedError"
          ? "Microphone blocked. Allow mic access in your browser and try again."
          : caught instanceof Error
            ? caught.message
            : "Unable to start voice.";
      setVoiceError(message);
      cleanup();
    }
  }, [cleanup, handleDeepgramMessage, setVoiceError, startLevelMeter]);

  useEffect(() => {
    startRef.current = () => {
      void start();
    };
  }, [start]);

  const retry = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    void start();
  }, [start]);

  const stop = useCallback(() => {
    cleanup();
    setStatus("idle");
    setInterimTranscript("");
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return {
    status,
    error,
    level,
    interimTranscript,
    lastUserTranscript,
    assistantText,
    start,
    stop,
    retry,
    interruptAssistant,
  };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
