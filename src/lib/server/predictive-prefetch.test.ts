import { describe, expect, it, vi } from "vitest";

const predictiveState = vi.hoisted(() => ({
  cache: new Map<string, unknown>(),
}));

vi.mock("@/lib/server/cache", () => ({
  cacheGet: vi.fn(async (key: string) => predictiveState.cache.get(key) ?? null),
  cacheSet: vi.fn(async (key: string, value: unknown) => {
    predictiveState.cache.set(key, value);
  }),
}));

vi.mock("@/lib/server/mongo-repositories", () => ({
  getMongoFdRateById: vi.fn(async () => null),
  listMongoFdRates: vi.fn(async () => []),
}));

import {
  classifyPredictiveIntent,
  extractPredictiveAmount,
  extractPredictiveTenors,
  preparePredictivePrefetch,
} from "@/lib/server/predictive-prefetch";

describe("predictive prefetch intent classification", () => {
  it("detects high-confidence HDFC and SBI comparisons", () => {
    const prediction = classifyPredictiveIntent({
      transcript: "Compare HDFC and SBI FD rates",
    });

    expect(prediction.intent).toBe("compare_banks");
    expect(prediction.confidence).toBe("high");
    expect(prediction.ui.mode).toBe("comparison");
    expect(prediction.ui.expand).toBe(true);
    expect(prediction.entities.map((entity) => entity.bankId)).toEqual(
      expect.arrayContaining(["hdfc", "sbi"])
    );
  });

  it("routes top-bank and highest-return prompts to recommendations", () => {
    const topBanks = classifyPredictiveIntent({
      transcript: "Show me top 5 banks",
    });
    const highestReturn = classifyPredictiveIntent({
      transcript: "Which bank gives highest returns?",
    });

    expect(topBanks.intent).toBe("best_bank");
    expect(topBanks.ui.mode).toBe("recommendation");
    expect(highestReturn.intent).toBe("best_bank");
    expect(highestReturn.ui.mode).toBe("recommendation");
  });

  it("extracts maturity calculator amount and tenor", () => {
    const prediction = classifyPredictiveIntent({
      transcript: "Calculate maturity for 1 lakh over 2 years",
    });

    expect(prediction.intent).toBe("calculate_returns");
    expect(prediction.ui.mode).toBe("calculator");
    expect(prediction.amount).toBe(100000);
    expect(prediction.tenorMonths).toBe(24);
  });

  it("recognizes senior citizen FD prompts", () => {
    const prediction = classifyPredictiveIntent({
      transcript: "Senior citizen FD rates for SBI",
    });

    expect(prediction.intent).toBe("senior_citizen");
    expect(prediction.seniorCitizen).toBe(true);
    expect(prediction.ui.mode).toBe("recommendation");
    expect(prediction.entities[0]?.bankId).toBe("sbi");
  });

  it("detects tenor comparisons", () => {
    const prediction = classifyPredictiveIntent({
      transcript: "Compare 1 year vs 5 year FD",
    });

    expect(prediction.intent).toBe("compare_banks");
    expect(prediction.ui.mode).toBe("comparison");
    expect(prediction.comparisonTenors).toEqual([12, 60]);
  });

  it("keeps vague prompts low confidence", () => {
    const prediction = classifyPredictiveIntent({ transcript: "hello" });

    expect(prediction.intent).toBe("general");
    expect(prediction.confidence).toBe("low");
    expect(prediction.ui.expand).toBe(false);
  });

  it("parses common Indian amount and tenor expressions", () => {
    expect(extractPredictiveAmount("invest 2.5 lakh")).toBe(250000);
    expect(extractPredictiveAmount("rs 75,000 FD")).toBe(75000);
    expect(extractPredictiveTenors("1 year vs 18 months")).toEqual([12, 18]);
  });
});

describe("predictive prefetch cache hydration", () => {
  it("warms deterministic FD data and reuses a stable cache key", async () => {
    const input = {
      transcript: "Compare HDFC and SBI FD rates for 1 lakh",
      language: "en" as const,
      turnId: "turn-cache",
      sequence: 1,
    };

    const first = await preparePredictivePrefetch({
      userId: "predictive-test-user",
      input,
    });
    const second = await preparePredictivePrefetch({
      userId: "predictive-test-user",
      input: { ...input, sequence: 2 },
    });

    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(second.prefetchKey).toBe(first.prefetchKey);
    expect(second.data.rateCards.length).toBeGreaterThan(0);
    expect(second.ui.prefetchKey).toBe(first.prefetchKey);
  });
});
