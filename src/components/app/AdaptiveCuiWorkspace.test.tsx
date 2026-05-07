import { renderToStaticMarkup } from "react-dom/server";
import type React from "react";
import { describe, expect, it, vi } from "vitest";

import type { AdvisorUi } from "@/lib/server/advisor-schemas";
import type { ConversationMessage } from "@/stores/conversationStore";

vi.mock("recharts", () => ({
  Bar: () => null,
  BarChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

import AdaptiveCuiWorkspace from "@/components/app/AdaptiveCuiWorkspace";

const comparisonUi: AdvisorUi = {
  mode: "comparison",
  expand: true,
  entities: ["HDFC Bank", "State Bank of India"],
  dataType: "fd_rates",
  visualizations: ["comparison_table", "rate_cards", "maturity_chart"],
  componentHints: ["side-by-side bank comparison"],
  actionButtons: [
    {
      label: "Compare more rates",
      type: "primary",
      action: "open_compare",
    },
  ],
  confidence: "high",
};

const message: ConversationMessage = {
  id: "bot-1",
  role: "bot",
  content: "HDFC has a slightly higher sample FD rate than SBI for this tenor.",
  timestamp: "10:31 AM",
  language: "EN",
  source: "chat",
  ui: comparisonUi,
  rateCards: [
    {
      bankId: "hdfc",
      bankName: "HDFC Bank",
      bankType: "private",
      tenor: "1 year",
      tenorMonths: 12,
      rate: "7.75% p.a.",
      rateValue: 7.75,
      maturityAmount: 107981,
      interestEarned: 7981,
      maturityPreview: "Rs 1,00,000 -> Rs 1,07,981",
      sourceLabel: "Demo seed data",
      asOf: "2026-04-28",
    },
    {
      bankId: "sbi",
      bankName: "State Bank of India",
      bankType: "public",
      tenor: "1 year",
      tenorMonths: 12,
      rate: "7.50% p.a.",
      rateValue: 7.5,
      maturityAmount: 107714,
      interestEarned: 7714,
      maturityPreview: "Rs 1,00,000 -> Rs 1,07,714",
      sourceLabel: "Demo seed data",
      asOf: "2026-04-28",
    },
  ],
};

describe("AdaptiveCuiWorkspace", () => {
  it("renders comparison workspace data from assistant UI metadata", () => {
    const html = renderToStaticMarkup(
      <AdaptiveCuiWorkspace ui={comparisonUi} message={message} />
    );

    expect(html).toContain("FD Comparison");
    expect(html).toContain("HDFC Bank");
    expect(html).toContain("State Bank of India");
    expect(html).toContain("Yield Shape");
    expect(html).toContain("Compare more rates");
  });

  it("renders loading skeletons while predictive prefetch is in flight", () => {
    const html = renderToStaticMarkup(
      <AdaptiveCuiWorkspace
        ui={{
          mode: "exploration",
          expand: true,
          entities: [],
          dataType: "general",
          visualizations: ["insight_panel"],
          componentHints: [],
          actionButtons: [],
          confidence: "low",
        }}
        predictiveStatus="loading"
      />
    );

    expect(html).toContain("Context Board");
    expect(html).toContain("Top rate");
  });
});
