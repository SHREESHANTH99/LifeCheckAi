# LifeCheck AI

LifeCheck AI is a full-stack environmental intelligence platform for India. It combines real-time safety scoring, location-aware environmental checks, AI chat guidance, map-based risk visualization, alerts, and water quality ML analysis.

The product is designed to answer one practical question: is it safe here, right now, and why?

## What It Does

LifeCheck AI brings together:
- Live air quality, weather, and pollen intelligence
- Location-aware safety scoring and advisories
- AI-assisted guidance with safety guardrails
- Live map visualization for monitored cities and user activity
- Environmental alerts with unread tracking and filtering
- Water quality prediction, trend analysis, and BIS compliance checks
- Real-time cache and polling support for frequently monitored locations

---

## Core Features

### 1. Location Intelligence

- Search any Indian city, district, or state.
- Use browser geolocation to check your current location.
- Resolve locations through geocoding and reverse geocoding.
- Support for broad India coverage, including states, cities, districts, and union territories.
- Cached live snapshot support for faster repeated checks.
- Source metadata so the UI can tell whether data is live or cached.

### 2. Safety Scoring and Environmental Snapshot

For each location, the platform can provide:
- Overall safety verdict
- Safety score / risk summary
- Air quality details
- Weather conditions
- Pollen context
- UV context where available
- Actionable advice based on the detected conditions

The dashboard and landing page both use this safety layer to present a clear safe / caution / unsafe view.

### 3. AI Chat Assistant

The AI assistant is built around safety-aware environmental guidance.

It supports:
- Natural-language questions about safety, AQI, weather, water, and outdoor plans
- Location extraction from the user query
- Intent detection for different response modes
- Safety guard logic that blocks unsafe or unsupported requests
- Structured answers with sections such as summary, air, weather, water, and action
- Streaming output for incremental frontend rendering

AI provider behavior:
- Gemini is tried first where available
- Groq is used as the working AI fallback provider
- DeepSeek is available as another fallback
- If all providers fail, the system falls back to template-based responses

### 4. Dashboard

The dashboard is the main operations screen for location intelligence.

It includes:
- Advanced search with recent and ranked location suggestions
- Live safety snapshot for a selected city
- AQI gauge and key environmental metrics
- Personalized risk profile selection
- Personal risk card for health-aware interpretation
- Safety timeline for forecasting and trend visibility
- Voice briefing support for quick spoken summaries
- Monitored city workflows with local persistence
- Sorting and filtering for monitored locations
- Refreshable live snapshots for saved cities

### 5. Map View

The map page provides spatial context for environmental risk.

It includes:
- Google Maps integration
- Risk overlays and zone circles
- City markers and live snapshot data
- Sidebar / drawer layout for monitored cities
- Crowd report markers
- User presence markers
- Live activity ticker
- Toggleable zone visibility
- Mobile and desktop-friendly map controls

### 6. Alerts Page

The alerts page turns the current safety snapshot into actionable alerts.

It includes:
- Filterable alert feed
- Categories such as air, weather, pollen, UV, and water
- Severity-based visual styling
- Unread tracking using local storage
- Top notification summary
- Read / mark-as-read interaction flow

### 7. Water Quality Intelligence

The water module is a dedicated ML-driven experience for water safety analysis.

It includes:
- State selector with optional district / city refinement
- Drinkability prediction
- Confidence, probability, and sample metadata
- BIS IS 10500:2012 violation detection
- Year-over-year trend charts for key water parameters
- AI-generated contamination analysis
- Remediation guidance
- Parameter cards for pH, TDS, conductivity, nitrate, fluoride, arsenic, and more

### 8. Realtime and Cache Support

LifeCheck AI is not just a static API consumer. It includes infrastructure for repeated live updates.

It supports:
- Live city snapshot polling
- Realtime snapshot endpoint
- SpaceTimeDB cache integration
- Scheduler-driven warmup for monitored locations
- Monitored city state persistence in the frontend
- Cache-hit metadata for transparency

---

## Frontend Pages

- `/` Landing page with quick safety search and feature overview
- `/dashboard` Main environmental intelligence dashboard
- `/map` Map-based live risk visualization
- `/chat` AI assistant with location-aware guidance
- `/alerts` Environmental alerts, filters, and unread tracking
- `/water` Water quality prediction, trends, and AI analysis

---

## Backend API Surface

### Core Safety APIs
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

---

## Backend Architecture

The backend is built with FastAPI and organized into routes, services, models, and utility layers.

### Main service areas
- Safety and geolocation
- Alerts and history
- Realtime snapshot support
- AI chat generation and prompt building
- Water quality ML analysis
- Scheduler-based warmup and cache management

### External integrations
- Google Geocoding API
- Google Weather / Air Quality / Pollen APIs
- Gemini / Groq / DeepSeek AI providers
- SpaceTimeDB for short-lived cache and monitored state support
- Water quality ML model stored locally as a joblib artifact

---

## Frontend Architecture

The frontend is built with Next.js App Router, React, TypeScript, and Tailwind CSS.

### UI/UX patterns used across the app
- Glassmorphism cards and panels
- Animated transitions
- Loading cards and skeleton-style states
- Responsive mobile / desktop layouts
- Location-aware search and selection
- Persistent local state for monitored items
- Real-time data polling and refresh flows

### Shared frontend building blocks
- Safety context and safety data hooks
- Search bar with ranked suggestions and recent searches
- Chat streaming components
- Realtime user presence and crowd reporting components
- Water-specific charts and display cards
- Personalized risk cards and timeline components

---

## Water Module Details

The water module currently supports:

- State selection from available water-quality data
- Optional district / city matching
- ML prediction for drinkability
- Confidence and class probabilities
- BIS compliance checks
- Parameter-by-parameter display
- Historical trends
- AI analysis of contamination and remediation
- Model performance metrics

This module is designed as a separate analytical surface, not just a generic form.

---

## AI Behavior Notes

### Chat provider behavior
- Gemini is used where available
- Groq currently acts as the working AI provider
- DeepSeek is a fallback provider
- If all providers fail, template fallback is used

### Safety behavior
- Unsafe or unsupported prompts can be blocked
- The assistant prioritizes environmental safety guidance
- Critical conditions can override normal generation

### Output style
The assistant returns structured, sectioned responses to keep answers readable and consistent.

---

## Setup

### 1. Backend

```powershell
cd lifecheckai/backend
python -m venv venv
./venv/Scripts/activate
pip install -r requirements.txt
```

Create `lifecheckai/backend/.env`:

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

### 2. Frontend

```powershell
cd ../frontend
npm install
```

Create `lifecheckai/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_BROWSER_MAPS_KEY
```

### 3. Optional Realtime Cache

If you are using SpaceTimeDB:

```powershell
cd ../../lifecheck-sbt/server
spacetime login
spacetime publish YOUR_DB_NAME -y
```

---

## Run the App

From the workspace root:

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
- Frontend: http://localhost:3000

---

## Quick Verification

```powershell
curl http://127.0.0.1:8000/health
curl "http://127.0.0.1:8000/api/check-safety?city=Delhi"
curl "http://127.0.0.1:8000/api/location-suggestions?q=maha&limit=8"
curl http://127.0.0.1:8000/api/cities/live
curl "http://127.0.0.1:8000/api/ask?query=How%20safe%20is%20Delhi%20today"
curl "http://127.0.0.1:8000/api/water/predict?state=Maharashtra"
```

---

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

---

## Operational Notes

- Google APIs must be enabled for full live geocoding, air quality, weather, and pollen coverage.
- Pollen coverage may be sparse for some locations.
- Without valid API keys, some features can fall back to limited or cached behavior.
- Do not commit secret values to the repository.

---

## Version

This README reflects the implemented feature set available in April 2026.

