"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAutoResize } from "@/hooks/useAutoResize";
import { LANGUAGE_LABELS } from "@/lib/copy";
import type { AppLanguage } from "@/lib/server/advisor-schemas";

const MAX_CHARS = 800;

type AdvisorComposerProps = {
  draft: string;
  disabled?: boolean;
  editing?: boolean;
  language: AppLanguage;
  mode: "chat" | "voice";
  prompts: string[];
  showPrompts: boolean;
  onCancelEdit: () => void;
  onChange: (value: string) => void;
  onOpenWizard: () => void;
  onPrompt: (prompt: string) => void;
  onSubmit: () => void;
  onVoiceMode: () => void;
};

export default function AdvisorComposer({
  draft,
  disabled = false,
  editing = false,
  language,
  mode,
  prompts,
  showPrompts,
  onCancelEdit,
  onChange,
  onOpenWizard,
  onPrompt,
  onSubmit,
  onVoiceMode,
}: AdvisorComposerProps) {
  const handleAutoResize = useAutoResize(128);

  return (
    <div className="border-t border-outline/60 bg-panel/90 p-3 backdrop-blur-xl md:p-4">
      <AnimatePresence>
        {showPrompts ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mb-3 flex flex-wrap gap-2"
          >
            <button
              type="button"
              onClick={onOpenWizard}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/15"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Best FD for me
            </button>
            {prompts.slice(0, 3).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onPrompt(prompt)}
                className="rounded-full border border-outline bg-input-bg px-3 py-1.5 text-xs font-medium text-text-muted transition hover:border-accent/30 hover:bg-panel hover:text-text-strong"
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
              className="font-medium text-text-muted transition hover:text-text-strong"
            >
              Cancel
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex items-end gap-2 rounded-[var(--radius-panel)] border border-outline bg-input-bg p-2 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        <textarea
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
              onSubmit();
            }
          }}
          placeholder={
            mode === "voice"
              ? "Type instead, or use the mic below..."
              : `Ask anything in ${LANGUAGE_LABELS[language]}...`
          }
          rows={1}
          maxLength={MAX_CHARS}
          className="max-h-32 min-h-[44px] w-full resize-none bg-transparent px-3 py-3 text-sm text-text-strong outline-none placeholder:text-text-muted custom-scrollbar"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={onVoiceMode}
          aria-label="Switch to voice mode"
          className="hidden h-11 w-11 rounded-[var(--radius-input)] text-text-muted hover:text-text-strong sm:inline-flex"
        >
          <Mic className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={onSubmit}
          disabled={disabled || !draft.trim()}
          aria-label="Send message"
          className="h-11 w-11 shrink-0 rounded-[var(--radius-input)]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-1.5 flex items-center justify-between px-1">
        <span className="hidden text-[10px] text-text-muted sm:inline">
          Enter to send. Shift+Enter for a new line.
        </span>
        <span className={draft.length > MAX_CHARS * 0.9 ? "text-[10px] font-medium text-danger" : "text-[10px] font-medium text-text-muted"}>
          {draft.length}/{MAX_CHARS}
        </span>
      </div>
    </div>
  );
}
