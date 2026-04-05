# LifeCheck AI

LifeCheck AI is a full-stack environmental intelligence platform focused on India-first safety decisions.
It helps answer one practical question:

Is this location safe right now, and what should I do next?

The platform combines live environment signals, AI guidance, map intelligence, alerts, water-quality ML, realtime shared state, and voice-first interaction.

## 1) Product Scope

LifeCheck AI is designed as a multi-surface system:

- Fast safety checks for city-level decisions
- Guided dashboard for daily monitoring
- Spatial risk understanding on maps
- Streaming AI assistant for actionable guidance
- Alerting workflow with severity and unread state
- Water-quality prediction and compliance diagnostics
- Realtime shared awareness and watcher presence
- Voice-assisted interaction and spoken summaries

## 2) Feature Tracks (Detailed)

This section describes each track and what is implemented.

### Track A: Location Intelligence

- Search by city, district, state, and common India place names
- Ranked suggestion endpoint for quick selection
- Browser geolocation support for current-location checks
- Reverse geocoding support in coordinate-based safety checks
- Input normalization for stable city matching
- Metadata indicating whether values are fresh, fallback, or cached

### Track B: Safety Snapshot and Risk Scoring

- Unified safety snapshot for a location
- Verdict-oriented output (safe/caution/unsafe style interpretation)
- Composite interpretation from:
  - Air quality signal
  - Weather signal
  - Pollen signal
  - UV signal where available
- Human-readable advisory text for immediate action
- Null-safe backend assembly to avoid crashes on missing provider fields
- Snapshot persistence support for history and timeline displays

### Track C: AI Assistant (Chat)

- Natural language environmental guidance
- Query-to-location extraction path
- Intent-aware prompt shaping for safety use-cases
- Streaming response mode for faster perceived latency
- Guardrails for unsafe or unsupported requests
- Structured response sections (summary, risks, actions)
- Provider strategy:
  - Gemini preferred when available
  - Groq fallback for operational continuity
  - DeepSeek fallback path
  - Template fallback if providers fail

### Track D: Dashboard Intelligence

- City search and monitored city workflow
- Risk summary cards with core metrics
- AQI and condition-focused visualization blocks
- Personal risk profile support for interpretation context
- Timeline-style view for trend awareness
- Live refresh controls for monitored locations
- Voice briefing entry points integrated into dashboard flow

### Track E: Map and Spatial Risk

- Google Maps integration for location context
- Marker and zone-style risk visualization
- Monitored city visibility from map surface
- User-activity and crowd-report style layer support
- Sidebar/drawer interaction pattern for desktop/mobile parity
- Zone visibility toggles for clutter control

### Track F: Alerts and Notification Workflow

- Live alert feed generation from safety context
- Category-aware filtering (air/weather/pollen/UV/water)
- Severity-based styling to prioritize critical items
- Local unread tracking persistence
- Read and mark-as-read interaction model
- Summary strip for high-priority status

### Track G: Water Quality ML Intelligence

- State-first filtering with optional district/city refinement
- Drinkability prediction endpoint
- Confidence and class-probability output
- BIS IS 10500:2012 compliance/violation interpretation
- Parameter-level exposure (pH, TDS, nitrate, fluoride, arsenic, etc.)
- Historical trend support by state/location
- AI-generated contamination analysis and remediation suggestions
- Model metrics endpoint for transparency

### Track H: Realtime Shared State and Caching

- SpaceTimeDB integration for shared city state patterns
- Shared watcher-count behavior for selected city contexts
- Shared alert board pattern for collaborative awareness
- Realtime snapshot endpoint for current-state consumers
- Polling support for continuously monitored cities
- Scheduler warmup for important cities

### Track I: Voice Assistant and Audio UX

- Voice settings persisted in browser local storage
- Default voice modes set to OFF for user control
- Chat voice mode flow:
  - Assistant intro prompt
  - User speaks
  - Assistant responds with voice
  - Loop continues for conversational hands-free use
- ElevenLabs TTS primary path
- Browser speech-synthesis fallback when ElevenLabs is unavailable
- Voice waveform feedback during active speech mode
- Proactive spoken alert support

## 3) User Journeys

### Journey 1: Quick Safety Check

1. User searches for a city.
2. Backend aggregates signals and computes safety context.
3. UI shows verdict, key metrics, and what to do now.

### Journey 2: Ongoing Monitoring

1. User adds city to monitored list.
2. Scheduler and polling keep data fresh.
3. Alerts surface elevated risk events.
4. Timeline/history allows quick trend review.

### Journey 3: Conversational Guidance

1. User asks in chat: "Is it safe to run outside in Bangalore tonight?"
2. Assistant infers location and context.
3. Streamed answer gives risk + recommendation + precautions.
4. Optional voice mode reads response and keeps the loop active.

### Journey 4: Water Decision Support

1. User selects state and location.
2. Model predicts drinkability and confidence.
3. BIS violations and contaminant clues are shown.
4. AI explanation suggests mitigation actions.

## 4) Frontend Pages

- `/` Landing page for fast entry and project overview
- `/dashboard` Main intelligence screen
- `/map` Spatial risk and city context
- `/chat` Streaming AI assistant with voice features
- `/alerts` Alert feed and unread workflow
- `/water` Water ML analysis and trends

## 5) Backend API Surface

### Safety and Location

- `GET /api/check-safety?city=...`
- `GET /api/check-safety-by-coordinates?lat=...&lon=...`
- `GET /api/location-suggestions?q=...&limit=...`
- `GET /api/cities/live`
- `GET /api/history?cities=...&limit=...`
- `GET /realtime/snapshot`

### Alerts

- `GET /api/alerts/live`

### Chat

- `GET /api/ask?query=...`
- `GET /api/ask/stream?query=...&city=...&profile=...&memory=...`

### Water

- `GET /api/water/states`
- `GET /api/water/predict?state=...&location=...`
- `GET /api/water/trends?state=...&location=...`
- `GET /api/water/model-metrics`
- `GET /api/water/analyze?state=...`

### Platform

- `GET /`
- `GET /health`
- `GET /test`

## 6) Architecture Summary

### Backend

- Framework: FastAPI + Uvicorn
- Route modules: safety, alerts, history, realtime, chat, water, test
- Service modules: weather/air/pollen/maps/geocode, AI providers, DB/cache, ML
- Scheduler: optional startup task for periodic warmup updates
- Data behavior: defensive merging and null-safe snapshot recording

### Frontend

- Framework: Next.js App Router + React + TypeScript
- Styling: Tailwind CSS
- Motion and transitions: Framer Motion
- Charts: Recharts + Chart.js
- State: React hooks and Zustand where needed
- Realtime integration: SpaceTimeDB client patterns + polling fallback
- Voice: ElevenLabs API path + browser speech fallback

### Realtime Server (Companion)

- Rust cdylib service using SpaceTimeDB
- Shared state support for collaborative city awareness patterns

## 7) Technology Stack and Dependencies

### Frontend (selected)

- next 16.2.2
- react 19.2.4
- typescript 5
- tailwindcss 3.4.x
- framer-motion 12.x
- chart.js 4.x
- react-chartjs-2 5.x
- recharts 3.x
- zustand 5.x
- spacetimedb 2.1.0

### Backend (selected)

- fastapi 0.135.x
- uvicorn 0.42.x
- httpx 0.28.x
- pydantic 2.12.x
- python-dotenv 1.2.x
- requests 2.33.x
- google-generativeai 0.8.x
- spacetimedb-sdk 0.7.0
- pandas 2.2+
- scikit-learn 1.5+
- joblib 1.4+
- numpy 1.26+

### Realtime Companion

- Rust 2021 edition
- spacetimedb crate 2.1.0

## 8) Environment Configuration

### Backend .env (`lifecheckai/backend/.env`)

```env
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-1.5-flash
GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_MODEL=llama-3.1-8b-instant
DEEPSEEK_API_KEY=YOUR_DEEPSEEK_API_KEY
DEEPSEEK_MODEL=deepseek-chat
GEOCODING_COUNTRY=IN
GEOCODING_REGION=in
SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
SPACETIMEDB_DB_NAME=YOUR_DB_NAME
ENABLE_SCHEDULER=true
SCHEDULER_INTERVAL_SECONDS=300
SCHEDULER_CITIES=Delhi,Mumbai,Bangalore,Chennai
```

### Frontend .env.local (`lifecheckai/frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_BROWSER_MAPS_KEY
NEXT_PUBLIC_ELEVENLABS_API_KEY=YOUR_ELEVENLABS_API_KEY
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=YOUR_ELEVENLABS_VOICE_ID
```

## 9) Local Setup

### Backend

```powershell
cd lifecheckai/backend
python -m venv venv
./venv/Scripts/activate
pip install -r requirements.txt
```

### Frontend

```powershell
cd ../frontend
npm install
```

### Optional SpaceTimeDB publish

```powershell
cd ../../lifecheck-sbt/server
spacetime login
spacetime publish YOUR_DB_NAME -y
```

## 10) Run

### Start backend

```powershell
./lifecheckai/backend/venv/Scripts/python.exe -m uvicorn lifecheckai.backend.app.main:app --reload
```

### Start frontend

```powershell
cd lifecheckai/frontend
npm run dev
```

### Open

- Backend docs: http://127.0.0.1:8000/docs
- Frontend app: http://localhost:3000

## 11) Verification Commands

```powershell
curl http://127.0.0.1:8000/health
curl "http://127.0.0.1:8000/api/check-safety?city=Delhi"
curl "http://127.0.0.1:8000/api/location-suggestions?q=maha&limit=8"
curl http://127.0.0.1:8000/api/cities/live
curl "http://127.0.0.1:8000/api/ask?query=How%20safe%20is%20Delhi%20today"
curl "http://127.0.0.1:8000/api/water/predict?state=Maharashtra"
```

## 12) Repository Layout

```text
lifecheck-ai/
  lifecheckai/
    backend/
      app/
        main.py
        config.py
        routes/
        services/
        models/
        utils/
      requirements.txt
    frontend/
      app/
      components/
      hooks/
      lib/
      types/
      package.json
    data/
    models/
  lifecheck-sbt/
    server/
      Cargo.toml
      src/lib.rs
```

## 13) Limitations and Operational Notes

- Full environmental coverage depends on valid third-party API keys.
- Some providers may return sparse data for smaller regions.
- Voice output quality and availability depend on browser/media permissions and API key validity.
- If ElevenLabs key is missing or invalid, browser speech fallback is used.
- Realtime shared-state features require SpaceTimeDB deployment and correct host/db configuration.
- Never commit secrets to version control.

## 14) Current Status

This README reflects the implemented project scope and integration tracks as of April 2026.

## 15) Deployment Guide (Production-Safe)

This repository is a monorepo-style layout, so deployment commands must match folder structure.

### Recommended Hosting Split

- Frontend (Next.js): Vercel
- Backend (FastAPI): Render
- Realtime shared state: SpaceTimeDB Cloud

### Render Backend (No-Build-Issue Setup)

Use these exact settings for the backend service:

- Root Directory: leave empty (repo root)
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT lifecheckai.backend.app.main:app`

Why this works:

- Root-level `requirements.txt` forwards to backend requirements.
- Backend imports use `lifecheckai.backend.app...`, which resolve when running from repo root.

### Render Python Version

For better package compatibility and predictable startup behavior, pin Python to 3.11.x or 3.12.x.

### Vercel Frontend

- Project root: `lifecheckai/frontend`
- Build: `npm run build`
- Start: default Vercel Next.js runtime

Required frontend environment variables:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_ELEVENLABS_API_KEY`
- `NEXT_PUBLIC_ELEVENLABS_VOICE_ID`
- `NEXT_PUBLIC_SPACETIMEDB_HOST`
- `NEXT_PUBLIC_SPACETIMEDB_DB_NAME`

## 16) Common Deployment Errors and Exact Fixes

### Error: `Could not open requirements file: requirements.txt`

Cause: Build command runs at repo root without a root requirements file path.

Fix:

- Keep `pip install -r requirements.txt` (root shim exists), or
- Use `pip install -r lifecheckai/backend/requirements.txt`

### Error: `gunicorn: command not found`

Cause: Gunicorn missing from backend dependencies.

Fix:

- Ensure `gunicorn==23.0.0` exists in backend requirements.

### Error: `ModuleNotFoundError: No module named 'lifecheckai'`

Cause: Start command import path does not match Root Directory.

Fix (recommended):

- Root Directory empty
- Start with `lifecheckai.backend.app.main:app`

Alternative (if Root Directory is `lifecheckai/backend`):

- Start with `app.main:app`

### Error: `unicorn: command not found`

Cause: Start command typo.

Fix:

- Use `gunicorn`, not `unicorn`.

## 17) Water Module Performance Notes (Why Fetch Can Feel Slow)

Water analysis can feel slower than safety/AQI checks because it does heavier data work per request.

### Why it is slower

- State and station filtering runs against large multi-year groundwater datasets.
- Prediction and trends are requested together for each analysis action.
- Station matching includes fuzzy/ranked comparisons.
- "Use My Location" adds reverse geocoding and nearby-station mapping.
- Some responses include richer payloads (statuses, recommendations, trend arrays).

### Current mitigations in the codebase

- Cached dataset/frame and derived catalogs (`@lru_cache`) in water services.
- Station lists are state-scoped before client filtering.
- Prediction + trends requests are executed in parallel from frontend.
- Nearby selection limits candidate stations before deeper processing.

### Practical speed tips for users/operators

- Select state first, then choose a monitoring location before Analyze.
- Avoid repeated "Use My Location" clicks unless location changed.
- Keep backend service on a paid instance for lower cold-start latency.
- Keep frontend and backend in nearby regions.

## 18) Security and Ops Checklist

- Never commit live API keys to git.
- Rotate keys immediately if they were exposed in any committed `.env` file.
- Restrict backend CORS to trusted frontend domains in production.
- Keep SpaceTimeDB host/db values in secret env vars.
- Add health checks (`/health`) and monitor deploy logs each release.

## 19) SpaceTimeDB Dashboard Screenshots

Use these paths for the three images you shared:

- `lifecheckai/docs/images/tracks/spacetimedb-overview-1.png`
- `lifecheckai/docs/images/tracks/spacetimedb-overview-2.png`
- `lifecheckai/docs/images/tracks/spacetimedb-overview-3.png`

After placing the files at those paths, this README will render them inline:

![SpaceTimeDB Overview 1](docs/images/tracks/spacetimedb-overview-1.png)
![SpaceTimeDB Overview 2](docs/images/tracks/spacetimedb-overview-2.png)
![SpaceTimeDB Overview 3](docs/images/tracks/spacetimedb-overview-3.png)

## 20) Track 1: SpaceTimeDB (Deep Dive)

### Table-intro line

"We use SpaceTimeDB as the multiplayer nervous system for live shared state, not as a generic database replacement."

### Exactly what is implemented in this repository

- Rust SpaceTimeDB module: `lifecheck-sbt/server/src/lib.rs`.
- Deployed database: `lifecheckai06-56awo-own` on maincloud.
- Current tables in module:
  - `city_data` (latest cached city snapshot rows)
  - `city_watcher` (session + city + joined timestamp)
  - `shared_alert` (push alerts with severity/message/time)
- Current reducers in module:
  - `save_city_data`
  - `join_city`
  - `leave_city`
  - `push_alert`

### How those tables are used by frontend/backend

- Frontend subscriptions are in `frontend/lib/spacetime-db.ts`.
- Watcher presence is consumed in `frontend/hooks/useSharedCityState.ts` and shown on dashboard/alerts.
- Backend writes to SpaceTimeDB in `backend/app/services/db_service.py`.
- Alert fan-out path:
  - safety scheduler/aggregation updates backend state
  - backend calls `push_alert`
  - subscribed clients can render new shared alerts immediately.

### Crowd reports note (important architecture clarity)

- Crowd reports are implemented today via FastAPI realtime routes (`backend/app/routes/realtime.py`) with in-memory stores + activity ring buffer.
- Map components consume these APIs through `frontend/lib/spacetime.ts` and `frontend/hooks/useRealtime.ts`.
- Upvote endpoint exists at `PUT /realtime/crowd-report/{report_id}/upvote`.
- If needed for judging narrative, this can be presented as the next SpaceTimeDB migration target: move crowd reports + upvotes from in-memory route state into SpaceTimeDB reducers/tables.

### Why SpaceTimeDB was chosen

- Reducer-centric server logic in Rust avoids client-side rule drift.
- Push subscriptions remove polling lag for shared state use-cases.
- Strong schema and deterministic write path simplify multi-user consistency.
- Fits the project need for live city watcher counts and shared alert propagation.

### Demo script for judges

1. Open dashboard for same city in two devices.
2. Show watcher count increasing live without refresh.
3. Trigger or simulate a shared alert write; show subscribed UI updating.
4. Mention that crowd reports are currently realtime API based, with clear migration path already aligned with existing reducer pattern.

## 21) Track 2: ArmorIQ (Deep Dive)

### Table-intro line

"ArmorIQ is implemented as both a backend safety gate and a visible trust panel in the UI."

### User-visible implementation

- The ArmorIQ rules panel is in chat sidebar Agent tab.
- Wired component: `frontend/components/agent/AgentRulesPanel.tsx`.
- Mounted from: `frontend/components/chat/ChatSidebar.tsx`.
- It shows:
  - Allowed capability list
  - Blocked action list
  - Live action log (allowed/blocked decisions)
  - Confidence bar with high/moderate/low states.

### Backend enforcement implementation

- Chat endpoints run guard checks before model response is finalized.
- Structured blocked responses include explicit safe fallback behavior.
- Frontend renders blocked cases clearly (warning style bubble + safe redirection response).

### Demo script for judges

1. Ask safe query: "Is it safe to run in Delhi today?"
2. Show ALLOWED action in log and confidence update.
3. Ask blocked query around diagnosis/medication.
4. Show BLOCKED state in log + safe fallback answer.
5. Explain: guardrails are pre-response policy checks, not decorative UI.

## 22) Track 3: Google Gemini (Deep Dive)

### Table-intro line

"Gemini is integrated in multiple feature paths, not a one-off chatbot add-on."

### Meaningful integrations in this codebase

- Chat reasoning + streaming responses with structured safety prompt strategy.
- Water analysis narrative generation for contamination interpretation.
- Forecast advisory language generation from computed trend arrays.
- Intent/location extraction helpers for contextual answers.

### Reliability architecture

- Gemini is preferred model provider.
- Fallback chain is configured so users still receive answers when provider failure occurs.
- The product always returns actionable output, even under degraded AI availability.

### Demo script for judges

1. Start streaming chat request and show token flow.
2. Open water page and show ML + narrative explanation behavior.
3. Show forecast summary text generation.
4. Explain fallback behavior and why it matters for safety products.

## 23) Track 4: ElevenLabs (Deep Dive)

### Table-intro line

"Voice is a first-class interaction model here, not a decorative button."

### Implemented voice surfaces

- Dashboard spoken safety briefing.
- Chat voice mode loop for hands-free interaction.
- Proactive spoken alerts (opt-in behavior).
- Browser speech fallback when ElevenLabs is unavailable.

### Technical notes

- Voice preferences persist in local storage.
- Speech output strips markdown/noise before TTS.
- Waveform/voice feedback is shown while playback is active.

### Demo script for judges

1. Trigger dashboard voice briefing.
2. Enable chat voice mode and show speak-response cycle.
3. Show fallback behavior when ElevenLabs key is absent.
4. Emphasize usefulness for accessibility and low-attention contexts.

## 24) Track Positioning Summary

- SpaceTimeDB is load-bearing for shared watcher + shared alert state today.
- ArmorIQ is both policy enforcement and transparent UI trust layer.
- Gemini is used across chat, water, forecast, and intent workflows.
- ElevenLabs powers practical voice-first interaction with graceful fallback.
- Combined, these tracks produce a safety platform that is realtime, policy-safe, AI-assisted, and voice-usable.