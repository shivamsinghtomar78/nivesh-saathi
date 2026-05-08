import { beforeEach, describe, expect, it, vi } from "vitest";

const routeState = vi.hoisted(() => ({
  csrfResponse: null as Response | null,
  adminResult: {
    ok: true as const,
    session: { uid: "admin-1", email: "ops@example.com" },
  } as
    | { ok: true; session: { uid: string; email: string } }
    | { ok: false; response: Response },
  updated: 1,
  receivedRates: null as unknown,
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdminSession: vi.fn(async () => routeState.adminResult),
  requireCsrfProtection: vi.fn(() => routeState.csrfResponse),
}));

vi.mock("@/lib/server/mongo-repositories", () => ({
  upsertMongoFdRates: vi.fn(async (rates: unknown) => {
    routeState.receivedRates = rates;
    return routeState.updated;
  }),
}));

import { POST } from "@/app/api/admin/fd-rates/route";

const sampleRate = {
  id: "sbi",
  bankName: "State Bank of India",
  bankNameHi: "State Bank of India",
  bankCode: "SBI",
  bankType: "public",
  officialUrl: "https://sbi.co.in/fd",
  sourceLabel: "Official bank page",
  sourceUrl: "https://sbi.co.in/fd",
  asOf: "2026-05-08",
  regularRate: 7.5,
  seniorRate: 8,
  minAmount: 1000,
  maxAmount: 100000000,
  tenorMinMonths: 12,
  tenorMaxMonths: 60,
  tenorLabel: "1 - 5 Years",
  compounding: "quarterly",
  dicgcInsured: true,
  badge: "safe-choice",
  color: "#1D4ED8",
};

function adminRequest(body: unknown) {
  return new Request("https://app.example.test/api/admin/fd-rates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-nivesh-csrf": "1",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/fd-rates", () => {
  beforeEach(() => {
    routeState.csrfResponse = null;
    routeState.adminResult = {
      ok: true,
      session: { uid: "admin-1", email: "ops@example.com" },
    };
    routeState.updated = 1;
    routeState.receivedRates = null;
  });

  it("rejects CSRF failures", async () => {
    routeState.csrfResponse = Response.json(
      { ok: false, error: "csrf" },
      { status: 403 }
    );

    const response = await POST(adminRequest([sampleRate]));

    expect(response.status).toBe(403);
    expect(routeState.receivedRates).toBeNull();
  });

  it("requires an allowlisted admin session", async () => {
    routeState.adminResult = {
      ok: false,
      response: Response.json(
        { ok: false, error: "Admin access required" },
        { status: 403 }
      ),
    };

    const response = await POST(adminRequest([sampleRate]));

    expect(response.status).toBe(403);
    expect(routeState.receivedRates).toBeNull();
  });

  it("rejects malformed FD-rate payloads", async () => {
    const response = await POST(
      adminRequest([{ ...sampleRate, sourceUrl: "not-a-url" }])
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid FD rate payload");
    expect(routeState.receivedRates).toBeNull();
  });

  it("validates and upserts FD rates", async () => {
    routeState.updated = 3;

    const response = await POST(adminRequest([sampleRate]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.updated).toBe(3);
    expect(routeState.receivedRates).toEqual([sampleRate]);
  });
});
