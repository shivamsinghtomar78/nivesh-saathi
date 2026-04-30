# Nivesh Saathi Roadmap Implementation Notes

This note maps the feature roadmap into product behavior, architecture, dependencies, edge cases, and validation strategy. It is intentionally compact so it can stay useful during demos and future handoff.

## Prioritization

| Tier | Features | Execution order |
| --- | --- | --- |
| MVP | F-15 streaming chat, F-06 profile onboarding, F-07 calculator card, F-11 voice summary, INV-03 portfolio split, INV-04 voice to compare | Stabilize chat/voice context, collect profile, render interactive cards, then add multimodal summaries |
| High-impact | F-01 memory, F-02 disambiguation, F-03 ranking, F-05 jargon chips, F-08 history, F-09 theme, F-10 accessibility, F-13 Hindi voice, F-16 feedback, F-17 sharing, INV-01 Hinglish, INV-05 WhatsApp share | Add personalization, retention surfaces, and share loops after the MVP flow is reliable |
| Optional advanced | F-04 rate alerts, F-12 VAD barge-in, F-14 tone adaptation, F-18 cached rates, F-19 offline PWA, F-20 affiliate booking, INV-02 time machine | Add after data quality and notification permissions are production-ready |

## Feature Breakdown And Implementation Plan

| Feature | Goal and expected behavior | User flow | Dependencies and edge cases | Frontend approach | Backend and AI approach | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 Persistent memory | Remember goals, amount, senior status, tenure, and banks considered. | Sign in, finish onboarding or chat, later answers use profile context. | Firestore unavailable falls back to generic answers. Keep summaries compact. | `OnboardingWizard`, `conversationStore`. | `user_profiles/{uid}/memory/context`, injected in `fd-advisor-agent.ts`. | API auth, memory updates, prompt output without leaked internals. |
| F-02 Intent disambiguation | Vague asks produce clarification chips instead of generic answers. | User asks "best FD", then taps safest/highest/split option. | Missing amount or tenor should not block answer entirely. | Smart chips in `ConversationTimeline`. | Heuristic intent schema in agent, LLM-ready structure. | Ambiguous and complete prompts. |
| F-03 Personalized ranking | Rank cards by rate, senior eligibility, bank preference, and DICGC safety. | User filters or chats with profile, top card is marked for them. | Large amount over Rs 5L needs safety-aware scoring. | Badges on rate cards. | Scoring in `fd-service.ts`. | Rate ordering, senior vs regular rates, bank filters. |
| F-04 Rate alerts | Let users watch banks for rate changes. | Compare screen, tap Watch, later receive in-app/push-capable alert. | No auth disables watch. Push requires browser permission and VAPID setup before real sends. | Bell buttons on compare cards. | `/api/watchers`, service worker push listener. | Watch add/remove, auth failure, service worker notification click. |
| F-05 Inline jargon | Financial terms become tappable explanations. | User reads answer, taps DICGC/p.a./maturity chip. | Avoid matching inside words or cluttering every sentence. | `JargonHighlighter` inside `StructuredAnswer`. | Jargon catalog remains server-backed for explicit explain actions. | Chip detection and popover keyboard/focus behavior. |
| F-06 Onboarding wizard | Collect profile once after sign-in. | Goal, amount, horizon, senior status, then sync profile. | API failure keeps local completion but future chat still works. | Zustand persisted store and modal wizard. | `/api/profile/memory`. | Step validation, persistence, no duplicate onboarding modals. |
| F-07 Calculator card | Live FD maturity calculations inside chat. | Ask to calculate FD, card appears, adjust sliders. | Very high or low values stay bounded. | `FDCalculatorCard` with sliders and animated total. | `calculateMaturity` shared utility and `/api/maturity` compatibility. | Formula tests, visual responsiveness. |
| F-08 History browser | Restore previous chat threads. | Tap History, choose thread, review messages, continue in same thread. | Missing Firestore uses memory fallback. Deleted thread shows safe empty state. | `HistoryDrawer`. | `/api/threads`, `chatSessions` persistence. | Thread list/detail auth checks. |
| F-09 Theme toggle | System, light, and dark support with premium tokens. | Tap header theme icon; preference persists locally and syncs to profile. | Hydration mismatch avoided via next-themes. | `ThemeToggle`, CSS variables. | `themePreference` in memory API. | Light/dark visual scan and API sync. |
| F-10 Accessibility | Keyboard and screen-reader safe app. | Chat log announces new messages; buttons have labels. | Focus rings should not break dense controls. | `role="log"`, `aria-live`, icon labels, focus-visible tokens. | Auth and API errors use clear JSON messages. | Keyboard tab path, screen reader log behavior. |
| F-11 Voice summary | Convert voice session into action card. | Tap Session Summary after a call, review top rates, go to Compare. | No rates still shows recap. | `VoiceSummaryCard`. | `/api/voice/summary`. | Empty session, rate-rich session. |
| F-12 Barge-in | User can interrupt spoken answer. | Start voice input while TTS is speaking, speech cancels. | Browser speech APIs differ. Full VAD needs permission tuning. | `VoiceScreen` cancels `speechSynthesis` on listening. | Future VAD can plug into same cancel path. | Speaking state cancellation. |
| F-13 Multilingual voice | Hindi and regional speech recognition. | Choose language, voice recognition and TTS use matching locale. | Browser may lack some voices. Deepgram fallback needs API key. | `useVoiceInput`, language toggle. | `/api/voice/transcribe`, `LANGUAGE_META`. | Hindi, English, Tamil, Bengali language params. |
| F-14 Tone adaptation | Spoken answers vary by caution, celebration, info. | Warning responses speak slower; portfolio wins sound upbeat. | Browser TTS support varies. | `speakReply` adjusts rate and pitch. | `tone` in advisor schema. | Warning and portfolio responses. |
| F-15 Streaming chat | Avoid blank wait time while answer arrives. | Send prompt, typing indicator, tokens stream in. | Network aborts mark last user message failed. | `useStreamingChat`, streaming placeholder message. | `/api/chat/stream` SSE route. | Chunk parsing, abort, bad JSON, rate limit. |
| F-16 Feedback loop | Capture helpful/not helpful signals. | Hover assistant message, thumbs up/down, choose reason. | Firestore unavailable should not break UI. | `MessageReactions`. | `/api/feedback`, `message_feedback`. | Reaction states, invalid reason, auth. |
| F-17 Share/export | Share clean recommendation with family. | Use share menu, create public read-only link or WhatsApp text. | Links expire; anonymous visitors cannot mutate data. | `ShareButton`, `/share/[id]`. | `/api/share`, `shared_responses`. | Link creation, expired/missing id, read-only render. |
| F-18 Cached rates | Reduce repeated static rate work. | Compare and chat reuse cached rate list. | Admin updates must bypass old cache via version/key. | Loading skeletons while fetch resolves. | Upstash Redis or memory cache in `cache.ts`, 1 hour TTL. | Cache hit/miss behavior. |
| F-19 Offline PWA | Keep app useful in poor connectivity. | Offline banner appears; cached rates/glossary remain available. | First visit without cache returns clear offline JSON. | `OfflineBanner`, `PwaRegistrar`. | `public/sw.js` stale-while-revalidate for rates and jargon. | Offline toggle, cache fallback, service worker install. |
| F-20 Affiliate booking | Track outbound bank booking intent. | Tap Book or official page. | Invalid URLs fail at build/service creation. | Book buttons in chat and compare. | `buildAffiliateBookingUrl`. | UTM params and safe external navigation. |
| INV-01 Hinglish mode | Accept mixed Hindi/English naturally. | User types Hinglish, agent answers conversationally in chosen mode. | True code-switch detection can be expanded with a classifier. | Existing language chips and prompt examples. | Agent prompt and multilingual heuristics. | Hinglish amount and tenor extraction. |
| INV-02 Time machine | Show historical rate trends. | Ask about past rates, chart appears in chat. | Static curated data must be disclosed. | `FDTimeMachineChart`. | `showTimeMachine` action flag. | Chart render and mobile fit. |
| INV-03 Portfolio split | Split large investments across banks for DICGC safety. | Ask for Rs 15L, view allocation chart. | Amount below Rs 5L should not overcomplicate. | `PortfolioSplitCard`. | `calculatePortfolioDiversification`. | > Rs 5L and <= Rs 5L cases. |
| INV-04 Voice to compare | Voice answer also renders visual comparison. | Ask voice comparison, hear answer and see companion card. | No rates should not leave stale card. | `VoiceCompanionCard`. | Shared chat/voice response schema. | Voice response with multiple rate cards. |
| INV-05 WhatsApp rate share | Create shareable branded rate content. | Share button opens WhatsApp/copy/native share; OG image route exists. | Native share may be unavailable. | `ShareButton`. | `/api/og/rates` image endpoint. | Mobile and desktop share fallbacks. |

## Code Structure

- `src/components/app`: page-level product screens and shell.
- `src/components/chat`: chat-specific feature cards and message controls.
- `src/components/voice`: voice-specific post-session UI.
- `src/components/providers`: app-wide client providers, PWA registration, offline status.
- `src/lib/server`: agent schemas, FD service, cache, persistence, auth-bound APIs.
- `src/stores`: persisted client state for conversation, compare shortlist, auth, onboarding.
- `src/app/api`: Next route handlers for BFF, streaming, profile memory, feedback, share, voice, watchers.

## UX Guardrails

- One entry point per feature: calculator appears in-context, history lives behind the History button, alerts live on compare cards.
- Premium minimal UI: cards are used for repeated items and tools, not nested page decoration.
- Accessibility: chat timeline is a live log, icon buttons use labels, focus-visible rings are global.
- Responsive behavior: fixed tool dimensions, bounded chat height, mobile bottom nav, mobile shortlist sheet.

## Reliability Checklist

- Validate request bodies with Zod.
- Require Firebase session and CSRF on mutations.
- Keep Firestore optional with memory/local fallbacks for demo resilience.
- Cache rate data with Redis when configured, memory otherwise.
- Use service worker stale-while-revalidate only for safe public GET data.
- Keep outbound bank links external and UTM-tagged.

## Verification Commands

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```
