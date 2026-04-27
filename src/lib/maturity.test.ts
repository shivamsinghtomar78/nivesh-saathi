import { describe, expect, it } from "vitest";

import { calculateMaturity } from "@/lib/maturity";

describe("calculateMaturity", () => {
  it("uses simple interest for short tenors", () => {
    const result = calculateMaturity({
      principal: 10000,
      ratePercent: 8,
      tenorMonths: 6,
      compounding: "quarterly",
    });

    expect(result.maturityAmount).toBe(10400);
    expect(result.interestEarned).toBe(400);
  });

  it("uses compound interest for one year or more", () => {
    const result = calculateMaturity({
      principal: 10000,
      ratePercent: 8,
      tenorMonths: 12,
      compounding: "quarterly",
    });

    expect(result.maturityAmount).toBeGreaterThan(10800);
    expect(result.interestEarned).toBeGreaterThan(800);
  });
});
