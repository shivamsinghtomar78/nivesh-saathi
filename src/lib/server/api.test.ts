import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/env", () => ({
  serverEnv: {
    NEXT_PUBLIC_APP_URL: "https://app.example.test",
  },
}));

vi.mock("@/lib/server/telemetry", () => ({
  logServerError: vi.fn(),
}));

import { handleRouteError, privateCorsHeaders } from "@/lib/server/api";
import { logServerError } from "@/lib/server/telemetry";

describe("server API helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("hides exception details from production error responses", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = handleRouteError(
      new Error("database password leaked in stack"),
      "Unable to process request"
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      error: "Unable to process request",
    });
    expect(logServerError).toHaveBeenCalledWith(
      "api_route_error",
      expect.objectContaining({
        message: "database password leaked in stack",
      })
    );
  });

  it("keeps private CORS limited to the app origin", () => {
    const headers = privateCorsHeaders(
      new Request("https://app.example.test/api/chat", {
        headers: { origin: "https://attacker.example.test" },
      }),
      "POST, OPTIONS"
    );

    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://app.example.test"
    );
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
  });
});
