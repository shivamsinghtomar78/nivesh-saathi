import { describe, expect, it } from "vitest";

import { buildAdvisorAppContext } from "@/lib/server/advisor-context";
import type { FdDashboardDto } from "@/lib/fd-tracker/types";

const dashboard: FdDashboardDto = {
  records: [],
  summary: {
    totalAmount: 500000,
    totalExpectedMaturity: 542000,
    totalInterestEarned: 42000,
    activeCount: 3,
    upcomingThisMonth: 1,
  },
  growthSeries: [],
  bankDistribution: [],
  maturityBars: [],
  maturityTimeline: [],
  insights: [],
  upcomingMaturities: [
    {
      id: "fd-1",
      bankName: "HDFC Bank",
      amount: 108000,
      maturityDate: "2026-05-10",
      daysLeft: 7,
      statusLabel: "7 days left",
    },
  ],
  alerts: [],
};

describe("advisor app context", () => {
  it("serializes dashboard, ladder, and compare context compactly", () => {
    const context = buildAdvisorAppContext({
      dashboard,
      ladderPlan: {
        totalAmount: 500000,
        goalLabel: "Balanced growth",
        assumedRatePercent: 7.5,
        totalMaturity: 540000,
        totalInterest: 40000,
        blocks: [
          {
            label: "Block 1",
            amount: 125000,
            tenureMonths: 12,
            ratePercent: 7.5,
            maturityAmount: 134000,
            maturityDate: "2027-05-03",
            sequence: 1,
          },
        ],
      },
      compareSnapshot: {
        amount: 125000,
        tenorMonths: 12,
        bankType: "all",
        seniorCitizen: false,
        topBanks: [
          {
            bankId: "hdfc",
            bankName: "HDFC Bank",
            ratePercent: 7.75,
            maturityAmount: 135000,
          },
        ],
        updatedAt: "2026-05-03T00:00:00.000Z",
      },
    });

    expect(context).toContain("3 active FDs");
    expect(context).toContain("HDFC Bank");
    expect(context).toContain("Balanced growth");
    expect(context).toContain("Top compared banks");
  });
});
