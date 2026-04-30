"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Shield, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ConversationMessage } from "@/stores/conversationStore";

type VoiceCompanionCardProps = {
  message: ConversationMessage | null;
};

/**
 * P1: Visual companion card shown during voice mode.
 * Displays rate cards and key data visually while the voice agent speaks,
 * solving the limitation of voice-only data presentation.
 */
export default function VoiceCompanionCard({ message }: VoiceCompanionCardProps) {
  if (!message || !message.rateCards || message.rateCards.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="rounded-2xl border border-outline bg-panel-glass p-4 shadow-sm backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-accent" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Live Comparison
          </span>
          <div className="flex-1" />
          <Badge variant="accent" className="bg-accent/10 text-accent text-[9px]">
            {message.rateCards.length} rates
          </Badge>
        </div>

        <div className="grid gap-2">
          {message.rateCards.slice(0, 3).map((card, i) => (
            <motion.div
              key={card.bankId ?? `card-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 * i }}
              className="flex items-center justify-between rounded-xl border border-outline bg-inner-panel px-3 py-2.5 transition hover:border-accent/20"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-strong truncate">
                  {card.bankName}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {card.tenor}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className="text-lg font-bold text-accent">{card.rate}</p>
                  {card.maturityPreview && (
                    <p className="text-[10px] text-text-muted">{card.maturityPreview}</p>
                  )}
                </div>
                {card.badge && (
                  <Badge variant="outline" className="text-[9px] bg-white/50">
                    {card.badge}
                  </Badge>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {message.rateCards.some((c) => c.safetyNote) && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-accent/5 px-3 py-2">
            <Shield className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
            <p className="text-[11px] text-text-muted leading-relaxed">
              {message.rateCards.find((c) => c.safetyNote)?.safetyNote}
            </p>
          </div>
        )}

        {message.rateCards[0]?.officialUrl && (
          <a
            href={message.rateCards[0].officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/70 transition"
          >
            <ExternalLink className="h-3 w-3" />
            View details
          </a>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
