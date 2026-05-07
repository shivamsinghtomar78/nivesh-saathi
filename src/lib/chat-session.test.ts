import { describe, expect, it, vi } from "vitest";

import {
  ACTIVE_CONVERSATION_STORAGE_KEY,
  clearStoredActiveConversation,
} from "@/lib/chat-session";

describe("chat session storage", () => {
  it("clears stale active conversation ids for explicit New Chat", () => {
    const storage = {
      removeItem: vi.fn(),
    };

    clearStoredActiveConversation(storage);

    expect(storage.removeItem).toHaveBeenCalledWith(
      ACTIVE_CONVERSATION_STORAGE_KEY
    );
  });
});
