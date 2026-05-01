# Nivesh Saathi Feature Implementation Checklist

Last audited: 2026-05-02

## Critical UX And Auth

- [x] Authentication-first app routes: `/home`, `/compare`, `/chat`, `/voice`, `/profile`, and `/share` are protected by server proxy and client `AuthGate`.
- [x] Public landing no longer exposes free feature CTAs. Primary action is secure sign-in.
- [x] Chat and voice are unified in one advisor workspace. The public Voice route redirects to Chat.
- [x] Microphone control lives inside the chat composer with listening, processing, speaking, and error states.
- [x] Duplicate visible "Use the mic" assistant action removed.
- [x] Workspace scroll fixed: chat and insights scroll internally without the full page drifting.
- [x] Mobile workspace bottom nav is hidden to prevent composer overlap.

## Roadmap Features

- [x] F-01 Persistent conversation memory: profile memory API and server prompt injection are present.
- [x] F-02 Intent disambiguation: heuristic classifier and clarification chips are present. Gemini Flash classifier remains a later enhancement.
- [x] F-03 Personalized FD ranking: ranking weighs rate, senior status, amount, bank type, badge, and DICGC risk.
- [~] F-04 Rate alerts: watcher API and compare-screen toggles are present. Push notifications and cron alerts are not yet wired.
- [x] F-05 Inline jargon: assistant text highlights known terms with micro-tooltips.
- [x] F-06 Onboarding profile wizard: one-time authenticated profile wizard syncs to memory.
- [x] F-07 In-chat FD calculator: interactive slider card with contextual defaults and DICGC warning.
- [x] F-08 History browser: drawer loads persisted threads and restores messages.
- [x] F-09 Theme toggle: `next-themes` with light/dark tokens and persisted preference hook.
- [x] F-10 Accessibility pass: role log, aria-live, icon labels, focus rings, and keyboard composer behavior are present.
- [x] F-11 Voice summary: voice replies now call `/api/voice/summary` and render a session summary card.
- [~] F-12 Barge-in: tap-to-interrupt speech is implemented. Full VAD barge-in remains advanced work.
- [x] F-13 Multilingual voice: Web Speech language maps include English, Hindi, Tamil, and Bengali.
- [~] F-14 Voice tone adaptation: response tone affects browser speech rate/pitch. SSML provider integration remains later.
- [x] F-15 Streaming response: authenticated SSE route and client stream reader are wired.
- [x] F-16 Message feedback: hover reactions post feedback to the backend.
- [x] F-17 Share/export: share route and share API are present; PDF export remains future work.
- [x] F-18 Cached rates: rate service uses server cache with a one-hour TTL and admin fallback.
- [x] F-19 PWA resilience: manifest, service-worker registration, and offline banner are present.
- [x] F-20 Affiliate booking: official bank links are wrapped with affiliate/UTM tracking.

## Innovation Layer

- [~] INV-01 Hinglish mode: Hindi/Hinglish prompts work through Gemini and language settings; code-switch detection is not a separate classifier yet.
- [x] INV-02 FD Time Machine: chart card exists and is shown for historical-rate intents.
- [x] INV-03 Portfolio diversification: optimizer and visual split card are implemented for amounts above Rs 5 lakh.
- [x] INV-04 Voice to Compare: voice prompts use the same response pipeline and render visual rate cards while speaking summaries.
- [x] INV-05 WhatsApp-style share: OG rate image endpoint and share flow exist.

## Latest Polish Pass

- [x] Refined dark palette from blue/purple to premium neutral green with gold highlights.
- [x] Added `on-accent` token so bright accent buttons stay readable.
- [x] Removed corrupted visible landing copy and public compare CTA.
- [x] Fixed calculator initial display so maturity no longer shows the principal by mistake.
- [x] Cleaned visible jargon tooltip copy artifacts.

