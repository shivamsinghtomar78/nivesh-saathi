import { z } from "zod";

import type { FDRate } from "@/lib/fd-data";
import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { requireAdminSession, requireCsrfProtection } from "@/lib/server/auth";
import { upsertMongoFdRates } from "@/lib/server/mongo-repositories";

export const runtime = "nodejs";

const adminFdRateSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    bankName: z.string().trim().min(1).max(140),
    bankNameHi: z.string().trim().min(1).max(140),
    bankCode: z.string().trim().min(1).max(24),
    bankType: z.enum(["public", "private", "small-finance"]),
    officialUrl: z.string().url(),
    sourceLabel: z.string().trim().min(1).max(120),
    sourceUrl: z.string().url(),
    asOf: z.string().trim().min(4).max(40),
    regularRate: z.number().nonnegative().max(25),
    seniorRate: z.number().nonnegative().max(25),
    minAmount: z.number().int().nonnegative().max(1_000_000_000),
    maxAmount: z.number().int().positive().max(10_000_000_000),
    tenorMinMonths: z.number().int().positive().max(600),
    tenorMaxMonths: z.number().int().positive().max(600),
    tenorLabel: z.string().trim().min(1).max(80),
    compounding: z.enum(["quarterly", "monthly", "annual"]),
    dicgcInsured: z.boolean(),
    badge: z.enum(["best-value", "popular", "safe-choice"]).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  })
  .strict()
  .refine((rate) => rate.maxAmount >= rate.minAmount, {
    message: "maxAmount must be greater than or equal to minAmount",
    path: ["maxAmount"],
  })
  .refine((rate) => rate.tenorMaxMonths >= rate.tenorMinMonths, {
    message: "tenorMaxMonths must be greater than or equal to tenorMinMonths",
    path: ["tenorMaxMonths"],
  });

const adminFdRatesSchema = z.array(adminFdRateSchema).min(1).max(200);

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const sessionResult = await requireAdminSession(request);
    if (!sessionResult.ok) {
      return sessionResult.response;
    }

    const rates = adminFdRatesSchema.parse(await request.json()) satisfies FDRate[];

    const updated = await upsertMongoFdRates(rates);
    if (updated === null) {
      return jsonError("MongoDB is not configured", 503);
    }

    return jsonSuccess({ success: true, updated });
  } catch (error) {
    return handleRouteError(error, "Failed to update FD rates", {
      zodMessage: "Invalid FD rate payload",
    });
  }
}
