"use client";

import type { AdvisorUi, AppLanguage } from "@/lib/server/advisor-schemas";
import type { VoiceProvider } from "@/lib/voice-provider";

export type DuplexVoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "interrupted"
  | "reconnecting"
  | "error";

export type VoiceHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type VoiceSessionOptions = {
  language: AppLanguage;
  threadId?: string | null;
  recentMessages?: VoiceHistoryMessage[];
  onThreadId?: (threadId: string) => void;
  onUserTranscript?: (transcript: string) => void;
  onInterimTranscript?: (transcript: string) => void;
  onAssistantReply?: (reply: string) => void;
  onError?: (message: string) => void;
  onProviderChange?: (provider: Exclude<VoiceProvider, "auto">, reason?: string) => void;
  getPredictiveContext?: () =>
    | {
        prefetchKey?: string;
        uiIntentHint?: AdvisorUi;
      }
    | null;
};

export type DuplexVoiceSessionState = {
  assistantText: string;
  error: string | null;
  interimTranscript: string;
  interruptAssistant: () => void;
  lastUserTranscript: string;
  level: number;
  provider?: Exclude<VoiceProvider, "auto">;
  retry: () => void;
  start: () => Promise<void>;
  status: DuplexVoiceStatus;
  stop: () => void;
};

export type VideoSdkVoiceRoom = {
  roomId: string;
  token: string;
  participantId: string;
  agentParticipantId?: string;
  voiceSessionId?: string;
  expiresIn?: number;
  worker?: {
    ok: boolean;
    status: "dispatched" | "not_configured" | "failed";
    error?: string;
  };
  meta?: {
    transport: "videosdk";
    agentName: string;
  };
};

export type VideoSdkAgentTranscriptType =
  | "user"
  | "assistant"
  | "interim"
  | "final"
  | "unknown";

export function mapVideoSdkAgentState(state?: string | null): DuplexVoiceStatus {
  const normalized = String(state ?? "").toLowerCase();

  if (normalized.includes("speaking")) return "speaking";
  if (normalized.includes("thinking") || normalized.includes("processing")) {
    return "processing";
  }
  if (normalized.includes("listening")) return "listening";
  if (normalized.includes("idle")) return "listening";

  return "listening";
}

export function classifyVideoSdkTranscriptType(
  type?: string | null
): VideoSdkAgentTranscriptType {
  const normalized = String(type ?? "").toLowerCase();

  if (normalized.includes("interim") || normalized.includes("partial")) {
    return "interim";
  }
  if (normalized.includes("final")) return "final";
  if (
    normalized.includes("assistant") ||
    normalized.includes("agent") ||
    normalized.includes("response")
  ) {
    return "assistant";
  }
  if (
    normalized.includes("user") ||
    normalized.includes("input") ||
    normalized.includes("transcript")
  ) {
    return "user";
  }

  return "unknown";
}
