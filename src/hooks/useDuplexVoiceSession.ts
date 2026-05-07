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
  details?: {
    code?: string;
  };
};

type DeepgramResultEvent = {
  type?: string;
  request_id?: string;
  metadata?: {
    request_id?: string;
  };
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
  | { type: "error"; error: string; code?: string };

type PlaybackItem =
  | { kind: "audio"; audioUrl: string; text: string; isFiller?: boolean }
  | { kind: "speech"; text: string; language: string; isFiller?: boolean };

type ChunkStats = {
  count: number;
  bytes: number;
  minBytes: number | null;
  maxBytes: number;
};

const MAX_TRANSIENT_RECONNECTS = 2;
const DEEPGRAM_POLICY_CLOSE_CODES = new Set([1002, 1003, 1007, 1008]);

function createVoiceDiagnosticSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `voice-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function createChunkStats(): ChunkStats {
  return {
    count: 0,
    bytes: 0,
    minBytes: null,
    maxBytes: 0,
  };
}

function summarizeChunkStats(stats: ChunkStats) {
  return {
    count: stats.count,
    bytes: stats.bytes,
    minBytes: stats.minBytes ?? 0,
    maxBytes: stats.maxBytes,
  };
}

export function isRetriableDeepgramClose(input: {
  code: number;
  wasClean?: boolean;
}) {
  if (input.code === 1000 || input.code === 1001) return false;
  if (DEEPGRAM_POLICY_CLOSE_CODES.has(input.code)) return false;
  if (input.code >= 4000 && input.code < 5000) return false;
  if (input.code === 1006) return true;
  if (input.code === 1011 || input.code === 1012 || input.code === 1013) {
    return true;
  }

  return !input.wasClean;
}

export function getDeepgramCloseMessage(input: {
  code: number;
  wasClean?: boolean;
}) {
  if (input.code === 1008 || (input.code >= 4000 && input.code < 5000)) {
    return "Live transcription was rejected. Please check the Deepgram key role and voice settings.";
  }

  if (DEEPGRAM_POLICY_CLOSE_CODES.has(input.code)) {
    return "Live transcription could not accept the microphone stream. Please try again.";
  }

  return "Voice connection dropped. Please try again.";
}

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
  const stableConnectionTimerRef = useRef<number | null>(null);
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
  const deepgramRequestIdRef = useRef<string | null>(null);
  const connectionAttemptRef = useRef(0);
  const diagnosticSessionIdRef = useRef(createVoiceDiagnosticSessionId());
  const chunkStatsRef = useRef<ChunkStats>(createChunkStats());
  const previousContextRef = useRef<{
    language: AppLanguage;
    threadId: string | null;
  }>({
    language: options.language,
    threadId: options.threadId ?? null,
  });
  const activeRef = useRef(false);
  const startRef = useRef<() => void>(() => undefined);
  const playNextRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    optionsRef.current = options;
    const nextContext = {
      language: options.language,
      threadId: options.threadId ?? null,
    };

    if (
      previousContextRef.current.language !== nextContext.language ||
      previousContextRef.current.threadId !== nextContext.threadId
    ) {
      previousContextRef.current = nextContext;
      lastSentTranscriptRef.current = "";
      finalSegmentsRef.current = [];
      assistantAccumulatedRef.current = "";
      voiceSessionIdRef.current = null;
      deepgramRequestIdRef.current = null;
    }
  }, [options]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const reportDiagnostic = useCallback(
    (event: string, metadata?: Record<string, unknown>) => {
      if (typeof window === "undefined") return;

      void fetch("/api/voice/diagnostics", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sessionId: diagnosticSessionIdRef.current,
          attemptId: connectionAttemptRef.current,
          event,
          metadata: {
            status: statusRef.current,
            deepgramRequestId: deepgramRequestIdRef.current,
            ...metadata,
          },
        }),
        keepalive: true,
      }).catch(() => undefined);
    },
    []
  );

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
      audio.onerror = () => {
        reportDiagnostic("playback_error", {
          kind: "audio",
          textLength: next.text.length,
        });
        playNextRef.current();
      };
      void audio.play().catch((caught) => {
        reportDiagnostic("playback_error", {
          kind: "audio_play",
          message: caught instanceof Error ? caught.message : "Audio play failed",
          textLength: next.text.length,
        });
        playNextRef.current();
      });
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      reportDiagnostic("playback_unavailable", { kind: "speech_synthesis" });
      playNextRef.current();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(next.text);
    utterance.lang = next.language;
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onend = () => playNextRef.current();
    utterance.onerror = () => {
      reportDiagnostic("playback_error", {
        kind: "speech_synthesis",
        textLength: next.text.length,
      });
      playNextRef.current();
    };
    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [reportDiagnostic]);

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

      reportDiagnostic("voice_response_stream_start", {
        contentType: response.headers.get("content-type"),
      });
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
            reportDiagnostic("voice_response_done", {
              replyLength: reply.length,
              hasThread: Boolean(nextThreadId),
              hasVoiceSession: Boolean(event.voiceSessionId),
            });
            if (playbackQueueRef.current.length === 0 && !currentAudioRef.current && !currentUtteranceRef.current) {
              setStatus("listening");
            }
          } else if (event.type === "error") {
            reportDiagnostic("voice_response_error", {
              code: event.code,
              message: event.error,
            });
            throw new Error(event.error);
          }
        }
      }
    },
    [enqueuePlayback, reportDiagnostic]
  );

  const sendUtterance = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.replace(/\s+/g, " ").trim();
      if (!trimmed || trimmed === lastSentTranscriptRef.current) return;

      lastSentTranscriptRef.current = trimmed;
      reportDiagnostic("voice_utterance_send", {
        transcriptLength: trimmed.length,
        hasThread: Boolean(optionsRef.current.threadId),
        hasVoiceSession: Boolean(voiceSessionIdRef.current),
      });
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
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
            details?: { code?: string };
          };
          reportDiagnostic("voice_response_http_error", {
            status: response.status,
            code: payload.details?.code,
          });
          throw new Error(payload.error || "Voice agent could not respond.");
        }

        await parseVoiceResponse(response);
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        reportDiagnostic("voice_utterance_failed", {
          message: caught instanceof Error ? caught.message : "Voice response failed",
        });
        setVoiceError(caught instanceof Error ? caught.message : "Voice response failed.");
      } finally {
        responseAbortRef.current = null;
        responseDoneRef.current = true;
      }
    },
    [parseVoiceResponse, reportDiagnostic, setVoiceError]
  );

  const handleDeepgramMessage = useCallback(
    (raw: string) => {
      let event: DeepgramResultEvent;
      try {
        event = JSON.parse(raw) as DeepgramResultEvent;
      } catch {
        return;
      }

      if (event.type === "Metadata") {
        const requestId = event.request_id ?? event.metadata?.request_id;
        if (requestId) {
          deepgramRequestIdRef.current = requestId;
          reportDiagnostic("deepgram_metadata", { requestId });
        }
        return;
      }

      if (event.type === "SpeechStarted") {
        reportDiagnostic("deepgram_speech_started");
        if (statusRef.current === "speaking" || statusRef.current === "processing") {
          interruptAssistant();
        }
        return;
      }

      const transcript = event.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
      if (!transcript) return;

      if (event.is_final) {
        finalSegmentsRef.current.push(transcript);
        reportDiagnostic("deepgram_transcript_final", {
          transcriptLength: transcript.length,
        });
      } else {
        setInterimTranscript(transcript);
        optionsRef.current.onInterimTranscript?.(transcript);
      }

      if (event.speech_final) {
        const utterance = (finalSegmentsRef.current.join(" ") || transcript).trim();
        finalSegmentsRef.current = [];
        if (utterance) {
          reportDiagnostic("deepgram_utterance_final", {
            transcriptLength: utterance.length,
          });
          void sendUtterance(utterance);
        }
      }
    },
    [interruptAssistant, reportDiagnostic, sendUtterance]
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

  const stopCaptureResources = useCallback(() => {
    if (keepAliveRef.current !== null) {
      window.clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }

    if (stableConnectionTimerRef.current !== null) {
      window.clearTimeout(stableConnectionTimerRef.current);
      stableConnectionTimerRef.current = null;
    }

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    analyserRef.current = null;
    stopLevelMeter();
  }, [stopLevelMeter]);

  const cleanup = useCallback(() => {
    activeRef.current = false;
    connectionAttemptRef.current += 1;
    responseAbortRef.current?.abort();
    responseAbortRef.current = null;
    stopPlayback();
    stopCaptureResources();

    const socket = socketRef.current;
    socketRef.current = null;

    if (
      socket &&
      (socket.readyState === WebSocket.CONNECTING ||
        socket.readyState === WebSocket.OPEN)
    ) {
      socket.close(1000, "client_cleanup");
    }

    finalSegmentsRef.current = [];
    responseDoneRef.current = true;
  }, [stopCaptureResources, stopPlayback]);

  const start = useCallback(async () => {
    const reconnecting = reconnectAttemptsRef.current > 0;
    cleanup();
    const attemptId = connectionAttemptRef.current + 1;
    connectionAttemptRef.current = attemptId;
    if (!reconnecting) {
      diagnosticSessionIdRef.current = createVoiceDiagnosticSessionId();
      lastSentTranscriptRef.current = "";
      voiceSessionIdRef.current = null;
    }
    chunkStatsRef.current = createChunkStats();
    finalSegmentsRef.current = [];
    assistantAccumulatedRef.current = "";
    responseDoneRef.current = true;
    deepgramRequestIdRef.current = null;
    activeRef.current = true;
    setError(null);
    setInterimTranscript("");
    setStatus(reconnecting ? "reconnecting" : "connecting");
    reportDiagnostic("voice_session_start", {
      reconnecting,
      reconnectAttempt: reconnectAttemptsRef.current,
      language: optionsRef.current.language,
      hasThread: Boolean(optionsRef.current.threadId),
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      startLevelMeter(stream);
      reportDiagnostic("microphone_opened", {
        tracks: stream.getAudioTracks().length,
      });

      const sessionResponse = await fetch("/api/voice/session", {
        method: "POST",
        headers: withCsrfHeaders(),
      });
      const session = (await sessionResponse.json()) as SessionResponse;
      if (!sessionResponse.ok || !session.accessToken) {
        reportDiagnostic("voice_session_token_failed", {
          status: sessionResponse.status,
          code: session.details?.code,
        });
        throw new Error(session.error || "Unable to create a voice session.");
      }
      reportDiagnostic("voice_session_token_ok", {
        expiresIn: session.expiresIn,
      });

      const voiceLanguage = normalizeVoiceLanguage(optionsRef.current.language);
      const deepgramLanguage = LANGUAGE_META[voiceLanguage].deepgram;
      const params = new URLSearchParams({
        token: session.accessToken,
        model: "nova-2",
        interim_results: "true",
        smart_format: "true",
        punctuate: "true",
        endpointing: "320",
        utterance_end_ms: "900",
        vad_events: "true",
        language: deepgramLanguage,
      });
      const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`);
      socketRef.current = socket;

      socket.onopen = () => {
        if (attemptId !== connectionAttemptRef.current) return;
        setStatus("listening");
        stableConnectionTimerRef.current = window.setTimeout(() => {
          if (activeRef.current && attemptId === connectionAttemptRef.current) {
            reconnectAttemptsRef.current = 0;
          }
          stableConnectionTimerRef.current = null;
        }, 5000);
        reportDiagnostic("ws_open", {
          deepgramLanguage,
          authMode: "query_token",
          readyState: socket.readyState,
        });

        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, getMediaRecorderOptions());
        } catch (caught) {
          reportDiagnostic("recorder_create_failed", {
            message:
              caught instanceof Error
                ? caught.message
                : "MediaRecorder could not start",
          });
          setVoiceError("Unable to capture microphone audio.");
          return;
        }
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            const stats = chunkStatsRef.current;
            stats.count += 1;
            stats.bytes += event.data.size;
            stats.minBytes =
              stats.minBytes === null
                ? event.data.size
                : Math.min(stats.minBytes, event.data.size);
            stats.maxBytes = Math.max(stats.maxBytes, event.data.size);
            socket.send(event.data);
          }
        };
        recorder.onerror = () => {
          reportDiagnostic("recorder_error", {
            mimeType: recorder.mimeType,
            state: recorder.state,
          });
          setVoiceError("Unable to capture microphone audio.");
        };
        try {
          recorder.start(250);
        } catch (caught) {
          reportDiagnostic("recorder_start_failed", {
            mimeType: recorder.mimeType,
            message:
              caught instanceof Error
                ? caught.message
                : "MediaRecorder could not start",
          });
          setVoiceError("Unable to capture microphone audio.");
          return;
        }
        reportDiagnostic("recorder_start", {
          mimeType: recorder.mimeType,
          state: recorder.state,
        });

        keepAliveRef.current = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "KeepAlive" }));
          }
        }, 8000);
      };

      socket.onmessage = (event) => {
        if (attemptId !== connectionAttemptRef.current) return;
        if (typeof event.data === "string") {
          handleDeepgramMessage(event.data);
        }
      };

      socket.onerror = () => {
        if (attemptId !== connectionAttemptRef.current) return;
        reportDiagnostic("ws_error", {
          authMode: "query_token",
          readyState: socket.readyState,
        });
      };

      socket.onclose = (event) => {
        if (attemptId !== connectionAttemptRef.current) return;
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        stopCaptureResources();
        const retriable = isRetriableDeepgramClose(event);
        reportDiagnostic("ws_close", {
          authMode: "query_token",
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          retriable,
          chunks: summarizeChunkStats(chunkStatsRef.current),
        });
        if (!activeRef.current || statusRef.current === "error") return;

        if (
          retriable &&
          reconnectAttemptsRef.current < MAX_TRANSIENT_RECONNECTS
        ) {
          reconnectAttemptsRef.current += 1;
          setStatus("reconnecting");
          window.setTimeout(() => {
            if (
              activeRef.current &&
              attemptId === connectionAttemptRef.current
            ) {
              startRef.current();
            }
          }, 900 * reconnectAttemptsRef.current);
        } else {
          setVoiceError(getDeepgramCloseMessage(event));
        }
      };
    } catch (caught) {
      const message =
        caught instanceof DOMException && caught.name === "NotAllowedError"
          ? "Microphone blocked. Allow mic access in your browser and try again."
          : caught instanceof Error
            ? caught.message
            : "Unable to start voice.";
      reportDiagnostic("voice_session_start_failed", {
        message,
      });
      setVoiceError(message);
      cleanup();
    }
  }, [
    cleanup,
    handleDeepgramMessage,
    reportDiagnostic,
    setVoiceError,
    startLevelMeter,
    stopCaptureResources,
  ]);

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
