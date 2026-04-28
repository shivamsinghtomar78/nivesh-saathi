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

export type ProfileChatSummary = {
  threadId: string;
  language: AppLanguage;
  fdContextIds: string[];
  messageCount: number;
  updatedAt: string;
  latestMessage?: string;
};

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
