import { describe, expect, it } from "vitest";

import {
  buildRateSourceDisclosure,
  buildVoiceComparisonPrompt,
  detectVoiceLanguageMode,
  extractVoiceAmount,
  extractVoiceTenorMonths,
  getRateFreshnessStatus,
  getVoiceClarification,
  isBookingIntent,
  parseVoiceCommand,
} from "@/lib/voice-flow";

describe("voice-flow", () => {
  it("detects Hinglish when English is selected but Hindi sentence flow is spoken", () => {
    expect(detectVoiceLanguageMode("1 lakh ke liye best FD batao", "en")).toBe(
      "hinglish"
    );
  });

  it("keeps explicit Hindi mode when Hindi is selected", () => {
    expect(detectVoiceLanguageMode("best FD batao", "hi")).toBe("hi");
  });

  it("extracts amount and tenure from common low-tech voice phrases", () => {
    expect(extractVoiceAmount("5 lakh ke liye FD")).toBe(500000);
    expect(extractVoiceTenorMonths("3 saal ke liye")).toBe(36);
  });

  it("extracts Devanagari Hindi amount and tenure phrases", () => {
    expect(extractVoiceAmount("पांच लाख की FD चाहिए")).toBe(500000);
    expect(extractVoiceTenorMonths("तीन साल के लिए")).toBe(36);
  });

  it("asks for missing amount and tenor on vague FD comparison asks", () => {
    const clarification = getVoiceClarification("best FD batao", "hinglish");
    expect(clarification?.field).toBe("amount_and_tenor");
    expect(clarification?.chips).toHaveLength(3);
  });

  it("does not block booking commands behind clarification", () => {
    expect(isBookingIntent("book this FD and continue KYC")).toBe(true);
    expect(getVoiceClarification("book this FD and continue KYC", "en")).toBeNull();
  });

  it("builds a voice prompt that requires exactly three options", () => {
    const prompt = buildVoiceComparisonPrompt({
      text: "compare FD",
      amount: 100000,
      tenorMonths: 12,
      language: "en",
    });

    expect(prompt).toContain("Compare exactly 3 FD options");
    expect(prompt).toContain("Amount: Rs 100000");
    expect(prompt).toContain("Tenure: 12 months");
  });

  it("parses selected booking commands across Hinglish and Hindi", () => {
    expect(parseVoiceCommand("book option 2", "en")).toMatchObject({
      command: "book",
      selectedOption: 2,
    });
    expect(parseVoiceCommand("दूसरा विकल्प बुक करें", "hi")).toMatchObject({
      command: "book",
      selectedOption: 2,
    });
  });

  it("parses deterministic call control commands", () => {
    expect(parseVoiceCommand("repeat the answer", "en").command).toBe("repeat");
    expect(parseVoiceCommand("start over", "en").command).toBe("start_over");
    expect(parseVoiceCommand("continue kyc", "hinglish").command).toBe("continue_kyc");
    expect(parseVoiceCommand("stop", "en").command).toBe("stop");
  });

  it("marks rate data stale and builds spoken source disclosure", () => {
    const cards = [
      {
        asOf: "2026-04-01",
        sourceLabel: "Demo seed data",
        sourceUrl: "https://example.com",
      },
    ];
    const status = getRateFreshnessStatus(cards, new Date("2026-04-10T00:00:00Z"));

    expect(status?.stale).toBe(true);
    expect(buildRateSourceDisclosure(cards, "en", new Date("2026-04-10T00:00:00Z"))).toContain(
      "verify the final rate"
    );
  });
});
