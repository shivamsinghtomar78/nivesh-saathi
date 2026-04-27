# Nivesh Saathi Completion Checklist

This file tracks the remaining APIs, credentials, and product work needed to turn the current prototype into a complete deployable FD advisor.

## Wired In This Repo

| Area | Status | Notes |
| --- | --- | --- |
| FD rates API | Implemented | Uses local seeded FD data with cache support. |
| Maturity calculator API | Implemented | Server route wraps the shared maturity utility. |
| LangGraph advisor | Implemented | Gemini primary, OpenRouter free-model fallback. |
| Chat API | Implemented | Returns text, rate cards, glossary, actions, and thread id. |
| Jargon API | Implemented | Localized glossary endpoint by term id. |
| Booking intent API | Implemented | Stores in memory locally, Firestore when Admin credentials exist. |
| Deepgram transcription route | Implemented | `POST /api/voice/transcribe` supports browser fallback speech upload. |
| Firebase client config | Implemented | Browser SDK initializer reads `NEXT_PUBLIC_FIREBASE_*`. |
| Firebase session route | Partial | Requires Firebase Admin service account credentials. |
| Voice page | Implemented | Browser STT first, Deepgram fallback, advisor call, spoken response. |
| Compare page | Implemented | Uses `/api/fd-rates` with loading, error, and empty states. |
| Booking page | Implemented | Uses bank-specific rate data, validates amount range, creates booking intent, redirects to official URL. |

## Required Before Production Demo

| Need | Env / Setup | Free-Tier Option | Why It Matters |
| --- | --- | --- | --- |
| Gemini API | `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini 2.5 Flash-Lite free tier | Primary chatbot reasoning and multilingual response polishing. |
| OpenRouter fallback | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL=openrouter/free` | OpenRouter free router | Keeps chat working if Gemini is unavailable or rate limited. |
| Deepgram STT | `DEEPGRAM_API_KEY` | Deepgram free allowance | Required if you want voice fallback beyond browser-native speech recognition. |
| Firebase Admin | `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase no-cost quota | Needed for secure session cookies and server-side Firestore writes. |
| Firebase Auth | Enable Phone provider, add app domain, configure reCAPTCHA | Firebase Auth free quota | Required for real phone OTP login. |
| Firestore | Create collections and deploy rules | Firebase free quota | Persists users, chat sessions, and booking intents beyond local memory. |
| Upstash Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash free tier | Shared FD rate cache and future API rate limiting on Vercel. |
| Vercel env vars | Add all production env vars in Vercel dashboard | Vercel Hobby | Local `.env.local` does not deploy automatically. |
| Live rate source | RBI/bank source, CSV upload, or admin updater | Free if manually curated | Seeded rates are demo data; production needs freshness policy. |
| Legal copy | RBI/DICGC disclaimers and no-investment-advice language | Free | Financial apps need clear user protection copy. |
| Secret rotation | Rotate any keys previously pasted into chat/screenshots | Free | Those credentials should be treated as exposed even if the repo is clean. |

## Optional But Valuable

| Need | Env / Setup | Free-Tier Option | Why It Helps |
| --- | --- | --- | --- |
| Analytics | Firebase Analytics enabled | Firebase free quota | Measures language choice, drop-off, and booking intent conversion. |
| Error monitoring | Sentry or Vercel logs | Sentry free tier | Speeds up debugging demo and production failures. |
| Rate limiting | Redis-backed limiter by IP/session | Upstash free tier | Protects Gemini/OpenRouter quotas from accidental spam. |
| Admin rate editor | Simple protected page or Firestore console workflow | Free | Lets the team update FD rates without code edits. |
| Test users | Seed phone numbers and OTP testing flow | Firebase test phone numbers | Avoids SMS quota surprises during judging. |

## Demo Readiness Checks

1. `npm.cmd run lint` completes with no errors.
2. `npm.cmd run build` completes successfully.
3. `/api/chat` returns a Gemini or OpenRouter-backed response with 3 FD cards.
4. `/api/fd-rates?tenorMonths=12&amount=50000&limit=3` returns sorted rates.
5. `/api/maturity` calculates maturity for amount, rate, and tenor.
6. `/api/booking-intents` returns an official bank redirect URL for a valid bank.
7. Chat action buttons open compare and booking pages.
8. Voice flow works with browser STT, and falls back to `/api/voice/transcribe` when needed.
9. Phone Auth test number can complete login and create `__session`.
10. Vercel production env vars match local env names.
