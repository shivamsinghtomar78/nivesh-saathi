import { afterEach, describe, expect, it, vi } from "vitest";

const mockMongo = vi.hoisted(() => {
  const users = {
    createIndex: vi.fn(async (..._args: unknown[]) => "idx"),
    findOne: vi.fn(async (): Promise<unknown> => null),
    updateOne: vi.fn(async (..._args: unknown[]) => ({ acknowledged: true })),
  };
  const records = {
    createIndex: vi.fn(async (..._args: unknown[]) => "idx"),
  };
  const alerts = {
    createIndex: vi.fn(async (..._args: unknown[]) => "idx"),
  };

  return {
    users,
    records,
    alerts,
    db: {
      collection: vi.fn((name: string) => {
        if (name === "users") return users;
        if (name === "fd_records") return records;
        if (name === "fd_alerts") return alerts;
        throw new Error(`Unexpected collection ${name}`);
      }),
    },
  };
});

vi.mock("@/lib/server/mongo", () => ({
  getMongoDb: vi.fn(async () => mockMongo.db),
}));

import { upsertFdUser } from "@/lib/server/fd-tracker-service";

describe("fd-tracker-service", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not update firebaseUid in both $set and $setOnInsert during user upsert", async () => {
    mockMongo.users.findOne.mockResolvedValueOnce({
      _id: "firebase-user-1",
      firebaseUid: "firebase-user-1",
      userId: "firebase-user-1",
      email: "old@example.com",
      name: "Old Name",
      fcmTokens: [],
      notificationEnabled: false,
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    });

    await upsertFdUser({
      userId: "firebase-user-1",
      email: "new@example.com",
      name: "New Name",
    });

    const updateCall = mockMongo.users.updateOne.mock.calls[0] as [
      unknown,
      {
        $set: Record<string, unknown>;
        $setOnInsert: Record<string, unknown>;
      },
    ];
    const [, update] = updateCall;
    expect(update.$set.firebaseUid).toBeUndefined();
    expect(update.$setOnInsert.firebaseUid).toBe("firebase-user-1");
    expect(Object.keys(update.$set)).not.toContain("firebaseUid");
  });
});
