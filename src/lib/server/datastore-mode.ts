import { serverEnv } from "@/lib/server/env";

export type DatastoreMode =
  | "dual_firebase_primary"
  | "mongo_primary_fallback"
  | "mongo_only";

export function getDatastoreMode(): DatastoreMode {
  return serverEnv.DATASTORE_MODE;
}

export function readsFirebaseFirst() {
  return getDatastoreMode() === "dual_firebase_primary";
}

export function readsMongoFirst() {
  return getDatastoreMode() !== "dual_firebase_primary";
}

export function writesFirebase() {
  return getDatastoreMode() !== "mongo_only";
}

export function writesMongo() {
  return true;
}

export function canFallbackToFirebase() {
  return getDatastoreMode() !== "mongo_only";
}
