"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { withCsrfHeaders } from "@/lib/csrf";
import type {
  AdvisorResponse,
  AdvisorUi,
  AppLanguage,
  BankTypeFilter,
  ChatCompareSnapshotContext,
  ChatLadderPlanContext,
  ConversationalUiMode,
} from "@/lib/server/advisor-schemas";

type PredictionConfidence = "low" | "medium" | "high";

export type PredictivePrefetchClientResult = {
  turnId: string;
  sequence: number;
  prefetchKey: string;
  cacheHit: boolean;
  prediction: {
    transcript: string;
    normalizedTranscript: string;
    intent:
      | "compare_banks"
      | "calculate_returns"
      | "ask_rates"
      | "tax_question"
      | "senior_citizen"
      | "investment_duration"
      | "best_bank"
      | "safety"
      | "general";
    confidence: PredictionConfidence;
    confidenceScore: number;
    ui: AdvisorUi;
    entities: { bankId: string; bankName: string; bankCode: string }[];
    amount?: number;
    tenorMonths?: number;
    comparisonTenors: number[];
    seniorCitizen: boolean;
    bankType: BankTypeFilter;
  };
  ui: AdvisorUi;
  data: {
    filters: {
      amount: number;
      tenorMonths: number;
      seniorCitizen: boolean;
      bankType: BankTypeFilter;
      bankIds: string[];
    };
    rateCards: AdvisorResponse["rateCards"];
    portfolioSplit?: AdvisorResponse["portfolioSplit"];
    warnings: string[];
    sourceAsOf?: string;
  };
  advisorResponse?: AdvisorResponse;
};

type PredictivePrefetchStatus = "idle" | "loading" | "ready" | "error";

type UsePredictivePrefetchOptions = {
  language: AppLanguage;
  threadId?: string | null;
  shortlistBankIds?: string[];
  ladderPlan?: ChatLadderPlanContext | null;
  compareSnapshot?: ChatCompareSnapshotContext | null;
  enabled?: boolean;
  debounceMs?: number;
  onResult?: (result: PredictivePrefetchClientResult | null) => void;
};

const MIN_TRANSCRIPT_LENGTH = 2;

function makeTurnId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function shouldSkipTranscript(transcript: string) {
  const trimmed = transcript.trim();
  return trimmed.length < MIN_TRANSCRIPT_LENGTH;
}

export function usePredictivePrefetch(options: UsePredictivePrefetchOptions) {
  const [status, setStatus] = useState<PredictivePrefetchStatus>("idle");
  const [result, setResult] = useState<PredictivePrefetchClientResult | null>(null);
  const [predictedMode, setPredictedMode] =
    useState<ConversationalUiMode>("conversational");
  const [error, setError] = useState<Error | null>(null);

  const optionsRef = useRef(options);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceRef = useRef(0);
  const turnIdRef = useRef(makeTurnId());
  const latestResultRef = useRef<PredictivePrefetchClientResult | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const cancel = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus((current) => (current === "loading" ? "idle" : current));
  }, []);

  const reset = useCallback(() => {
    cancel();
    turnIdRef.current = makeTurnId();
    sequenceRef.current = 0;
    latestResultRef.current = null;
    setResult(null);
    setPredictedMode("conversational");
    setError(null);
    setStatus("idle");
    optionsRef.current.onResult?.(null);
  }, [cancel]);

  const runPrediction = useCallback(async (transcript: string) => {
    const currentOptions = optionsRef.current;
    if (currentOptions.enabled === false || shouldSkipTranscript(transcript)) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const sequence = sequenceRef.current + 1;
    sequenceRef.current = sequence;
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/prefetch", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          transcript,
          language: currentOptions.language,
          turnId: turnIdRef.current,
          sequence,
          threadId: currentOptions.threadId ?? undefined,
          shortlistBankIds: currentOptions.shortlistBankIds,
          ladderPlan: currentOptions.ladderPlan ?? undefined,
          compareSnapshot: currentOptions.compareSnapshot ?? undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ||
            `Predictive prefetch failed: ${response.status}`
        );
      }

      const body = (await response.json()) as PredictivePrefetchClientResult & {
        ok?: boolean;
      };

      if (sequence !== sequenceRef.current) {
        return;
      }

      latestResultRef.current = body;
      setResult(body);
      setPredictedMode(body.ui.mode);
      setStatus("ready");
      currentOptions.onResult?.(body);
    } catch (caught) {
      if ((caught as Error).name === "AbortError") {
        return;
      }
      const nextError = caught as Error;
      latestResultRef.current = null;
      setError(nextError);
      setStatus("error");
      currentOptions.onResult?.(null);
    }
  }, []);

  const schedulePrediction = useCallback(
    (transcript: string) => {
      const trimmed = transcript.trim();
      if (shouldSkipTranscript(trimmed)) {
        return;
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      const delay = optionsRef.current.debounceMs ?? 140;
      debounceRef.current = setTimeout(() => {
        void runPrediction(trimmed);
      }, delay);
    },
    [runPrediction]
  );

  useEffect(() => cancel, [cancel]);

  return {
    status,
    result,
    predictedMode,
    error,
    latestResultRef,
    schedulePrediction,
    cancel,
    reset,
  };
}
