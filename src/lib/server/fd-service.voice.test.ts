import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/mongo-repositories", () => ({
  getMongoFdRateById: vi.fn(async () => null),
  listMongoFdRates: vi.fn(async () => []),
}));

import { buildDeterministicAdvisorResponse } from "@/lib/server/fd-service";

describe("fd-service voice comparison coverage", () => {
  it("broadens safely to keep three FD options available for the voice comparison", async () => {
    const response = await buildDeterministicAdvisorResponse({
      language: "en",
      amount: 250000000,
      tenorMonths: 12,
      glossaryTermIds: [],
    });

    expect(response.rateCards).toHaveLength(3);
    expect(response.warnings.join(" ")).toContain("three options");
    expect(response.warnings.join(" ")).toContain("Verify the final rate");
  });
});
