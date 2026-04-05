# LifeCheck AI Monorepo

This repository contains two tightly connected projects:

- `lifecheckai/` -> Product app (FastAPI backend + Next.js frontend + ML + AI + voice)
- `lifecheck-sbt/` -> SpaceTimeDB Rust module (`cdylib`) for shared realtime state

This root README is the complete top-level guide for architecture, tracks, implementation details, and demo narration.

## 1) Monorepo Structure

```text
lifecheck-ai/
  lifecheckai/
    backend/
    frontend/
    data/
    models/
    README.md
  lifecheck-sbt/
    server/
      Cargo.toml
      src/lib.rs
  render.yaml
  requirements.txt
```

## 2) What the Platform Does

LifeCheck AI is an India-focused environmental safety platform.

Core capabilities:

- Live city safety checks (AQI/weather/pollen/UV aware interpretation)
- AI chat with guardrails and streaming responses
- Map intelligence with crowd risk reports
- Water quality prediction + compliance analysis
- Shared realtime awareness (watchers and alerts)
- Voice-first interaction (dashboard briefing + chat voice mode + proactive alerts)

## 3) Product Tracks at a Glance

- Track 1: SpaceTimeDB
- Track 2: ArmorIQ
- Track 3: Google Gemini
- Track 4: ElevenLabs

## 4) Track 1 - SpaceTimeDB

### One-line pitch

"SpaceTimeDB is the multiplayer state engine of our product."

### Deployed module and schema

- Rust module path: `lifecheck-sbt/server/src/lib.rs`
- Deploy target: maincloud SpaceTimeDB database `lifecheckai06-56awo-own`
- Current SpaceTimeDB tables:
  - `city_data`
  - `city_watcher`
  - `shared_alert`
- Current reducers:
  - `save_city_data`
  - `join_city`
  - `leave_city`
  - `push_alert`

### Where it is consumed in app code

- Frontend table/reducer hooks: `lifecheckai/frontend/lib/spacetime-db.ts`
- Watcher aggregation hook: `lifecheckai/frontend/hooks/useSharedCityState.ts`
- Backend write bridge: `lifecheckai/backend/app/services/db_service.py`

### What users feel in UI

- Live watcher count for currently monitored city
- Shared alerts reflected quickly across clients
- Consistent reducer-enforced writes rather than client-only state mutation

### Note on crowd reports

Crowd report features are active and realtime in this repository, but are currently served through FastAPI realtime routes and in-memory stores:

- `lifecheckai/backend/app/routes/realtime.py`
- `lifecheckai/frontend/lib/spacetime.ts`
- `lifecheckai/frontend/hooks/useRealtime.ts`

This includes a crowd upvote endpoint and map markers. It is a valid realtime feature today and also a clear migration candidate into SpaceTimeDB tables/reducers if needed.

### SpaceTimeDB screenshots

Place your three screenshots here:

- `lifecheckai/docs/images/tracks/spacetimedb-overview-1.png`
- `lifecheckai/docs/images/tracks/spacetimedb-overview-2.png`
- `lifecheckai/docs/images/tracks/spacetimedb-overview-3.png`

Rendered section:

![SpaceTimeDB Overview 1](lifecheckai/docs/images/tracks/spacetimedb-overview-1.png)
![SpaceTimeDB Overview 2](lifecheckai/docs/images/tracks/spacetimedb-overview-2.png)
![SpaceTimeDB Overview 3](lifecheckai/docs/images/tracks/spacetimedb-overview-3.png)

## 5) Track 2 - ArmorIQ

### One-line pitch

"ArmorIQ in this product is a transparent policy layer, not a hidden moderation toggle."

### User-facing policy panel

- Primary component: `lifecheckai/frontend/components/agent/AgentRulesPanel.tsx`
- Mounted in chat sidebar agent tab: `lifecheckai/frontend/components/chat/ChatSidebar.tsx`

Panel sections include:

- Allowed capabilities
- Blocked actions
- Live action log with ALLOWED/BLOCKED decisions
- Confidence visualization

### Backend safety behavior

- Chat flow checks policy boundaries before final model answer is trusted.
- Blocked situations return safe, useful fallback guidance.
- UI clearly marks blocked interactions to preserve trust and explain behavior.

### Why this satisfies the track intent

- Rules are visible to users.
- Allowed and blocked decisions are observable.
- Safety boundaries are explicit and consistent.

## 6) Track 3 - Google Gemini

### One-line pitch

"Gemini is integrated across multiple product paths: chat, water analysis, forecast narration, and intent extraction."

### Meaningful integrations

- Streaming chat generation for safety assistant answers
- Water contamination narrative explanation over model outputs
- Forecast/advisory text generation from computed trends
- Intent + location understanding support for context-aware responses

### Reliability model

- Provider fallback paths are built in.
- Users still get usable output under provider degradation.

## 7) Track 4 - ElevenLabs

### One-line pitch

"Voice is a first-class interaction channel with multiple real user flows."

### Implemented voice features

- Dashboard spoken safety briefing
- Chat voice mode loop
- Proactive spoken alerts
- Browser speech fallback

### Why this is strong technically

- Persistent voice preferences
- Automated turn-taking in chat voice mode
- Graceful fallback rather than hard failure

## 8) Complete Feature Inventory

### Frontend

- Pages: landing, dashboard, map, chat, alerts, water
- Rich components for realtime, charts, recommendations, voice interactions
- Shared state hooks and realtime polling/subscription patterns

### Backend

- FastAPI routes for safety, chat, history, realtime, alerts, water
- Service layer for external data providers, AI providers, and data orchestration
- Scheduler support for periodic refresh and push opportunities

### Water intelligence

- State/location filtering
- Drinkability prediction
- Compliance checks and remediation context
- Trends + nearby station flow

### Realtime and social context

- Shared watcher counts
- Shared alert stream
- Crowd reporting and activity feed

## 9) Run and Deploy Summary

### Local run

- Backend: from `lifecheckai/backend`
- Frontend: from `lifecheckai/frontend`
- Optional SpaceTimeDB publish: from `lifecheck-sbt/server`

### Production split

- Frontend: Vercel
- Backend: Render
- Realtime shared state: SpaceTimeDB Cloud

## 10) Demo Script (Concise)

1. Open dashboard on two devices for same city.
2. Show watcher count changes live.
3. Ask safe and blocked chat queries; show ArmorIQ panel decisions.
4. Open water analysis and show prediction + narrative explanation.
5. Trigger voice briefing and chat voice mode.
6. Show SpaceTimeDB dashboard screenshots and table/reducer counts.

## 11) Source-of-Truth Docs

- Product-level deep documentation: `lifecheckai/README.md`
- SpaceTimeDB module code: `lifecheck-sbt/server/src/lib.rs`

## 12) Current Status

As of April 2026, this monorepo includes functioning implementations for all four target tracks with explicit architecture boundaries between:

- SpaceTimeDB-backed shared state,
- FastAPI realtime endpoints,
- AI safety controls,
- and voice-first UX.
