"use client";

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
    <div className="space-y-4">
      {messages.map((message) => {
        const isUser = message.role === "user";

        return (
          <article
            key={message.id}
            className={cn("flex", isUser ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[94%] rounded-[24px] px-4 py-4 shadow-[0_18px_40px_rgba(17,17,19,0.08)] md:max-w-[86%]",
                isUser
                  ? "bg-[#111113] text-[#f5f4ef]"
                  : "border border-outline bg-white/78 text-text-strong"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2">
                  {!isUser ? (
                    <Badge variant="accent" className="rounded-full">
                      Saathi
                    </Badge>
                  ) : null}
                  <span
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-[0.18em]",
                      isUser ? "text-white/54" : "text-text-muted"
                    )}
                  >
                    {message.timestamp}
                  </span>
                </div>
                {!isUser ? (
                  <Sparkles className="h-4 w-4 shrink-0 text-[#5e2741]" />
                ) : null}
              </div>

              <div className="mt-3">
                {isUser ? (
                  <p className="whitespace-pre-line text-sm leading-7 text-inherit md:text-base">
                    {message.content}
                  </p>
                ) : (
                  <StructuredAnswer text={message.content} />
                )}
              </div>

              {message.rateCards?.length ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {message.rateCards.map((card) => (
                    <div
                      key={`${message.id}-${card.bankId ?? card.bankName}`}
                      className="rounded-[20px] border border-outline bg-app/72 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-text-strong">
                            {card.bankName}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-muted">
                            {card.tenor}
                          </p>
                        </div>
                        {card.badge ? <Badge variant="outline">{card.badge}</Badge> : null}
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-2xl font-semibold text-text-strong">
                            {card.rate}
                          </p>
                          <p className="mt-1 text-sm text-text-muted">
                            {card.maturityPreview}
                          </p>
                        </div>
                      </div>
                      {card.safetyNote ? (
                        <p className="mt-3 text-sm leading-6 text-text-muted">
                          {card.safetyNote}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {message.glossary?.length ? (
                <div className="mt-4 grid gap-3">
                  {message.glossary.map((item) => (
                    <div
                      key={`${message.id}-${item.term}`}
                      className="rounded-[18px] border border-outline bg-app/72 p-4"
                    >
                      <p className="text-sm font-semibold text-text-strong">
                        {item.term}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-text-muted">
                        {item.plain}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {message.actions?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {message.actions.map((action) => {
                    const Icon = getActionIcon(action);

                    return (
                      <Button
                        key={`${message.id}-${action.label}`}
                        variant={action.type === "primary" ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => onAction(action)}
                      >
                        <Icon className="h-4 w-4" />
                        {action.label}
                      </Button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
