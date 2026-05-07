import { describe, expect, it, vi } from "vitest";

import { loadInsightsData } from "@/lib/insights-loader";

describe("loadInsightsData", () => {
  it("returns fallback data instead of throwing when dashboard fails", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/fds/dashboard")) {
        return Response.json(
          { error: "MongoDB is not configured" },
          { status: 503 }
        );
      }

      return Response.json({
        rates: [{ bankName: "State Bank of India", regularRate: 7.5 }],
      });
    }) as typeof fetch;

    const result = await loadInsightsData(fetcher);

    expect(result.dashboard).toBeNull();
    expect(result.topRate).toMatchObject({
      bankName: "State Bank of India",
      regularRate: 7.5,
    });
    expect(result.error).toContain("MongoDB is not configured");
  });
});
