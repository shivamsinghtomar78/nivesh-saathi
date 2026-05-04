"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Banknote,
  CalendarClock,
  ChartNoAxesCombined,
  Landmark,
  Lightbulb,
  MessageCircleMore,
  PiggyBank,
  RefreshCcw,
  Route,
  Save,
  Send,
  Split,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import AppShell from "@/components/app/AppShell";
import AuthGate from "@/components/auth/AuthGate";
import { FDCalculatorCard } from "@/components/chat/FDCalculatorCard";
import { FdCharts } from "@/components/fds/FdCharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildFdLadderPlan,
  LADDER_GOALS,
  type FdLadderPlan,
  type LadderGoal,
} from "@/lib/fd-ladder";
import type { FdDashboardDto } from "@/lib/fd-tracker/types";
import type { FDRate } from "@/lib/fd-data";
import { ROUTES } from "@/lib/routes";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useLadderStore } from "@/stores/ladderStore";

type SummaryCardProps = {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "accent" | "highlight" | "muted";
};

function SummaryCard({ icon: Icon, label, tone = "accent", value }: SummaryCardProps) {
  return (
    <Card className="border-outline bg-panel-glass p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {label}
          </p>
          <p
            className={cn(
              "financial-value mt-3 text-2xl font-semibold text-text-strong",
              tone === "accent" && "text-accent",
              tone === "highlight" && "text-highlight"
            )}
          >
            {value}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline bg-inner-panel text-accent">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function EmptyAnalyticsState() {
  return (
    <Card className="border-dashed border-outline bg-panel-glass p-8 text-center shadow-sm">
      <ChartNoAxesCombined className="mx-auto h-8 w-8 text-accent" />
      <h2 className="mt-4 text-lg font-semibold text-text-strong">
        Analytics will unlock after your first tracked FD
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-muted">
        The calculator and ladder planner are ready now. Once FDs are saved, this page will show maturity flow, bank concentration, and growth charts.
      </p>
      <Link href={ROUTES.FDS} className="mt-5 inline-flex">
        <Button variant="outline">
          <WalletCards className="h-4 w-4" />
          Open Dashboard
        </Button>
      </Link>
    </Card>
  );
}

function MaturityTimeline({ dashboard }: { dashboard: FdDashboardDto }) {
  const items = dashboard.maturityTimeline.slice(0, 8);

  return (
    <Card className="border-outline bg-panel-glass p-5 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Maturity Timeline</CardTitle>
        </div>
        <CardDescription>Upcoming cash-flow points from tracked FDs.</CardDescription>
      </CardHeader>
      <CardContent className="mt-0">
        {items.length > 0 ? (
          <div className="custom-scrollbar overflow-x-auto pb-2">
            <div className="relative flex min-w-[640px] items-start justify-between gap-4 px-2 pt-7 tablet:min-w-[760px]">
              <div className="absolute left-8 right-8 top-11 h-px bg-outline" />
              {items.map((item) => (
                <div key={item.id} className="group relative z-10 grid w-28 justify-items-center text-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-panel text-accent shadow-sm transition group-hover:scale-105 group-hover:bg-accent group-hover:text-on-accent">
                    <PiggyBank className="h-4 w-4" />
                  </div>
                  <p className="mt-3 max-w-28 truncate text-xs font-semibold text-text-strong">
                    {item.bankName}
                  </p>
                  <p className="financial-value mt-1 text-xs text-text-muted">
                    {formatCurrency(item.amount)}
                  </p>
                  <Badge variant="outline" className="mt-2 bg-input-bg text-[10px]">
                    {item.statusLabel}
                  </Badge>
                  <div className="pointer-events-none absolute bottom-full mb-3 hidden w-48 rounded-[var(--radius-panel)] border border-outline bg-panel p-3 text-left shadow-[var(--shadow-card)] group-hover:block">
                    <p className="text-xs font-semibold text-text-strong">{item.bankName}</p>
                    <p className="financial-value mt-1 text-xs text-accent">{formatCurrency(item.amount)}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {new Intl.DateTimeFormat("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(item.maturityDate))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--radius-panel)] border border-dashed border-outline bg-inner-panel/50 p-8 text-center text-sm text-text-muted">
            Add tracked FDs to see staggered maturity points here.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LadderBlockCard({ block }: { block: FdLadderPlan["blocks"][number] }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4 shadow-sm transition hover:border-accent/35 hover:bg-panel-strong/70"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-strong">{block.label}</p>
          <p className="mt-1 text-xs text-text-muted">{block.tenureMonths} months</p>
        </div>
        <Badge variant="outline" className="bg-panel text-[10px]">
          {block.sequence}
        </Badge>
      </div>
      <p className="financial-value mt-4 text-2xl font-semibold text-accent">
        {formatCurrency(block.amount)}
      </p>
      <div className="mt-4 grid gap-2 text-xs text-text-muted">
        <div className="flex items-center justify-between gap-3 border-b border-outline/50 pb-2">
          <span>Maturity</span>
          <span className="financial-value font-semibold text-text-strong">
            {formatCurrency(block.maturityAmount)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Date</span>
          <span className="font-medium text-text-strong">
            {new Intl.DateTimeFormat("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(new Date(block.maturityDate))}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function LadderTimeline({ plan }: { plan: FdLadderPlan }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-outline bg-panel-strong/70 p-5">
      <div className="flex items-center gap-2">
        <Route className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-strong">Staggered Maturity Sequence</h3>
      </div>
      <div className="custom-scrollbar mt-5 overflow-x-auto pb-2">
        <div className="relative flex min-w-[640px] items-start justify-between gap-4 px-2 pt-5 tablet:min-w-[720px]">
          <div className="absolute left-8 right-8 top-9 h-px bg-outline" />
          {plan.blocks.map((block) => (
            <div key={block.id} className="group relative z-10 grid w-28 justify-items-center text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-highlight/35 bg-panel text-highlight transition group-hover:scale-105 group-hover:bg-highlight group-hover:text-on-accent">
                {block.sequence}
              </div>
              <p className="mt-3 text-xs font-semibold text-text-strong">
                {block.tenureMonths} mo
              </p>
              <p className="financial-value mt-1 text-xs text-text-muted">
                {formatCurrency(block.maturityAmount)}
              </p>
              <div className="pointer-events-none absolute bottom-full mb-3 hidden w-52 rounded-[var(--radius-panel)] border border-outline bg-panel p-3 text-left shadow-[var(--shadow-card)] group-hover:block">
                <p className="text-xs font-semibold text-text-strong">{block.label}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {formatCurrency(block.amount)} becomes{" "}
                  <span className="financial-value text-accent">{formatCurrency(block.maturityAmount)}</span>
                </p>
                <p className="mt-1 text-xs text-text-muted">Matures on {block.maturityDate}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LadderPlanner({ defaultRate }: { defaultRate: number }) {
  const router = useRouter();
  const savePlan = useLadderStore((state) => state.savePlan);
  const setDashboardDraft = useLadderStore((state) => state.setDashboardDraft);
  const [amount, setAmount] = useState(500000);
  const [goal, setGoal] = useState<LadderGoal>("balanced_growth");
  const [ratePercent, setRatePercent] = useState(defaultRate);

  const plan = useMemo(
    () =>
      buildFdLadderPlan({
        amount,
        goal,
        ratePercent,
      }),
    [amount, goal, ratePercent]
  );

  const firstBlock = plan.blocks[0];
  const compareHref = firstBlock
    ? `${ROUTES.COMPARE}?amount=${firstBlock.amount}&tenorMonths=${firstBlock.tenureMonths}`
    : ROUTES.COMPARE;

  function handleSavePlan() {
    savePlan(plan);
    toast.success("Ladder plan saved");
  }

  function handleSendToDashboard() {
    savePlan(plan);
    setDashboardDraft(plan);
    toast.success("Ladder draft ready in Dashboard");
    router.push(ROUTES.FDS);
  }

  function handleAskSaathi() {
    savePlan(plan);
    const prompt = `Explain my ${plan.goalLabel.toLowerCase()} ladder plan for ${formatCurrency(plan.totalAmount)} across ${plan.blocks.length} maturity points.`;
    router.push(`${ROUTES.CHAT}?prompt=${encodeURIComponent(prompt)}`);
  }

  return (
    <section className="grid gap-5">
      <Card className="border-outline bg-panel p-5 shadow-sm">
        <CardHeader className="pb-5">
          <div className="flex flex-col gap-4 laptop:flex-row laptop:items-start laptop:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Split className="h-4 w-4 text-accent" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  FD Laddering
                </p>
              </div>
              <CardTitle className="mt-2 text-2xl">Build a staggered FD plan</CardTitle>
              <CardDescription className="mt-2 max-w-2xl">
                {plan.summary}
              </CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-2 tablet:grid-cols-4 tablet:gap-3">
              <Button variant="outline" onClick={handleSavePlan}>
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" onClick={handleSendToDashboard}>
                <Send className="h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="outline" onClick={handleAskSaathi}>
                <MessageCircleMore className="h-4 w-4" />
                Ask
              </Button>
              <Link href={compareHref}>
                <Button variant="secondary" className="w-full">
                  <ArrowUpRight className="h-4 w-4" />
                  Compare
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="mt-0 grid gap-6">
          <div className="grid gap-4 laptop:grid-cols-[1fr_1fr_0.7fr]">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Lump sum amount
              </span>
              <input
                type="number"
                min={10000}
                step={10000}
                value={amount}
                onChange={(event) => setAmount(Math.max(10000, Number(event.target.value) || 10000))}
                className="financial-value min-h-12 rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm font-semibold text-text-strong outline-none focus:border-accent"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Strategy goal
              </span>
              <select
                value={goal}
                onChange={(event) => setGoal(event.target.value as LadderGoal)}
                className="custom-select min-h-12 rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm font-semibold text-text-strong outline-none focus:border-accent"
              >
                {Object.entries(LADDER_GOALS).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Assumed rate
              </span>
              <input
                type="number"
                min={4}
                max={12}
                step={0.05}
                value={ratePercent}
                onChange={(event) => setRatePercent(Math.min(12, Math.max(4, Number(event.target.value) || 4)))}
                className="financial-value min-h-12 rounded-[var(--radius-input)] border border-outline bg-input-bg px-4 text-sm font-semibold text-text-strong outline-none focus:border-accent"
              />
            </label>
          </div>

          <div className="grid gap-4 tablet:grid-cols-3">
            <div className="rounded-[var(--radius-panel)] border border-outline bg-accent-soft p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                Total maturity
              </p>
              <p className="financial-value mt-2 text-2xl font-semibold text-text-strong">
                {formatCurrency(plan.totalMaturity)}
              </p>
            </div>
            <div className="rounded-[var(--radius-panel)] border border-outline bg-highlight-soft p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-highlight">
                Interest earned
              </p>
              <p className="financial-value mt-2 text-2xl font-semibold text-text-strong">
                {formatCurrency(plan.totalInterest)}
              </p>
            </div>
            <div className="rounded-[var(--radius-panel)] border border-outline bg-inner-panel p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                Maturity points
              </p>
              <p className="financial-value mt-2 text-2xl font-semibold text-text-strong">
                {plan.blocks.length}
              </p>
            </div>
          </div>

          <div className="grid gap-4 tablet:grid-cols-2 laptop:grid-cols-5">
            {plan.blocks.map((block) => (
              <LadderBlockCard key={block.id} block={block} />
            ))}
          </div>

          <LadderTimeline plan={plan} />

          <div className="grid gap-4 tablet:grid-cols-3">
            {plan.benefits.map((benefit) => (
              <div
                key={benefit}
                className="rounded-[var(--radius-panel)] border border-outline bg-panel-strong/70 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-accent">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium leading-6 text-text-strong">{benefit}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default function InsightsScreen() {
  const user = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState<FdDashboardDto | null>(null);
  const [topRate, setTopRate] = useState<FDRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [dashboardResponse, ratesResponse] = await Promise.all([
        fetch("/api/fds/dashboard"),
        fetch("/api/fd-rates?limit=1"),
      ]);
      const dashboardPayload = (await dashboardResponse.json()) as {
        dashboard?: FdDashboardDto;
        error?: string;
      };
      const ratesPayload = (await ratesResponse.json()) as { rates?: FDRate[] };

      if (!dashboardResponse.ok || !dashboardPayload.dashboard) {
        throw new Error(dashboardPayload.error || "Unable to load insights");
      }

      setDashboard(dashboardPayload.dashboard);
      setTopRate(ratesPayload.rates?.[0] ?? null);
    } catch (caught) {
      setDashboard(null);
      setTopRate(null);
      setError(caught instanceof Error ? caught.message : "Unable to load insights");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInsights();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadInsights]);

  const defaultRate = topRate?.regularRate ?? 7.5;
  const hasRecords = (dashboard?.records.length ?? 0) > 0;

  return (
    <AppShell
      eyebrow="Insights"
      title="FD Planning and Portfolio Intelligence"
      description="A dedicated workspace for calculator assumptions, maturity visualization, and laddering strategy."
      actions={
        user ? (
          <Button variant="outline" onClick={() => void loadInsights()} className="w-full tablet:w-auto">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        ) : null
      }
    >
      <AuthGate
        title="Sign in to view insights"
        body="Your FD analytics, ladder plans, and personalized maturity context stay tied to your profile."
      >
        {loading ? (
          <div className="grid gap-5">
            <div className="grid gap-4 tablet:grid-cols-2 laptop:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="h-32 animate-pulse bg-panel-glass p-5 shadow-sm">
                  <div className="h-full rounded-[var(--radius-panel)] bg-inner-panel/60" />
                </Card>
              ))}
            </div>
            <Card className="h-96 animate-pulse bg-panel-glass p-5 shadow-sm">
              <div className="h-full rounded-[var(--radius-panel)] bg-inner-panel/60" />
            </Card>
          </div>
        ) : (
          <div className="grid gap-6">
            {error ? (
              <Card className="border-highlight/25 bg-highlight-soft p-5 shadow-sm">
                <p className="text-sm font-semibold text-text-strong">Insights are partially available</p>
                <p className="mt-1 text-sm text-text-muted">
                  {error}. The calculator and ladder planner are still available.
                </p>
              </Card>
            ) : null}

            <div className="grid gap-4 tablet:grid-cols-2 laptop:grid-cols-5">
              <SummaryCard
                icon={Banknote}
                label="Total FD Value"
                value={formatCurrency(dashboard?.summary.totalAmount ?? 0)}
              />
              <SummaryCard
                icon={TrendingUp}
                label="Maturity Value"
                tone="highlight"
                value={formatCurrency(dashboard?.summary.totalExpectedMaturity ?? 0)}
              />
              <SummaryCard
                icon={WalletCards}
                label="Interest Earned"
                value={formatCurrency(dashboard?.summary.totalInterestEarned ?? 0)}
              />
              <SummaryCard
                icon={Landmark}
                label="Active FDs"
                tone="muted"
                value={String(dashboard?.summary.activeCount ?? 0)}
              />
              <SummaryCard
                icon={CalendarClock}
                label="This Month"
                tone="highlight"
                value={String(dashboard?.summary.upcomingThisMonth ?? 0)}
              />
            </div>

            {dashboard && hasRecords ? (
              <>
                <MaturityTimeline dashboard={dashboard} />
                <FdCharts dashboard={dashboard} />
              </>
            ) : (
              <EmptyAnalyticsState />
            )}

            <div className="grid gap-6 laptop:grid-cols-[minmax(0,1fr)_420px]">
              <LadderPlanner defaultRate={defaultRate} />
              <div className="grid gap-5 content-start">
                <FDCalculatorCard
                  bankName={topRate?.bankName}
                  defaultRatePercent={defaultRate}
                  defaultPrincipal={dashboard?.summary.totalAmount || 100000}
                  defaultTenorMonths={12}
                />
              </div>
            </div>
          </div>
        )}
      </AuthGate>
    </AppShell>
  );
}
