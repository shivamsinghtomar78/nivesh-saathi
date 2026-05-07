import type { FDRate } from "@/lib/fd-data";
import type { FdDashboardDto } from "@/lib/fd-tracker/types";

const INSIGHTS_FETCH_TIMEOUT_MS = 8000;

type DashboardPayload = {
  dashboard?: FdDashboardDto;
  error?: string;
};

type RatesPayload = {
  rates?: FDRate[];
  error?: string;
};

type FetchJsonResult<T> =
  | { ok: true; payload: T }
  | { ok: false; error: string; status?: number };

export type InsightsLoadResult = {
  dashboard: FdDashboardDto | null;
  topRate: FDRate | null;
  error: string | null;
};

async function fetchJsonWithTimeout<T>(
  url: string,
  label: string,
  fetcher: typeof fetch = fetch
): Promise<FetchJsonResult<T>> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(
    () => controller.abort(),
    INSIGHTS_FETCH_TIMEOUT_MS
  );

  try {
    const response = await fetcher(url, { signal: controller.signal });
    const payload = (await response.json().catch(() => ({}))) as T & {
      error?: string;
    };

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: payload.error || `${label} failed with ${response.status}`,
      };
    }

    return { ok: true, payload };
  } catch (caught) {
    const message =
      caught instanceof DOMException && caught.name === "AbortError"
        ? `${label} timed out`
        : caught instanceof Error
          ? caught.message
          : `${label} failed`;
    return { ok: false, error: message };
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export async function loadInsightsData(
  fetcher: typeof fetch = fetch
): Promise<InsightsLoadResult> {
  const dashboardPromise = fetchJsonWithTimeout<DashboardPayload>(
    "/api/fds/dashboard",
    "Dashboard insights",
    fetcher
  );
  const ratesPromise = fetchJsonWithTimeout<RatesPayload>(
    "/api/fd-rates?limit=1",
    "FD rates",
    fetcher
  );

  const [dashboardSettled, ratesSettled] = await Promise.allSettled([
    dashboardPromise,
    ratesPromise,
  ]);

  const dashboardResult =
    dashboardSettled.status === "fulfilled"
      ? dashboardSettled.value
      : { ok: false as const, error: "Dashboard insights failed" };
  const ratesResult =
    ratesSettled.status === "fulfilled"
      ? ratesSettled.value
      : { ok: false as const, error: "FD rates failed" };

  const errors: string[] = [];
  const dashboard =
    dashboardResult.ok && dashboardResult.payload.dashboard
      ? dashboardResult.payload.dashboard
      : null;
  const topRate = ratesResult.ok ? ratesResult.payload.rates?.[0] ?? null : null;

  if (!dashboard) {
    errors.push(
      dashboardResult.ok
        ? "Dashboard insights are unavailable"
        : dashboardResult.error
    );
  }

  if (!ratesResult.ok) {
    errors.push(ratesResult.error);
  }

  return {
    dashboard,
    topRate,
    error: errors.length > 0 ? errors.join(". ") : null,
  };
}
