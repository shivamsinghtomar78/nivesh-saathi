"use client";

import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Calculator,
  Gauge,
  PanelRightClose,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { FDCalculatorCard } from "@/components/chat/FDCalculatorCard";
import { FDTimeMachineChart } from "@/components/chat/FDTimeMachineChart";
import { PortfolioSplitCard } from "@/components/chat/PortfolioSplitCard";
import StructuredAnswer from "@/components/shared/StructuredAnswer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PredictivePrefetchClientResult } from "@/hooks/usePredictivePrefetch";
import type { AdvisorUi, ConversationalUiMode } from "@/lib/server/advisor-schemas";
import { cn, formatCurrency } from "@/lib/utils";
import type { ConversationMessage } from "@/stores/conversationStore";

type WorkspaceRateCard = NonNullable<ConversationMessage["rateCards"]>[number];
type UiAction = NonNullable<AdvisorUi["actionButtons"]>[number];

type AdaptiveCuiWorkspaceProps = {
  className?: string;
  ui?: AdvisorUi | null;
  message?: ConversationMessage | null;
  prefetch?: PredictivePrefetchClientResult | null;
  predictiveStatus?: "idle" | "loading" | "ready" | "error";
  onAction?: (action: UiAction) => void;
  onCollapse?: () => void;
};

const modeCopy: Record<ConversationalUiMode, { title: string; eyebrow: string }> = {
  conversational: { title: "Conversation", eyebrow: "Assistant" },
  comparison: { title: "FD Comparison", eyebrow: "Compare" },
  calculator: { title: "Maturity Lab", eyebrow: "Calculate" },
  recommendation: { title: "Top FD Options", eyebrow: "Recommend" },
  analytics: { title: "Investment View", eyebrow: "Analyze" },
  exploration: { title: "Context Board", eyebrow: "Explore" },
  onboarding: { title: "Start Here", eyebrow: "Onboard" },
};

function parseRatePercent(value?: string) {
  const match = value?.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : undefined;
}

function parseTenorMonths(value?: string) {
  const lower = value?.toLowerCase() ?? "";
  const number = Number(lower.match(/(\d+)/)?.[1] ?? 12);
  if (lower.includes("year") || lower.includes("yr") || lower.includes("saal")) {
    return number * 12;
  }
  return number || 12;
}

function mapPrefetchCards(prefetch?: PredictivePrefetchClientResult | null): WorkspaceRateCard[] {
  return (
    prefetch?.data.rateCards.map((card) => ({
      bankId: card.bankId,
      bankName: card.bankName,
      bankNameLocal: card.bankNameLocal,
      bankType: card.bankType,
      tenor: card.tenorLabel,
      tenorMonths: card.tenorMonths,
      rate: card.rate,
      rateValue: card.rateValue,
      maturityAmount: card.maturityAmount,
      interestEarned: card.interestEarned,
      maturityPreview: card.maturityPreview,
      safetyNote: card.safetyNote,
      badge: card.badge,
      officialUrl: card.officialUrl,
      sourceLabel: card.sourceLabel,
      asOf: card.asOf,
    })) ?? []
  );
}

function getCards(message?: ConversationMessage | null, prefetch?: PredictivePrefetchClientResult | null) {
  return message?.rateCards?.length ? message.rateCards : mapPrefetchCards(prefetch);
}

function getPortfolioSplit(
  message?: ConversationMessage | null,
  prefetch?: PredictivePrefetchClientResult | null
) {
  return message?.portfolioSplit ?? prefetch?.data.portfolioSplit;
}

function SkeletonPanel() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((item) => (
        <motion.div
          key={item}
          className="h-20 rounded-lg border border-outline/60 bg-panel-strong/50"
          animate={{ opacity: [0.45, 0.9, 0.45] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: item * 0.12 }}
        />
      ))}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-outline bg-panel px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-text-strong">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 text-text-muted">
          {entry.name}:{" "}
          <span className="font-semibold text-accent">
            {entry.name === "Maturity" ? formatCurrency(entry.value ?? 0) : `${entry.value}%`}
          </span>
        </p>
      ))}
    </div>
  );
}

function ComparisonTable({ cards }: { cards: WorkspaceRateCard[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-outline bg-panel-strong/70">
      <div className="grid grid-cols-[1.25fr_0.8fr_0.95fr_0.95fr] gap-2 border-b border-outline/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        <span>Bank</span>
        <span>Rate</span>
        <span>Tenor</span>
        <span className="text-right">Maturity</span>
      </div>
      {cards.map((card, index) => (
        <motion.div
          key={`${card.bankId ?? card.bankName}-${card.tenor}-${index}`}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          className="grid grid-cols-[1.25fr_0.8fr_0.95fr_0.95fr] items-center gap-2 border-b border-outline/50 px-4 py-4 last:border-b-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-strong">{card.bankName}</p>
            <p className="mt-1 truncate text-xs capitalize text-text-muted">
              {card.bankType?.replace("-", " ") ?? "bank"}
            </p>
          </div>
          <p className="financial-value text-base font-semibold text-accent">{card.rate}</p>
          <p className="truncate text-sm text-text-strong">{card.tenor}</p>
          <p className="truncate text-right text-sm font-semibold text-text-strong">
            {card.maturityAmount ? formatCurrency(card.maturityAmount) : card.maturityPreview ?? "-"}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

function YieldChart({ cards }: { cards: WorkspaceRateCard[] }) {
  const data = cards.map((card) => ({
    bank: card.bankName?.replace(" Bank", "") ?? "FD",
    Rate: card.rateValue ?? parseRatePercent(card.rate) ?? 0,
    Maturity: card.maturityAmount ?? 0,
  }));

  return (
    <div className="h-[260px] rounded-lg border border-outline bg-inner-panel/70 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="bank"
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={34}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(215,182,109,0.08)" }} />
          <Bar dataKey="Rate" fill="#D7B66D" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RateStrip({ cards }: { cards: WorkspaceRateCard[] }) {
  return (
    <div className="grid gap-3 tablet:grid-cols-3">
      {cards.slice(0, 3).map((card, index) => (
        <motion.a
          key={`${card.bankId ?? card.bankName}-${index}`}
          href={card.officialUrl}
          target={card.officialUrl ? "_blank" : undefined}
          rel={card.officialUrl ? "noopener noreferrer" : undefined}
          className="min-h-[168px] rounded-lg border border-outline bg-panel-strong/70 p-4 transition hover:-translate-y-0.5 hover:border-accent/40"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-strong">{card.bankName}</p>
              <p className="mt-1 truncate text-xs text-text-muted">{card.tenor}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-text-muted" />
          </div>
          <p className="financial-value mt-5 text-3xl font-semibold text-accent">{card.rate}</p>
          {card.maturityPreview ? (
            <p className="mt-2 text-sm font-medium text-text-strong">{card.maturityPreview}</p>
          ) : null}
          {card.badge ? (
            <Badge variant="outline" className="mt-3 bg-accent/10 text-[10px] text-accent">
              {card.badge}
            </Badge>
          ) : null}
        </motion.a>
      ))}
    </div>
  );
}

function ActionButtons({
  actions,
  onAction,
}: {
  actions?: UiAction[];
  onAction?: (action: UiAction) => void;
}) {
  if (!actions?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={`${action.action}-${action.label}`}
          type="button"
          size="sm"
          variant={action.type === "primary" ? "primary" : "outline"}
          className="min-h-9 rounded-lg"
          onClick={() => onAction?.(action)}
        >
          {action.action === "run_calculator" ? (
            <Calculator className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {action.label}
        </Button>
      ))}
    </div>
  );
}

export default function AdaptiveCuiWorkspace({
  className,
  ui,
  message,
  onAction,
  onCollapse,
  predictiveStatus = "idle",
  prefetch,
}: AdaptiveCuiWorkspaceProps) {
  const mode = ui?.mode ?? "conversational";
  const copy = modeCopy[mode];
  const cards = getCards(message, prefetch);
  const topCard = cards[0];
  const portfolioSplit = getPortfolioSplit(message, prefetch);
  const isPreloading = predictiveStatus === "loading" && cards.length === 0;
  const calculatorPrincipal =
    topCard?.maturityAmount && topCard?.interestEarned
      ? topCard.maturityAmount - topCard.interestEarned
      : prefetch?.data.filters.amount;
  const calculatorRate = topCard?.rateValue ?? parseRatePercent(topCard?.rate) ?? 7.5;
  const calculatorTenor =
    topCard?.tenorMonths ??
    parseTenorMonths(topCard?.tenor) ??
    prefetch?.data.filters.tenorMonths ??
    12;

  return (
    <motion.section
      layout
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-outline bg-panel-glass shadow-[var(--shadow-card)] backdrop-blur-xl",
        className
      )}
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="border-b border-outline/70 bg-inner-panel/60 px-4 py-4 tablet:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-accent/10 text-accent">
                {copy.eyebrow}
              </Badge>
              {ui?.confidence ? (
                <Badge variant="outline" className="bg-success/10 text-success">
                  {ui.confidence} confidence
                </Badge>
              ) : null}
              {prefetch?.cacheHit ? (
                <Badge variant="outline" className="bg-highlight/10 text-highlight">
                  Warm cache
                </Badge>
              ) : null}
            </div>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-text-strong tablet:text-3xl">
              {copy.title}
            </h2>
            {ui?.entities?.length ? (
              <p className="mt-2 truncate text-sm text-text-muted">
                {ui.entities.join(" vs ")}
              </p>
            ) : null}
          </div>
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline bg-panel-strong text-text-muted transition hover:border-accent/40 hover:text-text-strong"
              aria-label="Collapse workspace"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 tablet:p-5">
        <div className="grid gap-5">
          <div className="grid gap-3 tablet:grid-cols-3">
            <div className="rounded-lg border border-outline bg-panel-strong/70 p-4">
              <Gauge className="h-4 w-4 text-accent" />
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-text-muted">Top rate</p>
              <p className="financial-value mt-1 text-2xl font-semibold text-text-strong">
                {topCard?.rate ?? "--"}
              </p>
            </div>
            <div className="rounded-lg border border-outline bg-panel-strong/70 p-4">
              <TrendingUp className="h-4 w-4 text-success" />
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-text-muted">Maturity</p>
              <p className="financial-value mt-1 text-2xl font-semibold text-text-strong">
                {topCard?.maturityAmount ? formatCurrency(topCard.maturityAmount) : "--"}
              </p>
            </div>
            <div className="rounded-lg border border-outline bg-panel-strong/70 p-4">
              <ShieldCheck className="h-4 w-4 text-highlight" />
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-text-muted">Source</p>
              <p className="mt-1 truncate text-sm font-semibold text-text-strong">
                {topCard?.sourceLabel ?? prefetch?.data.sourceAsOf ?? "FD data"}
              </p>
            </div>
          </div>

          {isPreloading ? <SkeletonPanel /> : null}

          {cards.length > 0 ? (
            <>
              {(mode === "comparison" || ui?.visualizations.includes("comparison_table")) ? (
                <ComparisonTable cards={cards} />
              ) : (
                <RateStrip cards={cards} />
              )}

              {(mode === "comparison" ||
                mode === "recommendation" ||
                ui?.visualizations.includes("maturity_chart")) ? (
                <section className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-semibold text-text-strong">Yield Shape</h3>
                  </div>
                  <YieldChart cards={cards} />
                </section>
              ) : null}
            </>
          ) : null}

          {(mode === "calculator" || message?.showCalculator || ui?.visualizations.includes("calculator")) ? (
            <section className="grid gap-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-text-strong">Maturity Controls</h3>
              </div>
              <FDCalculatorCard
                bankName={topCard?.bankName}
                compact
                defaultPrincipal={calculatorPrincipal}
                defaultRatePercent={calculatorRate}
                defaultTenorMonths={calculatorTenor}
              />
            </section>
          ) : null}

          {portfolioSplit ? (
            <section className="grid gap-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-success" />
                <h3 className="text-sm font-semibold text-text-strong">Portfolio Split</h3>
              </div>
              <PortfolioSplitCard split={portfolioSplit} />
            </section>
          ) : null}

          {(message?.showTimeMachine || ui?.visualizations.includes("trend_chart")) ? (
            <section className="grid gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-highlight" />
                <h3 className="text-sm font-semibold text-text-strong">Rate Timeline</h3>
              </div>
              <FDTimeMachineChart />
            </section>
          ) : null}

          {message?.content ? (
            <section className="rounded-lg border border-outline bg-panel-strong/70 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-text-strong">Assistant Summary</h3>
              </div>
              <StructuredAnswer text={message.content} />
            </section>
          ) : null}

          <ActionButtons actions={ui?.actionButtons} onAction={onAction} />
        </div>
      </div>
    </motion.section>
  );
}
