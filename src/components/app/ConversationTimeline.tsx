"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  BookOpen,
  MessageCircleMore,
  Mic,
  Sparkles,
} from "lucide-react";

import StructuredAnswer from "@/components/shared/StructuredAnswer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/stores/chatStore";

type ConversationTimelineProps = {
  messages: ChatMessage[];
  onAction: (action: NonNullable<ChatMessage["actions"]>[number]) => void;
};

function getActionIcon(action: NonNullable<ChatMessage["actions"]>[number]) {
  if (action.action === "open_voice") {
    return Mic;
  }

  if (action.action === "open_compare") {
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
}: ConversationTimelineProps) {
  return (
    <div className="space-y-6">
      <AnimatePresence initial={false}>
        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <motion.article
              key={message.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[94%] rounded-3xl px-5 py-4 md:max-w-[85%] shadow-sm",
                  isUser
                    ? "bg-surface-dark text-on-dark rounded-tr-sm"
                    : "border border-outline bg-panel text-text-strong rounded-tl-sm"
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
                  </div>
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
                      </div>
                    ))}
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
              </div>
            </motion.article>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
