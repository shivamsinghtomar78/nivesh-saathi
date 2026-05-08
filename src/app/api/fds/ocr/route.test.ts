import { beforeEach, describe, expect, it, vi } from "vitest";

const routeState = vi.hoisted(() => ({
  csrfResponse: null as Response | null,
  authResult: {
    ok: true as const,
    session: { uid: "user-1" },
  } as
    | { ok: true; session: { uid: string } }
    | { ok: false; response: Response },
}));

vi.mock("@/lib/server/auth", () => ({
  requireCsrfProtection: vi.fn(() => routeState.csrfResponse),
  requireFirebaseSession: vi.fn(async () => routeState.authResult),
}));

vi.mock("@/lib/server/env", () => ({
  serverEnv: {
    GEMINI_API_KEY: "gemini-key",
  },
  hasLangSmithConfig: false,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  enforceRateLimit: vi.fn(async () => ({ success: true, reset: 0 })),
}));

vi.mock("@/lib/server/langsmith", () => ({
  withTracing: (fn: unknown) => fn,
}));

import { POST } from "@/app/api/fds/ocr/route";

function ocrRequest(file: File) {
  const form = new FormData();
  form.set("receipt", file);

  return new Request("https://app.example.test/api/fds/ocr", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/fds/ocr", () => {
  beforeEach(() => {
    routeState.csrfResponse = null;
    routeState.authResult = {
      ok: true,
      session: { uid: "user-1" },
    };
  });

  it("rejects unsupported receipt MIME types before OCR work", async () => {
    const response = await POST(
      ocrRequest(new File(["hello"], "receipt.txt", { type: "text/plain" }))
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Unsupported receipt file type");
  });
});
