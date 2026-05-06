import mongoose, { type Mongoose } from "mongoose";

import { hasMongoConfig, serverEnv } from "@/lib/server/env";

type MongooseGlobal = typeof globalThis & {
  __niveshMongoosePromise?: Promise<Mongoose>;
};

mongoose.set("bufferCommands", false);

export async function getAssistantMongoose() {
  if (!hasMongoConfig || !serverEnv.MONGODB_URI) {
    return null;
  }

  const mongooseGlobal = globalThis as MongooseGlobal;

  if (!mongooseGlobal.__niveshMongoosePromise) {
    mongooseGlobal.__niveshMongoosePromise = mongoose.connect(
      serverEnv.MONGODB_URI,
      {
        appName: "nivesh-saathi-assistant",
        maxPoolSize: 12,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 5000,
      }
    );
  }

  return mongooseGlobal.__niveshMongoosePromise;
}
