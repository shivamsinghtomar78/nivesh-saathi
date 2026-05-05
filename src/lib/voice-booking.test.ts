import { describe, expect, it } from "vitest";

import {
  completeMockKycHandoff,
  createVoiceBookingDraft,
  updateVoiceBookingDraft,
} from "@/lib/voice-booking";

const sampleRateCard = {
  bankId: "sbi",
  bankName: "State Bank of India",
  bankNameLocal: "State Bank of India",
  officialUrl: "https://sbi.co.in/fd",
  rate: "7.50% p.a.",
  rateValue: 7.5,
  tenorMonths: 12,
  tenorLabel: "1 year",
  maturityAmount: 107714,
  interestEarned: 7714,
  maturityPreview: "Rs 1,00,000 -> Rs 1,07,714",
  safetyNote: "Deposits up to Rs 5 lakh per bank are typically protected by DICGC cover.",
  sourceLabel: "Demo seed data",
  sourceUrl: "https://sbi.co.in/fd",
  asOf: "2026-04-28",
};

describe("voice-booking", () => {
  it("creates a complete booking draft ready for mock KYC handoff", () => {
    const draft = createVoiceBookingDraft({
      userId: "user-1",
      language: "hinglish",
      selectedOption: 2,
      rateCard: sampleRateCard,
      customer: {
        name: "Test User",
        phoneNumber: "9999999999",
        email: "test@example.com",
      },
    });

    expect(draft.status).toBe("draft");
    expect(draft.selectedOption).toBe(2);
    expect(draft.confirmationState).toBe("needs_confirmation");
    expect(draft.selectedBank.bankId).toBe("sbi");
    expect(draft.amount).toBe(100000);
    expect(draft.rateSource?.asOf).toBe("2026-04-28");
    expect(draft.kyc.status).toBe("ready");
    expect(draft.kyc.requiredDocuments).toContain("PAN card");
    expect(draft.kyc.requiredDocuments).toContain("Aadhaar card");
  });

  it("updates a draft and moves it to KYC handoff", () => {
    const draft = createVoiceBookingDraft({
      userId: "user-1",
      language: "en",
      rateCard: sampleRateCard,
    });

    const updated = updateVoiceBookingDraft(draft, {
      draftId: draft.draftId,
      consentAccepted: true,
      confirmationState: "confirmed",
      payoutFrequency: "monthly",
      status: "kyc_handoff",
    });

    expect(updated.consentAccepted).toBe(true);
    expect(updated.confirmationState).toBe("confirmed");
    expect(updated.payoutFrequency).toBe("monthly");
    expect(updated.status).toBe("kyc_handoff");
    expect(updated.kyc.status).toBe("handoff_shown");
  });

  it("completes the mock KYC handoff", () => {
    const draft = createVoiceBookingDraft({
      userId: "user-1",
      language: "hi",
      rateCard: sampleRateCard,
    });

    const completed = completeMockKycHandoff(draft);

    expect(completed.status).toBe("completed");
    expect(completed.kyc.status).toBe("completed");
    expect(completed.kyc.completedAt).toBeTruthy();
  });
});
