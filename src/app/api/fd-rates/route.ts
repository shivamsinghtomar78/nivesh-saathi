import { ZodError } from "zod";

import { fdRatesQuerySchema } from "@/lib/server/advisor-schemas";
import { getFDRates } from "@/lib/server/fd-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
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

    return Response.json({
      filters: query,
      count: rates.length,
      rates,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid fd-rates query", details: error.flatten() },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Unable to load FD rates" },
      { status: 500 }
    );
  }
}
