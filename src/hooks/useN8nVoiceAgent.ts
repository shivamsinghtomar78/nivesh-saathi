"use client";

/**
 * useN8nVoiceAgent
 *
 * React hook for communicating with the n8n-backed voice agent.
 * Replaces direct calls to /api/chat/stream and /api/voice/tts
 * with a single POST to /api/voice/n8n (which proxies to the
 * n8n webhook).
 *
 * The hook handles:
 *   - Sending text messages to the n8n agent
 *   - Playing returned audio (audioUrl from n8n)
 *   - Falling back to browser TTS when no audioUrl is returned
 *   - Conversation tracking via conversationId
 *   - Loading/error states
 */

import { useCallback, useRef, useState } from "react";

import { withCsrfHeaders } from "@/lib/csrf";
import type { SupportedLanguage } from "@/lib/languages";
import { LANGUAGE_META } from "@/lib/languages";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type N8nAgentStatus =
  | "idle"
  | "sending"
  | "speaking"
  | "error";

export interface N8nAgentResponse {
  conversationId: string;
  reply: string;
  audioUrl: string | null;
  timestamp: string;
}

export interface UseN8nVoiceAgentOptions {
  language: SupportedLanguage;
  onReply?: (response: N8nAgentResponse) => void;
  onError?: (error: string) => void;
  onSpeakingEnd?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useN8nVoiceAgent(options: UseN8nVoiceAgentOptions) {
  const { language, onReply, onError, onSpeakingEnd } = options;

  const [status, setStatus] = useState<N8nAgentStatus>("idle");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* ── Stop any ongoing audio/speech ────────────────────────────── */
  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }, []);

  /* ── Browser TTS fallback ─────────────────────────────────────── */
  const speakWithBrowser = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setStatus("idle");
        onSpeakingEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANGUAGE_META[language].speechSynthesis;
      utterance.rate = language === "en" ? 0.95 : 0.9;
      utterance.pitch = 1;
      utterance.onend = () => {
        setStatus("idle");
        onSpeakingEnd?.();
      };
      utterance.onerror = () => {
        setStatus("idle");
        onSpeakingEnd?.();
      };
      utteranceRef.current = utterance;
      setStatus("speaking");
      window.speechSynthesis.speak(utterance);
    },
    [language, onSpeakingEnd]
  );

  /* ── Play audio from URL or fall back to browser TTS ──────────── */
  const playAudio = useCallback(
    (audioUrl: string | null, fallbackText: string) => {
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        setStatus("speaking");
        audio.onended = () => {
          setStatus("idle");
          onSpeakingEnd?.();
        };
        audio.onerror = () => {
          // Fall back to browser TTS if audio fails
          speakWithBrowser(fallbackText);
        };
        audio.play().catch(() => {
          speakWithBrowser(fallbackText);
        });
        return;
      }
      // No audio URL — use browser TTS
      speakWithBrowser(fallbackText);
    },
    [onSpeakingEnd, speakWithBrowser]
  );

  /* ── Send message to n8n agent ────────────────────────────────── */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      setError(null);
      setStatus("sending");

      try {
        const response = await fetch("/api/voice/n8n", {
          method: "POST",
          headers: withCsrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            message: message.trim(),
            language,
            conversationId: conversationId ?? undefined,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          const errMsg =
            payload?.error || "Voice agent could not answer right now.";
          setError(errMsg);
          setStatus("error");
          onError?.(errMsg);
          return;
        }

        // Extract the n8n response
        const data = payload?.data ?? payload;
        const agentReply: N8nAgentResponse = {
          conversationId: data.conversationId ?? conversationId ?? "",
          reply: data.reply ?? "",
          audioUrl: data.audioUrl ?? null,
          timestamp: data.timestamp ?? new Date().toISOString(),
        };

        setReply(agentReply.reply);
        setConversationId(agentReply.conversationId);
        onReply?.(agentReply);

        // Play audio or speak with browser TTS
        playAudio(agentReply.audioUrl, agentReply.reply);
      } catch (caught) {
        const errMsg =
          caught instanceof Error
            ? caught.message
            : "Unable to reach voice agent.";
        setError(errMsg);
        setStatus("error");
        onError?.(errMsg);
      }
    },
    [conversationId, language, onError, onReply, playAudio]
  );

  /* ── Replay last response ─────────────────────────────────────── */
  const replayLastReply = useCallback(() => {
    if (reply) {
      speakWithBrowser(reply);
    }
  }, [reply, speakWithBrowser]);

  /* ── Reset conversation ───────────────────────────────────────── */
  const resetConversation = useCallback(() => {
    stopSpeaking();
    setConversationId(null);
    setReply("");
    setError(null);
    setStatus("idle");
  }, [stopSpeaking]);

  return {
    status,
    reply,
    error,
    conversationId,
    isSending: status === "sending",
    isSpeaking: status === "speaking",
    isIdle: status === "idle",
    sendMessage,
    stopSpeaking,
    replayLastReply,
    resetConversation,
  };
}
