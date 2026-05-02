"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackReason = "wrong_info" | "not_helpful" | "off_topic" | "outdated";

const FEEDBACK_REASONS: { id: FeedbackReason; label: string }[] = [
  { id: "wrong_info", label: "Wrong info" },
  { id: "not_helpful", label: "Not helpful" },
  { id: "off_topic", label: "Off-topic" },
  { id: "outdated", label: "Outdated rates" },
];

interface MessageReactionsProps {
  messageId: string;
  onFeedback?: (messageId: string, reaction: "up" | "down", reason?: FeedbackReason) => void;
  className?: string;
}

/**
 * F-16: Message Reactions & Feedback Loop
 * 
 * Renders hover-revealed 👍/👎 micro-reaction buttons on assistant messages.
 * Thumbs down opens a 1-tap reason picker for qualitative feedback.
 * Data is sent to Firestore for future model improvement.
 */
export function MessageReactions({ messageId, onFeedback, className }: MessageReactionsProps) {
  const [reaction, setReaction] = useState<"up" | "down" | null>(null);
  const [showReasons, setShowReasons] = useState(false);
  const [selectedReason, setSelectedReason] = useState<FeedbackReason | null>(null);

  const handleThumbsUp = useCallback(() => {
    setReaction("up");
    setShowReasons(false);
    onFeedback?.(messageId, "up");
  }, [messageId, onFeedback]);

  const handleThumbsDown = useCallback(() => {
    setReaction("down");
    setShowReasons(true);
  }, []);

  const handleReasonSelect = useCallback(
    (reason: FeedbackReason) => {
      setSelectedReason(reason);
      setShowReasons(false);
      onFeedback?.(messageId, "down", reason);
    },
    [messageId, onFeedback]
  );

  if (reaction === "up") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("flex items-center gap-1.5 text-[11px] text-accent font-medium", className)}
      >
        <ThumbsUp className="h-3 w-3 fill-accent" />
        Thanks!
      </motion.div>
    );
  }

  if (reaction === "down" && selectedReason) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("flex items-center gap-1.5 text-[11px] text-text-muted font-medium", className)}
      >
        <ThumbsDown className="h-3 w-3" />
        Feedback recorded
      </motion.div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence>
        {showReasons && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="absolute bottom-full mb-2 left-0 z-20 bg-panel border border-outline rounded-[var(--radius-panel)] p-2 shadow-lg min-w-[180px]"
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                What went wrong?
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowReasons(false);
                  setReaction(null);
                }}
                className="p-0.5 rounded-md hover:bg-inner-panel transition"
              >
                <X className="h-3 w-3 text-text-muted" />
              </button>
            </div>
            <div className="grid gap-1">
              {FEEDBACK_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => handleReasonSelect(reason.id)}
                  className="text-left px-3 py-1.5 rounded-lg text-xs font-medium text-text-strong hover:bg-inner-panel transition-colors"
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 hover:!opacity-100 focus-within:!opacity-100 transition-opacity duration-200">
        <button
          type="button"
          onClick={handleThumbsUp}
          className="p-1.5 rounded-lg hover:bg-accent/10 text-text-muted hover:text-accent transition-all"
          title="Helpful"
          aria-label="Mark response as helpful"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleThumbsDown}
          className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-all"
          title="Not helpful"
          aria-label="Mark response as not helpful"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
