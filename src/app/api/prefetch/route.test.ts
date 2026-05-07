import { beforeEach, describe, expect, it, vi } from "vitest";

const routeState = vi.hoisted(() => ({
  cache: new Map<string, unknown>(),
  csrfResponse: null as Response | null,
  authResult: {
    ok: true as const,
    session: { uid: "user-1" },
  } as
    | { ok: true; session: { uid: string } }
    | { ok: false; response: Response },
  rateLimit: { success: true, reset: 0 },
}));

vi.mock("@/lib/server/auth", () => ({
  requireCsrfProtection: vi.fn(() => routeState.csrfResponse),
  requireFirebaseSession: vi.fn(async () => routeState.authResult),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  enforceRateLimit: vi.fn(async () => routeState.rateLimit),
}));

vi.mock("@/lib/server/cache", () => ({
  cacheGet: vi.fn(async (key: string) => routeState.cache.get(key) ?? null),
  cacheSet: vi.fn(async (key: string, value: unknown) => {
    routeState.cache.set(key, value);
  }),
}));

vi.mock("@/lib/server/mongo-repositories", () => ({
  getMongoFdRateById: vi.fn(async () => null),
  listMongoFdRates: vi.fn(async () => []),
}));

import { POST } from "@/app/api/prefetch/route";

function prefetchRequest(body: unknown) {
  return new Request("http://localhost/api/prefetch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/prefetch", () => {
  beforeEach(() => {
    routeState.cache.clear();
    routeState.csrfResponse = null;
    routeState.authResult = {
      ok: true,
      session: { uid: "user-1" },
    };
    routeState.rateLimit = { success: true, reset: 0 };
  });

  it("rejects CSRF failures before prediction work", async () => {
    routeState.csrfResponse = Response.json({ ok: false, error: "csrf" }, { status: 403 });

    const response = await POST(
      prefetchRequest({
        transcript: "Compare HDFC and SBI FD rates",
        language: "en",
        turnId: "turn-1",
        sequence: 1,
      })
    );

    expect(response.status).toBe(403);
  });

  it("requires an authenticated Firebase session", async () => {
    routeState.authResult = {
      ok: false,
      response: Response.json({ ok: false, error: "Sign in required" }, { status: 401 }),
    };

    const response = await POST(
      prefetchRequest({
        transcript: "Compare HDFC and SBI FD rates",
        language: "en",
        turnId: "turn-1",
        sequence: 1,
      })
    );

    expect(response.status).toBe(401);
  });

  it("applies per-user rate limiting", async () => {
    routeState.rateLimit = { success: false, reset: 123 };

    const response = await POST(
      prefetchRequest({
        transcript: "Compare HDFC and SBI FD rates",
        language: "en",
        turnId: "turn-1",
        sequence: 1,
      })
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toContain("Too many");
  });

  it("rejects malformed interim transcripts", async () => {
    const response = await POST(
      prefetchRequest({
        transcript: "",
        language: "en",
        turnId: "turn-1",
        sequence: 1,
      })
    );

    expect(response.status).toBe(400);
  });

  it("prefetches FD data and returns cache hits for repeated predictions", async () => {
    const body = {
      transcript: "Compare HDFC and SBI FD rates for 1 lakh",
      language: "en",
      turnId: "turn-1",
      sequence: 1,
    };

    const first = await POST(prefetchRequest(body));
    const firstBody = await first.json();
    const second = await POST(prefetchRequest({ ...body, sequence: 2 }));
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(firstBody.cacheHit).toBe(false);
    expect(firstBody.ui.mode).toBe("comparison");
    expect(firstBody.data.rateCards.length).toBeGreaterThan(0);
    expect(second.status).toBe(200);
    expect(secondBody.cacheHit).toBe(true);
    expect(secondBody.prefetchKey).toBe(firstBody.prefetchKey);
  });
});
