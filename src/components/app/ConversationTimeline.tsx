"use client";

import { AnimatePresence, motion } from "framer-motion";
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

import { FDCalculatorCard } from "@/components/chat/FDCalculatorCard";
import { FDTimeMachineChart } from "@/components/chat/FDTimeMachineChart";
import { MessageReactions } from "@/components/chat/MessageReactions";
import { PortfolioSplitCard } from "@/components/chat/PortfolioSplitCard";
import { ShareButton } from "@/components/chat/ShareButton";
import SmartChips from "@/components/shared/SmartChips";
import StructuredAnswer from "@/components/shared/StructuredAnswer";
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
  showSmartChips?: boolean;
  isTyping?: boolean;
  richContent?: "inline" | "hidden";
};

function getActionIcon(action: NonNullable<ConversationMessage["actions"]>[number]) {
  if (action.action === "open_voice" || action.action === "switch_to_voice") {
    return Mic;
  }

  if (
    action.action === "open_compare" ||
    action.action === "switch_to_chat" ||
    action.action === "open_chat"
  ) {
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
  richContent = "inline",
}: ConversationTimelineProps) {
  const lastBotIndex = [...messages].reverse().findIndex((message) => message.role === "bot");
  const lastBotMessageIndex = lastBotIndex >= 0 ? messages.length - 1 - lastBotIndex : -1;
  const showInlineRichContent = richContent === "inline";

  return (
    <div className="space-y-5" role="log" aria-live="polite" aria-relevant="additions text">
      <AnimatePresence initial={false}>
        {messages.map((message, messageIndex) => {
          const isUser = message.role === "user";
          const isLastBot = messageIndex === lastBotMessageIndex;

          return (
            <motion.article
              key={message.id}
              initial={{ opacity: 0, y: 10, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className={cn("group flex w-full", isUser ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[94%] rounded-[var(--radius-panel)] px-4 py-3 md:max-w-[84%]",
                  isUser
                    ? "rounded-tr-md border border-accent/20 bg-panel-strong text-text-strong shadow-sm"
                    : "text-text-strong",
                  message.failed && "border border-danger/40 bg-danger/5"
                )}
              >
                <div className={cn("flex items-center justify-between gap-3", isUser ? "mb-2" : "mb-1")}>
                  <div className="inline-flex items-center gap-2">
                    {!isUser ? (
                      <div className="flex items-center gap-1.5 text-accent">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          Saathi
                        </span>
                      </div>
                    ) : null}
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider",
                        isUser ? "text-text-muted" : "text-text-muted/70"
                      )}
                    >
                      {message.timestamp}
                    </span>
                  </div>

                  {isUser && !message.failed && onEdit ? (
                    <button
                      type="button"
                      onClick={() => onEdit(message)}
                      className="rounded-md p-1 opacity-0 transition hover:bg-inner-panel hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
                      aria-label="Edit message"
                      title="Edit message"
                    >
                      <Pencil className="h-3 w-3 text-text-muted" />
                    </button>
                  ) : null}
                  {message.edited ? (
                    <span className={cn("text-[9px] italic", isUser ? "text-text-muted" : "text-text-muted/50")}>
                      edited
                    </span>
                  ) : null}
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

                {message.failed && onRetry ? (
                  <div className="mt-3 border-t border-danger/20 pt-2">
                    <button
                      type="button"
                      onClick={() => onRetry(message)}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-danger transition hover:text-danger/80"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Failed to send - tap to retry
                    </button>
                  </div>
                ) : null}

                {showInlineRichContent && message.rateCards && message.rateCards.length > 0 ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {message.rateCards.map((card) => (
                      <div
                        key={`${message.id}-${card.bankId ?? card.bankName}`}
                        className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4 transition-colors hover:border-accent/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-text-strong">{card.bankName}</p>
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                              {card.tenor}
                            </p>
                          </div>
                          {card.badge ? (
                            <Badge variant="outline" className="bg-panel/80 text-[10px] uppercase tracking-wider">
                              {card.badge}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-3">
                          <p className="text-xl font-bold text-accent">{card.rate}</p>
                          {card.maturityPreview ? (
                            <p className="mt-0.5 text-xs font-medium text-text-strong">
                              {card.maturityPreview}
                            </p>
                          ) : null}
                        </div>
                        {card.safetyNote ? (
                          <p className="mt-3 border-t border-outline/50 pt-3 text-xs leading-relaxed text-text-muted">
                            {card.safetyNote}
                          </p>
                        ) : null}
                        {card.officialUrl ? (
                          <a
                            href={card.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex w-full items-center gap-1.5 border-t border-outline/50 pt-2 text-xs font-semibold text-accent transition hover:text-accent/70"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Visit Bank
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {showInlineRichContent && message.portfolioSplit ? (
                  <div className="mt-5">
                    <PortfolioSplitCard split={message.portfolioSplit} />
                  </div>
                ) : null}

                {showInlineRichContent && message.glossary && message.glossary.length > 0 ? (
                  <div className="mt-5 grid gap-3">
                    {message.glossary.map((item) => (
                      <div
                        key={`${message.id}-${item.term}`}
                        className="rounded-[var(--radius-panel)] border border-outline bg-accent/5 p-4"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-accent" />
                          <p className="text-sm font-semibold text-text-strong">{item.term}</p>
                        </div>
                        <p className="text-sm leading-relaxed text-text-muted">{item.plain}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.actions && message.actions.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-outline/50 pt-3">
                    {message.actions.slice(0, 2).map((action) => {
                      const Icon = getActionIcon(action);

                      return (
                        <Button
                          key={`${message.id}-${action.label}`}
                          variant={action.type === "primary" ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => onAction(action)}
                          className={cn("rounded-full", action.type !== "primary" && "bg-input-bg")}
                        >
                          <Icon className="mr-1.5 h-3.5 w-3.5" />
                          {action.label}
                        </Button>
                      );
                    })}
                  </div>
                ) : null}

                {showInlineRichContent && message.showTimeMachine ? (
                  <div className="mt-5">
                    <FDTimeMachineChart />
                  </div>
                ) : null}

                {showInlineRichContent && message.showCalculator ? (
                  <div className="mt-5">
                    <FDCalculatorCard />
                  </div>
                ) : null}

                {message.followUpPrompt ? (
                  <div className="mt-4 border-t border-outline/50 pt-3">
                    <button
                      type="button"
                      onClick={() =>
                        onAction({
                          label: message.followUpPrompt!,
                          type: "secondary",
                          action: undefined,
                        })
                      }
                      className="rounded-[var(--radius-input)] border border-accent/20 bg-accent/5 px-3 py-2 text-left text-xs font-medium text-accent transition hover:border-accent/30 hover:bg-accent/10"
                    >
                      Idea: {message.followUpPrompt}
                    </button>
                  </div>
                ) : null}

                {!isUser && !message.failed && !isTyping ? (
                  <div className="mt-3 flex items-center justify-between border-t border-outline/50 pt-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
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
                ) : null}

                {isLastBot && showSmartChips && !isTyping && onChipSelect ? (
                  <SmartChips
                    chips={message.suggestedChips ?? []}
                    onSelect={onChipSelect}
                    disabled={isTyping}
                  />
                ) : null}
              </div>
            </motion.article>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
