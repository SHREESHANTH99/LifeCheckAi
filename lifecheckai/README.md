# LifeCheck AI

LifeCheck AI is a full-stack environmental safety platform for India-wide location intelligence.
It combines real-time air, weather, pollen, water-quality analytics, AI guidance, and map-based monitoring.

## What Is Built

### Core capabilities

- Real-time safety snapshot per location (AQI, weather, pollen, overall verdict)
- Geocoding + reverse geocoding (city/state/place resolution)
- Browser geolocation safety lookup
- Multi-city and state-scale monitoring with live map overlays
- Alert feed and notification-style alert UX
- AI chat assistant with safety-aware fallback mode
- Water quality ML prediction + trends + Gemini analysis
- Realtime cache via SpaceTimeDB and scheduler-driven warmup

### Coverage

- Dashboard and map search support broad location matching via `/api/location-suggestions`
- India states and UTs seeded in frontend for professional quick-selection UX
- Dynamic monitored locations are persisted and can grow beyond default seeds

## Tech Stack

### Frontend

- Next.js (App Router)
- TypeScript + React
- Framer Motion
- Tailwind CSS
- Recharts (water trends)
- Lucide icons

### Backend

- FastAPI
- Pydantic
- Requests/httpx
- Scikit-learn, pandas, numpy, joblib (water ML)
- Google APIs: Geocoding, Air Quality, Weather, Pollen
- SpaceTimeDB (short-lived realtime cache)

## Project Layout

```text
lifecheck-ai/
	lifecheckai/
		backend/
			requirements.txt
			.env
			app/
				main.py
				config.py
				routes/
				services/
				models/
				utils/
		frontend/
			package.json
			app/
			components/
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

Create/update `lifecheckai/backend/.env`:

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

Create/update `lifecheckai/frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_BROWSER_MAPS_KEY
```

### 3) SpaceTimeDB module (optional but recommended for realtime cache)

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

- Backend docs: `http://127.0.0.1:8000/docs`
- Frontend: `http://localhost:3000`

## Verification Quick Checks

```powershell
curl http://127.0.0.1:8000/health
curl "http://127.0.0.1:8000/api/check-safety?city=Delhi"
curl "http://127.0.0.1:8000/api/location-suggestions?q=maha&limit=8"
curl http://127.0.0.1:8000/api/cities/live
curl "http://127.0.0.1:8000/api/water/predict?state=Maharashtra"
```

## Notes and Limitations

- Google API enablement and billing are required for live geocoding/air/weather/pollen.
- Pollen coverage can vary by location; API may return sparse data in some regions.
- With no Google key, backend falls back to mock/default coordinate behavior.
- Map overlays require `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` with Maps JavaScript API enabled.

## Security and Ops

- Do not commit `.env` secrets.
- Rotate keys if exposed.
- Restrict production API keys by origin/IP and service scope.

## Current Version Snapshot

This README reflects the currently implemented feature set in the codebase as of April 2026.

