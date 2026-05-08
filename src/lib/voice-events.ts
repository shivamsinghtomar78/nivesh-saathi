import { z } from "zod";

export const voiceEventTypeSchema = z.enum([
  "session_started",
  "user_speech_start",
  "user_transcript_partial",
  "endpoint_candidate",
  "user_transcript_final",
  "assistant_delta",
  "assistant_speech_start",
  "assistant_interrupted",
  "session_reconnecting",
  "session_failed",
]);

export type VoiceEventType = z.infer<typeof voiceEventTypeSchema>;

export const voiceEventSchema = z.object({
  type: voiceEventTypeSchema,
  text: z.string().trim().optional(),
  threadId: z.string().trim().optional().nullable(),
  sessionId: z.string().trim().optional(),
  turnId: z.string().trim().optional(),
  confidence: z.number().min(0).max(1).optional(),
  latency: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type VoiceEvent = z.infer<typeof voiceEventSchema>;

export const LEGACY_VOICE_EVENT_ALIASES: Record<string, VoiceEventType> = {
  agent_error: "session_failed",
  agent_joined: "session_started",
  agent_turn_start: "assistant_speech_start",
  assistant_reply: "assistant_delta",
  user_transcript_interim: "user_transcript_partial",
  user_turn_start: "user_speech_start",
};

export function normalizeVoiceEventType(type: string | undefined | null): VoiceEventType | null {
  const normalized = String(type ?? "").trim();
  const legacy = LEGACY_VOICE_EVENT_ALIASES[normalized];
  if (legacy) return legacy;

  const parsed = voiceEventTypeSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}
