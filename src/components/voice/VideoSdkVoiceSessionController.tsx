"use client";

/* eslint-disable react-hooks/refs */

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioPlayer,
  MeetingProvider,
  createMicrophoneAudioTrack,
  useAgentParticipant,
  useMeeting,
  usePubSub,
} from "@videosdk.live/react-sdk";

import {
  classifyVideoSdkTranscriptType,
  mapVideoSdkAgentState,
  type DuplexVoiceStatus,
  type VideoSdkVoiceRoom,
  type VoiceHistoryMessage,
} from "@/hooks/useDuplexVoiceSession";
import { withCsrfHeaders } from "@/lib/csrf";
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

export type VideoSdkVoiceSessionState = {
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

type RuntimeControls = {
  interrupt: () => void;
  leave: () => void;
};

type VoiceRoomResponse = VideoSdkVoiceRoom & {
  ok?: boolean;
  error?: string;
  details?: unknown;
};

const VOICE_EVENTS_TOPIC = "NIVESH_VOICE_EVENTS";
const VOICE_CONTROL_TOPIC = "NIVESH_VOICE_CONTROL";

function stopTrack(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function shouldTreatParticipantAsAgent(participant: unknown, expectedId?: string) {
  const candidate = participant as {
    agentId?: string;
    displayName?: string;
    id?: string;
    isAgent?: boolean;
    metaData?: Record<string, unknown>;
  };

  return Boolean(
    candidate.isAgent ||
      candidate.agentId ||
      (expectedId && candidate.id === expectedId) ||
      candidate.metaData?.role === "ai-agent" ||
      candidate.displayName?.toLowerCase().includes("saathi")
  );
}

function VoiceLevelMeter({
  stream,
  onLevel,
}: {
  stream: MediaStream | null;
  onLevel: (level: number) => void;
}) {
  useEffect(() => {
    if (!stream || typeof window === "undefined") {
      onLevel(0);
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length;
      onLevel(Math.min(1, average / 120));
      frame = window.requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      void audioContext.close().catch(() => undefined);
      onLevel(0);
    };
  }, [onLevel, stream]);

  return null;
}

function AgentObserver({
  onAssistantReply,
  onInterimTranscript,
  onState,
  onUserTranscript,
  participantId,
}: {
  onAssistantReply: (text: string) => void;
  onInterimTranscript: (text: string) => void;
  onState: (status: DuplexVoiceStatus) => void;
  onUserTranscript: (text: string) => void;
  participantId: string;
}) {
  useAgentParticipant(participantId, {
    onAgentStateChanged: ({ state }: { state: string }) => {
      onState(mapVideoSdkAgentState(state));
    },
    onAgentTranscriptionReceived: ({
      segment,
    }: {
      segment: { text?: string; timestamp?: number; type?: string };
    }) => {
      const text = segment.text?.trim();
      if (!text) return;

      const transcriptType = classifyVideoSdkTranscriptType(segment.type);
      if (transcriptType === "interim") {
        onInterimTranscript(text);
        return;
      }
      if (transcriptType === "assistant") {
        onAssistantReply(text);
        return;
      }

      onUserTranscript(text);
    },
  });

  return <AudioPlayer participantId={participantId} type="audio" />;
}

function VideoSdkMeetingRuntime({
  controlsRef,
  onAssistantReply,
  onError,
  onInterimTranscript,
  onJoined,
  onLeft,
  onStatus,
  onThreadId,
  onUserTranscript,
  room,
}: {
  controlsRef: React.MutableRefObject<RuntimeControls | null>;
  onAssistantReply: (text: string) => void;
  onError: (message: string) => void;
  onInterimTranscript: (text: string) => void;
  onJoined: () => void;
  onLeft: () => void;
  onStatus: (status: DuplexVoiceStatus) => void;
  onThreadId?: (threadId: string) => void;
  onUserTranscript: (text: string) => void;
  room: VideoSdkVoiceRoom;
}) {
  const { publish } = usePubSub(VOICE_CONTROL_TOPIC);
  const { participants, join, leave, send } = useMeeting({
    onMeetingJoined: onJoined,
    onMeetingLeft: onLeft,
    onMeetingStateChanged: ({ state }: { state: string }) => {
      if (state === "CONNECTING") onStatus("connecting");
      if (state === "CONNECTED") onStatus("listening");
      if (state === "FAILED" || state === "DISCONNECTED") onStatus("reconnecting");
      if (state === "CLOSED") onStatus("idle");
    },
    onError: ({ message }: { message: string }) => {
      onError(message || "VideoSDK voice room failed.");
    },
    onAudioInputSilence: ({ state }: { state: "detected" | "resolved" }) => {
      if (state === "resolved") onStatus("listening");
    },
  });

  usePubSub(VOICE_EVENTS_TOPIC, {
    onMessageReceived: (message) => {
      try {
        const payload = JSON.parse(message.message) as {
          text?: string;
          threadId?: string;
          type?: string;
        };
        const text = payload.text?.trim();
        if (payload.threadId) onThreadId?.(payload.threadId);
        if (payload.type === "assistant_reply" && text) onAssistantReply(text);
        if (payload.type === "assistant_delta" && text) onAssistantReply(text);
        if (payload.type === "user_transcript_final" && text) onUserTranscript(text);
        if (payload.type === "user_transcript_interim" && text) onInterimTranscript(text);
        if (payload.type === "agent_error" && text) onError(text);
      } catch {
        // Ignore non-JSON messages on the shared room topic.
      }
    },
  });

  useEffect(() => {
    join();
    return () => {
      leave();
    };
  }, [join, leave]);

  useEffect(() => {
    controlsRef.current = {
      interrupt: () => {
        void publish(
          JSON.stringify({ type: "interrupt", at: Date.now() }),
          { persist: false },
          { roomId: room.roomId }
        ).catch(() => undefined);
        void send(JSON.stringify({ type: "voice_interrupt", at: Date.now() }), {
          reliability: "RELIABLE",
        }).catch(() => undefined);
      },
      leave,
    };

    return () => {
      controlsRef.current = null;
    };
  }, [controlsRef, leave, publish, room.roomId, send]);

  const agentParticipantIds = useMemo(
    () =>
      Array.from(participants.values())
        .filter((participant) =>
          shouldTreatParticipantAsAgent(participant, room.agentParticipantId)
        )
        .map((participant) => participant.id),
    [participants, room.agentParticipantId]
  );

  return (
    <>
      {agentParticipantIds.map((participantId) => (
        <AgentObserver
          key={participantId}
          participantId={participantId}
          onAssistantReply={onAssistantReply}
          onInterimTranscript={onInterimTranscript}
          onState={onStatus}
          onUserTranscript={onUserTranscript}
        />
      ))}
    </>
  );
}

export default function VideoSdkVoiceSessionController({
  children,
  options,
  open,
}: {
  children: (voice: VideoSdkVoiceSessionState) => ReactNode;
  options: VoiceSessionOptions;
  open: boolean;
}) {
  const [assistantText, setAssistantText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lastUserTranscript, setLastUserTranscript] = useState("");
  const [level, setLevel] = useState(0);
  const [room, setRoom] = useState<VideoSdkVoiceRoom | null>(null);
  const [status, setStatus] = useState<DuplexVoiceStatus>("idle");
  const [audioTrack, setAudioTrack] = useState<MediaStream | null>(null);

  const controlsRef = useRef<RuntimeControls | null>(null);
  const audioTrackRef = useRef<MediaStream | null>(null);
  const lastAssistantTextRef = useRef("");
  const lastUserTranscriptRef = useRef("");
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const stop = useCallback(() => {
    controlsRef.current?.leave();
    controlsRef.current = null;
    stopTrack(audioTrackRef.current);
    audioTrackRef.current = null;
    setAudioTrack(null);
    setRoom(null);
    setStatus("idle");
    setError(null);
    setInterimTranscript("");
    setLevel(0);
  }, []);

  const setVoiceError = useCallback((message: string) => {
    setError(message);
    setStatus("error");
    optionsRef.current.onError?.(message);
  }, []);

  const handleUserTranscript = useCallback((transcript: string) => {
    const normalized = transcript.replace(/\s+/g, " ").trim();
    if (!normalized || normalized === lastUserTranscriptRef.current) return;

    lastUserTranscriptRef.current = normalized;
    setLastUserTranscript(normalized);
    setInterimTranscript("");
    optionsRef.current.onUserTranscript?.(normalized);
  }, []);

  const handleAssistantReply = useCallback((reply: string) => {
    const normalized = reply.replace(/\s+/g, " ").trim();
    if (!normalized || normalized === lastAssistantTextRef.current) return;

    lastAssistantTextRef.current = normalized;
    setAssistantText(normalized);
    optionsRef.current.onAssistantReply?.(normalized);
  }, []);

  const handleInterimTranscript = useCallback((transcript: string) => {
    const normalized = transcript.replace(/\s+/g, " ").trim();
    setInterimTranscript(normalized);
    optionsRef.current.onInterimTranscript?.(normalized);
  }, []);

  const start = useCallback(async () => {
    stop();
    setStatus("connecting");
    setError(null);
    setAssistantText("");
    setInterimTranscript("");
    lastAssistantTextRef.current = "";
    lastUserTranscriptRef.current = "";

    try {
      const nextAudioTrack = await createMicrophoneAudioTrack({
        encoderConfig: "speech_standard",
        noiseConfig: {
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      });
      audioTrackRef.current = nextAudioTrack;
      setAudioTrack(nextAudioTrack);

      const predictiveContext = optionsRef.current.getPredictiveContext?.() ?? null;
      const response = await fetch("/api/voice/room", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          language: optionsRef.current.language,
          threadId: optionsRef.current.threadId ?? undefined,
          conversationId: optionsRef.current.threadId ?? undefined,
          recentMessages: optionsRef.current.recentMessages ?? [],
          prefetchKey: predictiveContext?.prefetchKey,
          uiIntentHint: predictiveContext?.uiIntentHint,
        }),
      });
      const payload = (await response.json()) as VoiceRoomResponse;

      if (!response.ok || !payload.roomId || !payload.token || !payload.participantId) {
        throw new Error(payload.error || "Unable to create a VideoSDK voice room.");
      }

      setRoom(payload);
    } catch (caught) {
      stopTrack(audioTrackRef.current);
      audioTrackRef.current = null;
      setAudioTrack(null);
      setRoom(null);
      setVoiceError(
        caught instanceof DOMException && caught.name === "NotAllowedError"
          ? "Microphone blocked. Allow mic access in your browser and try again."
          : caught instanceof Error
            ? caught.message
            : "Unable to start VideoSDK voice."
      );
    }
  }, [setVoiceError, stop]);

  const interruptAssistant = useCallback(() => {
    controlsRef.current?.interrupt();
    setStatus("interrupted");
    window.setTimeout(() => {
      setStatus((current) => (current === "interrupted" ? "listening" : current));
    }, 420);
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
    // Open controls the room lifecycle; options changes should not restart mid-call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const voice = useMemo<VideoSdkVoiceSessionState>(
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

  return (
    <>
      <VoiceLevelMeter stream={audioTrack} onLevel={setLevel} />
      {room && audioTrack ? (
        <MeetingProvider
          key={room.roomId}
          config={{
            meetingId: room.roomId,
            participantId: room.participantId,
            name: "Nivesh Saathi User",
            micEnabled: true,
            webcamEnabled: false,
            customMicrophoneAudioTrack: audioTrack,
            debugMode: process.env.NODE_ENV !== "production",
            mode: "SEND_AND_RECV",
            metaData: {
              role: "customer",
              app: "nivesh-saathi",
              voiceSessionId: room.voiceSessionId,
            },
          }}
          token={room.token}
        >
          <VideoSdkMeetingRuntime
            controlsRef={controlsRef}
            room={room}
            onAssistantReply={handleAssistantReply}
            onError={setVoiceError}
            onInterimTranscript={handleInterimTranscript}
            onJoined={() => setStatus("listening")}
            onLeft={() => setStatus("idle")}
            onStatus={setStatus}
            onThreadId={options.onThreadId}
            onUserTranscript={handleUserTranscript}
          />
          {children(voice)}
        </MeetingProvider>
      ) : (
        children(voice)
      )}
    </>
  );
}
