import { MongoClient, type Db } from "mongodb";

import { hasMongoConfig, serverEnv } from "@/lib/server/env";

const DEFAULT_DATABASE_NAME = "nivesh_saathi";

type MongoGlobal = typeof globalThis & {
  __niveshMongoClientPromise?: Promise<MongoClient>;
};

function getDatabaseName(uri: string) {
  try {
    const parsed = new URL(uri);
    const databaseName = parsed.pathname.replace("/", "").trim();
    return databaseName || DEFAULT_DATABASE_NAME;
  } catch {
    return DEFAULT_DATABASE_NAME;
  }
}

export async function getMongoClient() {
  if (!hasMongoConfig || !serverEnv.MONGODB_URI) {
    return null;
  }

  const mongoGlobal = globalThis as MongoGlobal;

  if (!mongoGlobal.__niveshMongoClientPromise) {
    const client = new MongoClient(serverEnv.MONGODB_URI, {
      appName: "nivesh-saathi",
      maxPoolSize: 10,
    });
    mongoGlobal.__niveshMongoClientPromise = client.connect();
  }

  return mongoGlobal.__niveshMongoClientPromise;
}

export async function getMongoDb(): Promise<Db | null> {
  const client = await getMongoClient();
  if (!client || !serverEnv.MONGODB_URI) {
    return null;
  }

  return client.db(getDatabaseName(serverEnv.MONGODB_URI));
}
