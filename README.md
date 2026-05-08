# Nivesh Saathi

Nivesh Saathi is a voice-first fixed-deposit companion for Indian savers. It helps people compare FD rates, calculate maturity, track existing deposits, understand confusing bank terms, scan FD receipts, and ask money questions in chat or voice.

The product is built for users who trust FDs but do not want to decode bank pages, jargon, tax language, and premature-withdrawal rules alone. It is not a trading app or a generic finance dashboard. It is a focused assistant for one common, high-trust savings decision.

## Founder Note

**Problem** - Fixed deposits are still where many Indian families park emergency savings, retirement income, and money they cannot afford to lose, but choosing one is harder than it should be. A first-time saver, a parent managing household money, or a senior citizen comparing rates has to jump between bank websites, English-heavy financial language, tenure rules, tax terms, and unclear withdrawal conditions. That confusion matters because a small misunderstanding can change liquidity, returns, or trust at exactly the moment people are trying to be careful.

**Solution** - Nivesh Saathi turns FD decision-making into a calmer guided experience. Users can compare rates, estimate maturity, save shortlists, track deposits, scan FD receipts, and ask practical questions through multilingual chat or voice. The app uses Firebase authentication, MongoDB persistence, Gemini-backed advisory flows, and Vapi-powered production voice sessions so the experience feels less like a spreadsheet and more like a patient financial companion.

**Approach** - I chose to build a focused FD advisor instead of another broad personal-finance dashboard because trust comes faster when the product does one high-stakes job clearly. I chose the web so it can run on ordinary phones without app-install friction, Firebase session cookies for secure sign-in, MongoDB for durable user history, and Vapi as the primary voice layer because it is the most production-ready path in the current stack. I considered a native app, a fully custom WebRTC voice stack, and a wider investment marketplace, but rejected them for this version because they would make the demo bigger while making the product less reliable.

**What's next** - With another month, the first priority is data trust: live or regularly verified FD-rate feeds, stronger admin review workflows, and clearer disclosures around eligibility, tax, and withdrawal conditions. After that comes deeper voice QA across Hindi, Tamil, Bengali, and English, better personalization for senior citizens and goal-based saving, and production observability so failures are visible before users feel them. The goal is not to make Nivesh Saathi louder; it is to make it calmer, more accurate, and worthy of the decisions people bring to it.

## What You Can Do

- Compare FD rates across banks and categories.
- Calculate maturity value, interest earned, and tenure outcomes.
- Chat with an FD-focused assistant for plain-language guidance.
- Use voice mode for a conversational advisory flow.
- Save and manage shortlisted FD options.
- Track existing FDs, maturity dates, and renewal reminders.
- Upload or scan FD receipts for structured extraction.
- View insights, portfolio splits, maturity timelines, and shared summaries.

## Tech Stack

- **Framework:** Next.js 16 App Router, React 19, TypeScript
- **Styling/UI:** Tailwind CSS 4, custom components, Radix slider, Framer Motion, Lucide icons
- **Auth:** Firebase client auth plus Firebase Admin session cookies
- **Database:** MongoDB with Firebase migration/dual-store support
- **AI:** Google Gemini through server-side advisor flows, LangChain/LangGraph utilities, optional LangSmith tracing
- **Voice:** Vapi for production voice sessions; VideoSDK/Python worker remains secondary experimental infrastructure
- **State:** Zustand stores and React hooks
- **Testing:** Vitest, Testing Library, jsdom
- **Deployment:** Vercel for the Next.js app; optional Render service for the voice worker

## Run It On Your Device

Use Node `^20.19.0`, `^22.13.0`, or `>=24`. Start from the GitHub codebase:

```powershell
git clone <your-github-repo-url>
cd nivesh-saathi
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

On macOS/Linux:

```bash
git clone <your-github-repo-url>
cd nivesh-saathi
npm install
cp .env.example .env.local
npm run dev
```

The app can start with partial configuration, but full functionality needs Firebase, MongoDB, Gemini, and Vapi values in `.env.local`.

## Required Configuration

Minimum local app setup:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY` or `FIREBASE_SERVICE_ACCOUNT_JSON`
- `MONGODB_URI`
- `MONGODB_ENCRYPTION_KEY`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_VAPI_PUBLIC_KEY`
- `NEXT_PUBLIC_VAPI_ASSISTANT_ID`

Admin-only FD-rate writes require at least one allowlist:

- `ADMIN_UIDS`
- `ADMIN_EMAILS`

Optional services include Upstash Redis rate limiting, LangSmith tracing, VideoSDK, Deepgram, ElevenLabs, and the Python voice worker.

## Useful Commands

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run start
npm run db:seed:rates
npm run db:migrate:firebase-to-mongo
npm run db:validate:migration
```

For the optional Python worker:

```bash
python -m compileall ai-worker
```

## Architecture

```text
Browser
  -> Next.js App Router pages
  -> React client components and Zustand stores
  -> Next.js API routes
  -> Firebase Admin session verification
  -> MongoDB repositories and services
  -> Gemini / Vapi / optional external services
```

The frontend lives under `src/app`, `src/components`, `src/hooks`, and `src/stores`. Public and protected pages are rendered by the App Router, while interactive workspaces use client components for chat, voice, comparison, tracking, and insights.

The backend lives mainly under `src/app/api` and `src/lib/server`. API routes validate requests, enforce auth or CSRF where needed, call service/repository modules, and return sanitized responses. Shared server utilities handle Firebase sessions, MongoDB access, rate limiting, telemetry, prompt safety, assistant memory, FD calculations, and voice-session helpers.

MongoDB is the main persistence layer for conversations, user memory, FD tracker data, rates, shortlists, share links, feedback, and analytics-style records. Firebase remains responsible for identity, session verification, and migration compatibility.

## Main Workflow

1. A user signs in with Firebase on `/login`.
2. The client exchanges the Firebase token for an HTTP-only session cookie through `/api/auth/session`.
3. Protected pages load inside the app shell.
4. The user compares FDs, chats, starts voice, uploads receipts, saves shortlists, or tracks deposits.
5. Client calls include credentials and CSRF headers for mutating routes.
6. API routes verify the session, validate input, call domain services, and persist data in MongoDB.
7. AI routes build a guarded FD context, call the configured model provider, and return structured guidance.
8. Voice sessions use Vapi in the browser and server routes for summaries, booking intents, diagnostics, and persistence.

## Folder Guide

```text
src/app                 App Router pages, layouts, loading/error states, and API routes
src/components          Product UI grouped by feature area
src/hooks               Client hooks for chat, voice, resizing, prefetching, and notifications
src/lib                 Shared business logic, client helpers, FD math, routes, language data
src/lib/server          Server-only auth, DB, AI, rate limiting, repositories, telemetry
src/stores              Zustand stores for auth, chat, compare, ladder, onboarding
src/test                Integration test setup and cross-feature tests
ai-worker               Optional secondary voice worker infrastructure
scripts                Database seed, migration, and validation scripts
docs                   Supporting architecture and voice migration notes
public                 Static public assets
```

## Core Product Areas

- `/` - public landing experience
- `/login` - Firebase sign-in
- `/home` - authenticated dashboard
- `/compare` - FD comparison workspace
- `/chat` - text advisor
- `/voice` - voice advisor
- `/fds` - FD tracker and maturity dashboard
- `/insights` - document scanner and portfolio insight tools
- `/profile` - user profile and memory controls
- `/share/[id]` - shared FD/advisor summary

## Production Notes

- Mutating private APIs use CSRF checks.
- Admin FD-rate writes are restricted by `ADMIN_UIDS` or `ADMIN_EMAILS`.
- Production errors are logged server-side and sanitized client-side.
- Security headers are configured in `next.config.ts`.
- `.env.local` is ignored and should never be committed.
- Vapi is the production voice path; VideoSDK is documented as secondary/experimental unless deliberately switched later.

 