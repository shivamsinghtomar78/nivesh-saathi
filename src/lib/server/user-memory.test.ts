import { describe, expect, it } from "vitest";

import type { AdvisorResponse } from "@/lib/server/advisor-schemas";
import {
  buildMemoryPromptContext,
  buildMemoryRecallLine,
  buildMemoryUpdateFromTurn,
  shouldSurfaceMemoryRecall,
} from "@/lib/server/user-memory";

const advisorResponse: AdvisorResponse = {
  text: "HDFC Bank is a strong fit for your FD.",
  rateCards: [
    {
      bankId: "hdfc",
      bankName: "HDFC Bank",
      bankNameLocal: "HDFC Bank",
      bankType: "private",
      rate: "7.75%",
      rateValue: 7.75,
      tenorMonths: 60,
      tenorLabel: "5 years",
      maturityAmount: 146784,
      interestEarned: 46784,
      minAmount: 1000,
      maxAmount: 10000000,
      maturityPreview: "Rs 1,00,000 -> Rs 1,46,784",
      badge: "POPULAR",
      safetyNote: "Deposits up to Rs 5 lakh per bank are protected by DICGC.",
      officialUrl: "https://example.com/hdfc",
      sourceLabel: "Seed rates",
      sourceUrl: "https://example.com/source",
      asOf: "2026-05-02",
    },
  ],
  actions: [],
  glossary: [],
  followUpPrompt: "",
  warnings: [],
  tone: "informative",
  suggestedChips: [],
};

describe("user memory", () => {
  it("builds a rolling profile update from an advisor turn", () => {
    const memory = buildMemoryUpdateFromTurn({
      existingMemory: {
        uid: "user-1",
        pastBanksConsidered: ["sbi"],
        interactionCount: 2,
        updatedAt: "2026-05-01T00:00:00.000Z",
      },
      userId: "user-1",
      threadId: "thread-1",
      language: "en",
      userMessage: "I want highest return for 1 lakh over 5 years",
      assistantMessage: advisorResponse.text,
      response: advisorResponse,
      amount: 100000,
      tenorMonths: 60,
      bankType: "private",
      seniorCitizen: false,
    });

    expect(memory.uid).toBe("user-1");
    expect(memory.amount).toBe(100000);
    expect(memory.preferredTenorMonths).toBe(60);
    expect(memory.riskTolerance).toBe("yield_first");
    expect(memory.interactionCount).toBe(3);
    expect(memory.pastBanksConsidered).toEqual(["hdfc", "sbi"]);
    expect(memory.lastRecommendedBanks?.[0]).toMatchObject({
      bankId: "hdfc",
      bankName: "HDFC Bank",
      rate: "7.75%",
      tenorMonths: 60,
    });
    expect(memory.compactSummary).toContain("Last top FD discussed: HDFC Bank");
  });

  it("keeps prompt memory compact and explicit", () => {
    const memory = buildMemoryUpdateFromTurn({
      existingMemory: null,
      userId: "user-1",
      threadId: "thread-1",
      language: "en",
      userMessage: "Suggest a safe FD for 100000",
      assistantMessage: advisorResponse.text,
      response: advisorResponse,
      amount: 100000,
      tenorMonths: 60,
      bankType: "private",
    });

    const context = buildMemoryPromptContext(memory);

    expect(context).toContain("Persistent user memory");
    expect(context).toContain("HDFC Bank");
    expect(context.length).toBeLessThanOrEqual(2000);
  });

  it("surfaces onboarding-only memory for vague follow-ups", () => {
    const memory = {
      uid: "user-1",
      investmentGoals: "wealth_creation",
      amount: 100000,
      preferredTenorMonths: 60,
      updatedAt: "2026-05-02T00:00:00.000Z",
    };

    expect(
      shouldSurfaceMemoryRecall({
        message: "best fd",
        memory,
      })
    ).toBe(true);

    const recallLine = buildMemoryRecallLine(memory, "en");
    expect(recallLine).toContain("I remember you were looking at");
    expect(recallLine).toContain("1,00,000 for 60 months");
  });
});
