"use client";

import { useRouter } from "next/navigation";
import { MessageCircleMore, Mic, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import type { ConversationMode } from "@/lib/server/advisor-schemas";

type ModeSwitchBannerProps = {
  targetMode: ConversationMode;
  reason: string;
  onDismiss: () => void;
};

/**
 * P2: Automatic mode-switch suggestion banner.
 * Appears when the system detects the response is better suited for another modality.
 */
export default function ModeSwitchBanner({ targetMode, reason, onDismiss }: ModeSwitchBannerProps) {
  const router = useRouter();
  const Icon = targetMode === "voice" ? Mic : MessageCircleMore;
  const label = targetMode === "voice" ? "Switch to Voice" : "Switch to Chat";
  const route = targetMode === "voice" ? ROUTES.VOICE : ROUTES.CHAT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      className="mx-4 mb-3 rounded-2xl border border-accent/20 bg-accent/5 p-4 flex items-start gap-3"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-strong leading-relaxed">{reason}</p>
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full text-xs"
            onClick={() => router.push(route)}
          >
            <Icon className="mr-1.5 h-3 w-3" />
            {label}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-text-muted hover:text-text-strong transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}
