import { z } from "zod";

import { handleRouteError, jsonSuccess } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import {
  getMongoShortlist,
  saveMongoShortlist,
} from "@/lib/server/mongo-repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const compareSnapshotSchema = z.object({
  amount: z.number().positive(),
  tenorMonths: z.number().int().positive(),
  bankType: z.enum(["all", "public", "private", "small-finance"]),
  seniorCitizen: z.boolean(),
  topBanks: z
    .array(
      z.object({
        bankId: z.string().trim().min(1),
        bankName: z.string().trim().min(1),
        ratePercent: z.number(),
        maturityAmount: z.number().optional(),
      })
    )
    .max(5),
  updatedAt: z.string().trim().min(1),
});

const shortlistSchema = z.object({
  bankIds: z.array(z.string().trim().min(1)).max(25),
  lastCompareSnapshot: compareSnapshotSchema.nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const shortlist = await getMongoShortlist(auth.session.uid);
    return jsonSuccess({
      bankIds: shortlist?.bankIds ?? [],
      lastCompareSnapshot: shortlist?.lastCompareSnapshot ?? null,
      updatedAt: shortlist?.updatedAt ?? null,
    });
  } catch (error) {
    return handleRouteError(error, "Failed to load shortlist");
  }
}

export async function PUT(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const input = shortlistSchema.parse(await request.json());
    await saveMongoShortlist({
      userId: auth.session.uid,
      bankIds: input.bankIds,
      lastCompareSnapshot: input.lastCompareSnapshot,
    });

    return jsonSuccess({
      bankIds: Array.from(new Set(input.bankIds)),
      lastCompareSnapshot: input.lastCompareSnapshot ?? null,
    });
  } catch (error) {
    return handleRouteError(error, "Failed to save shortlist", {
      zodMessage: "Invalid shortlist payload",
    });
  }
}
