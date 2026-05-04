import type { AppLanguage } from "@/lib/server/advisor-schemas";

type FirestoreRecord = Record<string, unknown>;

function asRecord(value: unknown): FirestoreRecord {
  return value && typeof value === "object" ? (value as FirestoreRecord) : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function asIso(value: unknown, fallback = new Date().toISOString()) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
  }
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate() as Date;
    return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
  }
  return fallback;
}

export function buildMongoUserFromFirebase(input: {
  uid: string;
  userProfile?: unknown;
  legacyUserProfile?: unknown;
  memory?: unknown;
}) {
  const modern = asRecord(input.userProfile);
  const legacy = asRecord(input.legacyUserProfile);
  const source = { ...legacy, ...modern };
  const now = new Date().toISOString();

  return {
    _id: input.uid,
    firebaseUid: input.uid,
    userId: input.uid,
    email: asNullableString(source.email),
    phoneNumber: asNullableString(source.phoneNumber),
    name: asNullableString(source.name),
    picture: asNullableString(source.picture),
    provider: asNullableString(source.provider),
    memory: input.memory ?? source.memory ?? undefined,
    legacyFirestoreIds: Array.from(
      new Set([input.uid, asString(source.uid)].filter(Boolean))
    ),
    fcmTokens: [],
    notificationEnabled: false,
    createdAt: asIso(source.createdAt, now),
    updatedAt: asIso(source.updatedAt, now),
  };
}

export function buildMongoChatFromFirebase(id: string, data: unknown) {
  const source = asRecord(data);
  const messages = Array.isArray(source.messages) ? source.messages : [];
  const now = new Date().toISOString();

  return {
    _id: asString(source.threadId, id),
    threadId: asString(source.threadId, id),
    userId: asString(source.userId) || undefined,
    language: (asString(source.language, "en") as AppLanguage) || "en",
    fdContextIds: asStringArray(source.fdContextIds),
    messages: messages.map((message) => {
      const entry = asRecord(message);
      return {
        role: entry.role === "user" ? "user" : "assistant",
        content: asString(entry.content),
        createdAt: asIso(entry.createdAt, now),
      };
    }),
    legacyFirestoreId: id,
    createdAt: asIso(source.createdAt, now),
    updatedAt: asIso(source.updatedAt, now),
  };
}

export function buildMongoSharedResponseFromFirebase(id: string, data: unknown) {
  const source = asRecord(data);
  const now = new Date().toISOString();

  return {
    _id: asString(source.id, id),
    id: asString(source.id, id),
    userId: asString(source.userId) || undefined,
    messageText: asString(source.messageText),
    rateCards: Array.isArray(source.rateCards) ? source.rateCards.map(asRecord) : [],
    legacyFirestoreId: id,
    createdAt: asIso(source.createdAt, now),
    expiresAt: asIso(source.expiresAt, now),
  };
}

export function buildMongoWatcherFromFirebase(id: string, data: unknown) {
  const source = asRecord(data);
  const userId = asString(source.userId);
  const bankId = asString(source.bankId);
  const now = new Date().toISOString();

  return {
    _id: userId && bankId ? `${userId}_${bankId}` : id,
    userId,
    bankId,
    channels: asStringArray(source.channels).length
      ? asStringArray(source.channels)
      : ["in_app"],
    legacyFirestoreId: id,
    createdAt: asIso(source.createdAt, now),
    updatedAt: asIso(source.updatedAt, now),
  };
}

export function buildMongoFeedbackFromFirebase(id: string, data: unknown) {
  const source = asRecord(data);

  return {
    userId: asString(source.userId),
    messageId: asString(source.messageId),
    threadId: asNullableString(source.threadId),
    reaction: source.reaction === "down" ? "down" : "up",
    reason: asNullableString(source.reason),
    legacyFirestoreId: id,
    createdAt: asIso(source.createdAt),
  };
}

export function buildMongoFlaggedMessageFromFirebase(id: string, data: unknown) {
  const source = asRecord(data);

  return {
    userId: asString(source.userId) || undefined,
    message: asString(source.message),
    reasons: asStringArray(source.reasons),
    confidence:
      typeof source.confidence === "number" && Number.isFinite(source.confidence)
        ? source.confidence
        : 0,
    legacyFirestoreId: id,
    createdAt: asIso(source.createdAt),
  };
}
