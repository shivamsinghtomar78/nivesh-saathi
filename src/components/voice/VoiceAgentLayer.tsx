"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LoaderCircle, Mic, Minus, RefreshCw, Volume2, VolumeX, X } from "lucide-react";

import VideoSdkVoiceSessionController from "@/components/voice/VideoSdkVoiceSessionController";
import type { DuplexVoiceStatus } from "@/hooks/useDuplexVoiceSession";
import {
  usePredictivePrefetch,
  type PredictivePrefetchClientResult,
} from "@/hooks/usePredictivePrefetch";
import { LANGUAGE_LABELS } from "@/lib/copy";
import type {
  AppLanguage,
  ChatCompareSnapshotContext,
  ChatLadderPlanContext,
} from "@/lib/server/advisor-schemas";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/stores/conversationStore";

type VoiceAgentLayerProps = {
  open: boolean;
  language: AppLanguage;
  threadId?: string | null;
  messages: ConversationMessage[];
  shortlistBankIds?: string[];
  ladderPlan?: ChatLadderPlanContext | null;
  compareSnapshot?: ChatCompareSnapshotContext | null;
  onClose: () => void;
  onMinimize: () => void;
  onThreadId: (threadId: string) => void;
  onUserTranscript: (transcript: string) => void;
  onAssistantReply: (reply: string) => void;
  onPrediction?: (result: PredictivePrefetchClientResult | null) => void;
  onPredictionStatus?: (status: "idle" | "loading" | "ready" | "error") => void;
};

const statusCopy: Record<DuplexVoiceStatus, { label: string; body: string }> = {
  idle: {
    label: "Ready",
    body: "Voice is ready.",
  },
  connecting: {
    label: "Connecting",
    body: "Preparing a secure live voice session.",
  },
  listening: {
    label: "Listening",
    body: "Speak naturally.",
  },
  processing: {
    label: "Thinking",
    body: "Saathi is preparing a short spoken answer.",
  },
  speaking: {
    label: "Speaking",
    body: "You can interrupt anytime.",
  },
  interrupted: {
    label: "Interrupted",
    body: "Listening again.",
  },
  reconnecting: {
    label: "Reconnecting",
    body: "Restoring the live voice session.",
  },
  error: {
    label: "Needs attention",
    body: "Voice hit a recoverable issue.",
  },
};

function StatusIcon({
  className,
  status,
}: {
  className?: string;
  status: DuplexVoiceStatus;
}) {
  if (status === "connecting" || status === "processing" || status === "reconnecting") {
    return <LoaderCircle className={className} />;
  }
  if (status === "speaking") return <Volume2 className={className} />;
  if (status === "interrupted") return <VolumeX className={className} />;
  return <Mic className={className} />;
}

export default function VoiceAgentLayer({
  compareSnapshot,
  open,
  language,
  ladderPlan,
  messages,
  onAssistantReply,
  onClose,
  onMinimize,
  onPrediction,
  onPredictionStatus,
  onThreadId,
  onUserTranscript,
  shortlistBankIds,
  threadId,
}: VoiceAgentLayerProps) {
  const recentMessages = useMemo(
    () =>
      messages
        .filter((message) => message.id !== "welcome")
        .slice(-8)
        .map((message) => ({
          role: message.role === "bot" ? ("assistant" as const) : ("user" as const),
          content: message.content,
        })),
    [messages]
  );

  const predictive = usePredictivePrefetch({
    language,
    threadId,
    shortlistBankIds,
    ladderPlan,
    compareSnapshot,
    enabled: open,
    onResult: onPrediction,
  });
  const latestPredictiveRef = useRef<PredictivePrefetchClientResult | null>(null);

  useEffect(() => {
    latestPredictiveRef.current = predictive.result;
  }, [predictive.result]);

  useEffect(() => {
    onPredictionStatus?.(predictive.status);
  }, [onPredictionStatus, predictive.status]);

  const voiceOptions = useMemo(
    () => ({
      language,
      threadId,
      recentMessages,
      onThreadId,
      onUserTranscript,
      onAssistantReply,
      onInterimTranscript: predictive.schedulePrediction,
      getPredictiveContext: () => {
        const latest = latestPredictiveRef.current;
        return latest
          ? {
              prefetchKey: latest.prefetchKey,
              uiIntentHint: latest.ui,
            }
          : null;
      },
    }),
    [
      language,
      onAssistantReply,
      onThreadId,
      onUserTranscript,
      predictive.schedulePrediction,
      recentMessages,
      threadId,
    ]
  );

  useEffect(() => {
    if (!open) {
      predictive.reset();
    }
  }, [open, predictive]);

  return (
    <VideoSdkVoiceSessionController open={open} options={voiceOptions}>
      {(voice) => {
        const copy = statusCopy[voice.status];
        const active =
          voice.status === "listening" ||
          voice.status === "processing" ||
          voice.status === "speaking" ||
          voice.status === "interrupted";
        const audioScale = 1 + voice.level * 0.22;
        const subtitle =
          voice.error ||
          voice.interimTranscript ||
          (predictive.status === "loading" ? "Predicting the workspace..." : "") ||
          voice.assistantText ||
          voice.lastUserTranscript ||
          copy.body;
        const predictionLabel =
          predictive.status === "loading"
            ? "Predicting"
            : predictive.result && predictive.result.prediction.confidence !== "low"
              ? predictive.result.ui.mode.replace("-", " ")
              : null;

        return (
          <AnimatePresence>
            {open ? (
              <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/58 p-3 backdrop-blur-2xl tablet:items-center tablet:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
          aria-label="AI voice agent"
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-[92svh] w-full max-w-[560px] overflow-hidden rounded-[30px] border border-white/10 bg-[#070707]/90 shadow-[0_34px_110px_rgba(0,0,0,0.72)] backdrop-blur-2xl tablet:rounded-[34px]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(215,182,109,0.2),transparent_20rem),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_42%)]" />
            <div className="pointer-events-none absolute inset-x-10 top-8 h-36 rounded-full bg-accent/10 blur-3xl" />

            <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3 tablet:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                  Live AI Voice
                </p>
                <h2 className="truncate text-base font-semibold text-[#F5F0E8]">
                  Nivesh Saathi
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={onMinimize}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-[#AEB4BE] transition hover:border-accent/30 hover:text-[#F5F0E8]"
                  aria-label="Minimize voice"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-[#AEB4BE] transition hover:border-accent/30 hover:text-[#F5F0E8]"
                  aria-label="Close voice"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative px-4 pb-5 pt-6 tablet:px-6 tablet:pb-6 tablet:pt-8">
              <div className="mx-auto flex w-full max-w-[360px] flex-col items-center">
                <div className="relative flex aspect-square w-[min(72vw,300px)] items-center justify-center">
                  {[0, 1, 2, 3].map((ring) => (
                    <motion.span
                      key={ring}
                      className={cn(
                        "absolute rounded-full border border-accent/25",
                        active ? "opacity-100" : "opacity-28"
                      )}
                      animate={{
                        scale: active ? [1, 1.08 + ring * 0.02, 1] : 1,
                        opacity: active ? [0.22, 0.55, 0.22] : 0.2,
                      }}
                      transition={{
                        duration: 2.6 + ring * 0.25,
                        repeat: Infinity,
                        delay: ring * 0.18,
                        ease: "easeInOut",
                      }}
                      style={{
                        width: `${46 + ring * 14}%`,
                        height: `${46 + ring * 14}%`,
                      }}
                    />
                  ))}

                  <motion.div
                    className="absolute h-[72%] w-[72%] rounded-full bg-[radial-gradient(circle,rgba(239,211,139,0.28),rgba(109,187,161,0.13)_38%,transparent_66%)] blur-md"
                    animate={{
                      scale: active ? audioScale : 0.95,
                      opacity: active ? 0.95 : 0.46,
                    }}
                    transition={{ duration: 0.2 }}
                  />

                  <motion.button
                    type="button"
                    onClick={
                      voice.status === "speaking" || voice.status === "processing"
                        ? voice.interruptAssistant
                        : voice.retry
                    }
                    className={cn(
                      "relative flex h-[42%] w-[42%] items-center justify-center rounded-full border bg-[#0D0D0D] text-accent shadow-[0_0_60px_rgba(215,182,109,0.24)] transition",
                      voice.status === "error"
                        ? "border-danger/40 text-danger hover:border-danger"
                        : "border-accent/28 hover:border-accent/55"
                    )}
                    whileTap={{ scale: 0.94 }}
                    aria-label={
                      voice.status === "speaking" || voice.status === "processing"
                        ? "Interrupt voice reply"
                        : "Retry voice session"
                    }
                  >
                    <StatusIcon
                      status={voice.status}
                      className={cn(
                        "h-10 w-10 tablet:h-12 tablet:w-12",
                        (voice.status === "connecting" ||
                          voice.status === "processing" ||
                          voice.status === "reconnecting") &&
                          "animate-spin"
                      )}
                    />
                  </motion.button>
                </div>

                <div className="mt-1 flex min-h-8 items-center gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
                    <motion.span
                      key={bar}
                      className="w-1 rounded-full bg-gradient-to-b from-accent to-success"
                      animate={{
                        height: active ? 8 + ((voice.level * 42 + bar * 7) % 30) : 8,
                        opacity: active ? 0.45 + voice.level * 0.55 : 0.28,
                      }}
                      transition={{ duration: 0.16, delay: bar * 0.015 }}
                    />
                  ))}
                </div>

                <div className="mt-5 text-center">
                  <div className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs font-semibold text-[#F5F0E8]">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        voice.status === "error"
                          ? "bg-danger"
                          : voice.status === "speaking"
                            ? "bg-accent"
                            : "bg-success"
                      )}
                    />
                    {copy.label}
                    <span className="text-[#8D949E]">·</span>
                    <span className="text-[#B8BDC5]">{LANGUAGE_LABELS[language]}</span>
                    {predictionLabel ? (
                      <>
                        <span className="text-[#8D949E]">·</span>
                        <span className="max-w-[9rem] truncate text-success">
                          {predictionLabel}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "mx-auto mt-4 min-h-[84px] max-w-[480px] text-balance text-lg font-medium leading-8 text-[#F5F0E8] tablet:text-xl tablet:leading-9",
                      voice.error && "text-danger"
                    )}
                    aria-live="polite"
                  >
                    {subtitle}
                  </p>
                </div>

                <div className="mt-5 grid w-full grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={voice.retry}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 text-sm font-semibold text-[#F5F0E8] transition hover:border-accent/35 hover:bg-white/[0.08]"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={voice.status === "speaking" ? voice.interruptAssistant : onClose}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 text-sm font-semibold text-[#F5F0E8] transition hover:border-accent/35 hover:bg-white/[0.08]"
                  >
                    <VolumeX className="h-4 w-4" />
                    {voice.status === "speaking" ? "Interrupt" : "Close"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
            ) : null}
          </AnimatePresence>
        );
      }}
    </VideoSdkVoiceSessionController>
  );
}
