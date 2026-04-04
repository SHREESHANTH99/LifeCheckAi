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
