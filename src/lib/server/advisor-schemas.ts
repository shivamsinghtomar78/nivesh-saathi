import { z } from "zod";

export const appLanguageSchema = z.enum(["en", "hi", "hinglish", "ta", "te"]);
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
  officialUrl: z.string().url(),
  sourceLabel: z.string(),
  sourceUrl: z.string().url(),
  asOf: z.string(),
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
    "explain_term",
    "switch_language",
    "open_voice",
    "open_official_site",
    "sign_in",
  ]),
  icon: z.string().optional(),
  bankId: z.string().optional(),
  termId: z.string().optional(),
  url: z.string().optional(),
});
export type AdvisorAction = z.infer<typeof advisorActionSchema>;

export const conversationModeSchema = z.enum(["chat", "voice"]);
export type ConversationMode = z.infer<typeof conversationModeSchema>;

export const conversationalUiModeSchema = z.enum([
  "conversational",
  "comparison",
  "calculator",
  "recommendation",
  "analytics",
  "exploration",
  "onboarding",
]);
export type ConversationalUiMode = z.infer<typeof conversationalUiModeSchema>;

export const advisorUiDataTypeSchema = z.enum([
  "fd_rates",
  "maturity_projection",
  "bank_safety",
  "portfolio",
  "tax",
  "general",
]);
export type AdvisorUiDataType = z.infer<typeof advisorUiDataTypeSchema>;

export const advisorUiVisualizationSchema = z.enum([
  "comparison_table",
  "rate_cards",
  "maturity_chart",
  "timeline",
  "calculator",
  "recommendation_cards",
  "portfolio_split",
  "trend_chart",
  "insight_panel",
]);
export type AdvisorUiVisualization = z.infer<typeof advisorUiVisualizationSchema>;

export const advisorUiSchema = z.object({
  mode: conversationalUiModeSchema.default("conversational"),
  expand: z.boolean().default(false),
  entities: z.array(z.string().trim().min(1)).max(8).default([]),
  dataType: advisorUiDataTypeSchema.default("general"),
  visualizations: z.array(advisorUiVisualizationSchema).max(8).default([]),
  componentHints: z.array(z.string().trim().min(1)).max(8).default([]),
  actionButtons: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        type: z.enum(["primary", "secondary"]).default("secondary"),
        action: z.enum([
          "ask_followup",
          "adjust_amount",
          "adjust_tenor",
          "run_calculator",
          "open_compare",
          "open_voice",
        ]),
        prompt: z.string().trim().max(220).optional(),
        url: z.string().url().optional(),
      })
    )
    .max(4)
    .default([]),
  prefetchKey: z.string().trim().optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
});
export type AdvisorUi = z.infer<typeof advisorUiSchema>;

export const portfolioSplitAllocationSchema = z.object({
  bankId: z.string(),
  bankName: z.string(),
  allocationAmount: z.number(),
  rate: z.number(),
  maturityAmount: z.number(),
});
export type PortfolioSplitAllocation = z.infer<typeof portfolioSplitAllocationSchema>;

export const portfolioSplitSchema = z.object({
  totalAmount: z.number(),
  allocations: z.array(portfolioSplitAllocationSchema),
  totalMaturity: z.number(),
  blendedRate: z.number(),
});
export type PortfolioSplit = z.infer<typeof portfolioSplitSchema>;

export const advisorResponseSchema = z.object({
  text: z.string(),
  rateCards: z.array(advisorRateCardSchema).default([]),
  actions: z.array(advisorActionSchema).default([]),
  glossary: z.array(glossaryItemSchema).default([]),
  followUpPrompt: z.string().default(""),
  warnings: z.array(z.string()).default([]),
  tone: z.enum(["informative", "celebratory", "cautionary"]).default("informative"),
  /** Smart follow-up chips generated based on context */
  suggestedChips: z.array(z.string()).default([]),
  /** Suggestion to switch modes when content is better suited for another interface */
  modeSwitchSuggestion: z.object({
    targetMode: conversationModeSchema,
    reason: z.string(),
  }).optional(),
  portfolioSplit: portfolioSplitSchema.optional(),
  showCalculator: z.boolean().optional(),
  showTimeMachine: z.boolean().optional(),
  ui: advisorUiSchema.optional(),
});
export type AdvisorResponse = z.infer<typeof advisorResponseSchema>;

const chatLadderBlockSchema = z.object({
  label: z.string(),
  amount: z.number(),
  tenureMonths: z.number().int().positive(),
  ratePercent: z.number(),
  maturityAmount: z.number(),
  maturityDate: z.string(),
  sequence: z.number().int().positive(),
});

export const chatLadderPlanSchema = z.object({
  totalAmount: z.number(),
  goalLabel: z.string(),
  assumedRatePercent: z.number(),
  totalMaturity: z.number(),
  totalInterest: z.number(),
  blocks: z.array(chatLadderBlockSchema).max(6),
});

export const chatCompareSnapshotSchema = z.object({
  amount: z.number(),
  tenorMonths: z.number().int().positive(),
  bankType: bankTypeFilterSchema,
  seniorCitizen: z.boolean(),
  topBanks: z.array(
    z.object({
      bankId: z.string(),
      bankName: z.string(),
      ratePercent: z.number(),
      maturityAmount: z.number().optional(),
    })
  ).max(5),
  updatedAt: z.string(),
});

export type ChatLadderPlanContext = z.infer<typeof chatLadderPlanSchema>;
export type ChatCompareSnapshotContext = z.infer<typeof chatCompareSnapshotSchema>;

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(800),
  language: appLanguageSchema.default("en"),
  threadId: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  requestId: z.string().trim().optional(),
  amount: z.number().int().positive().optional(),
  tenorMonths: z.number().int().positive().optional(),
  seniorCitizen: z.boolean().optional(),
  bankType: bankTypeFilterSchema.optional(),
  shortlistBankIds: z.array(z.string().trim().min(1)).max(10).optional(),
  ladderPlan: chatLadderPlanSchema.optional(),
  compareSnapshot: chatCompareSnapshotSchema.optional(),
  prefetchKey: z.string().trim().optional(),
  uiIntentHint: advisorUiSchema.partial().optional(),
  /** Current interaction mode — voice responses are shortened automatically */
  mode: conversationModeSchema.default("chat"),
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
