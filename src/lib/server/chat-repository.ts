/**
 * Chat Repository — Separate conversations + messages collections
 *
 * Data model follows ChatGPT pattern:
 * - Each conversation is a lightweight document in `conversations`
 * - Each message is a separate document in `chat_messages`
 * - No embedded message arrays
 */
import { ObjectId } from "mongodb";
import type { Collection } from "mongodb";

import { getMongoDb } from "@/lib/server/mongo";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConversationDocument = {
  _id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage: string;
  messageCount: number;
  isArchived: boolean;
  metadata: Record<string, unknown>;
};

export type MessageDocument = {
  _id: ObjectId;
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
};

export type ConversationDto = {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
  messageCount: number;
  isArchived: boolean;
};

export type MessageDto = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

// ─── Collections & Indexes ──────────────────────────────────────────────────

type ChatCollections = {
  conversations: Collection<ConversationDocument>;
  chatMessages: Collection<MessageDocument>;
};

let chatIndexesReady: Promise<void> | null = null;

async function ensureChatIndexes(collections: ChatCollections) {
  chatIndexesReady ??= Promise.all([
    // Sidebar listing: userId + updatedAt desc
    collections.conversations.createIndex(
      { userId: 1, updatedAt: -1 },
      { background: true }
    ),
    // Archived filter
    collections.conversations.createIndex(
      { userId: 1, isArchived: 1, updatedAt: -1 },
      { background: true }
    ),
    // Message retrieval: conversationId + createdAt asc
    collections.chatMessages.createIndex(
      { conversationId: 1, createdAt: 1 },
      { background: true }
    ),
    // Ownership validation
    collections.chatMessages.createIndex(
      { conversationId: 1, userId: 1 },
      { background: true }
    ),
  ]).then(() => undefined);

  await chatIndexesReady;
}

export async function getChatCollections(): Promise<ChatCollections | null> {
  const db = await getMongoDb();
  if (!db) return null;

  const collections: ChatCollections = {
    conversations: db.collection<ConversationDocument>("conversations"),
    chatMessages: db.collection<MessageDocument>("chat_messages"),
  };

  await ensureChatIndexes(collections);
  return collections;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toConversationDto(doc: ConversationDocument): ConversationDto {
  return {
    id: doc._id,
    userId: doc.userId,
    title: doc.title,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    lastMessage: doc.lastMessage,
    messageCount: doc.messageCount,
    isArchived: doc.isArchived,
  };
}

function toMessageDto(doc: MessageDocument): MessageDto {
  return {
    id: doc._id.toHexString(),
    conversationId: doc.conversationId,
    role: doc.role,
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
    metadata: doc.metadata,
  };
}

/**
 * Auto-generate a conversation title from the first user message.
 * Takes the first 60 characters, clipping at the last word boundary.
 */
function generateTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 60) return cleaned;

  const truncated = cleaned.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

// ─── Conversation CRUD ──────────────────────────────────────────────────────

export async function createConversation(input: {
  userId: string;
  title?: string;
  firstMessage?: string;
}): Promise<ConversationDto | null> {
  const collections = await getChatCollections();
  if (!collections) return null;

  const now = new Date();
  const id = crypto.randomUUID();
  const title =
    input.title || (input.firstMessage ? generateTitle(input.firstMessage) : "New conversation");

  const doc: ConversationDocument = {
    _id: id,
    userId: input.userId,
    title,
    createdAt: now,
    updatedAt: now,
    lastMessage: "",
    messageCount: 0,
    isArchived: false,
    metadata: {},
  };

  await collections.conversations.insertOne(doc);
  return toConversationDto(doc);
}

export async function getConversation(
  conversationId: string,
  userId: string
): Promise<ConversationDto | null> {
  const collections = await getChatCollections();
  if (!collections) return null;

  const doc = await collections.conversations.findOne({
    _id: conversationId,
    userId,
  });

  return doc ? toConversationDto(doc) : null;
}

export async function listConversations(
  userId: string,
  options: { limit?: number; includeArchived?: boolean } = {}
): Promise<ConversationDto[]> {
  const collections = await getChatCollections();
  if (!collections) return [];

  const filter: Record<string, unknown> = { userId };
  if (!options.includeArchived) {
    filter.isArchived = { $ne: true };
  }

  const docs = await collections.conversations
    .find(filter)
    .sort({ updatedAt: -1 })
    .limit(options.limit ?? 50)
    .toArray();

  return docs.map(toConversationDto);
}

export async function getConversationOwner(
  conversationId: string
): Promise<string | null> {
  const collections = await getChatCollections();
  if (!collections) return null;

  const doc = await collections.conversations.findOne(
    { _id: conversationId },
    { projection: { userId: 1 } }
  );

  return doc?.userId ?? null;
}

export async function updateConversationAfterMessage(
  conversationId: string,
  lastMessage: string
): Promise<void> {
  const collections = await getChatCollections();
  if (!collections) return;

  await collections.conversations.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessage:
          lastMessage.length > 200
            ? lastMessage.slice(0, 200) + "…"
            : lastMessage,
        updatedAt: new Date(),
      },
      $inc: { messageCount: 1 },
    }
  );
}

export async function archiveConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const collections = await getChatCollections();
  if (!collections) return false;

  const result = await collections.conversations.updateOne(
    { _id: conversationId, userId },
    { $set: { isArchived: true, updatedAt: new Date() } }
  );

  return result.modifiedCount > 0;
}

export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const collections = await getChatCollections();
  if (!collections) return false;

  const [convResult] = await Promise.all([
    collections.conversations.deleteOne({ _id: conversationId, userId }),
    collections.chatMessages.deleteMany({ conversationId, userId }),
  ]);

  return convResult.deletedCount > 0;
}

// ─── Message CRUD ───────────────────────────────────────────────────────────

export async function insertMessage(input: {
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<MessageDto | null> {
  const collections = await getChatCollections();
  if (!collections) return null;

  const now = new Date();
  const doc: MessageDocument = {
    _id: new ObjectId(),
    conversationId: input.conversationId,
    userId: input.userId,
    role: input.role,
    content: input.content,
    createdAt: now,
    metadata: input.metadata ?? {},
  };

  await collections.chatMessages.insertOne(doc);

  // Update conversation metadata
  await updateConversationAfterMessage(
    input.conversationId,
    input.content
  );

  return toMessageDto(doc);
}

/**
 * Fetch messages with cursor-based pagination.
 *
 * @param conversationId - The conversation to fetch messages for
 * @param userId - Owner of the conversation (for security)
 * @param options.limit - Max messages to return (default 20)
 * @param options.before - Cursor: return messages created before this ISO timestamp
 * @param options.after - Cursor: return messages created after this ISO timestamp
 */
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
  const collections = await getChatCollections();
  if (!collections)
    return { messages: [], hasMore: false, nextCursor: null };

  // Verify ownership
  const conversation = await collections.conversations.findOne(
    { _id: conversationId, userId },
    { projection: { _id: 1 } }
  );
  if (!conversation) return { messages: [], hasMore: false, nextCursor: null };

  const limit = Math.min(options.limit ?? 20, 100);

  const filter: Record<string, unknown> = { conversationId };
  if (options.before) {
    filter.createdAt = { $lt: new Date(options.before) };
  } else if (options.after) {
    filter.createdAt = { $gt: new Date(options.after) };
  }

  // Fetch limit + 1 to check if there are more
  const docs = await collections.chatMessages
    .find(filter)
    .sort({ createdAt: options.before ? -1 : 1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  if (hasMore) docs.pop();

  // If we fetched in reverse order (before cursor), reverse back
  if (options.before) docs.reverse();

  const messages = docs.map(toMessageDto);
  const nextCursor =
    hasMore && docs.length > 0
      ? docs[options.before ? 0 : docs.length - 1].createdAt.toISOString()
      : null;

  return { messages, hasMore, nextCursor };
}

/**
 * Get the most recent messages for a conversation (for loading a chat).
 * Returns messages in chronological order (oldest first).
 */
export async function getRecentMessages(
  conversationId: string,
  userId: string,
  limit = 20
): Promise<{ messages: MessageDto[]; hasMore: boolean }> {
  const collections = await getChatCollections();
  if (!collections) return { messages: [], hasMore: false };

  const conversation = await collections.conversations.findOne(
    { _id: conversationId, userId },
    { projection: { _id: 1 } }
  );
  if (!conversation) return { messages: [], hasMore: false };

  // Fetch the most recent N+1 messages in reverse order
  const docs = await collections.chatMessages
    .find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  if (hasMore) docs.pop();

  // Reverse to get chronological order
  docs.reverse();

  return {
    messages: docs.map(toMessageDto),
    hasMore,
  };
}
