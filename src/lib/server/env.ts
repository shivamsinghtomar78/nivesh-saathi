import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalSecret = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional()
);
const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.string().url().optional()
);
const defaultedSecret = (defaultValue: string) =>
  z.preprocess(emptyToUndefined, z.string().min(1).default(defaultValue));

const serverEnvSchema = z.object({
  GEMINI_API_KEY: optionalSecret,
  GEMINI_MODEL: defaultedSecret("gemini-2.5-flash-lite"),
  OPENROUTER_API_KEY: optionalSecret,
  OPENROUTER_MODEL: defaultedSecret("openrouter/free"),
  DEEPGRAM_API_KEY: optionalSecret,
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalSecret,
  FIREBASE_ADMIN_PROJECT_ID: optionalSecret,
  FIREBASE_ADMIN_CLIENT_EMAIL: optionalSecret,
  FIREBASE_ADMIN_PRIVATE_KEY: optionalSecret,
  NEXT_PUBLIC_APP_URL: optionalUrl,
});

export const serverEnv = serverEnvSchema.parse({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
  FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

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
