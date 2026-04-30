import { calculateMaturity } from "@/lib/maturity";
import { maturityRequestSchema } from "@/lib/server/advisor-schemas";
import { handleRouteError, jsonSuccess } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

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
