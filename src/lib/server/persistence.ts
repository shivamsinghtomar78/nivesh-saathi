import type { AppLanguage } from "@/lib/server/advisor-schemas";
import {
  canFallbackToFirebase,
  readsFirebaseFirst,
  readsMongoFirst,
  writesFirebase,
} from "@/lib/server/datastore-mode";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import {
  getMongoChatSession,
  getMongoChatSessionOwner,
  getMongoChatSummaries,
  getMongoSharedResponse,
  getMongoUserMemory,
  saveMongoChatSession,
  saveMongoFlaggedMessage,
  saveMongoSharedResponse,
  updateMongoUserMemory,
  upsertMongoUserProfile,
} from "@/lib/server/mongo-repositories";
import { logServerError, logServerInfo } from "@/lib/server/telemetry";
import {
  buildCompactMemorySummary,
  sanitizeMemoryForFirestore,
  type UserMemory,
} from "@/lib/server/user-memory";

type StoredChatSession = {
  id: string;
  threadId: string;
  userId?: string;
  language: AppLanguage;
  fdContextIds: string[];
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
  updatedAt: string;
};

const chatSessionMemoryStore = new Map<string, StoredChatSession>();

export type SharedRateCard = {
  bankName?: string;
  rate?: string;
  tenor?: string;
  maturityPreview?: string;
  safetyNote?: string;
};

export type SharedResponse = {
  id: string;
  userId?: string;
  messageText: string;
  rateCards: SharedRateCard[];
  createdAt: string;
  expiresAt: string;
};

const sharedResponseMemoryStore = new Map<string, SharedResponse>();

export type ProfileChatSummary = {
  threadId: string;
  language: AppLanguage;
  fdContextIds: string[];
  messageCount: number;
  updatedAt: string;
  latestMessage?: string;
};

export type ProfileChatSession = StoredChatSession;

function logFallback(event: string, meta?: Record<string, unknown>) {
  logServerInfo(event, {
    datastoreFallback: true,
    ...meta,
  });
}

function toProfileChatSummary(session: StoredChatSession): ProfileChatSummary {
  const latestMessage = session.messages.at(-1)?.content;

  return {
    threadId: session.threadId,
    language: session.language,
    fdContextIds: session.fdContextIds,
    messageCount: session.messages.length,
    updatedAt: session.updatedAt,
    latestMessage,
  };
}

function getMemoryChatSummaries(userId: string) {
  return Array.from(chatSessionMemoryStore.values())
    .filter((session) => session.userId === userId)
    .map(toProfileChatSummary);
}

async function getFirebaseChatSummaries(userId: string) {
  const db = getFirebaseAdminDb();
  if (!db) return null;

  try {
    const snapshot = await db
      .collection("chatSessions")
      .where("userId", "==", userId)
      .orderBy("updatedAt", "desc")
      .limit(12)
      .get();

    return snapshot.docs.map((doc) =>
      toProfileChatSummary(doc.data() as StoredChatSession)
    );
  } catch (error) {
    logServerError("user_chat_summaries_lookup_failed", {
      userId,
      source: "firebase",
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

async function getFirebaseChatSession(input: {
  userId: string;
  threadId: string;
}) {
  const db = getFirebaseAdminDb();
  if (!db) return null;

  try {
    const snapshot = await db.collection("chatSessions").doc(input.threadId).get();
    if (!snapshot.exists) {
      return null;
    }
    const session = snapshot.data() as StoredChatSession;
    return session.userId === input.userId ? session : null;
  } catch (error) {
    logServerError("user_chat_session_lookup_failed", {
      userId: input.userId,
      threadId: input.threadId,
      source: "firebase",
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

async function getFirebaseChatSessionOwner(threadId: string) {
  const db = getFirebaseAdminDb();
  if (!db) return null;

  try {
    const snapshot = await db.collection("chatSessions").doc(threadId).get();
    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data() as Partial<StoredChatSession> | undefined;
    return data?.userId ?? null;
  } catch (error) {
    logServerError("chat_session_owner_lookup_failed", {
      threadId,
      source: "firebase",
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

async function getFirebaseUserMemory(uid: string): Promise<UserMemory | null> {
  const db = getFirebaseAdminDb();
  if (!db) return null;

  try {
    const doc = await db
      .collection("user_profiles")
      .doc(uid)
      .collection("memory")
      .doc("context")
      .get();
    if (doc.exists) {
      return doc.data() as UserMemory;
    }

    const parentDoc = await db.collection("user_profiles").doc(uid).get();
    const parentMemory = parentDoc.data()?.memory;
    if (parentMemory && typeof parentMemory === "object") {
      return parentMemory as UserMemory;
    }

    const legacyDoc = await db.collection("userProfiles").doc(uid).get();
    const legacyMemory = legacyDoc.data()?.memory;
    if (legacyMemory && typeof legacyMemory === "object") {
      return legacyMemory as UserMemory;
    }

    return null;
  } catch (error) {
    logServerError("get_user_memory_failed", {
      uid,
      source: "firebase",
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

async function updateFirebaseUserMemory(uid: string, payload: UserMemory) {
  const db = getFirebaseAdminDb();
  if (!db) return false;

  try {
    const now = new Date().toISOString();
    const cleanPayload = sanitizeMemoryForFirestore(payload);
    const profileRef = db.collection("user_profiles").doc(uid);
    const memoryRef = profileRef.collection("memory").doc("context");

    await Promise.all([
      memoryRef.set(cleanPayload, { merge: true }),
      profileRef.set(
        {
          uid,
          memory: cleanPayload,
          updatedAt: now,
        },
        { merge: true }
      ),
    ]);

    return true;
  } catch (error) {
    logServerError("update_user_memory_failed", {
      uid,
      source: "firebase",
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

async function saveFirebaseChatSession(session: StoredChatSession) {
  const db = getFirebaseAdminDb();
  if (!db) return false;

  try {
    await db.collection("chatSessions").doc(session.threadId).set(session, {
      merge: true,
    });
    return true;
  } catch (error) {
    logServerError("chat_session_persist_failed", {
      threadId: session.threadId,
      source: "firebase",
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

export async function persistUserProfile(input: {
  uid: string;
  email?: string | null;
  phoneNumber?: string | null;
  name?: string | null;
  picture?: string | null;
  provider?: string | null;
}) {
  const now = new Date().toISOString();

  await upsertMongoUserProfile(input).catch((error) => {
    logServerError("user_profile_persist_failed", {
      userId: input.uid,
      source: "mongo",
      error: error instanceof Error ? error.message : "unknown",
    });
  });

  if (!writesFirebase()) {
    return;
  }

  const db = getFirebaseAdminDb();
  if (!db) {
    return;
  }

  try {
    const profilePayload = {
      uid: input.uid,
      email: input.email ?? null,
      phoneNumber: input.phoneNumber ?? null,
      name: input.name ?? null,
      picture: input.picture ?? null,
      provider: input.provider ?? null,
      updatedAt: now,
      createdAt: now,
    };

    await Promise.all([
      db.collection("userProfiles").doc(input.uid).set(profilePayload, {
        merge: true,
      }),
      db.collection("user_profiles").doc(input.uid).set(profilePayload, {
        merge: true,
      }),
    ]);
  } catch (error) {
    logServerError("user_profile_persist_failed", {
      userId: input.uid,
      source: "firebase",
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function getUserChatSummaries(userId: string) {
  const memorySessions = getMemoryChatSummaries(userId);

  if (readsFirebaseFirst()) {
    const firebaseSessions = await getFirebaseChatSummaries(userId);
    if (firebaseSessions && firebaseSessions.length > 0) {
      return firebaseSessions;
    }
    const mongoSessions = await getMongoChatSummaries(userId);
    if (mongoSessions && mongoSessions.length > 0) {
      logFallback("chat_summaries_read_from_mongo_after_firebase_empty", {
        userId,
      });
      return mongoSessions.map(toProfileChatSummary);
    }
    return firebaseSessions ?? mongoSessions?.map(toProfileChatSummary) ?? memorySessions;
  }

  const mongoSessions = await getMongoChatSummaries(userId);
  if (mongoSessions && mongoSessions.length > 0) {
    return mongoSessions.map(toProfileChatSummary);
  }

  if (canFallbackToFirebase()) {
    const firebaseSessions = await getFirebaseChatSummaries(userId);
    if (firebaseSessions && firebaseSessions.length > 0) {
      logFallback("chat_summaries_read_from_firebase_after_mongo_empty", {
        userId,
      });
      return firebaseSessions;
    }
  }

  return mongoSessions?.map(toProfileChatSummary) ?? memorySessions;
}

export async function getUserChatSession(input: {
  userId: string;
  threadId: string;
}) {
  const memorySession = chatSessionMemoryStore.get(input.threadId);
  if (memorySession?.userId === input.userId) {
    return memorySession;
  }

  if (readsMongoFirst()) {
    const mongoSession = await getMongoChatSession(input);
    if (mongoSession) {
      return mongoSession;
    }
    if (canFallbackToFirebase()) {
      const firebaseSession = await getFirebaseChatSession(input);
      if (firebaseSession) {
        logFallback("chat_session_read_from_firebase_after_mongo_miss", input);
        return firebaseSession;
      }
    }
    return null;
  }

  const firebaseSession = await getFirebaseChatSession(input);
  if (firebaseSession) {
    return firebaseSession;
  }
  const mongoSession = await getMongoChatSession(input);
  if (mongoSession) {
    logFallback("chat_session_read_from_mongo_after_firebase_miss", input);
  }
  return mongoSession;
}

export async function getChatSessionOwner(threadId: string) {
  const memorySession = chatSessionMemoryStore.get(threadId);
  if (memorySession?.userId) {
    return memorySession.userId;
  }

  if (readsMongoFirst()) {
    const mongoOwner = await getMongoChatSessionOwner(threadId);
    if (mongoOwner) return mongoOwner;
    if (canFallbackToFirebase()) {
      const firebaseOwner = await getFirebaseChatSessionOwner(threadId);
      if (firebaseOwner) {
        logFallback("chat_owner_read_from_firebase_after_mongo_miss", {
          threadId,
        });
      }
      return firebaseOwner;
    }
    return null;
  }

  const firebaseOwner = await getFirebaseChatSessionOwner(threadId);
  if (firebaseOwner) return firebaseOwner;
  const mongoOwner = await getMongoChatSessionOwner(threadId);
  if (mongoOwner) {
    logFallback("chat_owner_read_from_mongo_after_firebase_miss", { threadId });
  }
  return mongoOwner;
}

export async function persistChatSessionTurn(input: {
  threadId: string;
  userId?: string;
  language: AppLanguage;
  userMessage: string;
  assistantMessage: string;
  fdContextIds: string[];
}) {
  const now = new Date().toISOString();
  const persistedExisting = input.userId
    ? await getUserChatSession({
        userId: input.userId,
        threadId: input.threadId,
      })
    : null;
  const existing = chatSessionMemoryStore.get(input.threadId) ?? persistedExisting;

  const nextSession: StoredChatSession = {
    id: input.threadId,
    threadId: input.threadId,
    userId: input.userId,
    language: input.language,
    fdContextIds: input.fdContextIds,
    updatedAt: now,
    messages: [
      ...(existing?.messages ?? []),
      { role: "user", content: input.userMessage, createdAt: now },
      { role: "assistant", content: input.assistantMessage, createdAt: now },
    ],
  };

  chatSessionMemoryStore.set(input.threadId, nextSession);

  await saveMongoChatSession(nextSession).catch((error) => {
    logServerError("chat_session_persist_failed", {
      threadId: input.threadId,
      source: "mongo",
      error: error instanceof Error ? error.message : "unknown",
    });
  });

  if (writesFirebase()) {
    await saveFirebaseChatSession(nextSession);
  }

  return nextSession;
}

export async function persistFlaggedMessage(input: {
  userId?: string;
  message: string;
  reasons: string[];
  confidence: number;
}) {
  await saveMongoFlaggedMessage(input).catch((error) => {
    logServerError("persist_flagged_message_failed", {
      source: "mongo",
      error: error instanceof Error ? error.message : "unknown",
    });
  });

  if (!writesFirebase()) return;

  const db = getFirebaseAdminDb();
  if (!db) return;

  try {
    await db.collection("flaggedMessages").add({
      userId: input.userId ?? null,
      message: input.message,
      reasons: input.reasons,
      confidence: input.confidence,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logServerError("persist_flagged_message_failed", {
      source: "firebase",
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function getUserMemory(uid: string): Promise<UserMemory | null> {
  if (!uid) return null;

  if (readsMongoFirst()) {
    const mongoMemory = await getMongoUserMemory(uid);
    if (mongoMemory) return mongoMemory;

    if (canFallbackToFirebase()) {
      const firebaseMemory = await getFirebaseUserMemory(uid);
      if (firebaseMemory) {
        logFallback("user_memory_read_from_firebase_after_mongo_miss", { uid });
        return firebaseMemory;
      }
    }

    return null;
  }

  const firebaseMemory = await getFirebaseUserMemory(uid);
  if (firebaseMemory) return firebaseMemory;

  const mongoMemory = await getMongoUserMemory(uid);
  if (mongoMemory) {
    logFallback("user_memory_read_from_mongo_after_firebase_miss", { uid });
  }
  return mongoMemory;
}

export async function updateUserMemory(uid: string, updates: Partial<UserMemory>) {
  if (!uid) return;

  try {
    const now = new Date().toISOString();
    const shouldRebuildSummary = !updates.compactSummary;
    const existingMemory = shouldRebuildSummary ? await getUserMemory(uid) : null;
    const mergedMemory = sanitizeMemoryForFirestore({
      ...(existingMemory ?? {}),
      ...updates,
      uid,
      updatedAt: updates.updatedAt ?? now,
    } as Record<string, unknown>);
    const payload = sanitizeMemoryForFirestore({
      ...mergedMemory,
      compactSummary:
        updates.compactSummary ??
        buildCompactMemorySummary(mergedMemory as Partial<UserMemory>),
    }) as UserMemory;

    await updateMongoUserMemory(uid, payload).catch((error) => {
      logServerError("update_user_memory_failed", {
        uid,
        source: "mongo",
        error: error instanceof Error ? error.message : "unknown",
      });
    });

    if (writesFirebase()) {
      await updateFirebaseUserMemory(uid, payload);
    }
  } catch (error) {
    logServerError("update_user_memory_failed", {
      uid,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function persistSharedResponse(input: {
  userId?: string;
  messageText: string;
  rateCards: SharedRateCard[];
}) {
  const now = new Date();
  const shared: SharedResponse = {
    id: crypto.randomUUID(),
    userId: input.userId,
    messageText: input.messageText,
    rateCards: input.rateCards,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14).toISOString(),
  };

  sharedResponseMemoryStore.set(shared.id, shared);

  await saveMongoSharedResponse(shared).catch((error) => {
    logServerError("shared_response_persist_failed", {
      id: shared.id,
      source: "mongo",
      error: error instanceof Error ? error.message : "unknown",
    });
  });

  if (writesFirebase()) {
    const db = getFirebaseAdminDb();
    if (db) {
      try {
        await db.collection("shared_responses").doc(shared.id).set(shared);
      } catch (error) {
        logServerError("shared_response_persist_failed", {
          id: shared.id,
          source: "firebase",
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  }

  return shared;
}

async function getFirebaseSharedResponse(id: string) {
  const db = getFirebaseAdminDb();
  if (!db) return null;

  try {
    const snapshot = await db.collection("shared_responses").doc(id).get();
    if (!snapshot.exists) return null;

    const shared = snapshot.data() as SharedResponse;
    if (new Date(shared.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    return shared;
  } catch (error) {
    logServerError("shared_response_lookup_failed", {
      id,
      source: "firebase",
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export async function getSharedResponse(id: string) {
  const memoryShared = sharedResponseMemoryStore.get(id);
  const now = Date.now();
  if (memoryShared) {
    if (new Date(memoryShared.expiresAt).getTime() <= now) {
      sharedResponseMemoryStore.delete(id);
      return null;
    }
    return memoryShared;
  }

  if (readsMongoFirst()) {
    const mongoShared = await getMongoSharedResponse(id);
    if (mongoShared) return mongoShared;

    if (canFallbackToFirebase()) {
      const firebaseShared = await getFirebaseSharedResponse(id);
      if (firebaseShared) {
        logFallback("shared_response_read_from_firebase_after_mongo_miss", {
          id,
        });
      }
      return firebaseShared;
    }

    return null;
  }

  const firebaseShared = await getFirebaseSharedResponse(id);
  if (firebaseShared) return firebaseShared;

  const mongoShared = await getMongoSharedResponse(id);
  if (mongoShared) {
    logFallback("shared_response_read_from_mongo_after_firebase_miss", { id });
  }
  return mongoShared;
}
