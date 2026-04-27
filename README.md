# Nivesh Saathi

Voice-first, multilingual Fixed Deposit advisor for Hindi, Tamil, Bengali, and English users. The app is now centered on a cleaner hackathon story:

- compare FD options
- save a shortlist
- ask Saathi by chat or voice
- sign in with Email/Password, Phone, or Google to keep context across devices

The older booking flow has been removed from the product and backend contracts.

## Stack

- Next.js 16 App Router
- TypeScript
- Firebase client SDK and Firebase Admin hooks
- LangGraph advisor flow
- Gemini 2.5 Flash-Lite primary model
- OpenRouter free-model fallback
- Deepgram fallback speech transcription
- Upstash Redis cache and optional shared rate limiting
- Zustand persisted client state
- Sonner toasts
- Vitest unit tests

## What Is Implemented

- Dark-theme mobile-first landing, compare, chat, voice, and login flows
- Firebase Email/Password, Phone, and Google auth UI with session-cookie exchange route
- Persisted shortlist and chat state
- LangGraph advisor with Gemini primary and OpenRouter fallback
- Prompt-injection guard for chat requests
- Rate limiting on `/api/chat` and `/api/voice/transcribe`
- Route-level error boundaries and loading states
- PWA manifest and service worker registration
- Lucide-only icon system
- Jargon explainer sidebar and glossary API

## Local Setup

1. Install dependencies:

```powershell
npm.cmd install
```

2. Create local env values:

```powershell
Copy-Item .env.example .env.local
```

3. Fill `.env.local` with local-only credentials. This file is ignored by Git.

4. Start the app:

```powershell
npm.cmd run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Required Environment Variables

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Primary Gemini API key for the advisor. |
| `GEMINI_MODEL` | Defaults to `gemini-2.5-flash-lite`. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase browser SDK config. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase browser SDK config. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project id. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender id. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app id. |
| `NEXT_PUBLIC_APP_URL` | Public app URL used by OpenRouter metadata and install context. |

## Optional Environment Variables

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Fallback LLM key if Gemini fails or times out. |
| `OPENROUTER_MODEL` | Defaults to `openrouter/free`. |
| `DEEPGRAM_API_KEY` | Speech-to-text fallback for browsers without reliable native STT. |
| `UPSTASH_REDIS_REST_URL` | Shared cache and shared production rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash auth token. |
| `FIREBASE_ADMIN_PROJECT_ID` | Required for server session cookies and Firestore writes. |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin service account email. |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin private key with escaped newlines. |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Optional Realtime Database URL. |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional Firebase Analytics id. |

## API Routes

| Route | Purpose |
| --- | --- |
| `POST /api/chat` | LangGraph FD advisor response with prompt guard and rate limiting. |
| `GET /api/fd-rates` | Filtered FD rates from seeded data and cache. |
| `POST /api/maturity` | FD maturity calculator. |
| `POST /api/voice/transcribe` | Deepgram-backed speech transcription fallback with rate limiting. |
| `GET /api/jargon/[termId]` | Localized finance term explanation. |
| `POST /api/auth/session` | Exchanges Firebase id token for an HTTP-only session cookie. |
| `DELETE /api/auth/session` | Clears the session cookie. |

## Verification

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Verified in this workspace:

- `eslint` passed with no errors.
- `vitest` passed with 5 tests.
- `next build` passed successfully.

Known runtime note:

- `next build` emits a `punycode` deprecation warning from a dependency during static generation. The build still completes successfully.
- Firebase auth depends on the Email/Password, Phone, and Google providers being enabled in the Firebase console for the deployment domain.
