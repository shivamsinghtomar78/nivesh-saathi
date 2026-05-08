# Final Application Documentation

Audit date: 2026-05-08  
Application: Nivesh Saathi

## Application Overview

Nivesh Saathi is a secure, multilingual fixed-deposit advisory web application for Indian users. It helps users compare FD rates, calculate maturity values, maintain a shortlist, track existing FDs, receive maturity alerts, scan FD documents, and ask an AI advisor through text or voice.

Core users:

- Retail Indian depositors comparing public, private, and small-finance bank FDs.
- Users who want plain-language explanations in English, Hindi, Hinglish, Tamil, and Telugu.
- Authenticated users who want persistent shortlist, chat history, profile memory, FD tracking, alerts, and shareable advisor summaries.

## Tech Stack

Frontend:

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4.
- Framer Motion for transitions.
- Zustand for client state.
- Recharts and Three.js packages for rich visualization surfaces.
- Firebase browser SDK for authentication, analytics, messaging, and FCM registration.
- Vapi browser SDK as the primary production voice interface.

Backend:

- Next.js Route Handlers on Node.js runtime for application APIs.
- Edge runtime for lightweight health/OG routes.
- Firebase Admin for session-cookie verification, Firestore migration compatibility, and push messaging.
- MongoDB native driver and Mongoose for app data, assistant memory, conversations, analytics, FD tracker records, and alert documents.
- Zod for request and response validation.
- Upstash Redis for distributed rate limiting and cache where configured, with local in-memory fallbacks.

AI and external services:

- Gemini for primary LLM/document/OCR flows where configured.
- OpenRouter as an LLM fallback.
- LangSmith for optional tracing.
- Vapi for production voice calls.
- VideoSDK + Deepgram + Groq + ElevenLabs through `ai-worker/` as a secondary self-hosted voice path.

Deployment:

- Vercel-style deployment for Next.js.
- Render/Docker deployment for optional Python VideoSDK worker.
- Vercel cron for FD alert runs.

## Complete Architecture

The app has two deployable surfaces:

- `src/`: Next.js frontend and API application.
- `ai-worker/`: optional FastAPI worker for the experimental VideoSDK voice path.

Request lifecycle:

1. Browser loads a Next.js page.
2. Protected pages are checked by `src/proxy.ts` for the `__session` cookie.
3. Firebase client auth exchanges ID tokens for an HTTP-only session cookie through `POST /api/auth/session`.
4. API routes call `requireFirebaseSession` to verify the Firebase session cookie server-side.
5. Mutating same-origin APIs require `x-nivesh-csrf: 1` and same-origin request checks.
6. Business logic reads/writes MongoDB, Firebase legacy stores, cache, LLMs, or provider APIs.
7. API responses follow `{ ok: true, ...payload }` or `{ ok: false, error, details? }`.

Authentication flow:

- Client signs in with Firebase providers.
- `AuthBootstrap` listens for Firebase auth state and posts the ID token to `/api/auth/session`.
- The backend creates a Firebase session cookie named `__session`.
- Route handlers verify that cookie with Firebase Admin.
- Sign-out clears Firebase client auth and deletes the server cookie.

Realtime and voice:

- Production UI uses `VapiVoiceSessionController`.
- The user opens the voice layer, Vapi starts a live assistant call, and UI status updates from Vapi call/message events.
- Recent chat context and predictive UI context are sent to Vapi as startup context.
- VideoSDK room APIs and the Python worker remain available as secondary infrastructure, but they are not the active production UI path.

## Folder Structure

- `src/app`: Next.js pages, layouts, route handlers, error boundaries, loading states, and manifest.
- `src/app/api`: Backend API routes for auth, chat, FD rates, calculations, FD tracker, documents, voice, profile, share, and admin updates.
- `src/components`: UI components grouped by feature: app shell, chat, compare, FD tracker, landing, insights, onboarding, providers, shared, UI primitives, and voice.
- `src/hooks`: Client hooks for streaming chat, predictive prefetch, voice, FD notifications, auto-resize, and duplex voice helpers.
- `src/lib`: Shared business logic, routes, copy, Firebase client setup, CSRF helpers, FD calculations/data, voice booking logic, and server-only modules.
- `src/lib/server`: Server services for auth, env, rate limiting, MongoDB, Firebase Admin, advisor orchestration, prompt guard, persistence, chat repository, FD tracker, telemetry, VideoSDK, and assistant memory.
- `src/stores`: Zustand stores for auth, conversation, comparison, chat, ladders, onboarding, and FD-related state.
- `src/test`: Integration tests.
- `public`: PWA assets, icon, service worker, and landing/login imagery.
- `scripts`: Mongo/Firebase migration, validation, and seed scripts.
- `docs`: Operational design notes.
- `ai-worker`: Optional Python FastAPI VideoSDK voice worker.

## Frontend Documentation

Pages:

- `/`: Landing page with product positioning and sign-in CTA.
- `/login`: Firebase auth UI.
- `/home`: Authenticated home/workspace entry.
- `/compare`: FD rate comparison and shortlist workflow.
- `/chat`: Text advisor workspace with streaming responses, history, smart chips, and structured UI cards.
- `/voice`: Voice-first advisor and mock booking/KYC flow.
- `/fds`: FD tracker dashboard, manual entry, OCR entry, and maturity alerts.
- `/insights`: Document scanner and wealth simulation surfaces.
- `/profile`: User profile, memory, shortlist, and preferences.
- `/share/[id]`: Authenticated read-only shared advisor note.
- `/privacy` and `/terms`: Static legal pages.

State management:

- `authStore`: Firebase user and auth status.
- `conversationStore`: active chat messages, language, active thread/conversation, voice acknowledgment, history drawer state.
- `compareStore`: persisted shortlist and last compare snapshot.
- FD and onboarding stores maintain local workflow state.

Routing:

- Route constants live in `src/lib/routes.ts`.
- `src/proxy.ts` protects authenticated product routes by requiring `__session`.

Styling:

- Global tokens live in `src/app/globals.css`.
- Components use Tailwind utilities, CSS custom properties, and small UI primitives.
- Dark mode is default through `next-themes`; light variables exist for supported screens.

UX behavior:

- Loading and error states exist at page/app levels.
- Offline banner and service worker provide limited cached FD/glossary reads.
- Voice modal exposes listening, thinking, speaking, retry, interrupt, and error states.

## Backend Documentation

Backend conventions:

- Route handlers validate input with Zod.
- `jsonSuccess` and `jsonError` standardize response shape.
- `handleRouteError` returns validation details but hides server exception details in production.
- `logServerInfo/Warn/Error` write structured JSON logs.
- Rate-limited routes use Upstash Redis where configured, otherwise local memory buckets.

Primary services:

- `auth.ts`: session cookie verification, CSRF protection, same-origin checks, admin allowlist enforcement.
- `fd-service.ts`: deterministic FD advisor logic and rate-card construction.
- `fd-advisor-agent.ts`: LLM-backed advisor orchestration.
- `chat-repository.ts`: Mongoose-backed conversations/messages.
- `persistence.ts`: legacy-compatible persistence and migration helpers.
- `mongo-repositories.ts`: MongoDB native repositories for users, shortlists, rates, calculations, watchers, and shares.
- `fd-tracker-service.ts`: FD record, dashboard, notification token, and alert data services.
- `assistant-memory.ts`: Mongoose-backed AI memory, analytics, preferences, and voice sessions.
- `videosdk.ts`: secondary VideoSDK room/token/worker dispatch service.

## Database Documentation

MongoDB native collections:

- `users`: Firebase UID, email, phone, provider, FCM tokens, notification preferences, user memory.
- `chat_history`: legacy chat sessions with messages and FD context IDs.
- `shared_responses`: expiring shared advisor notes.
- `shortlists`: per-user shortlisted bank IDs and last compare snapshot.
- `calculations`: maturity calculation history.
- `watchers`: per-user watched bank IDs.
- `message_feedback`: user reactions and feedback reason.
- `flagged_messages`: prompt-guard rejections.
- `fd_rates`: seeded/admin-updated FD rate records.
- `fd_records`: tracked user FD records.
- `fd_alerts`: generated maturity alert records.

Mongoose collections:

- `conversations`: conversation metadata, title, summary, archive/delete states, unread state.
- `messages`: conversation messages, metadata, latency, token usage, delivery state, audio metadata.
- `voice_sessions`: voice session metadata and turn history.
- `ai_memory`: user memories, sanitized values, optional encrypted sensitive values, embeddings, expiry.
- `analytics`: event telemetry with TTL.
- `user_preferences`: language, tone, communication, memory, privacy, and financial preferences.
- `assistant_state`: active conversation/session and retrieval context.

Indexes:

- User/conversation/date indexes exist for list screens.
- Unique user and shortlist indexes protect per-user documents.
- TTL indexes expire shared responses, analytics, and memory entries.
- FD records are indexed by user/maturity and alert state.
- FD rates are indexed by bank type, tenor range, and rates.

## Authentication System

Login flow:

1. User signs in through Firebase client SDK.
2. Client posts the Firebase ID token to `/api/auth/session`.
3. Server verifies the ID token with Firebase Admin.
4. Server persists the user profile.
5. Server sets `__session` as HTTP-only, same-site `lax`, secure in production.

Token/session flow:

- Server APIs trust only Firebase Admin verified session cookies.
- Client localStorage is used only for non-sensitive UI hints such as active conversation and shortlist state.

Permissions:

- Regular authenticated users access user-owned records only.
- Admin FD-rate writes require `ADMIN_UIDS` or `ADMIN_EMAILS`.
- Cron alert runs require `FD_ALERT_CRON_SECRET` or `CRON_SECRET`.

## API Documentation

Auth:

- `GET /api/auth/session`: returns current verified user; auth cookie required.
- `POST /api/auth/session`: exchanges Firebase ID token for session cookie; CSRF required.
- `DELETE /api/auth/session`: clears session cookie; CSRF required.

Advisor and chat:

- `POST /api/chat`: non-streaming advisor response; auth, CSRF, rate limit.
- `POST /api/chat/stream`: SSE advisor response; auth, CSRF, rate limit.
- `POST /api/chat/send`: creates/updates conversation and returns advisor response; auth, CSRF, rate limit.
- `GET /api/chat/conversations`: list user conversations; auth required.
- `POST /api/chat/conversations`: create conversation; auth and CSRF required.
- `GET /api/chat/conversations/[id]`: fetch conversation messages; auth and ownership required.
- `PATCH /api/chat/conversations/[id]`: rename, archive, restore, pin, tag, summarize, or mark read; auth, ownership, CSRF.
- `DELETE /api/chat/conversations/[id]`: soft/hard delete conversation; auth, ownership, CSRF.
- `GET /api/threads`: legacy chat summaries; auth required.
- `POST /api/prefetch`: predictive workspace context; auth, CSRF, rate limit.
- `GET /api/jargon/[termId]`: localized finance term explanation; auth required.

FD compare/calculation:

- `GET /api/fd-rates`: filtered FD rates; auth required.
- `POST /api/maturity`: maturity calculation; auth and CSRF required.
- `GET /api/calculations`: recent maturity calculations; auth required.
- `GET /api/shortlist`: user shortlist; auth required.
- `PUT /api/shortlist`: update shortlist; auth and CSRF required.
- `GET /api/watchers`: list watched bank IDs; auth required.
- `POST /api/watchers`: add watched bank; auth and CSRF required.
- `DELETE /api/watchers`: remove watched bank; auth and CSRF required.

FD tracker:

- `GET /api/fds`: list tracked FDs; auth required.
- `POST /api/fds`: create tracked FD; auth, CSRF, validation.
- `PATCH /api/fds/[fdId]`: update tracked FD; auth, ownership, CSRF.
- `DELETE /api/fds/[fdId]`: delete tracked FD; auth, ownership, CSRF.
- `GET /api/fds/dashboard`: FD tracker dashboard; auth required.
- `GET /api/fds/alerts`: list alerts; auth required.
- `PATCH /api/fds/alerts`: mark alerts read; auth and CSRF required.
- `GET /api/fds/alerts/run`: cron alert job; cron secret required.
- `GET /api/fds/notifications/token`: returns Firebase VAPID key; auth required.
- `POST /api/fds/notifications/token`: register FCM token; auth and CSRF required.
- `DELETE /api/fds/notifications/token`: remove FCM token; auth and CSRF required.
- `POST /api/fds/ocr`: extract FD receipt image fields; auth, CSRF, rate limit, Gemini key, JPEG/PNG/WebP only.

Documents and insights:

- `POST /api/documents/extract`: extract FD details from image/PDF; auth, CSRF, file size/type checks, Gemini key.

Voice:

- `POST /api/voice/booking`: create mock FD booking draft; auth and CSRF required.
- `GET /api/voice/booking`: fetch active booking draft; auth required.
- `PATCH /api/voice/booking`: update booking draft; auth and CSRF required.
- `POST /api/voice/booking/kyc`: complete mock KYC handoff; auth and CSRF required.
- `POST /api/voice/diagnostics`: sanitized client voice diagnostic; auth, CSRF, rate limit.
- `POST /api/voice/summary`: persist voice summary; auth and CSRF required.
- `POST /api/voice/room`: secondary VideoSDK room creation; auth, CSRF, rate limit, VideoSDK config.
- `POST /api/voice/videosdk-webhook`: logs sanitized VideoSDK webhook payloads.
- `GET /api/voice/videosdk-webhook`: webhook health metadata.

Admin, profile, sharing, health:

- `POST /api/admin/fd-rates`: upsert FD rates; admin allowlist, auth, CSRF, schema validation.
- `GET /api/profile`: user profile; auth required.
- `GET /api/profile/memory`: user memory; auth required.
- `POST /api/profile/memory`: update user memory; auth and CSRF required.
- `DELETE /api/profile/memory`: reset user memory; auth and CSRF required.
- `POST /api/share`: create expiring share link; auth and CSRF required.
- `GET /api/og/rates`: authenticated OG rates image.
- `GET /api/health`: health response.

## Feature Workflow Documentation

Compare workflow:

1. User opens compare.
2. Client loads shortlist, watchers, and FD rates.
3. User filters by amount, tenor, bank type, and senior-citizen mode.
4. Shortlists sync to MongoDB and stay available to chat/profile.

Chat workflow:

1. User sends a message.
2. Client calls streaming or non-streaming chat route with CSRF.
3. Server authenticates, rate limits, validates, and checks ownership.
4. Prompt guard blocks injection attempts.
5. Advisor retrieves FD context, invokes LLM if configured, and returns structured text/cards/actions.
6. Messages persist in Mongoose conversations and legacy chat history.

FD tracker workflow:

1. User adds FD manually or through receipt OCR.
2. Server validates dates, amount, rate, payout frequency, and ownership.
3. Dashboard computes maturity, interest, status, and unread alerts.
4. Cron job creates maturity alerts and optionally sends push notifications.

Document scanner workflow:

1. User uploads supported file.
2. Server checks type/size and sends base64 file to Gemini.
3. Server validates JSON extraction and returns structured deposits and suggestions.

Share workflow:

1. User creates a share from an advisor message.
2. Server stores an expiring read-only response.
3. Authenticated recipients can view `/share/[id]`.

Admin rate workflow:

1. Allowlisted admin posts validated FD rates.
2. Server requires CSRF and verified Firebase session.
3. Server verifies UID/email against `ADMIN_UIDS`/`ADMIN_EMAILS`.
4. MongoDB rates are bulk upserted.

## Voice And Realtime Flow

Production Vapi flow:

1. User opens voice modal.
2. `VoiceAgentLayer` builds recent chat and predictive context.
3. `VapiVoiceSessionController` starts Vapi with public key and assistant ID.
4. Vapi events update local UI state: connecting, listening, processing, speaking, interrupted, error.
5. User and assistant transcripts are forwarded into the app conversation state.
6. Booking/KYC mock flow uses `/api/voice/booking` and `/api/voice/booking/kyc`.

Secondary VideoSDK flow:

1. `/api/voice/room` creates VideoSDK room and scoped token.
2. Server dispatches `ai-worker` if configured.
3. Python worker joins the room and runs Deepgram STT, Groq LLM, ElevenLabs TTS.
4. Worker publishes room events and closes on idle timeout/shutdown.

## Environment Variables

Required for authenticated production:

- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase client API key.
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Firebase auth domain.
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID.
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Firebase storage bucket.
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Firebase messaging sender ID.
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Firebase app ID.
- `NEXT_PUBLIC_APP_URL`: canonical app URL.
- `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`: Firebase Admin credentials.
- `MONGODB_URI`: MongoDB connection string.

Important optional variables:

- `MONGODB_ENCRYPTION_KEY`: encrypts sensitive assistant memory values.
- `GEMINI_API_KEY`, `GEMINI_MODEL`: Gemini advisor/OCR/document features.
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`: fallback LLM.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: distributed cache/rate limit.
- `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `NEXT_PUBLIC_VAPI_ASSISTANT_ID`: production Vapi voice.
- `ADMIN_UIDS`, `ADMIN_EMAILS`: comma-separated admin allowlists.
- `FD_ALERT_CRON_SECRET` or `CRON_SECRET`: alert cron authorization.
- `FIREBASE_VAPID_KEY`: browser push notifications.
- `LANGSMITH_*` and `LANGCHAIN_*`: optional tracing.

Secondary VideoSDK/worker variables:

- `VIDEOSDK_API_KEY`, `VIDEOSDK_SECRET_KEY`, `VIDEOSDK_AUTH_TOKEN`.
- `VIDEOSDK_ROOM_WEBHOOK_URL`.
- `VOICE_AGENT_WORKER_URL`, `VOICE_AGENT_WORKER_SECRET`.
- Worker-only: `DEEPGRAM_API_KEY`, `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_BASE_URL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL`.

## Deployment Guide

Local setup:

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Production build:

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Recommended Node runtime:

```text
^20.19.0 || ^22.13.0 || >=24
```

Vercel setup:

- Set all Firebase public and Firebase Admin values.
- Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS origin.
- Add the deployed domain to Firebase authorized domains.
- Set `MONGODB_URI`, `MONGODB_ENCRYPTION_KEY`, AI keys, Vapi keys, and admin allowlists.
- Set cron secret for `/api/fds/alerts/run`.

Render worker setup:

- Use `render.yaml` for `ai-worker`.
- Set worker provider keys and `VOICE_AGENT_WORKER_SECRET`.
- Use a non-sleeping instance for realtime voice reliability if VideoSDK is enabled later.

## Security Measures

Implemented:

- Firebase Admin session cookie verification.
- HTTP-only, secure production session cookie.
- CSRF header and same-origin checks for mutating routes.
- Admin FD-rate allowlist through env-based UID/email controls.
- Zod validation on API payloads.
- Rate limiting on expensive chat, prefetch, OCR, diagnostics, and voice-room routes.
- Prompt-injection guard for advisor messages.
- Structured logging with production error-detail suppression.
- Security headers: HSTS, no-sniff, referrer policy, permissions policy, frame denial, CSP report-only.
- File size/type validation for document and OCR uploads.
- No committed secrets found by tracked-file secret scan.
- Push token registration/removal scoped to authenticated user.

Residual dependency audit:

- `npm audit` still reports 10 vulnerabilities from upstream package dependency trees.
- `@tootallnate/once` is pulled through Google Cloud Storage/Firestore via Firebase Admin. The available audit fix downgrades Firebase Admin to `10.3.0`, which is breaking and not ship-safe.
- `postcss` is bundled inside Next.js `16.2.6`; the available audit fix suggests a breaking downgrade to Next `9.3.3`.
- `uuid` advisory was mitigated through a narrow Firebase Admin override to `uuid@11.1.1`.

## Performance Optimizations

Implemented or present:

- Next.js optimized production build.
- Streaming chat endpoint for perceived latency.
- Predictive prefetch cache with short TTL.
- Upstash-backed distributed cache/rate limiting where configured.
- MongoDB indexes for hot user/conversation/FD/rate paths.
- Lazy dynamic 3D insights import.
- Service worker cache for static assets and selected FD/glossary data.
- Short request size caps for chat/prefetch and upload size caps for OCR/documents.
- Removal of unused default public SVGs and unused landing 3D component.

## Testing Documentation

Automated tests:

- Unit and integration tests with Vitest.
- Auth helper tests, including admin allowlist behavior.
- API helper tests for production error sanitization and private CORS.
- Admin FD-rate tests for CSRF, admin access, payload validation, and upsert.
- Conversation mutation tests for CSRF enforcement.
- FD OCR MIME rejection test.
- Existing tests cover prompt guard, datastore mode, assistant models/context, FD calculations, maturity, migration transform, FD alerts, user memory, voice booking, voice routes, streaming helpers, adaptive workspace, insights, and voice UI helpers.

Verification commands used:

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd audit
python -m compileall ai-worker
```

## Known Limitations

- `npm audit` remains non-zero because two residual advisory families require upstream/non-breaking releases from Firebase Admin/Google Cloud and Next.js.
- Production build still emits dependency `punycode` deprecation warnings.
- Build emits an edge-runtime static-generation warning for edge routes.
- Local Node `22.9.0` is below the declared engine range; use Node `20.19+`, `22.13+`, or `24+`.
- Vapi is the primary production voice path; the VideoSDK worker requires explicit UI switching before production use.
- FD rate seed data is demo data unless updated through admin or seed scripts; users must verify current official rates.
- KYC flow is a mock handoff and does not collect real documents.

## Future Improvements

- Move CSP from report-only to enforced after collecting reports.
- Add Sentry/OpenTelemetry for frontend and backend exception monitoring.
- Add uptime checks for `/api/health`, chat, MongoDB, Firebase Admin, and Vapi readiness.
- Add Playwright end-to-end smoke tests for auth, compare, chat, FD tracker, and voice fallback states.
- Add a provider flag if VideoSDK should become a runtime-selectable voice option.
- Add queue-backed voice worker dispatch before scaling VideoSDK.
- Add admin UI with audit logs for FD-rate changes.
- Add database migration checks to CI.
- Add accessibility snapshots and keyboard-navigation tests.

## Final Audit Summary

Production-readiness status: buildable and testable with residual upstream dependency advisories documented.

Bugs fixed:

- Resolved React hooks lint blocker in Vapi controller.
- Removed unstable `visibleMessages` hook dependency warning.
- Removed unused predictive prefetch import.
- Fixed Vitest Windows worker termination warning by using thread pool.
- Repaired corrupted Hindi/Tamil finance glossary copy and Hindi voice booking copy.

Security improvements:

- Added admin UID/email allowlists.
- Added FD-rate admin payload validation.
- Added CSRF checks to mutating conversation routes.
- Replaced private API wildcard CORS with same-origin/app-origin CORS.
- Sanitized production API and global error details.
- Added security headers and CSP report-only policy.
- Added OCR MIME validation.
- Removed raw provider-content logging from document extraction errors.

Performance and maintainability:

- Applied compatible dependency updates.
- Overrode vulnerable Firebase Admin `uuid` transitive dependency to a patched version.
- Removed unused default assets and unused landing 3D component.
- Added targeted tests for the hardening work.
