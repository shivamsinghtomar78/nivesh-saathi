import { describe, expect, it } from "vitest";

import { buildFdLadderPlan } from "@/lib/fd-ladder";

describe("FD ladder planner", () => {
  it("creates balanced growth blocks with ordered tenures", () => {
    const plan = buildFdLadderPlan({
      amount: 500000,
      goal: "balanced_growth",
      ratePercent: 7.5,
      now: new Date("2026-05-03T00:00:00.000Z"),
    });

    expect(plan.blocks).toHaveLength(4);
    expect(plan.blocks.map((block) => block.tenureMonths)).toEqual([
      12, 18, 24, 36,
    ]);
    expect(plan.blocks.reduce((sum, block) => sum + block.amount, 0)).toBe(
      500000
    );
  });

  it("assigns split rounding remainder to the final block", () => {
    const plan = buildFdLadderPlan({
      amount: 500001,
      goal: "balanced_growth",
      ratePercent: 7.5,
      now: new Date("2026-05-03T00:00:00.000Z"),
    });

    expect(plan.blocks.map((block) => block.amount)).toEqual([
      125000, 125000, 125000, 125001,
    ]);
  });

  it("calculates maturity and interest for every ladder block", () => {
    const plan = buildFdLadderPlan({
      amount: 300000,
      goal: "safer_liquidity",
      ratePercent: 8,
      now: new Date("2026-05-03T00:00:00.000Z"),
    });

    expect(plan.blocks).toHaveLength(5);
    expect(plan.totalMaturity).toBe(
      plan.blocks.reduce((sum, block) => sum + block.maturityAmount, 0)
    );
    expect(plan.totalInterest).toBeGreaterThan(0);
    expect(
      plan.blocks.every((block) => block.maturityAmount > block.amount)
    ).toBe(true);
  });
});
