# LifeCheck AI

LifeCheck AI is a full-stack environmental intelligence platform focused on India. It combines location-aware safety scoring, realtime monitoring, AI chat guidance, map-based risk visualization, and water quality ML analysis.

## Implemented Features (April 2026)

### Safety Intelligence

- City-level safety snapshot using AQI, weather, pollen, and risk scoring.
- Browser geolocation flow with reverse geocoding and location-aware results.
- Search suggestions with broad India coverage (city, district, state, UT support).
- Live city cache support with source metadata and cache-hit indicators.
- Multi-city and state-scale monitoring with live map overlays.
- Alert feed and notification-style alert UX.
- AI chat assistant with safety-aware fallback mode.
- Water quality ML prediction + trends + Gemini AI analysis.
- Realtime cache via SpaceTimeDB and scheduler-driven warmup.

### Realtime Monitoring and Alerts

- Realtime snapshot feed for monitored locations.
- Alerts stream and alert history endpoints.
- Scheduler warmup for frequently monitored cities.
- History endpoint for city trend lookup.

### AI Chat Assistant

- Structured response generation with intent detection and location extraction.
- Safety guard that blocks unsafe requests and provides safe fallback guidance.
- Critical-condition override path for immediate safety-first response.
- Streaming endpoint for incremental chat rendering on the frontend.

### Water Intelligence

- State-level drinkability prediction with model confidence and probabilities.
- Year-over-year trend analysis for water parameters.
- BIS violations detection.
- AI-generated contamination analysis and remediation guidance.
- Dedicated reusable water component system in frontend.

## Frontend Pages

- /: Landing page with quick safety checks.
- /dashboard: Location intelligence, metrics, and monitored-location workflow.
- /map: Google Maps visualization with risk overlays and monitored location drawer.
- /chat: AI assistant interface with location context.
- /alerts: Alerts list, filtering, and status workflow.
- /water: Water ML prediction, trends, violations, and AI analysis.

## API Surface

### Core

- GET /api/check-safety?city=...
- GET /api/check-safety-by-coordinates?lat=...&lon=...
- GET /api/location-suggestions?q=...&limit=...
- GET /api/cities/live
- GET /api/history?cities=...&limit=...
- GET /api/alerts/live
- GET /realtime/snapshot

### Chat

- GET /api/ask?query=...
- GET /api/ask/stream?query=...&city=...&profile=...&memory=...

### Water

- GET /api/water/states
- GET /api/water/predict?state=...&location=...
- GET /api/water/trends?state=...&location=...
- GET /api/water/model-metrics
- GET /api/water/analyze?state=...

### Platform

- GET /
- GET /health
- GET /test

## Tech Stack

### Backend

- FastAPI
- Pydantic
- requests/httpx
- scikit-learn, pandas, numpy, joblib
- Google Geocoding, Air Quality, Weather, Pollen APIs
- SpaceTimeDB integration for short-lived cache

### Frontend

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Framer Motion
- Recharts + Chart.js
- Zustand
- Lucide icons

## Repository Layout

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
    frontend/
      app/
      components/
      hooks/
      lib/
      types/
  lifecheck-sbt/
    server/
      Cargo.toml
      src/lib.rs
```

## Backend Features (From Current Code)

### Safety and geolocation

- `GET /api/check-safety?city=...`
	- Geocodes location, fetches weather/air/pollen, computes verdict, advisory and score
	- Caches to SpaceTimeDB and returns `source` + `cache_hit`
- `GET /api/check-safety-by-coordinates?lat=...&lon=...`
	- Reverse-geocodes browser coordinates and returns full snapshot
- `GET /api/location-suggestions?q=...&limit=...`
	- Ranked location suggestions from geocoding + India state/UT fallback set
- `GET /api/cities/live`
	- Live cached city snapshots (used by map/dashboard monitored views)

### Alerts / history / realtime

- `GET /api/alerts/live`
	- Active alerts + alert history
- `GET /api/history?cities=...&limit=...`
	- Snapshot history for one or more cities
- `GET /realtime/snapshot`
	- Realtime city snapshot feed for polling clients

### AI chat

- `GET /api/ask?query=...`
	- Intent + location extraction
	- Safety-guard critical override path
	- Gemini-based sectioned answer with fallback rendering
	- Confidence + source metadata in response

### Water intelligence

- `GET /api/water/states`
- `GET /api/water/predict?state=...`
- `GET /api/water/trends?state=...`
- `GET /api/water/model-metrics`
- `GET /api/water/analyze?state=...`

### Platform endpoints 

- `GET /` backend status message
- `GET /health` service health + scheduler status
- `GET /test` basic health route 

## Frontend Features (From Current Code) 

### Pages

- `/` modern landing page with city quick-check + feature cards
- `/dashboard`
	- Sticky advanced search with async suggestions
	- Location intelligence panel
	- Air/weather/pollen/UV metric system
	- Monitored cities section with filtering/sorting/priority summaries
- `/map`
	- Google Maps JS integration
	- True map-anchored zone overlays (safe/caution/unsafe circles + markers)
	- Drawer-style monitored panel with hamburger toggle (desktop + mobile)
	- Dynamic monitored locations and live city refresh
- `/chat`
	- AI conversation UI with city context and quick prompts
- `/alerts`
	- Alert feed + filters + top notifications section with unread tracking
- `/water`
	- State selector, ML prediction, BIS violation view, trends charts, AI analysis

### Shared frontend behavior

- Context state store for safety data and chat context
- `useSafetyData` hook with normalization for multiple backend payload shapes
- 60-second auto-polling + local cache fallback + toasts
- `locateMe` support for browser geolocation
- Advanced `SearchBar` with:
	- Recent searches
	- Ranked suggestions
	- Grouped sections (Recent, Location Matches, Popular Picks)
	- Debounced async suggestion provider support
## Setup

### 1) Backend

```powershell
cd lifecheckai/backend
python -m venv venv
./venv/Scripts/activate
pip install -r requirements.txt
```

Create lifecheckai/backend/.env:

```env
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_OR_SAME_AS_GOOGLE
GEMINI_MODEL=gemini-2.5-flash
GEOCODING_COUNTRY=IN
GEOCODING_REGION=in
SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
SPACETIMEDB_DB_NAME=YOUR_DB_NAME
ENABLE_SCHEDULER=true
SCHEDULER_INTERVAL_SECONDS=300
SCHEDULER_CITIES=Delhi,Mumbai,Bangalore,Chennai
```

### 2) Frontend

```powershell
cd ../frontend
npm install
```

Create lifecheckai/frontend/.env.local:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_BROWSER_MAPS_KEY
```

### 3) SpaceTimeDB (Optional but Recommended)

```powershell
cd ../../lifecheck-sbt/server
spacetime login
spacetime publish YOUR_DB_NAME -y
```

## Run

From workspace root:

### Backend

```powershell
./lifecheckai/backend/venv/Scripts/python.exe -m uvicorn lifecheckai.backend.app.main:app --reload
```

### Frontend

```powershell
cd lifecheckai/frontend
npm run dev
```

Open:

- Backend docs: http://127.0.0.1:8000/docs
- Frontend app: http://localhost:3000

## Quick Verification

```powershell
curl http://127.0.0.1:8000/health
curl "http://127.0.0.1:8000/api/check-safety?city=Delhi"
curl "http://127.0.0.1:8000/api/location-suggestions?q=maha&limit=8"
curl http://127.0.0.1:8000/api/cities/live
curl "http://127.0.0.1:8000/api/ask?query=How%20safe%20is%20Delhi%20today"
curl "http://127.0.0.1:8000/api/water/predict?state=Maharashtra"
```

## Water Module Documentation

Additional docs at repository root:

- ../INDEX.md
- ../WATER_COMPONENTS_QUICK_START.md
- ../WATER_COMPONENTS_SUMMARY.md
- ../WATER_COMPONENTS_INTEGRATION_CHECKLIST.md
- ../WATER_FEATURE_DOCUMENTATION.md

Component-level docs:

- frontend/components/water/README.md

## Operational Notes

- Google APIs must be enabled for live geocoding, weather, air, and pollen responses.
- Pollen coverage may be sparse for some locations.
- Without configured Google keys, some flows fallback to limited/default behavior.
- Do not commit .env secrets.

## Version

This README reflects the implemented feature set in this repository as of April 2026.

