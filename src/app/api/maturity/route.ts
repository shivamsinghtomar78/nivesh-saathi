import { ZodError } from "zod";

import { calculateMaturity } from "@/lib/maturity";
import { maturityRequestSchema } from "@/lib/server/advisor-schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = maturityRequestSchema.parse(body);
    const result = calculateMaturity(input);

    return Response.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: "Invalid maturity request",
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Unable to calculate maturity" },
      { status: 500 }
    );
  }
}
