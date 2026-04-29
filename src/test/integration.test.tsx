import { describe, it, expect, beforeEach } from "vitest";
import { act } from "@testing-library/react";

import { useChatStore } from "../stores/chatStore";
import { useCompareStore } from "../stores/compareStore";
import { useAuthStore } from "../stores/authStore";

describe("Nivesh Saathi Store Integration", () => {
  beforeEach(() => {
    act(() => {
      useChatStore.getState().clearMessages();
      useCompareStore.getState().clearShortlist();
      useAuthStore.getState().clearUser();
    });
  });

  it("should persist shortlist across operations", () => {
    const { toggleShortlist, shortlist } = useCompareStore.getState();
    expect(shortlist).toHaveLength(0);

    act(() => {
      toggleShortlist("sbi-regular");
    });
    
    expect(useCompareStore.getState().shortlist).toContain("sbi-regular");
    expect(useCompareStore.getState().shortlist).toHaveLength(1);

    act(() => {
      toggleShortlist("hdfc-regular");
    });

    expect(useCompareStore.getState().shortlist).toContain("hdfc-regular");
    expect(useCompareStore.getState().shortlist).toHaveLength(2);

    act(() => {
      toggleShortlist("sbi-regular");
    });

    expect(useCompareStore.getState().shortlist).not.toContain("sbi-regular");
    expect(useCompareStore.getState().shortlist).toHaveLength(1);
  });

  it("should track chat language updates and clear context", () => {
    expect(useChatStore.getState().language).toBe("en");
    expect(useChatStore.getState().messages).toHaveLength(1); // Welcome message

    act(() => {
      useChatStore.getState().setLanguage("hi");
    });

    expect(useChatStore.getState().language).toBe("hi");
    expect(useChatStore.getState().messages[0].language).toBe("HI");
  });

  it("should manage simulated E2E flow from login to compare and chat", () => {
    // 1. Simulate Login
    act(() => {
      useAuthStore.getState().setUser({
        uid: "test-user-123",
        email: "test@example.com",
        emailVerified: true,
        displayName: "Test User",
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: "",
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => "token",
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
        phoneNumber: null,
        photoURL: null,
        providerId: "firebase",
      });
    });

    expect(useAuthStore.getState().user?.uid).toBe("test-user-123");

    // 2. Simulate Compare Screen Shortlisting
    act(() => {
      useCompareStore.getState().toggleShortlist("sbi-regular");
      useCompareStore.getState().toggleShortlist("icici-regular");
    });

    expect(useCompareStore.getState().shortlist).toEqual(["sbi-regular", "icici-regular"]);

    // 3. Simulate Chat Thread Creation with Shortlist
    act(() => {
      useChatStore.getState().setThreadId("thread-abc-123");
      useChatStore.getState().addMessage({
        id: "msg-1",
        role: "user",
        content: "What is the best rate out of my shortlist?",
        timestamp: "12:00 PM",
        language: "English",
      });
    });

    const chatState = useChatStore.getState();
    expect(chatState.threadId).toBe("thread-abc-123");
    expect(chatState.messages).toHaveLength(2); // Initial + user message

    // 4. Verify cross-store state is preserved
    expect(useAuthStore.getState().user).toBeDefined();
    expect(useCompareStore.getState().shortlist).toHaveLength(2);
    expect(useChatStore.getState().threadId).toBe("thread-abc-123");
  });
});
