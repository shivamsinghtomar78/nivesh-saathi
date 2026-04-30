"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

type SmartChipsProps = {
  chips: string[];
  onSelect: (chip: string) => void;
  disabled?: boolean;
};

/**
 * P1: Smart follow-up chips that appear after bot responses.
 * Generated from conversation context to guide user's next question.
 */
export default function SmartChips({ chips, onSelect, disabled }: SmartChipsProps) {
  if (chips.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="mt-3 flex flex-wrap gap-2"
      >
        <div className="flex items-center gap-1 mr-1">
          <Sparkles className="h-3 w-3 text-accent" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Follow-up
          </span>
        </div>
        {chips.map((chip, i) => (
          <motion.button
            key={chip}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.08 }}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(chip)}
            className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10 hover:border-accent/30 disabled:opacity-50 disabled:pointer-events-none"
          >
            {chip}
          </motion.button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
