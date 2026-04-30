import { fdRatesQuerySchema } from "@/lib/server/advisor-schemas";
import { handleRouteError, jsonSuccess } from "@/lib/server/api";
import { requireFirebaseSession } from "@/lib/server/auth";
import { getFDRates } from "@/lib/server/fd-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

export async function GET(request: Request) {
  try {
    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const query = fdRatesQuerySchema.parse({
      bankId: searchParams.get("bankId") ?? undefined,
      tenorMonths: searchParams.get("tenorMonths")
        ? Number(searchParams.get("tenorMonths"))
        : undefined,
      amount: searchParams.get("amount")
        ? Number(searchParams.get("amount"))
        : undefined,
      seniorCitizen: searchParams.get("seniorCitizen")
        ? searchParams.get("seniorCitizen") === "true"
        : undefined,
      bankType: searchParams.get("bankType") ?? undefined,
      limit: searchParams.get("limit")
        ? Number(searchParams.get("limit"))
        : undefined,
    });

    const rates = await getFDRates(query);

    return jsonSuccess({
      filters: query,
      count: rates.length,
      rates,
    });
  } catch (error) {
    return handleRouteError(error, "Unable to load FD rates", {
      zodMessage: "Invalid fd-rates query",
    });
  }
}
