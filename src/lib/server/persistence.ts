import type {
  AppLanguage,
  BookingIntentInput,
} from "@/lib/server/advisor-schemas";
import { getBankById } from "@/lib/server/fd-service";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";

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

type StoredBookingIntent = BookingIntentInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  redirectUrl: string;
};

const chatSessionMemoryStore = new Map<string, StoredChatSession>();
const bookingIntentMemoryStore = new Map<string, StoredBookingIntent>();

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
    console.error("Unable to persist chat session to Firestore", error);
  }

  return nextSession;
}

export async function createBookingIntent(input: BookingIntentInput) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const bank = getBankById(input.bankId);

  const bookingIntent: StoredBookingIntent = {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
    redirectUrl: bank?.bookingUrl ?? `/book?bank=${encodeURIComponent(input.bankId)}`,
  };

  bookingIntentMemoryStore.set(id, bookingIntent);

  const db = getFirebaseAdminDb();
  if (!db) {
    return bookingIntent;
  }

  try {
    await db.collection("bookingIntents").doc(id).set(bookingIntent);
  } catch (error) {
    console.error("Unable to persist booking intent to Firestore", error);
  }

  return bookingIntent;
}
