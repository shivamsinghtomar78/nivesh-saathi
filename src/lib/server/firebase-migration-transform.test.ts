import { describe, expect, it } from "vitest";

import {
  buildMongoChatFromFirebase,
  buildMongoFeedbackFromFirebase,
  buildMongoSharedResponseFromFirebase,
  buildMongoUserFromFirebase,
  buildMongoWatcherFromFirebase,
} from "@/lib/server/firebase-migration-transform";

describe("Firebase to Mongo migration transforms", () => {
  it("merges modern and legacy user profile data with memory", () => {
    const user = buildMongoUserFromFirebase({
      uid: "firebase-user-1",
      legacyUserProfile: {
        email: "old@example.com",
        name: "Old Name",
        memory: { uid: "firebase-user-1", updatedAt: "2026-05-01T00:00:00.000Z" },
      },
      userProfile: {
        email: "new@example.com",
        provider: "password",
        updatedAt: "2026-05-02T00:00:00.000Z",
      },
      memory: {
        uid: "firebase-user-1",
        amount: 100000,
        updatedAt: "2026-05-03T00:00:00.000Z",
      },
    });

    expect(user).toMatchObject({
      _id: "firebase-user-1",
      firebaseUid: "firebase-user-1",
      userId: "firebase-user-1",
      email: "new@example.com",
      name: "Old Name",
      provider: "password",
    });
    expect(user.memory).toMatchObject({ amount: 100000 });
  });

  it("normalizes chat sessions while preserving thread ownership", () => {
    const chat = buildMongoChatFromFirebase("thread-1", {
      userId: "user-1",
      language: "hi",
      fdContextIds: ["sbi", "hdfc"],
      messages: [
        { role: "user", content: "best fd", createdAt: "2026-05-01T00:00:00.000Z" },
        { role: "assistant", content: "Compare these.", createdAt: "2026-05-01T00:00:01.000Z" },
      ],
      updatedAt: "2026-05-01T00:00:01.000Z",
    });

    expect(chat.threadId).toBe("thread-1");
    expect(chat.userId).toBe("user-1");
    expect(chat.messages).toHaveLength(2);
    expect(chat.fdContextIds).toEqual(["sbi", "hdfc"]);
  });

  it("maps operational collections with legacy Firestore ids", () => {
    expect(
      buildMongoWatcherFromFirebase("watcher-1", {
        userId: "user-1",
        bankId: "sbi",
      })
    ).toMatchObject({
      _id: "user-1_sbi",
      legacyFirestoreId: "watcher-1",
      channels: ["in_app"],
    });

    expect(
      buildMongoFeedbackFromFirebase("feedback-1", {
        userId: "user-1",
        messageId: "message-1",
        reaction: "down",
        reason: "outdated",
      })
    ).toMatchObject({
      legacyFirestoreId: "feedback-1",
      reaction: "down",
      reason: "outdated",
    });

    expect(
      buildMongoSharedResponseFromFirebase("share-1", {
        messageText: "Shared answer",
        rateCards: [{ bankName: "SBI", rate: "7.5%" }],
      })
    ).toMatchObject({
      id: "share-1",
      legacyFirestoreId: "share-1",
      rateCards: [{ bankName: "SBI", rate: "7.5%" }],
    });
  });
});
