"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";

import { env } from "@/env";
import type { DuplexVoiceStatus, VoiceHistoryMessage } from "@/hooks/useDuplexVoiceSession";
import type { AdvisorUi, AppLanguage } from "@/lib/server/advisor-schemas";

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

export type VapiVoiceSessionState = {
  assistantText: string;
  error: string | null;
  interimTranscript: string;
  interruptAssistant: () => void;
  lastUserTranscript: string;
  level: number;
  retry: () => void;
  start: () => Promise<void>;
  status: DuplexVoiceStatus;
  stop: () => void;
};

type VapiMessage = {
  type?: string;
  role?: string;
  transcript?: string;
  transcriptType?: string;
  text?: string;
  delta?: string;
  status?: string;
  message?: unknown;
};

type VapiControls = Pick<
  Vapi,
  "on" | "removeListener" | "send" | "start" | "stop"
>;

const vapiPublicKey = env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const vapiAssistantId = env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

function normalizeTranscript(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function getErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Microphone blocked. Allow mic access in your browser and try again.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return "Unable to start Vapi voice.";
}

function shouldTreatAsFinal(message: VapiMessage) {
  const transcriptType = String(message.transcriptType ?? "").toLowerCase();
  const status = String(message.status ?? "").toLowerCase();

  return (
    transcriptType.includes("final") ||
    transcriptType.includes("complete") ||
    status.includes("final") ||
    status.includes("complete")
  );
}

function buildStartupContext(options: VoiceSessionOptions) {
  const recentMessages = options.recentMessages?.slice(-6) ?? [];
  const predictiveContext = options.getPredictiveContext?.() ?? null;

  return [
    "You are the Nivesh Saathi voice advisor for fixed deposit decisions in India.",
    `Current app language: ${options.language}.`,
    options.threadId ? `Current conversation thread: ${options.threadId}.` : "",
    recentMessages.length
      ? `Recent chat context:\n${recentMessages
          .map((message) => `${message.role}: ${message.content}`)
          .join("\n")}`
      : "",
    predictiveContext?.uiIntentHint
      ? `Current UI context: ${JSON.stringify(predictiveContext.uiIntentHint).slice(0, 1800)}`
      : "",
    "Keep spoken answers concise, practical, and friendly. For rate comparisons, mention that exact rates should be checked in the app before booking.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function VapiVoiceSessionController({
  children,
  options,
  open,
}: {
  children: (voice: VapiVoiceSessionState) => ReactNode;
  options: VoiceSessionOptions;
  open: boolean;
}) {
  const [assistantText, setAssistantText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lastUserTranscript, setLastUserTranscript] = useState("");
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState<DuplexVoiceStatus>("idle");

  const cleanupListenersRef = useRef<(() => void) | null>(null);
  const lastAssistantTextRef = useRef("");
  const lastUserTranscriptRef = useRef("");
  const optionsRef = useRef(options);
  const vapiRef = useRef<VapiControls | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const setVoiceError = useCallback((message: string) => {
    setError(message);
    setStatus("error");
    optionsRef.current.onError?.(message);
  }, []);

  const handleUserTranscript = useCallback((transcript: string, isFinal: boolean) => {
    const normalized = normalizeTranscript(transcript);
    if (!normalized) return;

    if (!isFinal) {
      setInterimTranscript(normalized);
      optionsRef.current.onInterimTranscript?.(normalized);
      return;
    }

    if (normalized === lastUserTranscriptRef.current) return;

    lastUserTranscriptRef.current = normalized;
    setLastUserTranscript(normalized);
    setInterimTranscript("");
    setStatus("processing");
    optionsRef.current.onUserTranscript?.(normalized);
  }, []);

  const handleAssistantReply = useCallback((reply: string) => {
    const normalized = normalizeTranscript(reply);
    if (!normalized || normalized === lastAssistantTextRef.current) return;

    lastAssistantTextRef.current = normalized;
    setAssistantText(normalized);
    optionsRef.current.onAssistantReply?.(normalized);
  }, []);

  const stop = useCallback(() => {
    cleanupListenersRef.current?.();
    cleanupListenersRef.current = null;
    void vapiRef.current?.stop().catch(() => undefined);
    vapiRef.current = null;
    setStatus("idle");
    setError(null);
    setInterimTranscript("");
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    stop();
    setStatus("connecting");
    setError(null);
    setAssistantText("");
    setInterimTranscript("");
    setLastUserTranscript("");
    lastAssistantTextRef.current = "";
    lastUserTranscriptRef.current = "";

    if (!vapiPublicKey || !vapiAssistantId) {
      setVoiceError(
        "Vapi is not configured. Add NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID in Vercel."
      );
      return;
    }

    try {
      const VapiClient = (await import("@vapi-ai/web")).default;
      const vapi = new VapiClient(vapiPublicKey);
      vapiRef.current = vapi;

      const onCallStart = () => setStatus("listening");
      const onCallEnd = () => setStatus("idle");
      const onSpeechStart = () => setStatus("speaking");
      const onSpeechEnd = () => setStatus("listening");
      const onVolumeLevel = (volume: number) => setLevel(Math.max(0, Math.min(1, volume)));
      const onError = (caught: unknown) => setVoiceError(getErrorMessage(caught));
      const onMessage = (message: VapiMessage) => {
        if (!message || typeof message !== "object") return;

        const type = String(message.type ?? "").toLowerCase();
        if (type === "transcript") {
          const transcript = normalizeTranscript(message.transcript ?? message.text);
          const role = String(message.role ?? "").toLowerCase();
          if (role === "assistant") {
            if (shouldTreatAsFinal(message)) handleAssistantReply(transcript);
            else setAssistantText(transcript);
            return;
          }

          handleUserTranscript(transcript, shouldTreatAsFinal(message));
          return;
        }

        if (type === "model-output") {
          setAssistantText(
            normalizeTranscript(message.text ?? message.delta ?? String(message.message ?? ""))
          );
          return;
        }

        if (type === "speech-update") {
          const nextStatus = String(message.status ?? "").toLowerCase();
          if (nextStatus.includes("start")) setStatus("speaking");
          if (nextStatus.includes("stop") || nextStatus.includes("end")) setStatus("listening");
        }
      };

      vapi.on("call-start", onCallStart);
      vapi.on("call-end", onCallEnd);
      vapi.on("speech-start", onSpeechStart);
      vapi.on("speech-end", onSpeechEnd);
      vapi.on("volume-level", onVolumeLevel);
      vapi.on("message", onMessage);
      vapi.on("error", onError);

      cleanupListenersRef.current = () => {
        vapi.removeListener("call-start", onCallStart);
        vapi.removeListener("call-end", onCallEnd);
        vapi.removeListener("speech-start", onSpeechStart);
        vapi.removeListener("speech-end", onSpeechEnd);
        vapi.removeListener("volume-level", onVolumeLevel);
        vapi.removeListener("message", onMessage);
        vapi.removeListener("error", onError);
      };

      await vapi.start(vapiAssistantId, {
        metadata: {
          app: "nivesh-saathi",
          language: optionsRef.current.language,
          threadId: optionsRef.current.threadId ?? undefined,
        },
        variableValues: {
          language: optionsRef.current.language,
          threadId: optionsRef.current.threadId ?? "",
        },
      });

      vapi.send({
        type: "add-message",
        message: {
          role: "system",
          content: buildStartupContext(optionsRef.current),
        },
        triggerResponseEnabled: false,
      });
    } catch (caught) {
      stop();
      setVoiceError(getErrorMessage(caught));
    }
  }, [handleAssistantReply, handleUserTranscript, setVoiceError, stop]);

  const interruptAssistant = useCallback(() => {
    vapiRef.current?.send({
      type: "control",
      control: "mute-assistant",
    });
    setStatus("interrupted");
    window.setTimeout(() => {
      vapiRef.current?.send({
        type: "control",
        control: "unmute-assistant",
      });
      setStatus((current) => (current === "interrupted" ? "listening" : current));
    }, 450);
  }, []);

  const retry = useCallback(() => {
    void start();
  }, [start]);

  useEffect(() => {
    if (!open) return;

    const startTimer = window.setTimeout(() => {
      void start();
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      stop();
    };
  }, [open, start, stop]);

  const voice = useMemo<VapiVoiceSessionState>(
    () => ({
      assistantText,
      error,
      interimTranscript,
      interruptAssistant,
      lastUserTranscript,
      level,
      retry,
      start,
      status,
      stop,
    }),
    [
      assistantText,
      error,
      interimTranscript,
      interruptAssistant,
      lastUserTranscript,
      level,
      retry,
      start,
      status,
      stop,
    ]
  );

  return <>{children(voice)}</>;
}
