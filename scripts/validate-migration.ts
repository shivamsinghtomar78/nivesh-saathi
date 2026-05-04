import {
  closeMongoForScript,
  getFirestoreForScript,
  getMongoDbForScript,
  loadLocalEnv,
} from "./lib/runtime.ts";

loadLocalEnv();

const firestore = getFirestoreForScript();
const mongo = await getMongoDbForScript();

async function firestoreCount(collectionName: string) {
  const snapshot = await firestore.collection(collectionName).count().get();
  return snapshot.data().count;
}

async function userUnionCount() {
  const ids = new Set<string>();
  const modern = await firestore.collection("user_profiles").get();
  modern.docs.forEach((doc) => ids.add(doc.id));
  const legacy = await firestore.collection("userProfiles").get();
  legacy.docs.forEach((doc) => ids.add(doc.id));
  return ids.size;
}

async function mongoCount(collectionName: string) {
  return mongo.collection(collectionName).countDocuments();
}

async function validateChatSamples() {
  const sample = await firestore.collection("chatSessions").limit(10).get();
  const mismatches: Array<Record<string, unknown>> = [];

  for (const doc of sample.docs) {
    const source = doc.data();
    const threadId =
      typeof source.threadId === "string" && source.threadId ? source.threadId : doc.id;
    const target = await mongo.collection("chat_history").findOne({ threadId });
    const sourceMessages = Array.isArray(source.messages) ? source.messages.length : 0;
    const targetMessages = Array.isArray(target?.messages)
      ? target.messages.length
      : -1;

    if (!target || source.userId !== target.userId || sourceMessages !== targetMessages) {
      mismatches.push({
        threadId,
        sourceUserId: source.userId,
        targetUserId: target?.userId,
        sourceMessages,
        targetMessages,
      });
    }
  }

  return mismatches;
}

async function validateOrphans() {
  const orphanWatchers = await mongo
    .collection("watchers")
    .countDocuments({ $or: [{ userId: "" }, { bankId: "" }] });
  const orphanChats = await mongo
    .collection("chat_history")
    .countDocuments({ $or: [{ userId: "" }, { userId: { $exists: false } }] });

  return {
    orphanWatchers,
    orphanChats,
  };
}

try {
  const checks = {
    users: {
      firebase: await userUnionCount(),
      mongo: await mongoCount("users"),
    },
    chat_history: {
      firebase: await firestoreCount("chatSessions"),
      mongo: await mongoCount("chat_history"),
    },
    shared_responses: {
      firebase: await firestoreCount("shared_responses"),
      mongo: await mongoCount("shared_responses"),
    },
    watchers: {
      firebase: await firestoreCount("watchers"),
      mongo: await mongoCount("watchers"),
    },
    message_feedback: {
      firebase: await firestoreCount("message_feedback"),
      mongo: await mongoCount("message_feedback"),
    },
    flagged_messages: {
      firebase: await firestoreCount("flaggedMessages"),
      mongo: await mongoCount("flagged_messages"),
    },
  };

  const chatMismatches = await validateChatSamples();
  const orphans = await validateOrphans();
  const countMismatches = Object.entries(checks).filter(
    ([, value]) => value.mongo < value.firebase
  );
  const ok =
    countMismatches.length === 0 &&
    chatMismatches.length === 0 &&
    orphans.orphanWatchers === 0 &&
    orphans.orphanChats === 0;

  console.log(
    JSON.stringify(
      {
        ok,
        checks,
        countMismatches,
        chatMismatches,
        orphans,
      },
      null,
      2
    )
  );

  if (!ok) {
    process.exitCode = 1;
  }
} finally {
  await closeMongoForScript();
}
