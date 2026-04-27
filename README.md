# Nivesh Saathi

Voice-first, multilingual Fixed Deposit advisor for Hindi, Tamil, Bengali, and English users. The app compares FD options, explains jargon in plain language, calculates maturity values, and starts a guided booking handoff.

Current production-ready surfaces in this repo:

- `Voice` page uses browser speech recognition first and Deepgram fallback for upload transcription.
- `Chat` page calls the LangGraph advisor and can submit by voice.
- `Compare` page fetches filtered rates from the live app API instead of local-only UI mocks.
- `Book` page uses bank-specific data, validates min and max amounts, creates a booking intent, and redirects to official bank URLs.

## Stack

- Next.js 16 App Router
- TypeScript
- Firebase client SDK and Firebase Admin hooks
- LangGraph advisor flow
- Gemini 2.5 Flash-Lite primary model
- OpenRouter free-model router fallback
- Upstash Redis optional cache
- Zustand client state

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

The app runs at `http://localhost:3000`.

## Required Environment Variables

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Primary Gemini API key for the advisor. |
| `GEMINI_MODEL` | Defaults to `gemini-2.5-flash-lite`. |
| `OPENROUTER_API_KEY` | Fallback OpenRouter key. |
| `OPENROUTER_MODEL` | Defaults to `openrouter/free`. |
| `DEEPGRAM_API_KEY` | Speech-to-text fallback for browsers without reliable native STT. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase browser SDK config. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase browser SDK config. |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Firebase Realtime Database URL. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project id. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender id. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app id. |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional Firebase Analytics id. |

## Optional Environment Variables

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Shared cache in deployed environments. |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash auth token. |
| `FIREBASE_ADMIN_PROJECT_ID` | Required for server session cookies and Firestore writes. |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin service account email. |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin private key with escaped newlines. |
| `NEXT_PUBLIC_APP_URL` | Public app URL used by OpenRouter metadata. |

## API Routes

| Route | Purpose |
| --- | --- |
| `POST /api/chat` | LangGraph FD advisor chat response. |
| `GET /api/fd-rates` | Filtered FD rates from seeded data/cache. |
| `POST /api/maturity` | FD maturity calculator. |
| `POST /api/voice/transcribe` | Deepgram-backed speech transcription fallback. |
| `GET /api/jargon/[termId]` | Localized finance term explanation. |
| `POST /api/booking-intents` | Creates a booking intent. |
| `POST /api/auth/session` | Exchanges Firebase id token for an HTTP-only session cookie. |
| `DELETE /api/auth/session` | Clears the session cookie. |

## Verification

```powershell
npm.cmd run lint
npm.cmd run build
```

Verified in this workspace:

- `eslint` passed with no errors.
- `next build` passed successfully.
- `GET /api/fd-rates?tenorMonths=12&amount=50000&limit=3` returned three sorted banks.
- `POST /api/chat` returned a LangGraph response with text, actions, glossary, and 3 rate cards.
- `POST /api/booking-intents` returned an official bank redirect URL.

Known runtime note:

- `next build` emits a `punycode` deprecation warning from a dependency during static generation. The build still completes successfully.

## GitHub Safety

- `.env.local`, `.env*`, `.next`, `node_modules`, logs, and generated Next files are ignored.
- `.env.example` is intentionally committed and contains names only, never values.
- Do not commit Firebase Admin service account JSON files or private keys.
- Add production credentials only in Vercel environment variables or another secret manager.

## Push Commands

```powershell
git status --short
git add .
git commit -m "Build Nivesh Saathi backend"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

If Git reports `detected dubious ownership`, mark the repo as safe once on your machine:

```powershell
git config --global --add safe.directory "C:/Users/shiva/Downloads/project/nivesh saathi financialapp/nivesh-saathi"
```

