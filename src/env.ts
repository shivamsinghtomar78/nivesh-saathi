import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const appUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string" || value.length === 0) {
    return value;
  }

  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}, z.string().url().default("http://localhost:3000"));

const optionalPublicString = z.string().min(1).optional();

const optionalWorkerUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value
    .trim()
    .replace(/^VOICE_AGENT_WORKER_URL\s*=\s*/i, "")
    .trim()
    .replace(/^["']|["']$/g, "");

  if (trimmed.length === 0) {
    return undefined;
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}, z.string().url().optional());

export const env = createEnv({
  server: {
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash-lite"),
    GROQ_API_KEY: z.string().min(1).optional(),
    GROQ_MODEL: z.string().min(1).default("llama-3.3-70b-versatile"),
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    OPENROUTER_MODEL: z.string().min(1).default("openrouter/free"),
    VIDEOSDK_API_KEY: z.string().min(1).optional(),
    VIDEOSDK_SECRET_KEY: z.string().min(1).optional(),
    VIDEOSDK_AUTH_TOKEN: z.string().min(1).optional(),
    VIDEOSDK_ROOM_WEBHOOK_URL: z.string().url().optional(),
    VOICE_AGENT_WORKER_URL: optionalWorkerUrlSchema,
    VOICE_AGENT_WORKER_SECRET: z.string().min(16).optional(),
    DEEPGRAM_API_KEY: z.string().min(1).optional(),
    ELEVENLABS_API_KEY: z.string().min(1).optional(),
    ELEVENLABS_VOICE_ID: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    FIREBASE_ADMIN_PROJECT_ID: z.string().min(1).optional(),
    FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email().optional(),
    FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1).optional(),
    FIREBASE_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),
    FIREBASE_VAPID_KEY: z.string().min(1).optional(),
    MONGODB_URI: z.string().url().optional(),
    MONGODB_ENCRYPTION_KEY: z.string().min(32).optional(),
    MEMORY_EMBEDDING_MODEL: z.string().min(1).default("text-embedding-004"),
    MEMORY_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
    ANALYTICS_RETENTION_DAYS: z.coerce.number().int().positive().default(180),
    DATASTORE_MODE: z
      .enum(["dual_firebase_primary", "mongo_primary_fallback", "mongo_only"])
      .default("dual_firebase_primary"),
    FD_ALERT_CRON_SECRET: z.string().min(1).optional(),
    CRON_SECRET: z.string().min(1).optional(),
    ADMIN_UIDS: z.string().min(1).optional(),
    ADMIN_EMAILS: z.string().min(1).optional(),
    
    // LangSmith / LangChain tracing legacy and current vars
    LANGCHAIN_TRACING_V2: z.string().optional(),
    LANGCHAIN_ENDPOINT: z.string().optional(),
    LANGCHAIN_API_KEY: z.string().optional(),
    LANGCHAIN_PROJECT: z.string().optional(),
    
    LANGSMITH_TRACING: z.string().optional(),
    LANGSMITH_ENDPOINT: z.string().optional(),
    LANGSMITH_API_KEY: z.string().optional(),
    LANGSMITH_PROJECT: z.string().optional(),
    LANGSMITH_WORKSPACE_ID: z.string().optional(),
    
    LANGSMITH_SAMPLE_RATE: z.string().optional(),
    LANGSMITH_TRACING_BACKGROUND: z.string().optional(),
    LANGCHAIN_CALLBACKS_BACKGROUND: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: appUrlSchema,
    NEXT_PUBLIC_FIREBASE_API_KEY: optionalPublicString,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: optionalPublicString,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: optionalPublicString,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: optionalPublicString,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: optionalPublicString,
    NEXT_PUBLIC_FIREBASE_APP_ID: optionalPublicString,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: optionalPublicString,
    NEXT_PUBLIC_VAPI_PUBLIC_KEY: optionalPublicString,
    NEXT_PUBLIC_VAPI_ASSISTANT_ID: optionalPublicString,
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    NEXT_PUBLIC_VAPI_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY,
    NEXT_PUBLIC_VAPI_ASSISTANT_ID: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
