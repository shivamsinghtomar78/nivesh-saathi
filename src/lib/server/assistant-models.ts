import {
  Schema,
  type InferSchemaType,
  type Model,
  model,
  models,
} from "mongoose";

export const ASSISTANT_LANGUAGES = ["en", "hi", "hinglish", "ta", "te"] as const;
export const MESSAGE_ROLES = ["user", "assistant", "system"] as const;
export const MESSAGE_TYPES = ["text", "voice", "system", "stream", "multimodal"] as const;
export const CONVERSATION_TYPES = ["chat", "voice", "mixed"] as const;
export const INTERACTION_MODES = ["chat", "voice"] as const;
export const MEMORY_TYPES = [
  "short_term",
  "long_term",
  "preference",
  "financial_preference",
  "language_preference",
  "conversation_summary",
  "retrieval_chunk",
] as const;

const Mixed = Schema.Types.Mixed;

const encryptedStringSchema = new Schema(
  {
    algorithm: { type: String, required: true },
    iv: { type: String, required: true },
    tag: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const tokenUsageSchema = new Schema(
  {
    promptTokens: { type: Number, min: 0, default: 0 },
    completionTokens: { type: Number, min: 0, default: 0 },
    totalTokens: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const latencySchema = new Schema(
  {
    totalMs: { type: Number, min: 0 },
    firstTokenMs: { type: Number, min: 0 },
    sttMs: { type: Number, min: 0 },
    ttsMs: { type: Number, min: 0 },
    modelMs: { type: Number, min: 0 },
  },
  { _id: false }
);

const audioMetadataSchema = new Schema(
  {
    audioUrl: { type: String },
    storageKey: { type: String },
    mimeType: { type: String },
    durationMs: { type: Number, min: 0 },
    sizeBytes: { type: Number, min: 0 },
    provider: { type: String },
    encryptedUrl: encryptedStringSchema,
  },
  { _id: false }
);

const deliveryStateSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["queued", "streaming", "sent", "failed", "cancelled"],
      default: "sent",
    },
    error: { type: String },
    deliveredAt: { type: Date },
  },
  { _id: false }
);

const retryStateSchema = new Schema(
  {
    count: { type: Number, min: 0, default: 0 },
    lastRetriedAt: { type: Date },
    lastError: { type: String },
  },
  { _id: false }
);

const unreadStateSchema = new Schema(
  {
    unreadCount: { type: Number, min: 0, default: 0 },
    lastReadMessageId: { type: String },
    lastReadAt: { type: Date },
  },
  { _id: false }
);

export const conversationSchema = new Schema(
  {
    _id: { type: String, required: true },
    conversationId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    titleGenerated: { type: Boolean, default: true },
    summary: { type: String, default: "", maxlength: 4000 },
    primaryLanguage: { type: String, enum: ASSISTANT_LANGUAGES, default: "en" },
    lastMessage: { type: String, default: "", maxlength: 500 },
    messageCount: { type: Number, min: 0, default: 0 },
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    metadata: { type: Mixed, default: {} },
    conversationType: { type: String, enum: CONVERSATION_TYPES, default: "chat" },
    activeVoiceSession: { type: String },
    lastInteractionMode: { type: String, enum: INTERACTION_MODES, default: "chat" },
    sentimentState: {
      type: String,
      enum: ["neutral", "positive", "concerned", "frustrated"],
      default: "neutral",
    },
    unreadState: { type: unreadStateSchema, default: () => ({}) },
    deletedAt: { type: Date },
    purgeAfter: { type: Date },
    restoredAt: { type: Date },
  },
  {
    collection: "conversations",
    timestamps: true,
    versionKey: false,
  }
);

conversationSchema.index({ userId: 1, archived: 1, pinned: -1, updatedAt: -1 });
conversationSchema.index({ userId: 1, deletedAt: 1, updatedAt: -1 });
conversationSchema.index({ userId: 1, purgeAfter: 1 });
conversationSchema.index({ title: "text", summary: "text", tags: "text", lastMessage: "text" });

export const messageSchema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: MESSAGE_ROLES, required: true },
    type: { type: String, enum: MESSAGE_TYPES, default: "text" },
    content: { type: String, default: "", maxlength: 20000 },
    transcript: { type: String, default: "", maxlength: 20000 },
    translatedText: { type: String, default: "", maxlength: 20000 },
    detectedLanguage: { type: String, enum: ASSISTANT_LANGUAGES },
    emotionalTone: {
      type: String,
      enum: ["neutral", "informative", "celebratory", "cautionary", "frustrated"],
      default: "neutral",
    },
    interrupted: { type: Boolean, default: false },
    streamingState: {
      type: String,
      enum: ["none", "partial", "complete", "cancelled", "failed"],
      default: "complete",
    },
    latency: { type: latencySchema, default: () => ({}) },
    model: {
      provider: { type: String },
      name: { type: String },
    },
    tokenUsage: { type: tokenUsageSchema, default: () => ({}) },
    retryState: { type: retryStateSchema, default: () => ({}) },
    deliveryState: { type: deliveryStateSchema, default: () => ({}) },
    audio: { type: audioMetadataSchema, default: () => ({}) },
    multimodal: { type: [Mixed], default: [] },
    voiceSessionId: { type: String },
    clientTurnId: { type: String },
    metadata: { type: Mixed, default: {} },
    deletedAt: { type: Date },
    purgeAfter: { type: Date },
  },
  {
    collection: "messages",
    timestamps: true,
    versionKey: false,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1, _id: 1 });
messageSchema.index({ userId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, userId: 1 });
messageSchema.index({ content: "text", transcript: "text", translatedText: "text" });
messageSchema.index({ userId: 1, purgeAfter: 1 });

const voiceTurnSchema = new Schema(
  {
    clientTurnId: { type: String },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    sttTranscript: { type: String, default: "" },
    finalTranscript: { type: String, default: "" },
    aiResponse: { type: String, default: "" },
    generatedSpeechText: { type: String, default: "" },
    playbackDurationMs: { type: Number, min: 0 },
    speakingDurationMs: { type: Number, min: 0 },
    interruptionCount: { type: Number, min: 0, default: 0 },
    silenceMs: { type: Number, min: 0 },
    latency: { type: latencySchema, default: () => ({}) },
    metadata: { type: Mixed, default: {} },
  },
  { _id: false }
);

export const voiceSessionSchema = new Schema(
  {
    _id: { type: String, required: true },
    sessionId: { type: String, required: true, unique: true },
    conversationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    language: { type: String, enum: ASSISTANT_LANGUAGES, default: "en" },
    status: {
      type: String,
      enum: ["active", "ended", "interrupted", "failed"],
      default: "active",
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    speakingDurationMs: { type: Number, min: 0, default: 0 },
    interruptionCount: { type: Number, min: 0, default: 0 },
    silenceEvents: { type: [Mixed], default: [] },
    reconnectEvents: { type: [Mixed], default: [] },
    audioMetadata: { type: audioMetadataSchema, default: () => ({}) },
    ttsMetadata: { type: Mixed, default: {} },
    turns: { type: [voiceTurnSchema], default: [] },
    metadata: { type: Mixed, default: {} },
    deletedAt: { type: Date },
    purgeAfter: { type: Date },
  },
  {
    collection: "voice_sessions",
    timestamps: true,
    versionKey: false,
  }
);

voiceSessionSchema.index({ userId: 1, updatedAt: -1 });
voiceSessionSchema.index({ conversationId: 1, startedAt: -1 });
voiceSessionSchema.index({ userId: 1, purgeAfter: 1 });

export const aiMemorySchema = new Schema(
  {
    memoryId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    conversationId: { type: String },
    memoryType: { type: String, enum: MEMORY_TYPES, required: true },
    key: { type: String, required: true },
    value: { type: String, default: "", maxlength: 12000 },
    sanitizedValue: { type: String, default: "", maxlength: 12000 },
    encryptedValue: encryptedStringSchema,
    language: { type: String, enum: ASSISTANT_LANGUAGES },
    sourceMessageIds: { type: [String], default: [] },
    embedding: { type: [Number], default: undefined },
    confidence: { type: Number, min: 0, max: 1, default: 0.75 },
    priority: { type: Number, min: 0, max: 100, default: 50 },
    tokenEstimate: { type: Number, min: 0, default: 0 },
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
    metadata: { type: Mixed, default: {} },
  },
  {
    collection: "ai_memory",
    timestamps: true,
    versionKey: false,
  }
);

aiMemorySchema.index({ userId: 1, memoryType: 1, priority: -1, updatedAt: -1 });
aiMemorySchema.index({ userId: 1, key: 1 }, { unique: true });
aiMemorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });
aiMemorySchema.index({ value: "text", sanitizedValue: "text", key: "text" });

export const analyticsSchema = new Schema(
  {
    userId: { type: String, index: true },
    conversationId: { type: String, index: true },
    voiceSessionId: { type: String },
    eventType: { type: String, required: true, index: true },
    source: { type: String, enum: ["chat", "voice", "system"], default: "system" },
    language: { type: String, enum: ASSISTANT_LANGUAGES },
    latencyMs: { type: Number, min: 0 },
    metadata: { type: Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, index: true },
  },
  {
    collection: "analytics",
    timestamps: true,
    versionKey: false,
  }
);

analyticsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });
analyticsSchema.index({ userId: 1, eventType: 1, occurredAt: -1 });

export const userPreferencesSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, unique: true },
    languagePreference: { type: String, enum: ASSISTANT_LANGUAGES, default: "en" },
    tonePreference: { type: String, default: "warm" },
    communicationStyle: { type: String, default: "simple" },
    memoryEnabled: { type: Boolean, default: true },
    voiceAutoSpeak: { type: Boolean, default: true },
    themePreference: { type: String, enum: ["light", "dark", "system"], default: "system" },
    financialPreferences: { type: Mixed, default: {} },
    privacy: {
      analyticsEnabled: { type: Boolean, default: true },
      voiceHistoryEnabled: { type: Boolean, default: true },
      memoryResetAt: { type: Date },
    },
    metadata: { type: Mixed, default: {} },
  },
  {
    collection: "user_preferences",
    timestamps: true,
    versionKey: false,
  }
);

export const assistantStateSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, unique: true },
    activeConversationId: { type: String },
    activeVoiceSessionId: { type: String },
    lastInteractionMode: { type: String, enum: INTERACTION_MODES, default: "chat" },
    contextSummary: { type: String, default: "" },
    retrievalContext: { type: Mixed, default: {} },
    lastSeenAt: { type: Date },
    metadata: { type: Mixed, default: {} },
  },
  {
    collection: "assistant_state",
    timestamps: true,
    versionKey: false,
  }
);

export type ConversationRecord = InferSchemaType<typeof conversationSchema>;
export type MessageRecord = InferSchemaType<typeof messageSchema>;
export type VoiceSessionRecord = InferSchemaType<typeof voiceSessionSchema>;
export type AiMemoryRecord = InferSchemaType<typeof aiMemorySchema>;
export type AnalyticsRecord = InferSchemaType<typeof analyticsSchema>;
export type UserPreferencesRecord = InferSchemaType<typeof userPreferencesSchema>;
export type AssistantStateRecord = InferSchemaType<typeof assistantStateSchema>;

function getModel<T>(name: string, schema: Schema<T>, collection: string): Model<T> {
  return (models[name] as Model<T> | undefined) ?? model<T>(name, schema, collection);
}

export function getAssistantModels() {
  return {
    Conversation: getModel("Conversation", conversationSchema, "conversations"),
    Message: getModel("Message", messageSchema, "messages"),
    VoiceSession: getModel("VoiceSession", voiceSessionSchema, "voice_sessions"),
    AiMemory: getModel("AiMemory", aiMemorySchema, "ai_memory"),
    Analytics: getModel("Analytics", analyticsSchema, "analytics"),
    UserPreferences: getModel("UserPreferences", userPreferencesSchema, "user_preferences"),
    AssistantState: getModel("AssistantState", assistantStateSchema, "assistant_state"),
  };
}
