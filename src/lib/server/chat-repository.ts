import { Types } from "mongoose";

import { getAssistantMongoose } from "@/lib/server/assistant-db";
import {
  type ASSISTANT_LANGUAGES,
  type CONVERSATION_TYPES,
  type INTERACTION_MODES,
  type MESSAGE_ROLES,
  type MESSAGE_TYPES,
  getAssistantModels,
} from "@/lib/server/assistant-models";
import { generateConversationTitle } from "@/lib/server/conversation-title";
import { serverEnv } from "@/lib/server/env";

export { generateConversationTitle };

type AssistantLanguage = (typeof ASSISTANT_LANGUAGES)[number];
type ConversationType = (typeof CONVERSATION_TYPES)[number];
type InteractionMode = (typeof INTERACTION_MODES)[number];
type MessageRole = (typeof MESSAGE_ROLES)[number];
type MessageType = (typeof MESSAGE_TYPES)[number];

type DateInput = Date | string | number | null | undefined;

export type ConversationDocument = {
  _id: string;
  conversationId: string;
  userId: string;
  title: string;
  titleGenerated?: boolean;
  summary?: string;
  primaryLanguage?: AssistantLanguage;
  createdAt: Date;
  updatedAt: Date;
  lastMessage: string;
  messageCount: number;
  pinned?: boolean;
  archived?: boolean;
  isArchived?: boolean;
  tags?: string[];
  metadata: Record<string, unknown>;
  conversationType?: ConversationType;
  activeVoiceSession?: string;
  lastInteractionMode?: InteractionMode;
  sentimentState?: "neutral" | "positive" | "concerned" | "frustrated";
  unreadState?: {
    unreadCount?: number;
    lastReadMessageId?: string;
    lastReadAt?: Date;
  };
  deletedAt?: Date;
  purgeAfter?: Date;
  restoredAt?: Date;
};

export type MessageDocument = {
  _id: Types.ObjectId;
  conversationId: string;
  userId: string;
  role: MessageRole;
  type?: MessageType;
  content: string;
  transcript?: string;
  translatedText?: string;
  detectedLanguage?: AssistantLanguage;
  emotionalTone?: string;
  interrupted?: boolean;
  streamingState?: "none" | "partial" | "complete" | "cancelled" | "failed";
  latency?: Record<string, unknown>;
  model?: {
    provider?: string;
    name?: string;
  };
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  retryState?: Record<string, unknown>;
  deliveryState?: Record<string, unknown>;
  audio?: Record<string, unknown>;
  multimodal?: unknown[];
  voiceSessionId?: string;
  clientTurnId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  purgeAfter?: Date;
};

export type ConversationDto = {
  id: string;
  conversationId: string;
  userId: string;
  title: string;
  titleGenerated: boolean;
  summary: string;
  primaryLanguage: AssistantLanguage;
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
  messageCount: number;
  pinned: boolean;
  archived: boolean;
  isArchived: boolean;
  tags: string[];
  conversationType: ConversationType;
  activeVoiceSession?: string;
  lastInteractionMode: InteractionMode;
  sentimentState: "neutral" | "positive" | "concerned" | "frustrated";
  unreadCount: number;
  deletedAt?: string;
  purgeAfter?: string;
  metadata: Record<string, unknown>;
};

export type MessageDto = {
  id: string;
  conversationId: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  transcript?: string;
  translatedText?: string;
  detectedLanguage?: AssistantLanguage;
  emotionalTone?: string;
  interrupted: boolean;
  streamingState: "none" | "partial" | "complete" | "cancelled" | "failed";
  latency: Record<string, unknown>;
  model?: {
    provider?: string;
    name?: string;
  };
  tokenUsage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  audio?: Record<string, unknown>;
  voiceSessionId?: string;
  clientTurnId?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
};

async function getModels() {
  const connection = await getAssistantMongoose();
  if (!connection) return null;
  return getAssistantModels();
}

function toDate(value: DateInput, fallback = new Date()) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function defaultPurgeAfter(now = new Date()) {
  return addDays(now, serverEnv.MEMORY_RETENTION_DAYS);
}

function trimLastMessage(message: string) {
  const cleaned = message.replace(/\s+/g, " ").trim();
  return cleaned.length > 500 ? `${cleaned.slice(0, 499).trim()}...` : cleaned;
}

function normalizeTags(tags: string[] | undefined) {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 20)
    )
  );
}

function toConversationDto(doc: ConversationDocument): ConversationDto {
  const archived = Boolean(doc.archived ?? doc.isArchived);
  return {
    id: doc.conversationId ?? doc._id,
    conversationId: doc.conversationId ?? doc._id,
    userId: doc.userId,
    title: doc.title,
    titleGenerated: doc.titleGenerated ?? true,
    summary: doc.summary ?? "",
    primaryLanguage: doc.primaryLanguage ?? "en",
    createdAt: toDate(doc.createdAt).toISOString(),
    updatedAt: toDate(doc.updatedAt).toISOString(),
    lastMessage: doc.lastMessage ?? "",
    messageCount: doc.messageCount ?? 0,
    pinned: Boolean(doc.pinned),
    archived,
    isArchived: archived,
    tags: doc.tags ?? [],
    conversationType: doc.conversationType ?? "chat",
    activeVoiceSession: doc.activeVoiceSession,
    lastInteractionMode: doc.lastInteractionMode ?? "chat",
    sentimentState: doc.sentimentState ?? "neutral",
    unreadCount: doc.unreadState?.unreadCount ?? 0,
    deletedAt: doc.deletedAt ? toDate(doc.deletedAt).toISOString() : undefined,
    purgeAfter: doc.purgeAfter ? toDate(doc.purgeAfter).toISOString() : undefined,
    metadata: doc.metadata ?? {},
  };
}

function toMessageDto(doc: MessageDocument): MessageDto {
  return {
    id: doc._id.toHexString(),
    conversationId: doc.conversationId,
    role: doc.role,
    type: doc.type ?? "text",
    content: doc.content ?? "",
    transcript: doc.transcript || undefined,
    translatedText: doc.translatedText || undefined,
    detectedLanguage: doc.detectedLanguage,
    emotionalTone: doc.emotionalTone,
    interrupted: Boolean(doc.interrupted),
    streamingState: doc.streamingState ?? "complete",
    latency: doc.latency ?? {},
    model: doc.model,
    tokenUsage: doc.tokenUsage ?? {},
    audio: doc.audio,
    voiceSessionId: doc.voiceSessionId,
    clientTurnId: doc.clientTurnId,
    createdAt: toDate(doc.createdAt).toISOString(),
    updatedAt: toDate(doc.updatedAt).toISOString(),
    metadata: doc.metadata ?? {},
  };
}

function encodeMessageCursor(message: MessageDocument) {
  const raw = `${toDate(message.createdAt).toISOString()}_${message._id.toHexString()}`;
  return Buffer.from(raw, "utf8").toString("base64url");
}

function decodeMessageCursor(cursor: string) {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const [dateText, id] = decoded.split("_");
    const createdAt = toDate(dateText, new Date("invalid"));
    if (!Number.isNaN(createdAt.getTime()) && Types.ObjectId.isValid(id)) {
      return { createdAt, id: new Types.ObjectId(id) };
    }
  } catch {
    // Accept legacy ISO timestamp cursors used by the first chat repository.
  }

  const createdAt = toDate(cursor, new Date("invalid"));
  return Number.isNaN(createdAt.getTime()) ? null : { createdAt, id: null };
}

export async function createConversation(input: {
  userId: string;
  title?: string;
  firstMessage?: string;
  language?: AssistantLanguage;
  conversationType?: ConversationType;
  interactionMode?: InteractionMode;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Promise<ConversationDto | null> {
  const models = await getModels();
  if (!models) return null;

  const now = new Date();
  const id = crypto.randomUUID();
  const title = input.title?.trim() || generateConversationTitle(input.firstMessage ?? "");

  const doc = await models.Conversation.create({
    _id: id,
    conversationId: id,
    userId: input.userId,
    title,
    titleGenerated: !input.title,
    summary: "",
    primaryLanguage: input.language ?? "en",
    createdAt: now,
    updatedAt: now,
    lastMessage: "",
    messageCount: 0,
    pinned: false,
    archived: false,
    tags: normalizeTags(input.tags),
    metadata: input.metadata ?? {},
    conversationType: input.conversationType ?? (input.interactionMode === "voice" ? "voice" : "chat"),
    lastInteractionMode: input.interactionMode ?? "chat",
    sentimentState: "neutral",
    unreadState: {
      unreadCount: 0,
      lastReadAt: now,
    },
  });

  return toConversationDto(doc.toObject() as ConversationDocument);
}

export async function getConversation(
  conversationId: string,
  userId: string,
  options: { includeDeleted?: boolean } = {}
): Promise<ConversationDto | null> {
  const models = await getModels();
  if (!models) return null;

  const filter: Record<string, unknown> = {
    conversationId,
    userId,
  };
  if (!options.includeDeleted) filter.deletedAt = { $exists: false };

  const doc = await models.Conversation.findOne(filter).lean<ConversationDocument>();
  return doc ? toConversationDto(doc) : null;
}

export async function listConversations(
  userId: string,
  options: {
    limit?: number;
    cursor?: string;
    includeArchived?: boolean;
    archived?: boolean;
    pinned?: boolean;
    query?: string;
    tags?: string[];
    includeDeleted?: boolean;
  } = {}
): Promise<ConversationDto[]> {
  const models = await getModels();
  if (!models) return [];

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const filter: Record<string, unknown> = { userId };

  if (!options.includeDeleted) filter.deletedAt = { $exists: false };
  if (typeof options.archived === "boolean") {
    filter.archived = options.archived;
  } else if (!options.includeArchived) {
    filter.archived = { $ne: true };
  }
  if (typeof options.pinned === "boolean") filter.pinned = options.pinned;
  const tags = normalizeTags(options.tags);
  if (tags.length > 0) filter.tags = { $all: tags };

  if (options.cursor) {
    const cursorDate = toDate(options.cursor, new Date("invalid"));
    if (!Number.isNaN(cursorDate.getTime())) {
      filter.updatedAt = { $lt: cursorDate };
    }
  }

  const query = options.query?.trim();
  if (query) {
    filter.$text = { $search: query };
  }

  const docs = await models.Conversation.find(filter)
    .sort({ pinned: -1, updatedAt: -1 })
    .limit(limit)
    .lean<ConversationDocument[]>();

  return docs.map(toConversationDto);
}

export async function searchConversations(input: {
  userId: string;
  query: string;
  limit?: number;
}) {
  return listConversations(input.userId, {
    query: input.query,
    limit: input.limit ?? 20,
    includeArchived: true,
  });
}

export async function getConversationOwner(
  conversationId: string
): Promise<string | null> {
  const models = await getModels();
  if (!models) return null;

  const doc = await models.Conversation.findOne(
    { conversationId, deletedAt: { $exists: false } },
    { userId: 1 }
  ).lean<{ userId?: string }>();

  return doc?.userId ?? null;
}

export async function updateConversationAfterMessage(
  conversationId: string,
  lastMessage: string,
  options: {
    mode?: InteractionMode;
    language?: AssistantLanguage;
    increment?: number;
    voiceSessionId?: string;
  } = {}
): Promise<void> {
  const models = await getModels();
  if (!models) return;

  await models.Conversation.updateOne(
    { conversationId, deletedAt: { $exists: false } },
    {
      $set: {
        lastMessage: trimLastMessage(lastMessage),
        updatedAt: new Date(),
        ...(options.mode ? { lastInteractionMode: options.mode } : {}),
        ...(options.language ? { primaryLanguage: options.language } : {}),
        ...(options.voiceSessionId
          ? { activeVoiceSession: options.voiceSessionId, conversationType: "mixed" }
          : {}),
      },
      $inc: { messageCount: options.increment ?? 1 },
    }
  );
}

export async function updateConversationMetadata(input: {
  conversationId: string;
  userId: string;
  title?: string;
  summary?: string;
  pinned?: boolean;
  archived?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
  sentimentState?: "neutral" | "positive" | "concerned" | "frustrated";
}) {
  const models = await getModels();
  if (!models) return null;

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) {
    set.title = input.title.trim().slice(0, 160) || "New conversation";
    set.titleGenerated = false;
  }
  if (input.summary !== undefined) set.summary = input.summary.trim().slice(0, 4000);
  if (input.pinned !== undefined) set.pinned = input.pinned;
  if (input.archived !== undefined) set.archived = input.archived;
  if (input.tags !== undefined) set.tags = normalizeTags(input.tags);
  if (input.metadata !== undefined) set.metadata = input.metadata;
  if (input.sentimentState !== undefined) set.sentimentState = input.sentimentState;

  const doc = await models.Conversation.findOneAndUpdate(
    {
      conversationId: input.conversationId,
      userId: input.userId,
      deletedAt: { $exists: false },
    },
    { $set: set },
    { returnDocument: "after" }
  ).lean<ConversationDocument>();

  return doc ? toConversationDto(doc) : null;
}

export async function archiveConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const updated = await updateConversationMetadata({
    conversationId,
    userId,
    archived: true,
  });
  return Boolean(updated);
}

export async function restoreConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const models = await getModels();
  if (!models) return false;

  const now = new Date();
  const result = await models.Conversation.updateOne(
    { conversationId, userId, deletedAt: { $exists: true } },
    {
      $set: {
        archived: false,
        restoredAt: now,
        updatedAt: now,
      },
      $unset: {
        deletedAt: "",
        purgeAfter: "",
      },
    }
  );

  await models.Message.updateMany(
    { conversationId, userId, deletedAt: { $exists: true } },
    {
      $unset: {
        deletedAt: "",
        purgeAfter: "",
      },
    }
  );

  return result.modifiedCount > 0;
}

export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const models = await getModels();
  if (!models) return false;

  const now = new Date();
  const purgeAfter = defaultPurgeAfter(now);
  const [conversationResult] = await Promise.all([
    models.Conversation.updateOne(
      { conversationId, userId, deletedAt: { $exists: false } },
      {
        $set: {
          deletedAt: now,
          purgeAfter,
          archived: true,
          updatedAt: now,
        },
      }
    ),
    models.Message.updateMany(
      { conversationId, userId, deletedAt: { $exists: false } },
      { $set: { deletedAt: now, purgeAfter } }
    ),
  ]);

  return conversationResult.modifiedCount > 0;
}

export async function hardDeleteConversation(
  conversationId: string,
  userId: string
) {
  const models = await getModels();
  if (!models) return false;

  const [conversationResult] = await Promise.all([
    models.Conversation.deleteOne({ conversationId, userId }),
    models.Message.deleteMany({ conversationId, userId }),
    models.VoiceSession.deleteMany({ conversationId, userId }),
    models.AiMemory.deleteMany({ conversationId, userId }),
    models.Analytics.deleteMany({ conversationId, userId }),
  ]);

  return conversationResult.deletedCount > 0;
}

export async function insertMessage(input: {
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
  type?: MessageType;
  transcript?: string;
  translatedText?: string;
  detectedLanguage?: AssistantLanguage;
  emotionalTone?: string;
  interrupted?: boolean;
  streamingState?: "none" | "partial" | "complete" | "cancelled" | "failed";
  latency?: Record<string, unknown>;
  model?: {
    provider?: string;
    name?: string;
  };
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  retryState?: Record<string, unknown>;
  deliveryState?: Record<string, unknown>;
  audio?: Record<string, unknown>;
  multimodal?: unknown[];
  voiceSessionId?: string;
  clientTurnId?: string;
  metadata?: Record<string, unknown>;
}): Promise<MessageDto | null> {
  const models = await getModels();
  if (!models) return null;

  const doc = await models.Message.create({
    conversationId: input.conversationId,
    userId: input.userId,
    role: input.role,
    type: input.type ?? "text",
    content: input.content,
    transcript: input.transcript ?? "",
    translatedText: input.translatedText ?? "",
    detectedLanguage: input.detectedLanguage,
    emotionalTone: input.emotionalTone ?? "neutral",
    interrupted: input.interrupted ?? false,
    streamingState: input.streamingState ?? "complete",
    latency: input.latency ?? {},
    model: input.model,
    tokenUsage: input.tokenUsage ?? {},
    retryState: input.retryState ?? {},
    deliveryState: input.deliveryState ?? {},
    audio: input.audio ?? {},
    multimodal: input.multimodal ?? [],
    voiceSessionId: input.voiceSessionId,
    clientTurnId: input.clientTurnId,
    metadata: input.metadata ?? {},
  });

  await updateConversationAfterMessage(input.conversationId, input.content || input.transcript || "", {
    mode: input.type === "voice" ? "voice" : "chat",
    language: input.detectedLanguage,
    voiceSessionId: input.voiceSessionId,
  });

  return toMessageDto(doc.toObject() as MessageDocument);
}

export async function getMessages(
  conversationId: string,
  userId: string,
  options: {
    limit?: number;
    before?: string;
    after?: string;
  } = {}
): Promise<{
  messages: MessageDto[];
  hasMore: boolean;
  nextCursor: string | null;
}> {
  const models = await getModels();
  if (!models) return { messages: [], hasMore: false, nextCursor: null };

  const conversation = await models.Conversation.exists({
    conversationId,
    userId,
    deletedAt: { $exists: false },
  });
  if (!conversation) return { messages: [], hasMore: false, nextCursor: null };

  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const filter: Record<string, unknown> = {
    conversationId,
    userId,
    deletedAt: { $exists: false },
  };

  if (options.before || options.after) {
    const cursor = decodeMessageCursor(options.before ?? options.after ?? "");
    if (cursor) {
      const direction = options.before ? "$lt" : "$gt";
      const idDirection = options.before ? "$lt" : "$gt";
      filter.$or = [
        { createdAt: { [direction]: cursor.createdAt } },
        ...(cursor.id
          ? [
              {
                createdAt: cursor.createdAt,
                _id: { [idDirection]: cursor.id },
              },
            ]
          : []),
      ];
    }
  }

  const docs = await models.Message.find(filter)
    .sort({ createdAt: options.before ? -1 : 1, _id: options.before ? -1 : 1 })
    .limit(limit + 1)
    .lean<MessageDocument[]>();

  const hasMore = docs.length > limit;
  if (hasMore) docs.pop();
  if (options.before) docs.reverse();

  return {
    messages: docs.map(toMessageDto),
    hasMore,
    nextCursor:
      hasMore && docs.length > 0
        ? encodeMessageCursor(docs[options.before ? 0 : docs.length - 1])
        : null,
  };
}

export async function getRecentMessages(
  conversationId: string,
  userId: string,
  limit = 20
): Promise<{ messages: MessageDto[]; hasMore: boolean; nextCursor: string | null }> {
  const models = await getModels();
  if (!models) return { messages: [], hasMore: false, nextCursor: null };

  const conversation = await models.Conversation.exists({
    conversationId,
    userId,
    deletedAt: { $exists: false },
  });
  if (!conversation) return { messages: [], hasMore: false, nextCursor: null };

  const normalizedLimit = Math.min(Math.max(limit, 1), 100);
  const docs = await models.Message.find({
    conversationId,
    userId,
    deletedAt: { $exists: false },
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(normalizedLimit + 1)
    .lean<MessageDocument[]>();

  const hasMore = docs.length > normalizedLimit;
  if (hasMore) docs.pop();
  docs.reverse();

  return {
    messages: docs.map(toMessageDto),
    hasMore,
    nextCursor: hasMore && docs.length > 0 ? encodeMessageCursor(docs[0]) : null,
  };
}

export async function markConversationRead(input: {
  conversationId: string;
  userId: string;
  messageId?: string;
}) {
  const models = await getModels();
  if (!models) return false;

  const result = await models.Conversation.updateOne(
    { conversationId: input.conversationId, userId: input.userId },
    {
      $set: {
        unreadState: {
          unreadCount: 0,
          lastReadMessageId: input.messageId,
          lastReadAt: new Date(),
        },
      },
    }
  );

  return result.modifiedCount > 0;
}
