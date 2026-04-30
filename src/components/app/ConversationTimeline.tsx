"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  BookOpen,
  ExternalLink,
  MessageCircleMore,
  Mic,
  Pencil,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import StructuredAnswer from "@/components/shared/StructuredAnswer";
import SmartChips from "@/components/shared/SmartChips";
import { PortfolioSplitCard } from "@/components/chat/PortfolioSplitCard";
import { MessageReactions } from "@/components/chat/MessageReactions";
import { ShareButton } from "@/components/chat/ShareButton";
import { FDTimeMachineChart } from "@/components/chat/FDTimeMachineChart";
import { FDCalculatorCard } from "@/components/chat/FDCalculatorCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { withCsrfHeaders } from "@/lib/csrf";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/stores/conversationStore";

type ConversationTimelineProps = {
  messages: ConversationMessage[];
  onAction: (action: NonNullable<ConversationMessage["actions"]>[number]) => void;
  onRetry?: (message: ConversationMessage) => void;
  onEdit?: (message: ConversationMessage) => void;
  onChipSelect?: (chip: string) => void;
  /** Only show smart chips on the very last bot message */
  showSmartChips?: boolean;
  isTyping?: boolean;
};

function getActionIcon(action: NonNullable<ConversationMessage["actions"]>[number]) {
  if (action.action === "open_voice" || action.action === "switch_to_voice") {
    return Mic;
  }

  if (action.action === "open_compare" || action.action === "switch_to_chat" || action.action === "open_chat") {
    return MessageCircleMore;
  }

  if (action.action === "explain_term") {
    return BookOpen;
  }

  return ArrowUpRight;
}

export default function ConversationTimeline({
  messages,
  onAction,
  onRetry,
  onEdit,
  onChipSelect,
  showSmartChips = true,
  isTyping = false,
}: ConversationTimelineProps) {
  // Find the last bot message index for smart chip placement
  const lastBotIndex = [...messages].reverse().findIndex((m) => m.role === "bot");
  const lastBotMessageIdx = lastBotIndex >= 0 ? messages.length - 1 - lastBotIndex : -1;

  return (
    <div className="space-y-6" role="log" aria-live="polite" aria-relevant="additions text">
      <AnimatePresence initial={false}>
        {messages.map((message, msgIndex) => {
          const isUser = message.role === "user";
          const isLastBot = msgIndex === lastBotMessageIdx;

          return (
            <motion.article
              key={message.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={cn("group flex w-full", isUser ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[94%] rounded-3xl px-5 py-4 md:max-w-[85%] shadow-sm",
                  isUser
                    ? "bg-surface-dark text-on-dark rounded-tr-sm"
                    : "border border-outline bg-panel text-text-strong rounded-tl-sm",
                  message.failed && "border-danger/40 bg-danger/5"
                )}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="inline-flex items-center gap-2">
                    {!isUser && (
                      <div className="flex items-center gap-1.5 text-accent">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          Saathi
                        </span>
                      </div>
                    )}
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider",
                        isUser ? "text-on-dark/60" : "text-text-muted/70"
                      )}
                    >
                      {message.timestamp}
                    </span>
                    {/* Source indicator */}
                    {message.source && (
                      <span className={cn(
                        "text-[9px] font-medium uppercase tracking-wider",
                        isUser ? "text-on-dark/40" : "text-text-muted/40"
                      )}>
                        via {message.source}
                      </span>
                    )}
                  </div>
                  {/* Edit button for user messages */}
                  {isUser && !message.failed && onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(message)}
                      className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 p-1 rounded-md hover:bg-white/10 transition"
                      title="Edit message"
                    >
                      <Pencil className="h-3 w-3 text-on-dark/60" />
                    </button>
                  )}
                  {message.edited && (
                    <span className={cn(
                      "text-[9px] italic",
                      isUser ? "text-on-dark/40" : "text-text-muted/50"
                    )}>
                      edited
                    </span>
                  )}
                </div>

                <div className="mt-1">
                  {isUser ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-inherit md:text-[15px]">
                      {message.content}
                    </p>
                  ) : (
                    <div className="text-[15px] leading-relaxed">
                      <StructuredAnswer text={message.content} />
                    </div>
                  )}
                </div>

                {/* Failed message retry button */}
                {message.failed && onRetry && (
                  <div className="mt-3 pt-2 border-t border-danger/20">
                    <button
                      type="button"
                      onClick={() => onRetry(message)}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-danger hover:text-danger/80 transition"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Failed to send — Tap to retry
                    </button>
                  </div>
                )}

                {/* Rate cards with "Visit Bank" links */}
                {message.rateCards && message.rateCards.length > 0 && (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {message.rateCards.map((card) => (
                      <div
                        key={`${message.id}-${card.bankId ?? card.bankName}`}
                        className="rounded-2xl border border-outline bg-inner-panel p-4 transition-colors hover:border-accent/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-text-strong text-sm">
                              {card.bankName}
                            </p>
                            <p className="mt-1 text-[10px] uppercase font-semibold tracking-wider text-text-muted">
                              {card.tenor}
                            </p>
                          </div>
                          {card.badge && (
                            <Badge variant="outline" className="bg-white/50 text-[10px] uppercase tracking-wider">
                              {card.badge}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-xl font-bold text-accent">
                              {card.rate}
                            </p>
                            <p className="mt-0.5 text-xs font-medium text-text-strong">
                              {card.maturityPreview}
                            </p>
                          </div>
                        </div>
                        {card.safetyNote && (
                          <p className="mt-3 text-xs leading-relaxed text-text-muted pt-3 border-t border-outline/50">
                            {card.safetyNote}
                          </p>
                        )}
                        {/* Visit Bank link */}
                        {card.officialUrl && (
                          <a
                            href={card.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/70 transition pt-2 border-t border-outline/50 w-full"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Visit Bank →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Portfolio Split Diversification Card */}
                {message.portfolioSplit && (
                  <div className="mt-5">
                    <PortfolioSplitCard split={message.portfolioSplit} />
                  </div>
                )}

                {message.glossary && message.glossary.length > 0 && (
                  <div className="mt-5 grid gap-3">
                    {message.glossary.map((item) => (
                      <div
                        key={`${message.id}-${item.term}`}
                        className="rounded-2xl border border-outline bg-accent/5 p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-accent" />
                          <p className="text-sm font-semibold text-text-strong">
                            {item.term}
                          </p>
                        </div>
                        <p className="text-sm leading-relaxed text-text-muted">
                          {item.plain}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {message.actions && message.actions.length > 0 && (
                  <div className="mt-5 pt-3 flex flex-wrap gap-2 border-t border-outline/50">
                    {message.actions.map((action) => {
                      const Icon = getActionIcon(action);

                      return (
                        <Button
                          key={`${message.id}-${action.label}`}
                          variant={action.type === "primary" ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => onAction(action)}
                          className={cn(
                            "rounded-full",
                            action.type !== "primary" && "bg-white"
                          )}
                        >
                          <Icon className="mr-1.5 h-3.5 w-3.5" />
                          {action.label}
                        </Button>
                      );
                    })}
                  </div>
                )}

                {message.showTimeMachine && (
                  <div className="mt-5">
                    <FDTimeMachineChart />
                  </div>
                )}

                {message.showCalculator && (
                  <div className="mt-5">
                    <FDCalculatorCard />
                  </div>
                )}

                {/* Follow-up prompt chip */}
                {message.followUpPrompt && (
                  <div className="mt-4 pt-3 border-t border-outline/50">
                    <button
                      type="button"
                      onClick={() =>
                        onAction({
                          label: message.followUpPrompt!,
                          type: "secondary",
                          action: undefined,
                        })
                      }
                      className="text-left rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-xs font-medium text-accent transition hover:bg-accent/10 hover:border-accent/30"
                    >
                      💡 {message.followUpPrompt}
                    </button>
                  </div>
                )}

                {/* Message action bar (Reactions & Share) */}
                {!isUser && !message.failed && !isTyping && (
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-outline/50 group/msg">
                    <MessageReactions
                      messageId={message.id}
                      onFeedback={(id, reaction, reason) => {
                        fetch("/api/feedback", {
                          method: "POST",
                          headers: withCsrfHeaders({ "Content-Type": "application/json" }),
                          body: JSON.stringify({ messageId: id, reaction, reason }),
                        }).catch(() => {});
                      }}
                    />
                    <ShareButton messageText={message.content} rateCards={message.rateCards} />
                  </div>
                )}

                {/* Smart follow-up chips (only on last bot message) */}
                {isLastBot && showSmartChips && !isTyping && onChipSelect && (
                  <SmartChips
                    chips={message.suggestedChips ?? []}
                    onSelect={onChipSelect}
                    disabled={isTyping}
                  />
                )}
              </div>
            </motion.article>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
