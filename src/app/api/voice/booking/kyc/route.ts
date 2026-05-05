import { z } from "zod";

import { cacheGet, cacheSet } from "@/lib/server/cache";
import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { updateUserMemory } from "@/lib/server/persistence";
import { completeMockKycHandoff, type VoiceBookingDraft } from "@/lib/voice-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

const completeKycSchema = z.object({
  draftId: z.string(),
});

const KYC_ROUTE_META = {
  mockKyc: true,
  collectsRealDocuments: false,
  handoffOnly: true,
} as const;

function bookingKey(userId: string) {
  return `voice_booking:${userId}`;
}

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const input = completeKycSchema.parse(await request.json());
    const existing = await cacheGet<VoiceBookingDraft>(bookingKey(auth.session.uid));
    if (!existing || existing.draftId !== input.draftId) {
      return jsonError("No matching KYC handoff draft was found.", 404);
    }

    const draft = completeMockKycHandoff(existing);
    await cacheSet(bookingKey(auth.session.uid), draft, 60 * 60 * 24);
    await updateUserMemory(auth.session.uid, {
      lastVoiceFlow: {
        status: "completed",
        updatedAt: draft.updatedAt,
      },
      bookingDraft: {
        draftId: draft.draftId,
        bankId: draft.selectedBank.bankId,
        bankName: draft.selectedBank.bankName,
        amount: draft.amount,
        tenorMonths: draft.tenorMonths,
        rate: draft.rate,
        maturityAmount: draft.maturityAmount,
        status: draft.status,
        updatedAt: draft.updatedAt,
      },
      kycHandoffState: {
        status: "completed",
        draftId: draft.draftId,
        updatedAt: draft.updatedAt,
      },
    });

    return jsonSuccess({ draft, meta: KYC_ROUTE_META });
  } catch (error) {
    return handleRouteError(error, "Failed to complete mock KYC handoff", {
      zodMessage: "Invalid KYC handoff request",
    });
  }
}
