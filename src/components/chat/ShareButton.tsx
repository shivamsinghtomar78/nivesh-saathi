"use client";

import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Share2, Copy, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { withCsrfHeaders } from "@/lib/csrf";

interface ShareButtonProps {
  messageText: string;
  rateCards?: { bankName?: string; rate?: string }[];
}

/**
 * INV-05 + F-17: Share Chat / WhatsApp Rate Share
 * 
 * Renders a share button that opens native Web Share API or
 * falls back to copy-to-clipboard. Includes WhatsApp deep link.
 */
export function ShareButton({ messageText, rateCards }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  const shareText = useCallback(() => {
    let text = messageText;
    if (rateCards && rateCards.length > 0) {
      text += "\n\nTop FD Rates:\n";
      rateCards.forEach((card) => {
        text += `- ${card.bankName}: ${card.rate}\n`;
      });
    }
    text += "\nShared via Nivesh Saathi";
    return text;
  }, [messageText, rateCards]);

  const createShareLink = useCallback(async () => {
    setCreatingLink(true);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ messageText, rateCards: rateCards ?? [] }),
      });
      const payload = (await response.json()) as {
        id?: string;
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Unable to create share link");
      }

      return new URL(payload.url, window.location.origin).toString();
    } finally {
      setCreatingLink(false);
    }
  }, [messageText, rateCards]);

  const handleNativeShare = useCallback(async () => {
    const text = shareText();
    if (navigator.share) {
      try {
        const url = await createShareLink().catch(() => window.location.origin);
        await navigator.share({
          title: "Nivesh Saathi FD Recommendation",
          text,
          url,
        });
        setShowMenu(false);
      } catch {
        // User cancelled
      }
    }
  }, [createShareLink, shareText]);

  const handleShareLink = useCallback(async () => {
    try {
      const url = await createShareLink();
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied");
      setShowMenu(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create share link");
    }
  }, [createShareLink]);

  const handleCopy = useCallback(async () => {
    const text = shareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
      setShowMenu(false);
    } catch {
      toast.error("Failed to copy");
    }
  }, [shareText]);

  const handleWhatsApp = useCallback(() => {
    const text = shareText();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
    setShowMenu(false);
  }, [shareText]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className="p-1.5 rounded-lg hover:bg-accent/10 text-text-muted hover:text-accent transition-all opacity-0 group-hover/msg:opacity-100 hover:!opacity-100"
        title="Share"
        aria-label="Share this message"
      >
        <Share2 className="h-3.5 w-3.5" />
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="absolute bottom-full mb-2 right-0 z-30 bg-panel border border-outline rounded-[var(--radius-panel)] p-2 shadow-lg min-w-[160px]"
          >
            {typeof navigator !== "undefined" && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-strong hover:bg-inner-panel transition"
              >
                <Share2 className="h-3.5 w-3.5 text-accent" />
                Share...
              </button>
            )}
            <button
              type="button"
              onClick={handleShareLink}
              disabled={creatingLink}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-strong hover:bg-inner-panel disabled:opacity-60 transition"
            >
              <Link2 className="h-3.5 w-3.5 text-accent" />
              {creatingLink ? "Creating..." : "Share link"}
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-strong hover:bg-inner-panel transition"
            >
              <MessageCircle className="h-3.5 w-3.5 text-green-500" />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-strong hover:bg-inner-panel transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5 text-text-muted" />}
              {copied ? "Copied!" : "Copy text"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
