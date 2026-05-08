"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import VapiVoiceSessionController from "@/components/voice/VapiVoiceSessionController";
import VideoSdkVoiceSessionController from "@/components/voice/VideoSdkVoiceSessionController";
import type {
  DuplexVoiceSessionState,
  VoiceSessionOptions,
} from "@/hooks/useDuplexVoiceSession";
import {
  chooseVoiceProvider,
  getRequestedVoiceProvider,
  isVapiClientConfigured,
  type VoiceProviderStatus,
} from "@/lib/voice-provider";

const idleVoice: DuplexVoiceSessionState = {
  assistantText: "",
  error: null,
  interimTranscript: "",
  interruptAssistant: () => undefined,
  lastUserTranscript: "",
  level: 0,
  provider: "videosdk",
  retry: async () => undefined,
  start: async () => undefined,
  status: "idle",
  stop: () => undefined,
};

async function fetchProviderStatus(): Promise<VoiceProviderStatus | null> {
  try {
    const response = await fetch("/api/voice/provider", { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as VoiceProviderStatus;
  } catch {
    return null;
  }
}

export default function UnifiedVoiceSessionController({
  children,
  options,
  open,
}: {
  children: (voice: DuplexVoiceSessionState) => ReactNode;
  options: VoiceSessionOptions;
  open: boolean;
}) {
  const requestedProvider = getRequestedVoiceProvider();
  const [resolvedAutoProvider, setResolvedAutoProvider] = useState<"videosdk" | "vapi" | null>(
    null
  );
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const activeProvider = requestedProvider === "auto" ? resolvedAutoProvider : requestedProvider;
  const onErrorRef = useRef(options.onError);
  const onProviderChangeRef = useRef(options.onProviderChange);
  const fallbackReasonRef = useRef(fallbackReason);

  useEffect(() => {
    onErrorRef.current = options.onError;
    onProviderChangeRef.current = options.onProviderChange;
  }, [options.onError, options.onProviderChange]);

  useEffect(() => {
    fallbackReasonRef.current = fallbackReason;
  }, [fallbackReason]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    if (requestedProvider === "auto") {
      void fetchProviderStatus().then((status) => {
        if (cancelled) return;
        const provider = chooseVoiceProvider(status);
        setResolvedAutoProvider(provider);
        onProviderChangeRef.current?.(
          provider,
          status?.providers[provider].reason ?? fallbackReasonRef.current ?? undefined
        );
      });
      return () => {
        cancelled = true;
      };
    }

    onProviderChangeRef.current?.(requestedProvider);
    return () => {
      cancelled = true;
    };
  }, [open, requestedProvider]);

  const fallbackToVapi = useCallback(
    (reason: string) => {
      setFallbackReason(reason);
      if (requestedProvider === "auto" && isVapiClientConfigured()) {
        setResolvedAutoProvider("vapi");
        onProviderChangeRef.current?.("vapi", reason);
      } else {
        onErrorRef.current?.(reason);
      }
    },
    [requestedProvider]
  );

  const connectingVoice = useMemo<DuplexVoiceSessionState>(
    () => ({
      ...idleVoice,
      error: fallbackReason,
      provider: activeProvider ?? "videosdk",
      status: open ? "connecting" : "idle",
    }),
    [activeProvider, fallbackReason, open]
  );

  if (!activeProvider) {
    return <>{children(connectingVoice)}</>;
  }

  if (activeProvider === "vapi") {
    return (
      <VapiVoiceSessionController open={open} options={options}>
        {children}
      </VapiVoiceSessionController>
    );
  }

  return (
    <VideoSdkVoiceSessionController
      fallbackOnStartError={requestedProvider === "auto"}
      onFallbackRequested={fallbackToVapi}
      open={open}
      options={options}
    >
      {children}
    </VideoSdkVoiceSessionController>
  );
}
