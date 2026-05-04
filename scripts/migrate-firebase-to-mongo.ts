import {
  buildMongoChatFromFirebase,
  buildMongoFeedbackFromFirebase,
  buildMongoFlaggedMessageFromFirebase,
  buildMongoSharedResponseFromFirebase,
  buildMongoUserFromFirebase,
  buildMongoWatcherFromFirebase,
} from "../src/lib/server/firebase-migration-transform.ts";
import {
  closeMongoForScript,
  dateFromMaybe,
  getFirestoreForScript,
  getMongoDbForScript,
  isApplyMode,
  loadLocalEnv,
} from "./lib/runtime.ts";

loadLocalEnv();

const apply = isApplyMode();
const firestore = getFirestoreForScript();
const mongo = await getMongoDbForScript();

type Counts = {
  scanned: number;
  written: number;
  skipped: number;
};

const counts: Record<string, Counts> = {
  users: { scanned: 0, written: 0, skipped: 0 },
  chat_history: { scanned: 0, written: 0, skipped: 0 },
  shared_responses: { scanned: 0, written: 0, skipped: 0 },
  watchers: { scanned: 0, written: 0, skipped: 0 },
  message_feedback: { scanned: 0, written: 0, skipped: 0 },
  flagged_messages: { scanned: 0, written: 0, skipped: 0 },
};

async function ensureIndexes() {
  await Promise.all([
    mongo.collection("users").createIndex({ firebaseUid: 1 }, { unique: true }),
    mongo.collection("users").createIndex({ userId: 1 }, { unique: true }),
    mongo.collection("chat_history").createIndex({ userId: 1, updatedAt: -1 }),
    mongo.collection("shared_responses").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    mongo.collection("watchers").createIndex({ userId: 1, bankId: 1 }, { unique: true }),
    mongo.collection("message_feedback").createIndex({ userId: 1, createdAt: -1 }),
    mongo.collection("message_feedback").createIndex({ legacyFirestoreId: 1 }, { unique: true, sparse: true }),
    mongo.collection("flagged_messages").createIndex({ userId: 1, createdAt: -1 }),
    mongo.collection("flagged_messages").createIndex({ legacyFirestoreId: 1 }, { unique: true, sparse: true }),
  ]);
}

function dateFields(document: Record<string, unknown>, fields: string[]) {
  const next: Record<string, unknown> = { ...document };
  for (const field of fields) {
    if (field in next) {
      next[field] = dateFromMaybe(next[field]);
    }
  }
  return next;
}

function chatDates(document: ReturnType<typeof buildMongoChatFromFirebase>) {
  return {
    ...dateFields(document, ["createdAt", "updatedAt"]),
    messages: document.messages.map((message) =>
      dateFields(message, ["createdAt"])
    ),
  };
}

async function upsert(collectionName: string, filter: Record<string, unknown>, document: Record<string, unknown>) {
  if (!apply) return;
  await mongo.collection(collectionName).updateOne(
    filter,
    {
      $set: document,
    },
    { upsert: true }
  );
}

async function migrateUsers() {
  const profiles = new Map<
    string,
    { userProfile?: unknown; legacyUserProfile?: unknown; memory?: unknown }
  >();

  const modernSnapshot = await firestore.collection("user_profiles").get();
  for (const doc of modernSnapshot.docs) {
    const entry = profiles.get(doc.id) ?? {};
    entry.userProfile = doc.data();
    const memoryDoc = await doc.ref.collection("memory").doc("context").get();
    if (memoryDoc.exists) {
      entry.memory = memoryDoc.data();
    }
    profiles.set(doc.id, entry);
  }

  const legacySnapshot = await firestore.collection("userProfiles").get();
  for (const doc of legacySnapshot.docs) {
    const entry = profiles.get(doc.id) ?? {};
    entry.legacyUserProfile = doc.data();
    profiles.set(doc.id, entry);
  }

  for (const [uid, entry] of profiles.entries()) {
    counts.users.scanned += 1;
    if (!uid) {
      counts.users.skipped += 1;
      continue;
    }

    const user = buildMongoUserFromFirebase({ uid, ...entry });
    await upsert(
      "users",
      { firebaseUid: uid },
      dateFields(user, ["createdAt", "updatedAt"])
    );
    counts.users.written += apply ? 1 : 0;
  }
}

async function migrateCollection(
  firebaseCollection: string,
  mongoCollection: string,
  transform: (id: string, data: unknown) => Record<string, unknown>,
  filterFor: (doc: Record<string, unknown>) => Record<string, unknown>,
  dateKeys: string[]
) {
  const snapshot = await firestore.collection(firebaseCollection).get();
  for (const doc of snapshot.docs) {
    counts[mongoCollection].scanned += 1;
    const transformed = transform(doc.id, doc.data());
    const filter = filterFor(transformed);

    if (Object.values(filter).some((value) => !value)) {
      counts[mongoCollection].skipped += 1;
      continue;
    }

    await upsert(mongoCollection, filter, dateFields(transformed, dateKeys));
    counts[mongoCollection].written += apply ? 1 : 0;
  }
}

try {
  await ensureIndexes();
  await migrateUsers();
  await migrateCollection(
    "chatSessions",
    "chat_history",
    (id, data) => chatDates(buildMongoChatFromFirebase(id, data)),
    (doc) => ({ threadId: doc.threadId }),
    ["createdAt", "updatedAt"]
  );
  await migrateCollection(
    "shared_responses",
    "shared_responses",
    (id, data) => buildMongoSharedResponseFromFirebase(id, data),
    (doc) => ({ id: doc.id }),
    ["createdAt", "expiresAt"]
  );
  await migrateCollection(
    "watchers",
    "watchers",
    (id, data) => buildMongoWatcherFromFirebase(id, data),
    (doc) => ({ userId: doc.userId, bankId: doc.bankId }),
    ["createdAt", "updatedAt"]
  );
  await migrateCollection(
    "message_feedback",
    "message_feedback",
    (id, data) => buildMongoFeedbackFromFirebase(id, data),
    (doc) => ({ legacyFirestoreId: doc.legacyFirestoreId }),
    ["createdAt"]
  );
  await migrateCollection(
    "flaggedMessages",
    "flagged_messages",
    (id, data) => buildMongoFlaggedMessageFromFirebase(id, data),
    (doc) => ({ legacyFirestoreId: doc.legacyFirestoreId }),
    ["createdAt"]
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: apply ? "apply" : "dry-run",
        counts,
      },
      null,
      2
    )
  );
} finally {
  await closeMongoForScript();
}
