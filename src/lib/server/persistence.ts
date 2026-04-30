import type { AppLanguage } from "@/lib/server/advisor-schemas";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { logServerError } from "@/lib/server/telemetry";

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

export async function persistUserProfile(input: {
  uid: string;
  email?: string | null;
  phoneNumber?: string | null;
  name?: string | null;
  picture?: string | null;
  provider?: string | null;
}) {
  const db = getFirebaseAdminDb();
  if (!db) {
    return;
  }

  const now = new Date().toISOString();

  try {
    await db.collection("userProfiles").doc(input.uid).set(
      {
        uid: input.uid,
        email: input.email ?? null,
        phoneNumber: input.phoneNumber ?? null,
        name: input.name ?? null,
        picture: input.picture ?? null,
        provider: input.provider ?? null,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
  } catch (error) {
    logServerError("user_profile_persist_failed", {
      userId: input.uid,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function getUserChatSummaries(userId: string) {
  const memorySessions = Array.from(chatSessionMemoryStore.values())
    .filter((session) => session.userId === userId)
    .map(toProfileChatSummary);

  const db = getFirebaseAdminDb();
  if (!db) {
    return memorySessions;
  }

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
      error: error instanceof Error ? error.message : "unknown",
    });
    return memorySessions;
  }
}

export async function getUserChatSession(input: {
  userId: string;
  threadId: string;
}) {
  const memorySession = chatSessionMemoryStore.get(input.threadId);
  if (memorySession?.userId === input.userId) {
    return memorySession;
  }

  const db = getFirebaseAdminDb();
  if (!db) {
    return null;
  }

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
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
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

export async function getChatSessionOwner(threadId: string) {
  const memorySession = chatSessionMemoryStore.get(threadId);
  if (memorySession?.userId) {
    return memorySession.userId;
  }

  const db = getFirebaseAdminDb();
  if (!db) {
    return null;
  }

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
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
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
  const existing = chatSessionMemoryStore.get(input.threadId);

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

  const db = getFirebaseAdminDb();
  if (!db) {
    return nextSession;
  }

  try {
    await db.collection("chatSessions").doc(input.threadId).set(nextSession, {
      merge: true,
    });
  } catch (error) {
    logServerError("chat_session_persist_failed", {
      threadId: input.threadId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  return nextSession;
}

export async function persistFlaggedMessage(input: {
  userId?: string;
  message: string;
  reasons: string[];
  confidence: number;
}) {
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
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export type UserMemory = {
  uid: string;
  investmentGoals?: string;
  preferredTenorMonths?: number;
  riskTolerance?: string;
  pastBanksConsidered?: string[];
  seniorCitizen?: boolean;
  amount?: number;
  themePreference?: "light" | "dark" | "system";
  updatedAt: string;
};

export async function getUserMemory(uid: string): Promise<UserMemory | null> {
  const db = getFirebaseAdminDb();
  if (!db) return null;
  try {
    const doc = await db.collection("user_profiles").doc(uid).collection("memory").doc("context").get();
    if (doc.exists) {
      return doc.data() as UserMemory;
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateUserMemory(uid: string, updates: Partial<UserMemory>) {
  const db = getFirebaseAdminDb();
  if (!db) return;
  try {
    const memoryRef = db.collection("user_profiles").doc(uid).collection("memory").doc("context");
    await memoryRef.set({ ...updates, uid, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    logServerError("update_user_memory_failed", { uid, error: error instanceof Error ? error.message : "unknown" });
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

  const db = getFirebaseAdminDb();
  if (db) {
    try {
      await db.collection("shared_responses").doc(shared.id).set(shared);
    } catch (error) {
      logServerError("shared_response_persist_failed", {
        id: shared.id,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return shared;
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

  const db = getFirebaseAdminDb();
  if (!db) return null;

  try {
    const snapshot = await db.collection("shared_responses").doc(id).get();
    if (!snapshot.exists) return null;

    const shared = snapshot.data() as SharedResponse;
    if (new Date(shared.expiresAt).getTime() <= now) {
      return null;
    }
    return shared;
  } catch (error) {
    logServerError("shared_response_lookup_failed", {
      id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}
