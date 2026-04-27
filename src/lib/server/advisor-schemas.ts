import { z } from "zod";

export const appLanguageSchema = z.enum(["en", "hi", "ta", "bn"]);
export type AppLanguage = z.infer<typeof appLanguageSchema>;

export const bankTypeFilterSchema = z.enum([
  "all",
  "public",
  "private",
  "small-finance",
]);
export type BankTypeFilter = z.infer<typeof bankTypeFilterSchema>;

export const advisorRateCardSchema = z.object({
  bankId: z.string(),
  bankName: z.string(),
  bankNameLocal: z.string(),
  bankType: z.enum(["public", "private", "small-finance"]),
  rate: z.string(),
  rateValue: z.number(),
  tenorMonths: z.number().int().positive(),
  tenorLabel: z.string(),
  maturityAmount: z.number().int().nonnegative(),
  interestEarned: z.number().int().nonnegative(),
  minAmount: z.number().int().nonnegative(),
  maxAmount: z.number().int().positive(),
  maturityPreview: z.string(),
  badge: z.string().optional(),
  safetyNote: z.string(),
});
export type AdvisorRateCard = z.infer<typeof advisorRateCardSchema>;

export const glossaryItemSchema = z.object({
  termId: z.string(),
  term: z.string(),
  plain: z.string(),
  example: z.string(),
});
export type GlossaryItem = z.infer<typeof glossaryItemSchema>;

export const advisorActionSchema = z.object({
  label: z.string(),
  type: z.enum(["primary", "secondary"]),
  action: z.enum([
    "open_compare",
    "start_booking",
    "explain_term",
    "open_kyc_help",
    "switch_language",
  ]),
  icon: z.string().optional(),
  bankId: z.string().optional(),
  termId: z.string().optional(),
  url: z.string().optional(),
});
export type AdvisorAction = z.infer<typeof advisorActionSchema>;

export const advisorResponseSchema = z.object({
  text: z.string(),
  rateCards: z.array(advisorRateCardSchema).default([]),
  actions: z.array(advisorActionSchema).default([]),
  glossary: z.array(glossaryItemSchema).default([]),
  bookingSteps: z.array(z.string()).default([]),
  followUpPrompt: z.string().default(""),
  warnings: z.array(z.string()).default([]),
});
export type AdvisorResponse = z.infer<typeof advisorResponseSchema>;

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1),
  language: appLanguageSchema.default("hi"),
  threadId: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  amount: z.number().int().positive().optional(),
  tenorMonths: z.number().int().positive().optional(),
  seniorCitizen: z.boolean().optional(),
  bankType: bankTypeFilterSchema.optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const fdRatesQuerySchema = z.object({
  bankId: z.string().trim().min(1).optional(),
  tenorMonths: z.number().int().positive().optional(),
  amount: z.number().int().positive().optional(),
  seniorCitizen: z.boolean().optional(),
  bankType: bankTypeFilterSchema.optional(),
  limit: z.number().int().positive().max(25).optional(),
});
export type FDRatesQuery = z.infer<typeof fdRatesQuerySchema>;

export const maturityRequestSchema = z.object({
  principal: z.number().positive(),
  ratePercent: z.number().nonnegative(),
  tenorMonths: z.number().int().positive(),
  compounding: z.enum(["quarterly", "monthly", "annual"]).default("quarterly"),
});
export type MaturityRequest = z.infer<typeof maturityRequestSchema>;

export const bookingIntentInputSchema = z.object({
  bankId: z.string().trim().min(1),
  amount: z.number().int().positive(),
  tenorMonths: z.number().int().positive(),
  language: appLanguageSchema.default("hi"),
  userId: z.string().trim().optional(),
  status: z.enum(["draft", "kyc_pending", "redirected"]).default("draft"),
});
export type BookingIntentInput = z.infer<typeof bookingIntentInputSchema>;
