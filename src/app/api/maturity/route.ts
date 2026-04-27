import { calculateMaturity } from "@/lib/maturity";
import { maturityRequestSchema } from "@/lib/server/advisor-schemas";
import { handleRouteError, jsonSuccess } from "@/lib/server/api";

export const runtime = "nodejs";
export const preferredRegion = "bom1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = maturityRequestSchema.parse(body);
    const result = calculateMaturity(input);

    return jsonSuccess(result);
  } catch (error) {
    return handleRouteError(error, "Unable to calculate maturity", {
      zodMessage: "Invalid maturity request",
    });
  }
}
