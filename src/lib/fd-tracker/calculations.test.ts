import { describe, expect, it } from "vitest";

import {
  buildFdDashboard,
  calculateExpectedMaturity,
  daysBetweenDateKeys,
} from "@/lib/fd-tracker/calculations";
import type { FdRecordDto } from "@/lib/fd-tracker/types";

function makeFd(overrides: Partial<FdRecordDto> = {}): FdRecordDto {
  return {
    id: overrides.id ?? "fd-1",
    userId: "user-1",
    bankName: overrides.bankName ?? "HDFC Bank",
    amount: overrides.amount ?? 100000,
    interestRate: overrides.interestRate ?? 7.5,
    startDate: overrides.startDate ?? "2026-01-01",
    maturityDate: overrides.maturityDate ?? "2026-12-31",
    expectedMaturityAmount: overrides.expectedMaturityAmount ?? 107750,
    interestEarned: overrides.interestEarned ?? 7750,
    status: overrides.status ?? "active",
    fdType: null,
    payoutFrequency: "cumulative",
    notes: null,
    nominee: null,
    sourceType: "manual",
    receiptUrl: null,
    ocrConfidence: null,
    alert7Sent: false,
    alert1Sent: false,
    alertTodaySent: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("FD tracker calculations", () => {
  it("calculates expected cumulative maturity", () => {
    const maturity = calculateExpectedMaturity({
      amount: 100000,
      interestRate: 8,
      startDate: "2026-01-01",
      maturityDate: "2027-01-01",
      payoutFrequency: "cumulative",
    });

    expect(maturity.expectedMaturityAmount).toBeGreaterThan(108000);
    expect(maturity.interestEarned).toBeGreaterThan(8000);
  });

  it("counts days between date keys without local timezone drift", () => {
    expect(daysBetweenDateKeys("2026-05-02", "2026-05-09")).toBe(7);
    expect(daysBetweenDateKeys("2026-05-02", "2026-05-03")).toBe(1);
  });

  it("builds dashboard metrics and bank concentration insight", () => {
    const dashboard = buildFdDashboard(
      [
        makeFd({ id: "fd-1", bankName: "HDFC Bank", amount: 150000 }),
        makeFd({
          id: "fd-2",
          bankName: "SBI",
          amount: 50000,
          expectedMaturityAmount: 54000,
          interestEarned: 4000,
          maturityDate: "2026-05-08",
        }),
      ],
      [],
      new Date("2026-05-02T08:00:00.000Z")
    );

    expect(dashboard.summary.totalAmount).toBe(200000);
    expect(dashboard.summary.activeCount).toBe(2);
    expect(dashboard.bankDistribution[0].bankName).toBe("HDFC Bank");
    expect(dashboard.insights.some((insight) => insight.includes("HDFC"))).toBe(
      true
    );
    expect(dashboard.upcomingMaturities[0].bankName).toBe("SBI");
  });
});
