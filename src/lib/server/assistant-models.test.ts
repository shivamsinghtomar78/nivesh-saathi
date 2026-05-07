import { describe, expect, it } from "vitest";

import { analyticsSchema, getAssistantModels } from "@/lib/server/assistant-models";
import { generateConversationTitle } from "@/lib/server/conversation-title";

describe("assistant persistence models", () => {
  it("validates Telugu conversations and rich voice messages", () => {
    const { Conversation, Message } = getAssistantModels();
    const conversation = new Conversation({
      _id: "conv-1",
      conversationId: "conv-1",
      userId: "user-1",
      title: "Telugu FD discussion",
      primaryLanguage: "te",
      lastMessage: "FD rates gurinchi",
      conversationType: "voice",
      lastInteractionMode: "voice",
    });
    const message = new Message({
      conversationId: "conv-1",
      userId: "user-1",
      role: "user",
      type: "voice",
      content: "Best FD edi?",
      transcript: "Best FD edi?",
      detectedLanguage: "te",
      voiceSessionId: "voice-1",
      latency: { sttMs: 120, totalMs: 500 },
    });

    expect(conversation.validateSync()).toBeUndefined();
    expect(message.validateSync()).toBeUndefined();
  });

  it("rejects deprecated Bengali language codes", () => {
    const { Conversation } = getAssistantModels();
    const conversation = new Conversation({
      _id: "conv-2",
      conversationId: "conv-2",
      userId: "user-1",
      title: "Old language",
      primaryLanguage: "bn",
    });

    expect(conversation.validateSync()?.message).toContain("`bn`");
  });

  it("generates compact deterministic titles", () => {
    expect(generateConversationTitle("   Best FD for 1 lakh over 12 months   ")).toBe(
      "Best FD for 1 lakh over 12 months"
    );
    expect(
      generateConversationTitle(
        "Please compare the safest fixed deposit options for a very large emergency corpus"
      )
    ).toBe("Please compare the safest fixed deposit options for a very...");
  });

  it("keeps a single TTL index for analytics expiresAt", () => {
    const expiresAtIndexes = analyticsSchema
      .indexes()
      .filter(([fields]) => fields.expiresAt === 1);

    expect(expiresAtIndexes).toHaveLength(1);
    expect(expiresAtIndexes[0][1]).toMatchObject({
      expireAfterSeconds: 0,
      sparse: true,
    });
  });
});
