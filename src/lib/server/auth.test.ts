import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/firebase-admin", () => ({
  getFirebaseAdminAuth: () => null,
}));

import {
  getCookieValue,
  hasValidCsrfHeader,
  isSameOriginRequest,
} from "@/lib/server/auth";

describe("server auth helpers", () => {
  it("reads the Firebase session cookie from a request", () => {
    const request = new Request("https://app.example.test/api/chat", {
      headers: {
        cookie: "theme=dark; __session=session-token; other=value",
      },
    });

    expect(getCookieValue(request, "__session")).toBe("session-token");
  });

  it("requires the custom CSRF header", () => {
    const request = new Request("https://app.example.test/api/auth/session", {
      headers: {
        "x-nivesh-csrf": "1",
      },
    });

    expect(hasValidCsrfHeader(request)).toBe(true);
  });

  it("rejects cross-site origins", () => {
    const request = new Request("https://app.example.test/api/auth/session", {
      headers: {
        origin: "https://attacker.example.test",
      },
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("allows same-origin requests", () => {
    const request = new Request("https://app.example.test/api/auth/session", {
      headers: {
        origin: "https://app.example.test",
      },
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("accepts browser same-origin fetch metadata", () => {
    const request = new Request("https://app.example.test/api/auth/session", {
      headers: {
        "sec-fetch-site": "same-origin",
      },
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });
});
