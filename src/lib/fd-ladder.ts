import { calculateMaturity } from "@/lib/maturity";
import { formatCurrency } from "@/lib/utils";

export type LadderGoal =
  | "safer_liquidity"
  | "balanced_growth"
  | "reinvestment_flexibility";

export type FdLadderBlock = {
  id: string;
  label: string;
  amount: number;
  tenureMonths: number;
  ratePercent: number;
  maturityAmount: number;
  interestEarned: number;
  maturityDate: string;
  sequence: number;
};

export type FdLadderPlan = {
  id: string;
  totalAmount: number;
  goal: LadderGoal;
  goalLabel: string;
  assumedRatePercent: number;
  createdAt: string;
  totalMaturity: number;
  totalInterest: number;
  blocks: FdLadderBlock[];
  summary: string;
  benefits: string[];
};

export const LADDER_GOALS: Record<
  LadderGoal,
  {
    label: string;
    description: string;
    tenures: number[];
    benefits: string[];
  }
> = {
  safer_liquidity: {
    label: "Safer liquidity",
    description: "Keeps more maturity points closer so money returns sooner.",
    tenures: [3, 6, 9, 12, 18],
    benefits: [
      "Some money comes back earlier instead of everything staying locked.",
      "Useful when the user wants emergency flexibility.",
      "Reduces the pressure to break one large FD early.",
    ],
  },
  balanced_growth: {
    label: "Balanced growth",
    description: "Balances near-term access with longer compounding windows.",
    tenures: [12, 18, 24, 36],
    benefits: [
      "Spreads maturity across short and medium horizons.",
      "Keeps reinvestment decisions available at multiple points.",
      "Avoids putting the full amount into a single tenure assumption.",
    ],
  },
  reinvestment_flexibility: {
    label: "Reinvestment flexibility",
    description: "Creates annual maturity points for future rate decisions.",
    tenures: [12, 24, 36, 48, 60],
    benefits: [
      "Gives yearly chances to reinvest if rates improve.",
      "Keeps the plan easier to review at predictable intervals.",
      "Staggers maturity so the user is not dependent on one future date.",
    ],
  },
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + months);

  if (next.getUTCDate() !== day) {
    next.setUTCDate(0);
  }

  return next;
}

function splitAmount(totalAmount: number, blockCount: number) {
  const normalizedTotal = Math.max(0, Math.round(totalAmount));
  const baseAmount = Math.floor(normalizedTotal / blockCount);
  const remainder = normalizedTotal - baseAmount * blockCount;

  return Array.from({ length: blockCount }, (_, index) =>
    index === blockCount - 1 ? baseAmount + remainder : baseAmount
  );
}

export function buildFdLadderPlan(params: {
  amount: number;
  goal: LadderGoal;
  ratePercent?: number;
  now?: Date;
  id?: string;
}) {
  const goalConfig = LADDER_GOALS[params.goal];
  const ratePercent = params.ratePercent ?? 7.5;
  const now = params.now ?? new Date();
  const amounts = splitAmount(params.amount, goalConfig.tenures.length);
  const createdAt = now.toISOString();

  const blocks = goalConfig.tenures.map((tenureMonths, index) => {
    const amount = amounts[index] ?? 0;
    const maturity = calculateMaturity({
      principal: amount,
      ratePercent,
      tenorMonths: tenureMonths,
      compounding: "quarterly",
    });

    return {
      id: `${params.goal}-${tenureMonths}-${index + 1}`,
      label: `Block ${index + 1}`,
      amount,
      tenureMonths,
      ratePercent,
      maturityAmount: maturity.maturityAmount,
      interestEarned: maturity.interestEarned,
      maturityDate: toDateKey(addMonths(now, tenureMonths)),
      sequence: index + 1,
    } satisfies FdLadderBlock;
  });

  const totalMaturity = blocks.reduce(
    (sum, block) => sum + block.maturityAmount,
    0
  );
  const totalInterest = blocks.reduce(
    (sum, block) => sum + block.interestEarned,
    0
  );

  return {
    id: params.id ?? `ladder-${now.getTime()}`,
    totalAmount: Math.round(params.amount),
    goal: params.goal,
    goalLabel: goalConfig.label,
    assumedRatePercent: ratePercent,
    createdAt,
    totalMaturity,
    totalInterest,
    blocks,
    summary:
      "Instead of locking all your money in one FD, this plan splits it into smaller parts so some money comes back earlier and can be reinvested later.",
    benefits: goalConfig.benefits,
  } satisfies FdLadderPlan;
}

export function summarizeLadderPlanForChat(plan?: FdLadderPlan | null) {
  if (!plan) return undefined;

  const maturityPoints = plan.blocks
    .map(
      (block) =>
        `${block.label}: ${formatCurrency(block.amount)} for ${block.tenureMonths} months, matures around ${block.maturityDate} at ${formatCurrency(block.maturityAmount)}`
    )
    .join("; ");

  return [
    `Latest ladder plan: ${plan.goalLabel}`,
    `Total split: ${formatCurrency(plan.totalAmount)} across ${plan.blocks.length} maturity points`,
    `Assumed rate: ${plan.assumedRatePercent.toFixed(2)}% p.a.`,
    `Expected maturity total: ${formatCurrency(plan.totalMaturity)}`,
    `Blocks: ${maturityPoints}`,
  ].join(". ");
}
