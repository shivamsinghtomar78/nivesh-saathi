import { describe, expect, it, vi } from "vitest";

async function loadMode(mode: string) {
  vi.resetModules();
  vi.doMock("@/lib/server/env", () => ({
    serverEnv: { DATASTORE_MODE: mode },
  }));
  return import("@/lib/server/datastore-mode");
}

describe("datastore mode", () => {
  it("uses Firebase-primary reads and dual writes during phase 1", async () => {
    const mode = await loadMode("dual_firebase_primary");

    expect(mode.readsFirebaseFirst()).toBe(true);
    expect(mode.readsMongoFirst()).toBe(false);
    expect(mode.writesFirebase()).toBe(true);
    expect(mode.canFallbackToFirebase()).toBe(true);
  });

  it("uses Mongo-primary reads with Firebase fallback during phase 2", async () => {
    const mode = await loadMode("mongo_primary_fallback");

    expect(mode.readsFirebaseFirst()).toBe(false);
    expect(mode.readsMongoFirst()).toBe(true);
    expect(mode.writesFirebase()).toBe(true);
    expect(mode.canFallbackToFirebase()).toBe(true);
  });

  it("removes Firebase database fallback in Mongo-only mode", async () => {
    const mode = await loadMode("mongo_only");

    expect(mode.readsMongoFirst()).toBe(true);
    expect(mode.writesFirebase()).toBe(false);
    expect(mode.canFallbackToFirebase()).toBe(false);
  });
});
