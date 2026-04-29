# Nivesh Saathi

Voice-first, multilingual Fixed Deposit advisor for Hindi, Tamil, Bengali, and English users. The application has been redesigned with a premium, minimal aesthetic, focusing on smooth interactions and high-quality user experience.

- **Explore & Compare**: Clean interface to filter and compare fixed deposit options.
- **Save a Shortlist**: Seamlessly carry your selections across devices and chat sessions.
- **Intelligent Assistant**: Ask Saathi via text or voice for personalized financial advice and jargon explanations.
- **Seamless Authentication**: Sign in with Email/Password, Phone, or Google to keep context across devices.

## Stack & Design System

- **Next.js 16 App Router**
- **TypeScript & Tailwind CSS**
- **Framer Motion**: Smooth entrance and layout animations across all screens.
- **Three.js (@react-three/fiber, @react-three/drei)**: Lightweight 3D interactive hero background.
- **Firebase**: Client SDK and Firebase Admin hooks for Auth & Data.
- **LangGraph advisor flow**: Powered by Gemini 2.5 Flash-Lite primary model.
- **OpenRouter & Deepgram**: Fallbacks for LLM and speech transcription.
- **Zustand**: Persisted client state management.

## What Is Implemented

- **Premium UI Redesign**: Dark-theme mobile-first landing, compare, chat, voice, and login flows with a cohesive, polished design system.
- **Framer Motion Interactivity**: Staggered fades, layout animations, and fluid transitions across the AppShell and content modules.
- **3D Hero Integration**: Interactive glass-like Torus Knot on the landing page for a state-of-the-art feel.
- **Firebase Authentication**: Email/Password, Phone, and Google auth UI with session-cookie exchange route.
- **Persisted Context**: Shared shortlist and chat state that seamlessly transitions between text and voice bots.
- **LangGraph Advisor**: Prompt-injection guard, terminology explanation, and intelligent rate comparisons.
- **PWA Ready**: Manifest, service worker registration, and mobile-optimized layouts.
- **Lucide Icons**: Unified icon system for consistent visual language.

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

## Vercel Deployment Notes

To ensure the production environment works correctly, follow these configuration steps in the Vercel Dashboard:

1.  **Environment Variables**:
    *   Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g., `https://nivesh-saathi.vercel.app`).
    *   When adding `FIREBASE_ADMIN_PRIVATE_KEY`, paste the raw value **without** wrapping double quotes. The application handles the newline characters automatically.
2.  **Firebase Authorized Domains**:
    *   Go to **Firebase Console** > **Authentication** > **Settings** > **Authorized Domains**.
    *   Add your Vercel deployment domain (e.g., `nivesh-saathi.vercel.app`) to the list. This is required for Google Sign-In and Phone Authentication to function in production.

## Verification

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Verified in this workspace:

- `eslint` passed with no errors.
- `vitest` passed successfully.
- `next build` passed successfully.

Known runtime note:

- `next build` emits a `punycode` deprecation warning from a dependency during static generation. The build still completes successfully.
- Firebase auth depends on the Email/Password, Phone, and Google providers being enabled in the Firebase console for the deployment domain.
