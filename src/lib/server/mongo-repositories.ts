import type { Collection } from "mongodb";
import { ObjectId } from "mongodb";

import type { FDRate } from "@/lib/fd-data";
import type { CompareSnapshot } from "@/stores/compareStore";
import type { AppLanguage } from "@/lib/server/advisor-schemas";
import { getMongoDb } from "@/lib/server/mongo";
import type { UserMemory } from "@/lib/server/user-memory";

type MongoDateInput = Date | string | number | null | undefined;

export type UserDocument = {
  _id: string;
  firebaseUid: string;
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  name: string | null;
  picture: string | null;
  provider: string | null;
  fcmTokens?: string[];
  notificationEnabled?: boolean;
  preferences?: Record<string, unknown>;
  memory?: UserMemory;
  legacyFirestoreIds?: string[];
  createdAt: Date;
  updatedAt: Date;
};

type ChatMessageDocument = {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

export type ChatSessionDocument = {
  _id: string;
  threadId: string;
  userId?: string;
  language: AppLanguage;
  fdContextIds: string[];
  messages: ChatMessageDocument[];
  legacyFirestoreId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatSessionDto = {
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

export type SharedRateCardDocument = {
  bankName?: string;
  rate?: string;
  tenor?: string;
  maturityPreview?: string;
  safetyNote?: string;
};

export type SharedResponseDocument = {
  _id: string;
  id: string;
  userId?: string;
  messageText: string;
  rateCards: SharedRateCardDocument[];
  legacyFirestoreId?: string;
  createdAt: Date;
  expiresAt: Date;
};

export type SharedResponseDto = {
  id: string;
  userId?: string;
  messageText: string;
  rateCards: SharedRateCardDocument[];
  createdAt: string;
  expiresAt: string;
};

export type ShortlistDocument = {
  _id: string;
  userId: string;
  bankIds: string[];
  lastCompareSnapshot: CompareSnapshot | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CalculationDocument = {
  _id: ObjectId;
  userId: string;
  principal: number;
  ratePercent: number;
  tenorMonths: number;
  compounding: "quarterly" | "monthly" | "annual";
  maturityAmount: number;
  interestEarned: number;
  maturityDate: Date;
  effectiveYield: string;
  createdAt: Date;
};

export type WatcherDocument = {
  _id: string;
  userId: string;
  bankId: string;
  channels: string[];
  legacyFirestoreId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageFeedbackDocument = {
  _id: ObjectId;
  userId: string;
  messageId: string;
  threadId: string | null;
  reaction: "up" | "down";
  reason: "wrong_info" | "not_helpful" | "off_topic" | "outdated" | null;
  legacyFirestoreId?: string;
  createdAt: Date;
};

export type FlaggedMessageDocument = {
  _id: ObjectId;
  userId: string | null;
  message: string;
  reasons: string[];
  confidence: number;
  legacyFirestoreId?: string;
  createdAt: Date;
};

export type FdRateDocument = FDRate & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

type AppCollections = {
  users: Collection<UserDocument>;
  chatHistory: Collection<ChatSessionDocument>;
  sharedResponses: Collection<SharedResponseDocument>;
  shortlists: Collection<ShortlistDocument>;
  calculations: Collection<CalculationDocument>;
  watchers: Collection<WatcherDocument>;
  messageFeedback: Collection<MessageFeedbackDocument>;
  flaggedMessages: Collection<FlaggedMessageDocument>;
  fdRates: Collection<FdRateDocument>;
};

let indexesReady: Promise<void> | null = null;

function toDate(value: MongoDateInput, fallback = new Date()) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

function toChatDto(document: ChatSessionDocument): ChatSessionDto {
  return {
    id: document.threadId,
    threadId: document.threadId,
    userId: document.userId,
    language: document.language,
    fdContextIds: document.fdContextIds,
    messages: document.messages.map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: toDate(message.createdAt).toISOString(),
    })),
    updatedAt: toDate(document.updatedAt).toISOString(),
  };
}

function toSharedDto(document: SharedResponseDocument): SharedResponseDto {
  return {
    id: document.id,
    userId: document.userId,
    messageText: document.messageText,
    rateCards: document.rateCards,
    createdAt: toDate(document.createdAt).toISOString(),
    expiresAt: toDate(document.expiresAt).toISOString(),
  };
}

function toRateDto(document: FdRateDocument): FDRate {
  const { _id, createdAt, updatedAt, ...rate } = document;
  void _id;
  void createdAt;
  void updatedAt;
  return rate;
}

async function ensureIndexes(collections: AppCollections) {
  indexesReady ??= Promise.all([
    collections.users.createIndex({ firebaseUid: 1 }, { unique: true }),
    collections.users.createIndex({ email: 1 }, { sparse: true }),
    collections.chatHistory.createIndex({ userId: 1, updatedAt: -1 }),
    collections.shortlists.createIndex({ userId: 1 }, { unique: true }),
    collections.calculations.createIndex({ userId: 1, createdAt: -1 }),
    collections.watchers.createIndex({ userId: 1, bankId: 1 }, { unique: true }),
    collections.messageFeedback.createIndex({ userId: 1, createdAt: -1 }),
    collections.flaggedMessages.createIndex({ userId: 1, createdAt: -1 }),
    collections.sharedResponses.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    collections.fdRates.createIndex({ bankType: 1, tenorMinMonths: 1, tenorMaxMonths: 1 }),
    collections.fdRates.createIndex({ regularRate: -1 }),
    collections.fdRates.createIndex({ seniorRate: -1 }),
  ]).then(() => undefined);

  await indexesReady;
}

export async function getAppCollections() {
  const db = await getMongoDb();
  if (!db) {
    return null;
  }

  const collections: AppCollections = {
    users: db.collection<UserDocument>("users"),
    chatHistory: db.collection<ChatSessionDocument>("chat_history"),
    sharedResponses: db.collection<SharedResponseDocument>("shared_responses"),
    shortlists: db.collection<ShortlistDocument>("shortlists"),
    calculations: db.collection<CalculationDocument>("calculations"),
    watchers: db.collection<WatcherDocument>("watchers"),
    messageFeedback: db.collection<MessageFeedbackDocument>("message_feedback"),
    flaggedMessages: db.collection<FlaggedMessageDocument>("flagged_messages"),
    fdRates: db.collection<FdRateDocument>("fd_rates"),
  };

  await ensureIndexes(collections);
  return collections;
}

export async function upsertMongoUserProfile(input: {
  uid: string;
  email?: string | null;
  phoneNumber?: string | null;
  name?: string | null;
  picture?: string | null;
  provider?: string | null;
  legacyFirestoreId?: string;
}) {
  const collections = await getAppCollections();
  if (!collections) return false;

  const now = new Date();
  await collections.users.updateOne(
    { firebaseUid: input.uid },
    {
      $set: {
        email: input.email ?? null,
        userId: input.uid,
        phoneNumber: input.phoneNumber ?? null,
        name: input.name ?? null,
        picture: input.picture ?? null,
        provider: input.provider ?? null,
        updatedAt: now,
      },
      ...(input.legacyFirestoreId
        ? { $addToSet: { legacyFirestoreIds: input.legacyFirestoreId } }
        : {}),
      $setOnInsert: {
        _id: input.uid,
        firebaseUid: input.uid,
        fcmTokens: [],
        notificationEnabled: false,
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return true;
}

export async function getMongoUserMemory(uid: string) {
  const collections = await getAppCollections();
  if (!collections) return null;

  const user = await collections.users.findOne({ firebaseUid: uid });
  return user?.memory ?? null;
}

export async function updateMongoUserMemory(uid: string, memory: UserMemory) {
  const collections = await getAppCollections();
  if (!collections) return false;

  const now = new Date();
  await collections.users.updateOne(
    { firebaseUid: uid },
    {
      $set: {
        memory,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: uid,
        firebaseUid: uid,
        userId: uid,
        email: null,
        phoneNumber: null,
        name: null,
        picture: null,
        provider: null,
        fcmTokens: [],
        notificationEnabled: false,
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return true;
}

export async function getMongoChatSummaries(userId: string) {
  const collections = await getAppCollections();
  if (!collections) return null;

  const sessions = await collections.chatHistory
    .find({ userId })
    .sort({ updatedAt: -1 })
    .limit(12)
    .toArray();

  return sessions.map(toChatDto);
}

export async function getMongoChatSession(input: {
  userId: string;
  threadId: string;
}) {
  const collections = await getAppCollections();
  if (!collections) return null;

  const session = await collections.chatHistory.findOne({
    threadId: input.threadId,
    userId: input.userId,
  });

  return session ? toChatDto(session) : null;
}

export async function getMongoChatSessionOwner(threadId: string) {
  const collections = await getAppCollections();
  if (!collections) return null;

  const session = await collections.chatHistory.findOne(
    { threadId },
    { projection: { userId: 1 } }
  );
  return session?.userId ?? null;
}

export async function saveMongoChatSession(session: ChatSessionDto) {
  const collections = await getAppCollections();
  if (!collections) return false;

  const now = toDate(session.updatedAt);
  await collections.chatHistory.updateOne(
    { threadId: session.threadId },
    {
      $set: {
        threadId: session.threadId,
        userId: session.userId,
        language: session.language,
        fdContextIds: session.fdContextIds,
        messages: session.messages.map((message) => ({
          role: message.role,
          content: message.content,
          createdAt: toDate(message.createdAt, now),
        })),
        updatedAt: now,
      },
      $setOnInsert: {
        _id: session.threadId,
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return true;
}

export async function saveMongoFlaggedMessage(input: {
  userId?: string;
  message: string;
  reasons: string[];
  confidence: number;
  createdAt?: MongoDateInput;
  legacyFirestoreId?: string;
}) {
  const collections = await getAppCollections();
  if (!collections) return false;

  await collections.flaggedMessages.insertOne({
    _id: new ObjectId(),
    userId: input.userId ?? null,
    message: input.message,
    reasons: input.reasons,
    confidence: input.confidence,
    legacyFirestoreId: input.legacyFirestoreId,
    createdAt: toDate(input.createdAt),
  });

  return true;
}

export async function saveMongoSharedResponse(input: SharedResponseDto) {
  const collections = await getAppCollections();
  if (!collections) return false;

  await collections.sharedResponses.updateOne(
    { id: input.id },
    {
      $set: {
        id: input.id,
        userId: input.userId,
        messageText: input.messageText,
        rateCards: input.rateCards,
        createdAt: toDate(input.createdAt),
        expiresAt: toDate(input.expiresAt),
      },
      $setOnInsert: { _id: input.id },
    },
    { upsert: true }
  );

  return true;
}

export async function getMongoSharedResponse(id: string) {
  const collections = await getAppCollections();
  if (!collections) return null;

  const shared = await collections.sharedResponses.findOne({
    id,
    expiresAt: { $gt: new Date() },
  });
  return shared ? toSharedDto(shared) : null;
}

export async function listMongoWatchers(userId: string) {
  const collections = await getAppCollections();
  if (!collections) return null;

  const watchers = await collections.watchers.find({ userId }).toArray();
  return watchers.map((watcher) => watcher.bankId);
}

export async function saveMongoWatcher(input: {
  userId: string;
  bankId: string;
  channels?: string[];
  createdAt?: MongoDateInput;
  legacyFirestoreId?: string;
}) {
  const collections = await getAppCollections();
  if (!collections) return false;

  const now = new Date();
  const id = `${input.userId}_${input.bankId}`;
  await collections.watchers.updateOne(
    { userId: input.userId, bankId: input.bankId },
    {
      $set: {
        userId: input.userId,
        bankId: input.bankId,
        channels: input.channels ?? ["in_app"],
        legacyFirestoreId: input.legacyFirestoreId,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: id,
        createdAt: toDate(input.createdAt, now),
      },
    },
    { upsert: true }
  );

  return true;
}

export async function deleteMongoWatcher(userId: string, bankId: string) {
  const collections = await getAppCollections();
  if (!collections) return false;

  await collections.watchers.deleteOne({ userId, bankId });
  return true;
}

export async function saveMongoMessageFeedback(input: {
  userId: string;
  messageId: string;
  threadId?: string | null;
  reaction: "up" | "down";
  reason?: "wrong_info" | "not_helpful" | "off_topic" | "outdated" | null;
  createdAt?: MongoDateInput;
  legacyFirestoreId?: string;
}) {
  const collections = await getAppCollections();
  if (!collections) return false;

  await collections.messageFeedback.insertOne({
    _id: new ObjectId(),
    userId: input.userId,
    messageId: input.messageId,
    threadId: input.threadId ?? null,
    reaction: input.reaction,
    reason: input.reason ?? null,
    legacyFirestoreId: input.legacyFirestoreId,
    createdAt: toDate(input.createdAt),
  });

  return true;
}

export async function getMongoShortlist(userId: string) {
  const collections = await getAppCollections();
  if (!collections) return null;

  const shortlist = await collections.shortlists.findOne({ userId });
  return {
    bankIds: shortlist?.bankIds ?? [],
    lastCompareSnapshot: shortlist?.lastCompareSnapshot ?? null,
    updatedAt: shortlist?.updatedAt.toISOString() ?? null,
  };
}

export async function saveMongoShortlist(input: {
  userId: string;
  bankIds: string[];
  lastCompareSnapshot?: CompareSnapshot | null;
}) {
  const collections = await getAppCollections();
  if (!collections) return false;

  const now = new Date();
  await collections.shortlists.updateOne(
    { userId: input.userId },
    {
      $set: {
        userId: input.userId,
        bankIds: Array.from(new Set(input.bankIds)),
        ...(input.lastCompareSnapshot === undefined
          ? {}
          : { lastCompareSnapshot: input.lastCompareSnapshot }),
        updatedAt: now,
      },
      $setOnInsert: {
        _id: input.userId,
        createdAt: now,
        ...(input.lastCompareSnapshot === undefined
          ? { lastCompareSnapshot: null }
          : {}),
      },
    },
    { upsert: true }
  );

  return true;
}

export async function saveMongoCalculation(input: {
  userId: string;
  principal: number;
  ratePercent: number;
  tenorMonths: number;
  compounding: "quarterly" | "monthly" | "annual";
  maturityAmount: number;
  interestEarned: number;
  maturityDate: Date;
  effectiveYield: string;
}) {
  const collections = await getAppCollections();
  if (!collections) return false;

  await collections.calculations.insertOne({
    _id: new ObjectId(),
    ...input,
    createdAt: new Date(),
  });

  return true;
}

export async function listMongoCalculations(userId: string) {
  const collections = await getAppCollections();
  if (!collections) return null;

  const calculations = await collections.calculations
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  return calculations.map((calculation) => ({
    id: calculation._id.toHexString(),
    principal: calculation.principal,
    ratePercent: calculation.ratePercent,
    tenorMonths: calculation.tenorMonths,
    compounding: calculation.compounding,
    maturityAmount: calculation.maturityAmount,
    interestEarned: calculation.interestEarned,
    maturityDate: calculation.maturityDate.toISOString(),
    effectiveYield: calculation.effectiveYield,
    createdAt: calculation.createdAt.toISOString(),
  }));
}

export async function listMongoFdRates() {
  const collections = await getAppCollections();
  if (!collections) return null;

  const rates = await collections.fdRates.find({}).toArray();
  return rates.map(toRateDto);
}

export async function getMongoFdRateById(bankId: string) {
  const collections = await getAppCollections();
  if (!collections) return null;

  const rate = await collections.fdRates.findOne({ _id: bankId });
  return rate ? toRateDto(rate) : null;
}

export async function upsertMongoFdRates(rates: FDRate[]) {
  const collections = await getAppCollections();
  if (!collections) return null;

  const now = new Date();
  if (rates.length === 0) {
    return 0;
  }

  const result = await collections.fdRates.bulkWrite(
    rates.map((rate) => ({
      updateOne: {
        filter: { _id: rate.id },
        update: {
          $set: {
            ...rate,
            updatedAt: now,
          },
          $setOnInsert: {
            _id: rate.id,
            createdAt: now,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
