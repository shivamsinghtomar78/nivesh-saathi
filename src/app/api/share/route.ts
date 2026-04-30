import { z } from "zod";

import { jsonSuccess, handleRouteError } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { persistSharedResponse } from "@/lib/server/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const shareSchema = z.object({
  messageText: z.string().trim().min(1).max(4000),
  rateCards: z
    .array(
      z.object({
        bankName: z.string().max(120).optional(),
        rate: z.string().max(40).optional(),
        tenor: z.string().max(80).optional(),
        maturityPreview: z.string().max(120).optional(),
        safetyNote: z.string().max(240).optional(),
      })
    )
    .max(6)
    .default([]),
});

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const data = shareSchema.parse(await request.json());
    const shared = await persistSharedResponse({
      userId: auth.session.uid,
      messageText: data.messageText,
      rateCards: data.rateCards,
    });

    return jsonSuccess({
      id: shared.id,
      url: `/share/${shared.id}`,
      expiresAt: shared.expiresAt,
    });
  } catch (error) {
    return handleRouteError(error, "Failed to create share link", {
      zodMessage: "Invalid share payload",
    });
  }
}
