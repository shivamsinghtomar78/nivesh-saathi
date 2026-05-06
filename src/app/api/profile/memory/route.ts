import { jsonSuccess, handleRouteError } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { getUserMemory, updateUserMemory } from "@/lib/server/persistence";
import {
  buildAssistantRetrievalContext,
  exportAssistantMemory,
  listAssistantMemories,
  resetAssistantMemory,
  upsertAssistantMemory,
  upsertUserPreferences,
} from "@/lib/server/assistant-memory";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateMemorySchema = z.object({
  investmentGoals: z.string().trim().min(1).max(80).optional(),
  amount: z.number().int().positive().max(100000000).optional(),
  preferredTenorMonths: z.number().int().positive().max(120).optional(),
  riskTolerance: z
    .enum(["safety_first", "balanced", "yield_first"])
    .optional(),
  bankTypePreference: z
    .enum(["all", "public", "private", "small-finance"])
    .optional(),
  pastBanksConsidered: z.array(z.string().trim().min(1)).max(10).optional(),
  seniorCitizen: z.boolean().optional(),
  languagePreference: z.enum(["en", "hi", "hinglish", "ta", "te"]).optional(),
  lastVoiceFlow: z
    .object({
      status: z.enum(["started", "recommended", "booking_started", "kyc_handoff", "completed"]),
      updatedAt: z.string(),
      lastTranscript: z.string().trim().max(800).optional(),
    })
    .optional(),
  bookingDraft: z
    .object({
      draftId: z.string(),
      bankId: z.string(),
      bankName: z.string(),
      amount: z.number().int().positive(),
      tenorMonths: z.number().int().positive(),
      rate: z.string(),
      maturityAmount: z.number().int().nonnegative(),
      status: z.enum(["draft", "confirmed", "kyc_handoff", "completed"]),
      updatedAt: z.string(),
    })
    .optional(),
  kycHandoffState: z
    .object({
      status: z.enum(["not_started", "ready", "handoff_shown", "completed"]),
      draftId: z.string().optional(),
      updatedAt: z.string(),
    })
    .optional(),
  themePreference: z.enum(["light", "dark", "system"]).optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "export") {
      const exported = await exportAssistantMemory(auth.session.uid);
      return jsonSuccess({ export: exported });
    }

    if (mode === "context") {
      const query = searchParams.get("query") ?? "";
      const conversationId = searchParams.get("conversationId") ?? undefined;
      const context = await buildAssistantRetrievalContext({
        userId: auth.session.uid,
        conversationId,
        query,
      });
      return jsonSuccess(context);
    }

    const [legacyMemory, memories] = await Promise.all([
      getUserMemory(auth.session.uid),
      listAssistantMemories({ userId: auth.session.uid, limit: 100 }),
    ]);

    return jsonSuccess({ memory: legacyMemory, memories });
  } catch (error) {
    return handleRouteError(error, "Failed to fetch user memory");
  }
}

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const data = updateMemorySchema.parse(body);

    await updateUserMemory(auth.session.uid, data);
    await upsertUserPreferences(auth.session.uid, {
      languagePreference: data.languagePreference,
      themePreference: data.themePreference,
      financialPreferences: {
        investmentGoals: data.investmentGoals,
        amount: data.amount,
        preferredTenorMonths: data.preferredTenorMonths,
        riskTolerance: data.riskTolerance,
        bankTypePreference: data.bankTypePreference,
        pastBanksConsidered: data.pastBanksConsidered,
        seniorCitizen: data.seniorCitizen,
      },
    }).catch(() => null);

    const preferenceSummary = Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
      .join("; ");
    if (preferenceSummary) {
      await upsertAssistantMemory({
        userId: auth.session.uid,
        memoryType: "preference",
        key: "profile_preferences",
        value: preferenceSummary,
        sanitizedValue: preferenceSummary,
        language: data.languagePreference,
        priority: 90,
        confidence: 0.95,
        metadata: { source: "profile_memory_api" },
      }).catch(() => null);
    }

    return jsonSuccess({ updated: true });
  } catch (error) {
    return handleRouteError(error, "Failed to update user memory", {
      zodMessage: "Invalid memory update payload",
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    await resetAssistantMemory(auth.session.uid);
    await updateUserMemory(auth.session.uid, {
      compactSummary: "",
      lastUserMessage: "",
      lastAssistantSummary: "",
      pastBanksConsidered: [],
      lastRecommendedBanks: [],
    });

    return jsonSuccess({ reset: true });
  } catch (error) {
    return handleRouteError(error, "Failed to reset user memory");
  }
}
