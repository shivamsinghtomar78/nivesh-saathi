import { env } from "@/env";

export const serverEnv = env;

export const hasGeminiConfig = Boolean(serverEnv.GEMINI_API_KEY);
export const hasOpenRouterConfig = Boolean(serverEnv.OPENROUTER_API_KEY);
export const hasLlmConfig = hasGeminiConfig || hasOpenRouterConfig;
export const hasDeepgramConfig = Boolean(serverEnv.DEEPGRAM_API_KEY);
export const hasUpstashConfig = Boolean(
  serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN
);
export const hasFirebaseAdminConfig = Boolean(
  serverEnv.FIREBASE_ADMIN_PROJECT_ID &&
    serverEnv.FIREBASE_ADMIN_CLIENT_EMAIL &&
    serverEnv.FIREBASE_ADMIN_PRIVATE_KEY
);
