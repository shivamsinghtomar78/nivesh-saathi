import { jsonSuccess, handleRouteError } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { updateUserMemory } from "@/lib/server/persistence";
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
  languagePreference: z.enum(["en", "hi", "hinglish", "ta", "bn"]).optional(),
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

    return jsonSuccess({ updated: true });
  } catch (error) {
    return handleRouteError(error, "Failed to update user memory", {
      zodMessage: "Invalid memory update payload",
    });
  }
}
