import { beforeEach, describe, expect, it, vi } from "vitest";

const assistantMemoryMocks = vi.hoisted(() => {
  const calls = {
    assistantStateUpdate: undefined as
      | {
          $set: Record<string, unknown>;
          $setOnInsert: Record<string, unknown>;
        }
      | undefined,
    userPreferencesUpdate: undefined as
      | {
          $set: Record<string, unknown>;
          $setOnInsert: Record<string, unknown>;
        }
      | undefined,
  };

  return {
    calls,
    models: {
      AssistantState: {
        findOneAndUpdate: vi.fn((_filter: unknown, update: typeof calls.assistantStateUpdate) => {
          calls.assistantStateUpdate = update;
          return {
            lean: vi.fn(async () => ({ userId: "user-1" })),
          };
        }),
      },
      UserPreferences: {
        findOneAndUpdate: vi.fn((_filter: unknown, update: typeof calls.userPreferencesUpdate) => {
          calls.userPreferencesUpdate = update;
          return {
            lean: vi.fn(async () => ({ userId: "user-1" })),
          };
        }),
      },
    },
  };
});

vi.mock("@/lib/server/assistant-db", () => ({
  getAssistantMongoose: vi.fn(async () => ({})),
}));

vi.mock("@/lib/server/assistant-models", () => ({
  getAssistantModels: vi.fn(() => assistantMemoryMocks.models),
}));

vi.mock("@/lib/server/env", () => ({
  serverEnv: {
    ANALYTICS_RETENTION_DAYS: 30,
    GEMINI_API_KEY: "",
    MEMORY_RETENTION_DAYS: 90,
    MEMORY_EMBEDDING_MODEL: "text-embedding-004",
  },
}));

vi.mock("@/lib/server/telemetry", () => ({
  logServerWarn: vi.fn(),
}));

vi.mock("@/lib/server/chat-repository", () => ({
  getRecentMessages: vi.fn(async () => ({ messages: [] })),
}));

import {
  updateAssistantState,
  upsertUserPreferences,
} from "@/lib/server/assistant-memory";

describe("assistant memory upserts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assistantMemoryMocks.calls.assistantStateUpdate = undefined;
    assistantMemoryMocks.calls.userPreferencesUpdate = undefined;
  });

  it("does not set user preference paths in both $set and $setOnInsert", async () => {
    await upsertUserPreferences("user-1", {
      communicationStyle: undefined,
      financialPreferences: { amount: 100000 },
      languagePreference: "hi",
      themePreference: "dark",
    });

    const update = assistantMemoryMocks.calls.userPreferencesUpdate;

    expect(update?.$set.languagePreference).toBe("hi");
    expect(update?.$set.themePreference).toBe("dark");
    expect(update?.$setOnInsert.languagePreference).toBeUndefined();
    expect(update?.$setOnInsert.themePreference).toBeUndefined();
    expect(update?.$setOnInsert.financialPreferences).toBeUndefined();
    expect(Object.keys(update?.$set ?? {})).not.toContain("communicationStyle");
    expect(update?.$setOnInsert.communicationStyle).toBe("simple");
    expect(update?.$setOnInsert.tonePreference).toBe("warm");
  });

  it("does not set assistant state paths in both $set and $setOnInsert", async () => {
    await updateAssistantState("user-1", {
      contextSummary: "Asked about safe FDs",
      lastInteractionMode: "voice",
    });

    const update = assistantMemoryMocks.calls.assistantStateUpdate;

    expect(update?.$set.contextSummary).toBe("Asked about safe FDs");
    expect(update?.$set.lastInteractionMode).toBe("voice");
    expect(update?.$setOnInsert.contextSummary).toBeUndefined();
    expect(update?.$setOnInsert.lastInteractionMode).toBeUndefined();
    expect(update?.$setOnInsert.retrievalContext).toEqual({});
  });
});
