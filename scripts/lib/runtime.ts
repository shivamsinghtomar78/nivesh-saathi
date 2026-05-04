import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { MongoClient } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, "..", "..");

let mongoClient: MongoClient | null = null;

function parseEnvFile(content: string) {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

export function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const envPath = path.join(repoRoot, filename);
    if (fs.existsSync(envPath)) {
      parseEnvFile(fs.readFileSync(envPath, "utf8"));
    }
  }
}

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function getDatabaseName(uri: string) {
  try {
    const parsed = new URL(uri);
    const databaseName = parsed.pathname.replace("/", "").trim();
    return databaseName || "nivesh_saathi";
  } catch {
    return "nivesh_saathi";
  }
}

export async function getMongoDbForScript() {
  const uri = requireEnv("MONGODB_URI");
  mongoClient ??= new MongoClient(uri, {
    appName: "nivesh-saathi-migration",
    maxPoolSize: 5,
  });
  await mongoClient.connect();
  return mongoClient.db(getDatabaseName(uri));
}

export async function closeMongoForScript() {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
  }
}

function getFirebaseCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key?.replace(/\\n/g, "\n"),
    });
  }

  return cert({
    projectId: requireEnv("FIREBASE_ADMIN_PROJECT_ID"),
    clientEmail: requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
    privateKey: requireEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
  });
}

export function getFirestoreForScript() {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: getFirebaseCredential(),
    });

  return getFirestore(app);
}

export function isApplyMode() {
  return process.argv.includes("--apply");
}

export function dateFromMaybe(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}
