import type {
  ChatCompareSnapshotContext,
  ChatLadderPlanContext,
} from "@/lib/server/advisor-schemas";
import type { FdDashboardDto } from "@/lib/fd-tracker/types";
import { formatCurrency } from "@/lib/utils";

function joinClean(parts: Array<string | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

export function buildAdvisorAppContext(params: {
  dashboard?: FdDashboardDto | null;
  ladderPlan?: ChatLadderPlanContext | null;
  compareSnapshot?: ChatCompareSnapshotContext | null;
}) {
  const sections: string[] = [];
  const { compareSnapshot, dashboard, ladderPlan } = params;

  if (dashboard) {
    const nextMaturities = dashboard.upcomingMaturities
      .slice(0, 4)
      .map(
        (item) =>
          `${item.bankName} ${formatCurrency(item.amount)} on ${item.maturityDate} (${item.statusLabel})`
      )
      .join("; ");
    const unreadAlerts = dashboard.alerts.length;

    sections.push(
      joinClean([
        `FD dashboard: ${dashboard.summary.activeCount} active FDs.`,
        `Principal ${formatCurrency(dashboard.summary.totalAmount)}.`,
        `Expected maturity ${formatCurrency(dashboard.summary.totalExpectedMaturity)}.`,
        `Interest earned ${formatCurrency(dashboard.summary.totalInterestEarned)}.`,
        dashboard.summary.upcomingThisMonth > 0
          ? `${dashboard.summary.upcomingThisMonth} maturities this month.`
          : "No tracked maturity this month.",
        nextMaturities ? `Upcoming: ${nextMaturities}.` : undefined,
        unreadAlerts > 0 ? `${unreadAlerts} unread maturity alerts.` : undefined,
      ])
    );
  }

  if (ladderPlan) {
    const blocks = ladderPlan.blocks
      .map(
        (block) =>
          `${block.label} ${formatCurrency(block.amount)} for ${block.tenureMonths} months, matures ${block.maturityDate} at ${formatCurrency(block.maturityAmount)}`
      )
      .join("; ");

    sections.push(
      joinClean([
        `Latest ladder: ${ladderPlan.goalLabel}.`,
        `Split ${formatCurrency(ladderPlan.totalAmount)} across ${ladderPlan.blocks.length} maturity points.`,
        `Assumed ${ladderPlan.assumedRatePercent.toFixed(2)}% p.a.`,
        `Total maturity ${formatCurrency(ladderPlan.totalMaturity)}.`,
        `Blocks: ${blocks}.`,
      ])
    );
  }

  if (compareSnapshot) {
    const banks = compareSnapshot.topBanks
      .map(
        (bank) =>
          `${bank.bankName} ${bank.ratePercent.toFixed(2)}%${
            bank.maturityAmount
              ? ` maturity ${formatCurrency(bank.maturityAmount)}`
              : ""
          }`
      )
      .join("; ");

    sections.push(
      joinClean([
        `Last compare: ${formatCurrency(compareSnapshot.amount)} for ${compareSnapshot.tenorMonths} months.`,
        `Bank type ${compareSnapshot.bankType}.`,
        compareSnapshot.seniorCitizen ? "Senior citizen rates applied." : undefined,
        banks ? `Top compared banks: ${banks}.` : undefined,
      ])
    );
  }

  return sections.join("\n");
}
