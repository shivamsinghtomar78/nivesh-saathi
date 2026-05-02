"use client";

import { Calculator, ExternalLink, Info, ShieldCheck, Sparkles, Star } from "lucide-react";

import { FDCalculatorCard } from "@/components/chat/FDCalculatorCard";
import { FDTimeMachineChart } from "@/components/chat/FDTimeMachineChart";
import { PortfolioSplitCard } from "@/components/chat/PortfolioSplitCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/stores/conversationStore";

type RateCard = NonNullable<ConversationMessage["rateCards"]>[number];

type AdvisorInsightPanelProps = {
  className?: string;
  contextPrincipal?: number;
  latestMessage?: ConversationMessage | null;
  shortlistCount: number;
  onSelectRateCard?: (card: RateCard) => void;
  selectedRateCard?: RateCard | null;
};

function parseRatePercent(value?: string) {
  const match = value?.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 7.5;
}

function parseTenorMonths(value?: string) {
  const lower = value?.toLowerCase() ?? "";
  const number = Number(lower.match(/(\d+)/)?.[1] ?? 12);

  if (lower.includes("year") || lower.includes("yr")) {
    return number * 12;
  }

  return number || 12;
}

export function hasAdvisorInsights(message?: ConversationMessage | null) {
  return Boolean(
    (message?.rateCards?.length ?? 0) > 0 ||
      (message?.glossary?.length ?? 0) > 0 ||
      message?.portfolioSplit ||
      message?.showCalculator ||
      message?.showTimeMachine
  );
}

export default function AdvisorInsightPanel({
  className,
  contextPrincipal,
  latestMessage,
  shortlistCount,
  onSelectRateCard,
  selectedRateCard,
}: AdvisorInsightPanelProps) {
  const fallbackCard = latestMessage?.rateCards?.[0] ?? null;
  const calculatorCard = selectedRateCard ?? fallbackCard;
  const showCalculator = Boolean(latestMessage?.showCalculator || calculatorCard);
  const hasInsights = hasAdvisorInsights(latestMessage);

  return (
    <aside className={cn("flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-outline bg-panel-glass shadow-[var(--shadow-card)] backdrop-blur-xl", className)}>
      <div className="border-b border-outline/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              Insights
            </p>
            <h2 className="mt-1 text-xl font-semibold text-text-strong">Financial Context</h2>
          </div>
          {shortlistCount > 0 ? (
            <Badge variant="outline" className="bg-accent/10 text-accent">
              {shortlistCount} saved
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 custom-scrollbar">
        {!hasInsights ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[var(--radius-panel)] border border-dashed border-outline bg-inner-panel/70 p-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-semibold text-text-strong">Ask for a recommendation</p>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Rate cards, calculators, safety notes, and glossary explanations will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
            {latestMessage?.rateCards && latestMessage.rateCards.length > 0 ? (
              <section className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-semibold text-text-strong">Recommended Options</h3>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Context
                  </span>
                </div>
                {latestMessage.rateCards.map((card) => {
                  const selected = (selectedRateCard?.bankId ?? selectedRateCard?.bankName) === (card.bankId ?? card.bankName);

                  return (
                    <button
                      key={`${card.bankId ?? card.bankName}-${card.tenor}`}
                      type="button"
                      onClick={() => onSelectRateCard?.(card)}
                      className={cn(
                        "rounded-[var(--radius-panel)] border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent/35",
                        selected ? "border-accent/60 bg-accent/10" : "border-outline bg-panel-strong/70"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-strong">{card.bankName}</p>
                          <p className="mt-1 text-xs text-text-muted">{card.tenor}</p>
                        </div>
                        {card.badge ? (
                          <Badge variant="outline" className="bg-panel text-[10px] uppercase tracking-wider">
                            {card.badge}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="financial-value mt-3 text-3xl font-semibold text-accent">{card.rate}</p>
                      {card.maturityPreview ? (
                        <p className="mt-1 text-xs font-medium text-text-strong">{card.maturityPreview}</p>
                      ) : null}
                      {card.safetyNote ? (
                        <p className="mt-3 border-t border-outline/50 pt-3 text-xs leading-5 text-text-muted">
                          {card.safetyNote}
                        </p>
                      ) : null}
                      {card.officialUrl ? (
                        <a
                          href={card.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition hover:text-accent/70"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Official page
                        </a>
                      ) : null}
                    </button>
                  );
                })}
              </section>
            ) : null}

            {showCalculator ? (
              <section className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-semibold text-text-strong">Maturity Calculator</h3>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Result + Controls
                  </span>
                </div>
                <FDCalculatorCard
                  bankName={calculatorCard?.bankName}
                  compact
                  defaultPrincipal={contextPrincipal}
                  defaultRatePercent={parseRatePercent(calculatorCard?.rate)}
                  defaultTenorMonths={parseTenorMonths(calculatorCard?.tenor)}
                />
              </section>
            ) : null}

            {latestMessage?.portfolioSplit ? (
              <PortfolioSplitCard split={latestMessage.portfolioSplit} />
            ) : null}

            {latestMessage?.glossary && latestMessage.glossary.length > 0 ? (
              <section className="grid gap-3 rounded-[var(--radius-panel)] border border-outline bg-panel-strong/70 p-4">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold text-text-strong">Plain-Language Glossary</h3>
                </div>
                {latestMessage.glossary.map((item) => (
                  <div key={item.term} className="border-t border-outline/60 pt-3 first:border-t-0 first:pt-0">
                    <p className="text-sm font-semibold text-text-strong">{item.term}</p>
                    <p className="mt-1 text-sm leading-6 text-text-muted">{item.plain}</p>
                  </div>
                ))}
              </section>
            ) : null}

            <section className="rounded-[var(--radius-panel)] border border-outline bg-panel-strong/70 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-text-strong">Safety Reminder</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                FD rates can change. Always confirm the final rate and terms on the bank site before booking.
              </p>
            </section>

            {latestMessage?.showTimeMachine ? <FDTimeMachineChart /> : null}
          </div>
        )}
      </div>

      <div className="border-t border-outline/60 p-5">
        <Button variant="outline" className="w-full rounded-[var(--radius-input)] bg-input-bg" disabled={!hasInsights}>
          Use this context in next question
        </Button>
      </div>
    </aside>
  );
}
