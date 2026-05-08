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

vi.mock("@/lib/server/chat-repository", () => ({
  archiveConversation: vi.fn(async () => true),
  createConversation: vi.fn(async () => ({ id: "conversation-1" })),
  deleteConversation: vi.fn(async () => true),
  getConversation: vi.fn(async () => ({ id: "conversation-1" })),
  getMessages: vi.fn(async () => ({ messages: [], hasMore: false })),
  getRecentMessages: vi.fn(async () => ({ messages: [], hasMore: false })),
  hardDeleteConversation: vi.fn(async () => true),
  listConversations: vi.fn(async () => []),
  markConversationRead: vi.fn(async () => true),
  restoreConversation: vi.fn(async () => true),
  updateConversationMetadata: vi.fn(async () => ({ id: "conversation-1" })),
}));

import { POST as createConversation } from "@/app/api/chat/conversations/route";
import {
  DELETE as deleteConversation,
  PATCH as patchConversation,
} from "@/app/api/chat/conversations/[id]/route";

function jsonRequest(url: string, method: string, body: unknown = {}) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const context = {
  params: Promise.resolve({ id: "conversation-1" }),
};

describe("conversation mutation CSRF protection", () => {
  beforeEach(() => {
    routeState.csrfResponse = null;
    routeState.authResult = {
      ok: true,
      session: { uid: "user-1" },
    };
  });

  it("rejects conversation creation without CSRF protection", async () => {
    routeState.csrfResponse = Response.json(
      { ok: false, error: "csrf" },
      { status: 403 }
    );

    const response = await createConversation(
      jsonRequest("https://app.example.test/api/chat/conversations", "POST", {
        title: "New chat",
      })
    );

    expect(response.status).toBe(403);
  });

  it("rejects conversation patch without CSRF protection", async () => {
    routeState.csrfResponse = Response.json(
      { ok: false, error: "csrf" },
      { status: 403 }
    );

    const response = await patchConversation(
      jsonRequest(
        "https://app.example.test/api/chat/conversations/conversation-1",
        "PATCH",
        { action: "rename", title: "Updated" }
      ),
      context
    );

    expect(response.status).toBe(403);
  });

  it("rejects conversation delete without CSRF protection", async () => {
    routeState.csrfResponse = Response.json(
      { ok: false, error: "csrf" },
      { status: 403 }
    );

    const response = await deleteConversation(
      jsonRequest(
        "https://app.example.test/api/chat/conversations/conversation-1",
        "DELETE"
      ),
      context
    );

    expect(response.status).toBe(403);
  });
});
