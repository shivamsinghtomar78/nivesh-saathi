"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LoaderCircle, Mic, MicOff, RotateCcw, Send, VolumeX } from "lucide-react";

import { useAutoResize } from "@/hooks/useAutoResize";
import { LANGUAGE_LABELS } from "@/lib/copy";
import type { AppLanguage } from "@/lib/server/advisor-schemas";
import { cn } from "@/lib/utils";

const MAX_CHARS = 800;

type VoiceComposerState = "idle" | "listening" | "processing" | "speaking" | "error";

type AdvisorComposerProps = {
  draft: string;
  disabled?: boolean;
  editing?: boolean;
  language: AppLanguage;
  prompts: string[];
  showPrompts: boolean;
  spokenSummary?: string | null;
  voiceAcknowledgment?: string | null;
  voiceDisabled?: boolean;
  voiceError?: string | null;
  voiceState: VoiceComposerState;
  voiceTranscript?: string;
  onCancelEdit: () => void;
  onChange: (value: string) => void;
  onMicPress: () => void;
  onPrompt: (prompt: string) => void;
  onSubmit: () => void;
  onVoiceRetry: () => void;
};

function voiceStatusTitle(state: VoiceComposerState) {
  if (state === "listening") return "Listening";
  if (state === "processing") return "Checking FD options";
  if (state === "speaking") return "Speaking";
  if (state === "error") return "Voice needs attention";
  return null;
}

function voiceStatusBody({
  acknowledgment,
  error,
  spokenSummary,
  state,
  transcript,
}: {
  acknowledgment?: string | null;
  error?: string | null;
  spokenSummary?: string | null;
  state: VoiceComposerState;
  transcript?: string;
}) {
  if (error) return error;
  if (state === "listening") {
    return transcript || "Speak naturally. Your question will appear in this same thread.";
  }
  if (state === "processing") {
    return acknowledgment || "Preparing a concise voice reply and detailed chat answer.";
  }
  if (state === "speaking") {
    return spokenSummary || "Reading the short answer. Tap the mic to interrupt.";
  }
  return "";
}

function micLabel(state: VoiceComposerState) {
  if (state === "listening") return "Stop listening";
  if (state === "processing") return "Voice is processing";
  if (state === "speaking") return "Interrupt voice reply";
  if (state === "error") return "Try voice input again";
  return "Start voice input";
}

export default function AdvisorComposer({
  draft,
  disabled = false,
  editing = false,
  language,
  prompts,
  showPrompts,
  spokenSummary,
  voiceAcknowledgment,
  voiceDisabled = false,
  voiceError,
  voiceState,
  voiceTranscript,
  onCancelEdit,
  onChange,
  onMicPress,
  onPrompt,
  onSubmit,
  onVoiceRetry,
}: AdvisorComposerProps) {
  const handleAutoResize = useAutoResize(128);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const statusTitle = voiceError ? "Voice needs attention" : voiceStatusTitle(voiceState);
  const statusBody = voiceStatusBody({
    acknowledgment: voiceAcknowledgment,
    error: voiceError,
    spokenSummary,
    state: voiceState,
    transcript: voiceTranscript,
  });
  const showVoiceStatus = voiceState !== "idle" || Boolean(voiceError);
  const micIsActive = voiceState === "listening" || voiceState === "speaking";
  const micIsDisabled = voiceDisabled && voiceState !== "speaking" && voiceState !== "listening";
  const canSend = !disabled && draft.trim().length > 0;

  useEffect(() => {
    if (!textareaRef.current || draft.length > 0) return;
    textareaRef.current.style.height = "46px";
  }, [draft]);

  return (
    <div className="sticky bottom-0 z-20 shrink-0 bg-[linear-gradient(180deg,rgba(10,10,10,0),rgba(10,10,10,0.94)_28%,#0A0A0A_100%)] px-4 pb-3 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[860px]">
        <AnimatePresence>
          {showPrompts ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mb-3 flex flex-wrap gap-2"
            >
              {prompts.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onPrompt(prompt)}
                  className="rounded-full border border-[#1F1F1F] bg-[#121212]/82 px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition hover:border-accent/30 hover:bg-[#161616] hover:text-[#EAEAEA]"
                >
                  {prompt}
                </button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {editing ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 flex items-center gap-3 px-1 text-xs"
            >
              <span className="font-semibold text-accent">Editing message</span>
              <button
                type="button"
                onClick={onCancelEdit}
                className="font-medium text-[#9CA3AF] transition hover:text-[#EAEAEA]"
              >
                Cancel
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="rounded-[26px] border border-[#1F1F1F] bg-[#121212]/96 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition focus-within:border-accent/40 focus-within:shadow-[0_0_0_1px_rgba(215,182,109,0.12),0_24px_70px_rgba(0,0,0,0.45)]">
          <div className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-end gap-2">
            <button
              type="button"
              onClick={voiceState === "error" ? onVoiceRetry : onMicPress}
              disabled={micIsDisabled}
              aria-label={micLabel(voiceState)}
              className={cn(
                "relative flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-visible rounded-[18px] border border-transparent text-[#9CA3AF] transition hover:border-[#2A2A2A] hover:bg-white/[0.055] hover:text-[#EAEAEA] disabled:cursor-not-allowed disabled:opacity-45",
                voiceState === "listening" && "border-accent/35 bg-accent-soft text-accent",
                voiceState === "speaking" && "border-accent/30 bg-[#1A1A1A] text-[#EAEAEA]",
                voiceState === "error" && "text-danger hover:text-danger"
              )}
            >
              {micIsActive ? (
                <span
                  className="absolute inset-0 -z-10 rounded-[18px] bg-accent/12 blur-md"
                  aria-hidden="true"
                />
              ) : null}
              {voiceState === "processing" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : voiceState === "listening" ? (
                <MicOff className="h-4 w-4" />
              ) : voiceState === "speaking" ? (
                <VolumeX className="h-4 w-4" />
              ) : voiceState === "error" ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => {
                if (event.target.value.length <= MAX_CHARS) {
                  onChange(event.target.value);
                }
              }}
              onInput={handleAutoResize}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (canSend) onSubmit();
                }
              }}
              placeholder={`Ask or speak in ${LANGUAGE_LABELS[language]}...`}
              rows={1}
              maxLength={MAX_CHARS}
              className="max-h-32 min-h-[46px] w-full resize-none bg-transparent px-1 py-3 text-[15px] leading-6 text-[#EAEAEA] outline-none placeholder:text-[#777F8C] custom-scrollbar"
            />

            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSend}
              aria-label="Send message"
              className={cn(
                "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[18px] border transition disabled:cursor-not-allowed",
                canSend
                  ? "border-accent/30 bg-accent text-on-accent shadow-[0_14px_34px_rgba(215,182,109,0.18)] hover:bg-accent-hover"
                  : "border-[#1F1F1F] bg-[#161616] text-[#5F6670]"
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showVoiceStatus ? (
            <motion.div
              initial={{ opacity: 0, y: 6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 4, height: 0 }}
              role="status"
              aria-live="polite"
              className="overflow-hidden"
            >
              <div
                className={cn(
                  "mt-2 flex items-start justify-between gap-3 rounded-[18px] border px-3 py-2",
                  voiceState === "error"
                    ? "border-danger/25 bg-danger/10"
                    : "border-accent/18 bg-accent/[0.055]"
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {voiceState === "listening" || voiceState === "speaking" ? (
                      <span className="wave-bars" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </span>
                    ) : voiceState === "processing" ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin text-accent" />
                    ) : null}
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        voiceState === "error" ? "text-danger" : "text-[#EAEAEA]"
                      )}
                    >
                      {statusTitle}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#9CA3AF]">
                    {statusBody}
                  </p>
                </div>

                {voiceState === "error" ? (
                  <button
                    type="button"
                    onClick={onVoiceRetry}
                    className="shrink-0 rounded-full border border-[#1F1F1F] bg-[#121212] px-3 py-1 text-xs font-semibold text-[#EAEAEA] transition hover:border-accent/30"
                  >
                    Retry
                  </button>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mt-1.5 flex items-center justify-between px-1">
          <span className="hidden text-[10px] text-[#777F8C] sm:inline">
            Enter to send. Shift+Enter for a new line.
          </span>
          <span
            className={
              draft.length > MAX_CHARS * 0.9
                ? "text-[10px] font-medium text-danger"
                : "text-[10px] font-medium text-[#777F8C]"
            }
          >
            {draft.length}/{MAX_CHARS}
          </span>
        </div>
      </div>
    </div>
  );
}
