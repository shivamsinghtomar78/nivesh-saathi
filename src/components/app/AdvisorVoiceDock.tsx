"use client";

import { motion } from "framer-motion";
import { LoaderCircle, Mic, MicOff, RotateCcw, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VoiceVisualState = "idle" | "listening" | "processing" | "speaking" | "error";

type AdvisorVoiceDockProps = {
  acknowledgment?: string | null;
  autoSpeak: boolean;
  disabled?: boolean;
  error?: string | null;
  isListening: boolean;
  isSpeaking: boolean;
  spokenSummary?: string | null;
  state: VoiceVisualState;
  transcript?: string;
  onMicPress: () => void;
  onRetry: () => void;
  onToggleAutoSpeak: () => void;
};

function stateLabel(state: VoiceVisualState) {
  if (state === "listening") return "Listening";
  if (state === "processing") return "Checking FD options";
  if (state === "speaking") return "Speaking";
  if (state === "error") return "Needs attention";
  return "Tap to ask about rates";
}

function stateBody(props: AdvisorVoiceDockProps) {
  if (props.error) return props.error;
  if (props.state === "listening") return props.transcript || "Speak naturally. I will turn it into a question.";
  if (props.state === "processing") return props.acknowledgment || "Reading the latest FD context and preparing a concise answer.";
  if (props.state === "speaking") return props.spokenSummary || "Saathi is reading the short version. The detailed answer stays in the thread.";
  return "Use voice and chat in the same conversation. Tap once to speak.";
}

export default function AdvisorVoiceDock(props: AdvisorVoiceDockProps) {
  const { autoSpeak, disabled, error, isListening, isSpeaking, onMicPress, onRetry, onToggleAutoSpeak, state } = props;
  const label = stateLabel(state);
  const body = stateBody(props);
  const active = state === "listening" || state === "speaking" || state === "processing";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="border-t border-outline/60 bg-panel/95 px-4 py-4 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          {active ? (
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full",
                state === "speaking" ? "bg-highlight/20" : "bg-accent/15"
              )}
              animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.18, 0.55] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}

          {state === "processing" ? (
            <Button size="icon" variant="secondary" className="relative h-16 w-16 rounded-full" disabled>
              <LoaderCircle className="h-6 w-6 animate-spin" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant={isListening ? "primary" : "secondary"}
              onClick={onMicPress}
              disabled={disabled && !isSpeaking}
              aria-label={isSpeaking ? "Interrupt voice reply" : isListening ? "Stop listening" : "Start voice input"}
              className={cn(
                "relative h-16 w-16 rounded-full shadow-soft transition",
                isListening && "bg-danger text-white hover:bg-danger/90",
                isSpeaking && "bg-surface-dark text-on-dark"
              )}
            >
              {isSpeaking ? <VolumeX className="h-6 w-6" /> : isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-text-strong">{label}</p>
          <p className="mt-1 max-w-xl text-sm leading-6 text-text-muted">{body}</p>
        </div>

        {state === "listening" || state === "speaking" ? (
          <div className="wave-bars" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {error ? (
            <Button size="sm" variant="outline" className="rounded-full bg-input-bg" onClick={onRetry}>
              <RotateCcw className="h-3.5 w-3.5" />
              Try mic again
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full"
            onClick={onToggleAutoSpeak}
            aria-pressed={autoSpeak}
          >
            {autoSpeak ? <Volume2 className="h-3.5 w-3.5 text-accent" /> : <VolumeX className="h-3.5 w-3.5" />}
            Auto-speak {autoSpeak ? "on" : "off"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
