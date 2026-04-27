# Nivesh Saathi Completion Checklist

This file tracks the remaining APIs, credentials, and product work needed to turn the current repo into a fully deployed production FD advisor.

## Wired In This Repo

| Area | Status | Notes |
| --- | --- | --- |
| FD rates API | Implemented | Uses local seeded FD data with cache support. |
| Maturity calculator API | Implemented | Server route wraps the shared maturity utility. |
| LangGraph advisor | Implemented | Gemini primary, OpenRouter free-model fallback. |
| Chat API | Implemented | Returns text, rate cards, glossary, actions, and thread id. |
| Prompt-injection guard | Implemented | Blocks obvious jailbreak and secret-exfiltration prompts. |
| API rate limiting | Implemented | Chat and Deepgram routes have Upstash-or-memory rate limiting. |
| Jargon API | Implemented | Localized glossary endpoint by term id. |
| Deepgram transcription route | Implemented | `POST /api/voice/transcribe` supports browser fallback speech upload. |
| Firebase client config | Implemented | Browser SDK initializer reads `NEXT_PUBLIC_FIREBASE_*`. |
| Firebase session route | Implemented | Needs Firebase Admin credentials to work outside client-only auth. |
| Firebase auth UI | Implemented | Email/Password, Google, and Phone OTP flows are wired with Firebase client auth. |
| Voice page | Implemented | Browser STT first, Deepgram fallback, advisor call, spoken response. |
| Compare page | Implemented | Uses `/api/fd-rates` with loading, error, empty, and sticky CTA states. |
| Chat page | Implemented | Auth-gated, shortlist-aware, voice-capable advisor flow. |
| PWA basics | Implemented | Manifest + service worker registration are present. |
| Booking flow | Removed | Product flow is now shortlist-first, not booking-first. |
| Unit tests | Implemented | Vitest covers maturity math and prompt guard logic. |

## Required Before Production Demo

| Need | Env / Setup | Free-Tier Option | Why It Matters |
| --- | --- | --- | --- |
| Gemini API | `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini 2.5 Flash-Lite free tier | Primary chatbot reasoning and multilingual response polishing. |
| OpenRouter fallback | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL=openrouter/free` | OpenRouter free router | Keeps chat working if Gemini is unavailable or rate limited. |
| Deepgram STT | `DEEPGRAM_API_KEY` | Deepgram free allowance | Required if voice fallback should work beyond browser-native speech recognition. |
| Firebase Auth | Enable Phone provider, add app domain, configure reCAPTCHA | Firebase Auth free quota | Required for real phone OTP login. |
| Firebase Admin | `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase no-cost quota | Needed for secure session cookies and server-side Firestore writes. |
| Firestore | Create collections and deploy rules | Firebase free quota | Persists users and chat sessions beyond local memory. |
| Upstash Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash free tier | Shared FD rate cache and shared production rate limiting on Vercel. |
| Vercel env vars | Add all production env vars in Vercel dashboard | Vercel Hobby | Local `.env.local` does not deploy automatically. |
| Live rate source | RBI/bank source, CSV upload, or admin updater | Free if manually curated | Seeded rates are demo data; production needs freshness policy. |
| Legal copy | RBI/DICGC disclaimers and no-investment-advice language | Free | Financial apps need clear user protection copy. |
| Secret rotation | Rotate any keys previously pasted into chat/screenshots | Free | Those credentials should be treated as exposed even if the repo is clean. |

## Optional But Valuable

| Need | Env / Setup | Free-Tier Option | Why It Helps |
| --- | --- | --- | --- |
| Error monitoring | Sentry, Axiom, or Vercel Observability | Free tiers available | Speeds up debugging real production failures. |
| Analytics | Firebase Analytics or Vercel Analytics events | Free tier | Measures language choice, drop-off, and shortlist conversion. |
| Admin rate editor | Simple protected page or Firestore console workflow | Free | Lets the team update FD rates without code edits. |
| Server-side session guard | Middleware or server-layout cookie verification | Free | Tightens auth beyond client-store gating. |
| Streaming LLM responses | Vercel AI SDK or manual streaming | Free + token cost | Lowers perceived latency during demos. |
| Test users | Seed phone numbers and OTP testing flow | Firebase test phone numbers | Avoids SMS quota surprises during judging. |

## Demo Readiness Checks

1. `npm.cmd run lint` completes with no errors.
2. `npm.cmd run test` completes successfully.
3. `npm.cmd run build` completes successfully.
4. `/api/chat` returns a Gemini or OpenRouter-backed response with rate cards and actions.
5. `/api/fd-rates?tenorMonths=12&amount=50000&limit=3` returns sorted rates.
6. `/api/maturity` calculates maturity for amount, rate, and tenor.
7. Chat actions open compare, voice, and official bank pages without referencing booking.
8. Voice flow works with browser STT, and falls back to `/api/voice/transcribe` when needed.
9. Email/Password, Google, and Phone Auth test users can complete login and create `__session`.
10. PWA install prompt appears after deploy on supported devices.
11. Vercel production env vars match local env names.
