import { cacheGet, cacheSet } from "@/lib/server/cache";
import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { updateUserMemory } from "@/lib/server/persistence";
import {
  createBookingDraftRequestSchema,
  createVoiceBookingDraft,
  updateBookingDraftRequestSchema,
  updateVoiceBookingDraft,
  type VoiceBookingDraft,
} from "@/lib/voice-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

const BOOKING_TTL_SECONDS = 60 * 60 * 24;
const BOOKING_ROUTE_META = {
  storage: "cache",
  ttlSeconds: BOOKING_TTL_SECONDS,
  mockKyc: true,
} as const;

function bookingKey(userId: string) {
  return `voice_booking:${userId}`;
}

export async function GET(request: Request) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const draft = await cacheGet<VoiceBookingDraft>(bookingKey(auth.session.uid));
    return jsonSuccess({ draft, meta: BOOKING_ROUTE_META });
  } catch (error) {
    return handleRouteError(error, "Failed to load voice booking draft");
  }
}

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const input = createBookingDraftRequestSchema.parse(await request.json());
    const draft = createVoiceBookingDraft({
      userId: auth.session.uid,
      language: input.language,
      selectedOption: input.selectedOption,
      rateCard: input.rateCard,
      customer: {
        name: input.customer?.name ?? auth.session.name ?? null,
        phoneNumber: input.customer?.phoneNumber ?? auth.session.phone_number ?? null,
        email: input.customer?.email ?? auth.session.email ?? null,
      },
      seniorCitizen: input.seniorCitizen,
      nomineeName: input.nomineeName,
      payoutFrequency: input.payoutFrequency,
    });

    await cacheSet(bookingKey(auth.session.uid), draft, BOOKING_TTL_SECONDS);
    await updateUserMemory(auth.session.uid, {
      languagePreference: input.language,
      lastVoiceFlow: {
        status: "booking_started",
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
        status: "ready",
        draftId: draft.draftId,
        updatedAt: draft.updatedAt,
      },
    });

    return jsonSuccess({ draft, meta: BOOKING_ROUTE_META }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Failed to create voice booking draft", {
      zodMessage: "Invalid voice booking draft",
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const input = updateBookingDraftRequestSchema.parse(await request.json());
    const existing = await cacheGet<VoiceBookingDraft>(bookingKey(auth.session.uid));
    if (!existing) {
      return jsonError("No active voice booking draft was found.", 404);
    }

    const draft = updateVoiceBookingDraft(existing, input);
    await cacheSet(bookingKey(auth.session.uid), draft, BOOKING_TTL_SECONDS);
    await updateUserMemory(auth.session.uid, {
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
        status: draft.kyc.status,
        draftId: draft.draftId,
        updatedAt: draft.updatedAt,
      },
    });

    return jsonSuccess({ draft, meta: BOOKING_ROUTE_META });
  } catch (error) {
    return handleRouteError(error, "Failed to update voice booking draft", {
      zodMessage: "Invalid voice booking update",
    });
  }
}
