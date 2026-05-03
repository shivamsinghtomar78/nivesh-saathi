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
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        <div className="mr-1 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-accent/80" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7B8490]">
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
            className="rounded-full border border-[#1F1F1F] bg-[#121212] px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition hover:border-accent/25 hover:bg-[#161616] hover:text-[#EAEAEA] disabled:pointer-events-none disabled:opacity-50"
          >
            {chip}
          </motion.button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
