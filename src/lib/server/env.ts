import { env } from "@/env";

export const serverEnv = env;

export const hasGeminiConfig = Boolean(serverEnv.GEMINI_API_KEY);
export const hasGroqConfig = Boolean(serverEnv.GROQ_API_KEY);
export const hasOpenRouterConfig = Boolean(serverEnv.OPENROUTER_API_KEY);
export const hasLlmConfig = hasGeminiConfig || hasOpenRouterConfig;
export const hasDeepgramConfig = Boolean(serverEnv.DEEPGRAM_API_KEY);
export const hasElevenLabsConfig = Boolean(serverEnv.ELEVENLABS_API_KEY);
export const hasUpstashConfig = Boolean(
  serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN
);
export const hasFirebaseAdminConfig = Boolean(
  serverEnv.FIREBASE_SERVICE_ACCOUNT_JSON ||
    (serverEnv.FIREBASE_ADMIN_PROJECT_ID &&
      serverEnv.FIREBASE_ADMIN_CLIENT_EMAIL &&
      serverEnv.FIREBASE_ADMIN_PRIVATE_KEY)
);
export const hasMongoConfig = Boolean(serverEnv.MONGODB_URI);
export const hasMongoEncryptionKey = Boolean(serverEnv.MONGODB_ENCRYPTION_KEY);
export const hasFirebaseVapidConfig = Boolean(serverEnv.FIREBASE_VAPID_KEY);
export const hasFdAlertCronSecret = Boolean(
  serverEnv.FD_ALERT_CRON_SECRET || serverEnv.CRON_SECRET
);
export const hasLangSmithConfig = Boolean(
  serverEnv.LANGSMITH_API_KEY || serverEnv.LANGCHAIN_API_KEY
);
