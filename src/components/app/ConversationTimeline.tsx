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
    <div className="space-y-6 pb-2 tablet:space-y-8" role="log" aria-live="polite" aria-relevant="additions text">
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
              className={cn("group/msg flex w-full", isUser ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "min-w-0",
                  isUser
                    ? "ml-auto max-w-[92%] rounded-[20px] rounded-br-md border border-[#1F1F1F] bg-[#161616] px-3.5 py-3 text-[#EAEAEA] shadow-[0_14px_40px_rgba(0,0,0,0.22)] tablet:max-w-[78%] tablet:rounded-[22px] tablet:px-4"
                    : "mr-auto w-full max-w-full break-words text-[#EAEAEA]",
                  message.failed && "border-danger/35 bg-danger/10"
                )}
              >
                {isUser ? (
                  <div className="mb-1 flex items-center justify-end gap-2">
                    <span
                      className="text-[10px] font-medium uppercase tracking-wider text-[#7B8490]"
                    >
                      {message.timestamp}
                    </span>
                    {!message.failed && onEdit ? (
                      <button
                        type="button"
                        onClick={() => onEdit(message)}
                        className="rounded-md p-1 opacity-0 transition hover:bg-white/[0.055] hover:opacity-100 focus:opacity-100 group-hover/msg:opacity-100"
                        aria-label="Edit message"
                        title="Edit message"
                      >
                        <Pencil className="h-3 w-3 text-[#9CA3AF]" />
                      </button>
                    ) : null}
                    {message.edited ? (
                      <span className="text-[9px] italic text-[#7B8490]">edited</span>
                    ) : null}
                  </div>
                ) : (
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    <span className="text-accent">Saathi</span>
                    <span className="h-1 w-1 rounded-full bg-[#3A3A3A]" aria-hidden="true" />
                    <span className="font-medium text-[#7B8490]">{message.timestamp}</span>
                    {message.edited ? (
                      <span className="text-[9px] italic normal-case tracking-normal text-[#7B8490]">
                        edited
                      </span>
                    ) : null}
                  </div>
                )}

                <div className="mt-1">
                  {isUser ? (
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-6 text-inherit">
                      {message.content}
                    </p>
                  ) : (
                    <div className="break-words text-[15.5px] leading-7 text-[#EAEAEA] tablet:text-base [&_a]:break-words [&_a]:text-accent [&_strong]:text-[#F4F4F5]">
                      <StructuredAnswer text={message.content} />
                    </div>
                  )}
                </div>

                {message.failed && onRetry ? (
                  <div className="mt-3">
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
                  <div className="mt-5 grid gap-3 tablet:grid-cols-2">
                    {message.rateCards.map((card) => (
                      <div
                        key={`${message.id}-${card.bankId ?? card.bankName}`}
                        className="rounded-[18px] border border-[#1F1F1F] bg-[#121212] p-4 transition-colors hover:border-accent/25"
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
                          <p className="text-xl font-bold text-highlight">{card.rate}</p>
                          {card.maturityPreview ? (
                            <p className="mt-0.5 text-xs font-medium text-text-strong">
                              {card.maturityPreview}
                            </p>
                          ) : null}
                        </div>
                        {card.safetyNote ? (
                          <p className="mt-3 border-t border-[#1F1F1F] pt-3 text-xs leading-relaxed text-[#9CA3AF]">
                            {card.safetyNote}
                          </p>
                        ) : null}
                        {card.officialUrl ? (
                          <a
                            href={card.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex w-full items-center gap-1.5 border-t border-[#1F1F1F] pt-2 text-xs font-semibold text-accent transition hover:text-accent/70"
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
                        className="rounded-[18px] border border-[#1F1F1F] bg-[#121212] p-4"
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
                  <div className="custom-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 tablet:mx-0 tablet:flex-wrap tablet:overflow-visible tablet:px-0 tablet:pb-0">
                    {message.actions.slice(0, 2).map((action) => {
                      const Icon = getActionIcon(action);

                      return (
                        <button
                          type="button"
                          key={`${message.id}-${action.label}`}
                          onClick={() => onAction(action)}
                          className={cn(
                            "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition hover:-translate-y-px",
                            "shrink-0",
                            action.type === "primary"
                              ? "border-accent/25 bg-accent-soft text-accent hover:bg-accent/15"
                              : "border-[#1F1F1F] bg-[#121212] text-[#9CA3AF] hover:border-accent/25 hover:text-[#EAEAEA]"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {action.label}
                        </button>
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
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() =>
                        onAction({
                          label: message.followUpPrompt!,
                          type: "secondary",
                          action: undefined,
                        })
                      }
                      className="max-w-full rounded-full border border-accent/20 bg-accent/[0.055] px-3 py-1.5 text-left text-xs font-medium text-accent transition hover:border-accent/30 hover:bg-accent/10"
                    >
                      {message.followUpPrompt}
                    </button>
                  </div>
                ) : null}

                {!isUser && !message.failed && !isTyping ? (
                  <div className="mt-3 flex items-center gap-2 opacity-70 transition tablet:opacity-0 tablet:group-hover/msg:opacity-100 tablet:focus-within:opacity-100">
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
