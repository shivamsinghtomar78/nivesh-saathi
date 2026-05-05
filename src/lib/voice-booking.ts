import { z } from "zod";

import type { AppLanguage } from "@/lib/server/advisor-schemas";

export const bookingDraftStatusSchema = z.enum([
  "draft",
  "confirmed",
  "kyc_handoff",
  "completed",
]);
export type BookingDraftStatus = z.infer<typeof bookingDraftStatusSchema>;

export const bookingConfirmationStateSchema = z.enum([
  "needs_confirmation",
  "confirmed",
]);
export type BookingConfirmationState = z.infer<typeof bookingConfirmationStateSchema>;

export const voiceBookingDraftSchema = z.object({
  draftId: z.string(),
  userId: z.string(),
  language: z.enum(["en", "hi", "hinglish", "ta", "bn"]).default("en"),
  selectedOption: z.number().int().min(1).max(3).default(1),
  confirmationState: bookingConfirmationStateSchema.default("needs_confirmation"),
  selectedBank: z.object({
    bankId: z.string(),
    bankName: z.string(),
    bankNameLocal: z.string().optional(),
    officialUrl: z.string().url(),
  }),
  amount: z.number().int().positive(),
  tenorMonths: z.number().int().positive(),
  tenorLabel: z.string(),
  rate: z.string(),
  rateValue: z.number().nonnegative(),
  maturityAmount: z.number().int().nonnegative(),
  interestEarned: z.number().int().nonnegative(),
  maturityPreview: z.string(),
  safetyNote: z.string(),
  rateSource: z
    .object({
      sourceLabel: z.string().optional(),
      sourceUrl: z.string().url().optional(),
      asOf: z.string().optional(),
    })
    .optional(),
  payoutFrequency: z.enum(["cumulative", "monthly", "quarterly"]).default("cumulative"),
  seniorCitizen: z.boolean().default(false),
  nomineeName: z.string().trim().max(80).optional().nullable(),
  customer: z.object({
    name: z.string().trim().max(120).optional().nullable(),
    phoneNumber: z.string().trim().max(30).optional().nullable(),
    email: z.string().trim().max(160).optional().nullable(),
  }),
  consentAccepted: z.boolean().default(false),
  kyc: z.object({
    status: z.enum(["not_started", "ready", "handoff_shown", "completed"]).default("not_started"),
    requiredDocuments: z.array(z.string()),
    handoffMessage: z.string(),
    completedAt: z.string().optional(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
  status: bookingDraftStatusSchema,
});
export type VoiceBookingDraft = z.infer<typeof voiceBookingDraftSchema>;

export const createBookingDraftRequestSchema = z.object({
  language: z.enum(["en", "hi", "hinglish", "ta", "bn"]).default("en"),
  selectedOption: z.number().int().min(1).max(3).default(1),
  rateCard: z.object({
    bankId: z.string(),
    bankName: z.string(),
    bankNameLocal: z.string().optional(),
    officialUrl: z.string().url(),
    rate: z.string(),
    rateValue: z.number().nonnegative(),
    tenorMonths: z.number().int().positive(),
    tenorLabel: z.string(),
    maturityAmount: z.number().int().nonnegative(),
    interestEarned: z.number().int().nonnegative(),
    maturityPreview: z.string(),
    safetyNote: z.string(),
    sourceLabel: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    asOf: z.string().optional(),
  }),
  customer: z
    .object({
      name: z.string().trim().max(120).optional().nullable(),
      phoneNumber: z.string().trim().max(30).optional().nullable(),
      email: z.string().trim().max(160).optional().nullable(),
    })
    .optional(),
  seniorCitizen: z.boolean().optional(),
  nomineeName: z.string().trim().max(80).optional().nullable(),
  payoutFrequency: z.enum(["cumulative", "monthly", "quarterly"]).optional(),
});
export type CreateBookingDraftRequest = z.infer<typeof createBookingDraftRequestSchema>;

export const updateBookingDraftRequestSchema = z.object({
  draftId: z.string(),
  confirmationState: bookingConfirmationStateSchema.optional(),
  payoutFrequency: z.enum(["cumulative", "monthly", "quarterly"]).optional(),
  seniorCitizen: z.boolean().optional(),
  nomineeName: z.string().trim().max(80).optional().nullable(),
  customer: z
    .object({
      name: z.string().trim().max(120).optional().nullable(),
      phoneNumber: z.string().trim().max(30).optional().nullable(),
      email: z.string().trim().max(160).optional().nullable(),
    })
    .optional(),
  consentAccepted: z.boolean().optional(),
  status: bookingDraftStatusSchema.optional(),
});
export type UpdateBookingDraftRequest = z.infer<typeof updateBookingDraftRequestSchema>;

const REQUIRED_DOCUMENTS = ["PAN card", "Aadhaar card", "Mobile number linked for OTP"];

function handoffMessage(language: AppLanguage) {
  if (language === "hi") {
    return "अब बैंक KYC के लिए PAN, Aadhaar और OTP verification करेगा। यह prototype यहीं तक handoff दिखाता है।";
  }
  if (language === "hinglish") {
    return "Ab bank KYC ke liye PAN, Aadhaar aur OTP verification lega. Is prototype mein handoff yahin complete hota hai.";
  }
  return "The bank will now verify PAN, Aadhaar, and OTP details. This prototype completes the journey at KYC handoff.";
}

export function createVoiceBookingDraft(input: {
  userId: string;
  language: AppLanguage;
  selectedOption?: number;
  rateCard: CreateBookingDraftRequest["rateCard"];
  customer?: CreateBookingDraftRequest["customer"];
  seniorCitizen?: boolean;
  nomineeName?: string | null;
  payoutFrequency?: "cumulative" | "monthly" | "quarterly";
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString();

  return voiceBookingDraftSchema.parse({
    draftId: crypto.randomUUID(),
    userId: input.userId,
    language: input.language,
    selectedOption: input.selectedOption ?? 1,
    confirmationState: "needs_confirmation",
    selectedBank: {
      bankId: input.rateCard.bankId,
      bankName: input.rateCard.bankName,
      bankNameLocal: input.rateCard.bankNameLocal,
      officialUrl: input.rateCard.officialUrl,
    },
    amount: inferAmountFromPreview(input.rateCard.maturityPreview),
    tenorMonths: input.rateCard.tenorMonths,
    tenorLabel: input.rateCard.tenorLabel,
    rate: input.rateCard.rate,
    rateValue: input.rateCard.rateValue,
    maturityAmount: input.rateCard.maturityAmount,
    interestEarned: input.rateCard.interestEarned,
    maturityPreview: input.rateCard.maturityPreview,
    safetyNote: input.rateCard.safetyNote,
    rateSource: {
      sourceLabel: input.rateCard.sourceLabel,
      sourceUrl: input.rateCard.sourceUrl,
      asOf: input.rateCard.asOf,
    },
    payoutFrequency: input.payoutFrequency ?? "cumulative",
    seniorCitizen: input.seniorCitizen ?? false,
    nomineeName: input.nomineeName ?? null,
    customer: {
      name: input.customer?.name ?? null,
      phoneNumber: input.customer?.phoneNumber ?? null,
      email: input.customer?.email ?? null,
    },
    consentAccepted: false,
    kyc: {
      status: "ready",
      requiredDocuments: REQUIRED_DOCUMENTS,
      handoffMessage: handoffMessage(input.language),
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt,
    status: "draft",
  });
}

export function updateVoiceBookingDraft(
  draft: VoiceBookingDraft,
  updates: UpdateBookingDraftRequest
) {
  if (draft.draftId !== updates.draftId) {
    throw new Error("Booking draft mismatch");
  }

  return voiceBookingDraftSchema.parse({
    ...draft,
    payoutFrequency: updates.payoutFrequency ?? draft.payoutFrequency,
    seniorCitizen: updates.seniorCitizen ?? draft.seniorCitizen,
    nomineeName:
      updates.nomineeName === undefined ? draft.nomineeName : updates.nomineeName,
    customer: updates.customer
      ? {
          ...draft.customer,
          ...updates.customer,
        }
      : draft.customer,
    consentAccepted: updates.consentAccepted ?? draft.consentAccepted,
    confirmationState:
      updates.confirmationState ??
      (updates.consentAccepted || updates.status === "confirmed" || updates.status === "kyc_handoff"
        ? "confirmed"
        : draft.confirmationState),
    status: updates.status ?? draft.status,
    kyc:
      updates.status === "kyc_handoff"
        ? { ...draft.kyc, status: "handoff_shown" }
        : draft.kyc,
    updatedAt: new Date().toISOString(),
  });
}

export function completeMockKycHandoff(draft: VoiceBookingDraft) {
  const now = new Date().toISOString();
  return voiceBookingDraftSchema.parse({
    ...draft,
    consentAccepted: true,
    confirmationState: "confirmed",
    status: "completed",
    kyc: {
      ...draft.kyc,
      status: "completed",
      completedAt: now,
    },
    updatedAt: now,
  });
}

function inferAmountFromPreview(preview: string) {
  const firstNumber = preview.replace(/,/g, "").match(/(\d{4,9})/);
  return firstNumber ? Number(firstNumber[1]) : 50000;
}
