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
