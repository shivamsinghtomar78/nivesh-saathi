import type { PipelineStage } from "mongoose";

import { getAssistantMongoose } from "@/lib/server/assistant-db";
import { encryptSensitiveText } from "@/lib/server/assistant-crypto";
import {
  type ASSISTANT_LANGUAGES,
  type MEMORY_TYPES,
  getAssistantModels,
} from "@/lib/server/assistant-models";
import { getRecentMessages, type MessageDto } from "@/lib/server/chat-repository";
import { serverEnv } from "@/lib/server/env";
import { logServerWarn } from "@/lib/server/telemetry";

type AssistantLanguage = (typeof ASSISTANT_LANGUAGES)[number];
type MemoryType = (typeof MEMORY_TYPES)[number];

type MemoryRecordDto = {
  memoryId: string;
  userId: string;
  conversationId?: string;
  memoryType: MemoryType;
  key: string;
  value: string;
  sanitizedValue: string;
  language?: AssistantLanguage;
  sourceMessageIds: string[];
  confidence: number;
  priority: number;
  tokenEstimate: number;
  expiresAt?: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
};

type MemoryLean = MemoryRecordDto & {
  _id?: unknown;
  createdAt?: Date;
  updatedAt: Date;
  expiresAt?: Date;
};

type UserPreferencesDto = {
  userId: string;
  languagePreference: AssistantLanguage;
  tonePreference: string;
  communicationStyle: string;
  memoryEnabled: boolean;
  voiceAutoSpeak: boolean;
  themePreference: "light" | "dark" | "system";
  financialPreferences: Record<string, unknown>;
  privacy: {
    analyticsEnabled?: boolean;
    voiceHistoryEnabled?: boolean;
    memoryResetAt?: Date;
  };
  metadata: Record<string, unknown>;
};

type AssistantStateDto = {
  userId: string;
  activeConversationId?: string;
  activeVoiceSessionId?: string;
  lastInteractionMode: "chat" | "voice";
  contextSummary: string;
  retrievalContext: Record<string, unknown>;
  lastSeenAt?: Date;
  metadata: Record<string, unknown>;
};

type VoiceSessionDto = {
  sessionId: string;
  conversationId: string;
  userId: string;
  language: AssistantLanguage;
  status: "active" | "ended" | "interrupted" | "failed";
  startedAt: string;
  endedAt?: string;
  speakingDurationMs: number;
  interruptionCount: number;
  turns: unknown[];
  metadata: Record<string, unknown>;
};

async function getModels() {
  const connection = await getAssistantMongoose();
  if (!connection) return null;
  return getAssistantModels();
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function trimText(text: string, maxLength: number) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3).trim()}...` : cleaned;
}

function analyticsExpiresAt() {
  return new Date(Date.now() + serverEnv.ANALYTICS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function memoryExpiresAt(days = serverEnv.MEMORY_RETENTION_DAYS) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function toMemoryDto(memory: MemoryLean): MemoryRecordDto {
  return {
    memoryId: memory.memoryId,
    userId: memory.userId,
    conversationId: memory.conversationId,
    memoryType: memory.memoryType,
    key: memory.key,
    value: memory.value,
    sanitizedValue: memory.sanitizedValue,
    language: memory.language,
    sourceMessageIds: memory.sourceMessageIds ?? [],
    confidence: memory.confidence ?? 0.75,
    priority: memory.priority ?? 50,
    tokenEstimate: memory.tokenEstimate ?? estimateTokens(memory.sanitizedValue || memory.value),
    expiresAt: memory.expiresAt?.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
    metadata: memory.metadata ?? {},
  };
}

async function embedMemoryText(text: string) {
  const apiKey = serverEnv.GEMINI_API_KEY;
  if (!apiKey || !text.trim()) return null;

  const endpoint = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${serverEnv.MEMORY_EMBEDDING_MODEL}:embedContent`
  );
  endpoint.searchParams.set("key", apiKey);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: {
        parts: [{ text: text.slice(0, 8000) }],
      },
    }),
  });

  if (!response.ok) {
    logServerWarn("memory_embedding_failed", { status: response.status });
    return null;
  }

  const payload = (await response.json()) as {
    embedding?: {
      values?: number[];
    };
  };

  return payload.embedding?.values ?? null;
}

export async function upsertAssistantMemory(input: {
  userId: string;
  memoryType: MemoryType;
  key: string;
  value: string;
  sanitizedValue?: string;
  conversationId?: string;
  language?: AssistantLanguage;
  sourceMessageIds?: string[];
  confidence?: number;
  priority?: number;
  sensitive?: boolean;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}) {
  const models = await getModels();
  if (!models) return null;

  const sanitizedValue = trimText(input.sanitizedValue ?? input.value, 12000);
  const value = input.sensitive ? "" : trimText(input.value, 12000);
  const encryptedValue = input.sensitive ? encryptSensitiveText(input.value) : null;
  const embedding = await embedMemoryText(sanitizedValue).catch(() => null);
  const memoryId = `${input.userId}:${input.key}`;
  const now = new Date();

  const doc = await models.AiMemory.findOneAndUpdate(
    { userId: input.userId, key: input.key },
    {
      $set: {
        memoryId,
        userId: input.userId,
        conversationId: input.conversationId,
        memoryType: input.memoryType,
        key: input.key,
        value,
        sanitizedValue,
        encryptedValue: encryptedValue ?? undefined,
        language: input.language,
        sourceMessageIds: input.sourceMessageIds ?? [],
        embedding: embedding ?? undefined,
        confidence: input.confidence ?? 0.75,
        priority: input.priority ?? 50,
        tokenEstimate: estimateTokens(sanitizedValue),
        expiresAt: input.expiresAt === null ? undefined : input.expiresAt ?? memoryExpiresAt(),
        lastUsedAt: now,
        metadata: input.metadata ?? {},
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" }
  ).lean<MemoryLean>();

  return doc ? toMemoryDto(doc) : null;
}

export async function listAssistantMemories(input: {
  userId: string;
  memoryType?: MemoryType;
  limit?: number;
}) {
  const models = await getModels();
  if (!models) return [];

  const filter: Record<string, unknown> = { userId: input.userId };
  if (input.memoryType) filter.memoryType = input.memoryType;

  const docs = await models.AiMemory.find(filter)
    .sort({ priority: -1, updatedAt: -1 })
    .limit(Math.min(Math.max(input.limit ?? 50, 1), 100))
    .lean<MemoryLean[]>();

  return docs.map(toMemoryDto);
}

export async function retrieveRelevantMemories(input: {
  userId: string;
  query: string;
  limit?: number;
  tokenBudget?: number;
}) {
  const models = await getModels();
  if (!models) return [];

  const limit = Math.min(Math.max(input.limit ?? 8, 1), 20);
  const query = input.query.trim();
  const embedding = await embedMemoryText(query).catch(() => null);

  if (embedding?.length) {
    try {
      const pipeline: PipelineStage[] = [
        {
          $vectorSearch: {
            index: "ai_memory_vector",
            path: "embedding",
            queryVector: embedding,
            numCandidates: Math.max(50, limit * 8),
            limit,
            filter: { userId: input.userId },
          },
        },
        {
          $project: {
            memoryId: 1,
            userId: 1,
            conversationId: 1,
            memoryType: 1,
            key: 1,
            value: 1,
            sanitizedValue: 1,
            language: 1,
            sourceMessageIds: 1,
            confidence: 1,
            priority: 1,
            tokenEstimate: 1,
            expiresAt: 1,
            updatedAt: 1,
            metadata: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ];
      const docs = (await models.AiMemory.aggregate(pipeline)) as MemoryLean[];
      return applyTokenBudget(docs.map(toMemoryDto), input.tokenBudget);
    } catch {
      logServerWarn("memory_vector_search_fallback", { userId: input.userId });
    }
  }

  const filter: Record<string, unknown> = { userId: input.userId };
  if (query) {
    filter.$text = { $search: query };
  }

  try {
    const docs = await models.AiMemory.find(filter)
      .sort(query ? { score: { $meta: "textScore" }, priority: -1 } : { priority: -1, updatedAt: -1 })
      .limit(limit)
      .lean<MemoryLean[]>();
    return applyTokenBudget(docs.map(toMemoryDto), input.tokenBudget);
  } catch {
    const docs = await models.AiMemory.find({ userId: input.userId })
      .sort({ priority: -1, updatedAt: -1 })
      .limit(limit)
      .lean<MemoryLean[]>();
    return applyTokenBudget(docs.map(toMemoryDto), input.tokenBudget);
  }
}

function applyTokenBudget(memories: MemoryRecordDto[], tokenBudget = 900) {
  const selected: MemoryRecordDto[] = [];
  let used = 0;

  for (const memory of memories) {
    const cost = memory.tokenEstimate || estimateTokens(memory.sanitizedValue || memory.value);
    if (used + cost > tokenBudget && selected.length > 0) break;
    selected.push(memory);
    used += cost;
  }

  return selected;
}

export async function getUserPreferences(userId: string): Promise<UserPreferencesDto | null> {
  const models = await getModels();
  if (!models) return null;

  const doc = await models.UserPreferences.findOne({ userId }).lean<UserPreferencesDto>();
  return doc ?? null;
}

export async function upsertUserPreferences(
  userId: string,
  updates: Partial<UserPreferencesDto>
) {
  const models = await getModels();
  if (!models) return null;

  const now = new Date();
  const doc = await models.UserPreferences.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...updates,
        userId,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: userId,
        languagePreference: "en",
        tonePreference: "warm",
        communicationStyle: "simple",
        memoryEnabled: true,
        voiceAutoSpeak: true,
        themePreference: "system",
        financialPreferences: {},
        privacy: {
          analyticsEnabled: true,
          voiceHistoryEnabled: true,
        },
        metadata: {},
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" }
  ).lean<UserPreferencesDto>();

  return doc;
}

export async function updateAssistantState(
  userId: string,
  updates: Partial<AssistantStateDto>
) {
  const models = await getModels();
  if (!models) return null;

  const now = new Date();
  const doc = await models.AssistantState.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...updates,
        userId,
        lastSeenAt: updates.lastSeenAt ?? now,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: userId,
        lastInteractionMode: "chat",
        contextSummary: "",
        retrievalContext: {},
        metadata: {},
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" }
  ).lean<AssistantStateDto>();

  return doc;
}

export async function getAssistantState(userId: string) {
  const models = await getModels();
  if (!models) return null;

  return models.AssistantState.findOne({ userId }).lean<AssistantStateDto>();
}

export async function trackAnalyticsEvent(input: {
  userId?: string;
  conversationId?: string;
  voiceSessionId?: string;
  eventType: string;
  source?: "chat" | "voice" | "system";
  language?: AssistantLanguage;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}) {
  const models = await getModels();
  if (!models) return false;

  await models.Analytics.create({
    ...input,
    source: input.source ?? "system",
    occurredAt: new Date(),
    expiresAt: analyticsExpiresAt(),
    metadata: input.metadata ?? {},
  });

  return true;
}

export async function startVoiceSession(input: {
  userId: string;
  conversationId: string;
  language: AssistantLanguage;
  metadata?: Record<string, unknown>;
}) {
  const models = await getModels();
  if (!models) return null;

  const sessionId = crypto.randomUUID();
  const doc = await models.VoiceSession.create({
    _id: sessionId,
    sessionId,
    userId: input.userId,
    conversationId: input.conversationId,
    language: input.language,
    metadata: input.metadata ?? {},
  });

  await updateAssistantState(input.userId, {
    activeConversationId: input.conversationId,
    activeVoiceSessionId: sessionId,
    lastInteractionMode: "voice",
  });

  return toVoiceSessionDto(doc.toObject() as VoiceSessionDto & { startedAt: Date; endedAt?: Date });
}

function toVoiceSessionDto(
  doc: Omit<VoiceSessionDto, "startedAt" | "endedAt"> & {
    startedAt: Date;
    endedAt?: Date;
  }
): VoiceSessionDto {
  return {
    sessionId: doc.sessionId,
    conversationId: doc.conversationId,
    userId: doc.userId,
    language: doc.language,
    status: doc.status,
    startedAt: doc.startedAt.toISOString(),
    endedAt: doc.endedAt?.toISOString(),
    speakingDurationMs: doc.speakingDurationMs ?? 0,
    interruptionCount: doc.interruptionCount ?? 0,
    turns: doc.turns ?? [],
    metadata: doc.metadata ?? {},
  };
}

export async function recordVoiceTurn(input: {
  sessionId: string;
  userId: string;
  conversationId: string;
  clientTurnId?: string;
  transcript: string;
  finalTranscript?: string;
  aiResponse: string;
  generatedSpeechText?: string;
  playbackDurationMs?: number;
  speakingDurationMs?: number;
  interruptionCount?: number;
  latency?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const models = await getModels();
  if (!models) return false;

  const result = await models.VoiceSession.updateOne(
    {
      sessionId: input.sessionId,
      userId: input.userId,
      conversationId: input.conversationId,
    },
    {
      $push: {
        turns: {
          clientTurnId: input.clientTurnId,
          startedAt: new Date(),
          endedAt: new Date(),
          sttTranscript: input.transcript,
          finalTranscript: input.finalTranscript ?? input.transcript,
          aiResponse: input.aiResponse,
          generatedSpeechText: input.generatedSpeechText ?? input.aiResponse,
          playbackDurationMs: input.playbackDurationMs,
          speakingDurationMs: input.speakingDurationMs,
          interruptionCount: input.interruptionCount ?? 0,
          latency: input.latency ?? {},
          metadata: input.metadata ?? {},
        },
      },
      $inc: {
        speakingDurationMs: input.speakingDurationMs ?? 0,
        interruptionCount: input.interruptionCount ?? 0,
      },
      $set: { updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
}

export async function endVoiceSession(input: {
  sessionId: string;
  userId: string;
  status?: "ended" | "interrupted" | "failed";
}) {
  const models = await getModels();
  if (!models) return false;

  const result = await models.VoiceSession.updateOne(
    { sessionId: input.sessionId, userId: input.userId },
    {
      $set: {
        status: input.status ?? "ended",
        endedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  await updateAssistantState(input.userId, {
    activeVoiceSessionId: undefined,
    lastInteractionMode: "voice",
  });

  return result.modifiedCount > 0;
}

export async function buildAssistantRetrievalContext(input: {
  userId: string;
  conversationId?: string;
  query: string;
  tokenBudget?: number;
  recentLimit?: number;
}) {
  const [preferences, state, memories, recent] = await Promise.all([
    getUserPreferences(input.userId),
    getAssistantState(input.userId),
    retrieveRelevantMemories({
      userId: input.userId,
      query: input.query,
      limit: 10,
      tokenBudget: Math.floor((input.tokenBudget ?? 1200) * 0.7),
    }),
    input.conversationId
      ? getRecentMessages(input.conversationId, input.userId, input.recentLimit ?? 8)
      : Promise.resolve({ messages: [] as MessageDto[], hasMore: false, nextCursor: null }),
  ]);

  const memoryLines = memories.map((memory) => {
    const value = memory.sanitizedValue || memory.value;
    return `${memory.memoryType}:${memory.key}=${trimText(value, 360)}`;
  });
  const recentLines = recent.messages
    .slice(-8)
    .map((message) => `${message.role}: ${trimText(message.transcript || message.content, 280)}`);

  const context = [
    preferences
      ? `Preferences: language=${preferences.languagePreference}; tone=${preferences.tonePreference}; style=${preferences.communicationStyle}.`
      : "",
    state?.contextSummary ? `Assistant state: ${trimText(state.contextSummary, 420)}` : "",
    memoryLines.length ? `Relevant memory:\n${memoryLines.join("\n")}` : "",
    recentLines.length ? `Recent conversation:\n${recentLines.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    context: trimText(context, (input.tokenBudget ?? 1200) * 4),
    preferences,
    state,
    memories,
    recentMessages: recent.messages,
  };
}

export async function resetAssistantMemory(userId: string) {
  const models = await getModels();
  if (!models) return false;

  const now = new Date();
  await Promise.all([
    models.AiMemory.deleteMany({ userId }),
    models.AssistantState.updateOne(
      { userId },
      {
        $set: {
          contextSummary: "",
          retrievalContext: {},
          "metadata.memoryResetAt": now,
          updatedAt: now,
        },
        $unset: {
          activeConversationId: "",
          activeVoiceSessionId: "",
        },
      },
      { upsert: true }
    ),
    upsertUserPreferences(userId, {
      privacy: {
        analyticsEnabled: true,
        voiceHistoryEnabled: true,
        memoryResetAt: now,
      },
    } as Partial<UserPreferencesDto>),
  ]);

  return true;
}

export async function exportAssistantMemory(userId: string) {
  const [preferences, state, memories] = await Promise.all([
    getUserPreferences(userId),
    getAssistantState(userId),
    listAssistantMemories({ userId, limit: 100 }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    preferences,
    state,
    memories,
  };
}
