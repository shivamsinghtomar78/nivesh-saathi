import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { hasFdAlertCronSecret, serverEnv } from "@/lib/server/env";
import { runFdAlertJob } from "@/lib/server/fd-alert-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

function hasValidCronSecret(request: Request) {
  const authorization = request.headers.get("authorization");
  const querySecret = new URL(request.url).searchParams.get("secret");
  const expected = serverEnv.FD_ALERT_CRON_SECRET || serverEnv.CRON_SECRET;

  return (
    Boolean(expected) &&
    (authorization === `Bearer ${expected}` || querySecret === expected)
  );
}

export async function GET(request: Request) {
  try {
    if (!hasFdAlertCronSecret) {
      return jsonError("FD alert cron secret is not configured", 503);
    }

    if (!hasValidCronSecret(request)) {
      return jsonError("Unauthorized alert job", 401);
    }

    const result = await runFdAlertJob();
    if (!result) {
      return jsonError("MongoDB is not configured", 503);
    }

    return jsonSuccess({ result });
  } catch (error) {
    return handleRouteError(error, "Failed to run FD alert job");
  }
}
