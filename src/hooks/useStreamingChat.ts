"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdvisorResponse } from "@/lib/server/advisor-schemas";
import { withCsrfHeaders } from "@/lib/csrf";

export type StreamMeta = {
  threadId?: string;
  rateCards: AdvisorResponse["rateCards"];
  actions: AdvisorResponse["actions"];
  glossary: AdvisorResponse["glossary"];
  warnings: AdvisorResponse["warnings"];
  tone?: AdvisorResponse["tone"];
  suggestedChips: AdvisorResponse["suggestedChips"];
  modeSwitchSuggestion?: AdvisorResponse["modeSwitchSuggestion"];
  followUpPrompt?: string;
  portfolioSplit?: AdvisorResponse["portfolioSplit"];
  showCalculator?: boolean;
  showTimeMachine?: boolean;
};

type StreamEvent =
  | { type: "meta" } & StreamMeta
  | { type: "token"; token: string }
  | { type: "done" };

type UseStreamingChatOptions = {
  onMeta?: (meta: StreamMeta) => void;
  onToken?: (token: string, accumulated: string) => void;
  onDone?: (fullText: string, meta: StreamMeta | null) => void;
  onError?: (error: Error) => void;
};

/**
 * F-15: Hook for consuming the SSE streaming chat API.
 * 
 * Provides real-time token streaming with callbacks for:
 * - Metadata arrival (rate cards, glossary, etc.)
 * - Each text token as it arrives
 * - Completion signal with full assembled text
 */
export function useStreamingChat(options: UseStreamingChatOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [meta, setMeta] = useState<StreamMeta | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const accumulatedRef = useRef("");
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const sendStreamingMessage = useCallback(
    async (payload: {
      message: string;
      language: string;
      threadId?: string;
      amount?: number;
      tenorMonths?: number;
      seniorCitizen?: boolean;
      shortlistBankIds?: string[];
      mode?: "chat" | "voice";
    }) => {
      // Cancel any existing stream
      cancelStream();

      const controller = new AbortController();
      abortRef.current = controller;
      accumulatedRef.current = "";
      setStreamedText("");
      setMeta(null);
      setIsStreaming(true);

      let currentMeta: StreamMeta | null = null;

      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: withCsrfHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(
            (errorBody as { error?: string }).error ||
              `Stream request failed: ${response.status}`
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No readable stream available");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? ""; // Keep incomplete last part

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const jsonStr = trimmed.slice(6);
            try {
              const event = JSON.parse(jsonStr) as StreamEvent;

              if (event.type === "meta") {
                const metaData = Object.fromEntries(
                  Object.entries(event).filter(([key]) => key !== "type")
                );
                currentMeta = metaData as StreamMeta;
                setMeta(currentMeta);
                optionsRef.current.onMeta?.(currentMeta);
              } else if (event.type === "token") {
                accumulatedRef.current += event.token;
                setStreamedText(accumulatedRef.current);
                optionsRef.current.onToken?.(event.token, accumulatedRef.current);
              } else if (event.type === "done") {
                optionsRef.current.onDone?.(accumulatedRef.current, currentMeta);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          optionsRef.current.onError?.(error as Error);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [cancelStream]
  );

  return {
    sendStreamingMessage,
    cancelStream,
    isStreaming,
    streamedText,
    meta,
  };
}
