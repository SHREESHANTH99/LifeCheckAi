# LifeCheck AI

Real-time city safety assistant built with:

- FastAPI backend (Python)
- Next.js frontend (TypeScript)
- Google APIs (Geocoding, Weather, Air Quality, Pollen)
- SpaceTimeDB for short-lived realtime cache

This README is the full setup and runbook for teammates.

## Project Structure

```text
lifecheck-ai/
	lifecheckai/
		backend/
			.env
			requirements.txt
			app/
				main.py
				config.py
				routes/
				services/
				utils/
		frontend/
			package.json
			app/
	lifecheck-sbt/
		server/
			Cargo.toml
			src/lib.rs
```

## Prerequisites

- Python 3.11+ (project also runs on newer versions)
- Node.js 20+
- npm
- Rust toolchain (for SpaceTimeDB module publish)
- SpaceTimeDB CLI installed

Optional but recommended:

- VS Code
- `wasm-opt` (for optimized SpaceTimeDB module builds)

## One-Time Setup

### 1. Clone and open workspace

Use the `lifecheck-ai` workspace root as your terminal working directory.

### 2. Backend setup

```powershell
cd lifecheckai/backend
python -m venv venv
./venv/Scripts/activate
pip install -r requirements.txt
```

Create or update `backend/.env`:

```env
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
SPACETIMEDB_DB_NAME=YOUR_SPACETIMEDB_DB_NAME
```

Important:

- `app/config.py` loads `.env` from `backend/.env` explicitly.
- Do not commit real API keys.

### 3. Frontend setup

```powershell
cd ../frontend
npm install
```

### 4. SpaceTimeDB module setup

The SpaceTimeDB module lives in `lifecheck-sbt/server`.

```powershell
cd ../../lifecheck-sbt/server
spacetime login
spacetime publish YOUR_SPACETIMEDB_DB_NAME -y
```

After publish, copy the DB name into `backend/.env` as `SPACETIMEDB_DB_NAME`.

## Running the App

Open two terminals from workspace root (`lifecheck-ai`).

### Terminal A: Backend

```powershell
./lifecheckai/backend/venv/Scripts/python.exe -m uvicorn lifecheckai.backend.app.main:app --host 127.0.0.1 --port 8000
```

Backend URLs:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

### Terminal B: Frontend

```powershell
cd lifecheckai/frontend
npm run dev
```

Frontend URL:

- `http://localhost:3000`

## API Endpoints

### Health and basics

- `GET /` -> backend startup message
- `GET /health` -> service health
- `GET /test` -> basic route check

### Safety

- `GET /api/check-safety?city=Delhi`
	- Pulls data from Google APIs
	- Applies rule engine
	- Saves response to SpaceTimeDB cache
	- Returns `source: "live"` or `source: "realtime_cache"`

- `GET /api/cities/live`
	- Returns all non-expired cached city snapshots

### Realtime

- `GET /realtime/snapshot`
	- Snapshot for polling clients

## Frontend Data Flow

- `frontend/app/hooks/useSafetyData.ts` polls `/api/check-safety` every 60 seconds.
- `frontend/app/page.tsx` currently includes a basic backend connectivity view.

## SpaceTimeDB Details

### Module source

- `lifecheck-sbt/server/src/lib.rs`

### Current schema/reducer

- Table: `city_data`
- Reducer: `save_city_data(city, data, timestamp)`

### Backend integration mode

Backend uses SpaceTimeDB HTTP API:

- Base: `{SPACETIMEDB_HOST}/v1/database/{SPACETIMEDB_DB_NAME}`
- Write: `POST /call/save_city_data`
- Read: `POST /sql` with SQL text payload

Cache TTL is 5 minutes in `backend/app/services/db_service.py`.

## Verification Checklist

Run these after setup:

```powershell
curl http://127.0.0.1:8000/health
curl "http://127.0.0.1:8000/api/check-safety?city=Delhi"
curl http://127.0.0.1:8000/api/cities/live
```

Expected:

- Health returns status `ok`
- Safety returns JSON with `overall`, `air_quality`, `weather`, `pollen`
- Live cities returns at least one cached row after a safety call

## Known Limitations

- Google Pollen API coverage is location-dependent.
- Some regions may return pollen unavailable; backend degrades gracefully to:
	- `pollen.level = "Unknown"`
	- `pollen.types = null`
- This does not fail the entire safety response.

## Troubleshooting

### 1. `check-safety` returns 404 city not found

Likely geocoding/API key issue.

Check:

- Geocoding API enabled in Google Cloud
- Billing enabled
- Key restrictions allow backend server usage

### 2. `check-safety` returns 502 weather/air unavailable

Likely API enablement or quota issue.

Check:

- Weather API enabled
- Air Quality API enabled
- API key has permission and quota

### 3. SpaceTimeDB publish returns 403 collaborator error

You are logged in with an identity that does not own the target DB.

Fix:

```powershell
spacetime login show
spacetime list
spacetime publish YOUR_OWN_DB_NAME -y
```

Then update `SPACETIMEDB_DB_NAME` in backend `.env`.

### 4. SpaceTimeDB publish ABI/module errors

Ensure module uses current dependency and wasm crate type:

- `spacetimedb = { version = "2.1.0" }`
- `[lib] crate-type = ["cdylib"]`

### 5. Frontend build fails with Turbopack root/dist issues

Keep `frontend/next.config.ts` simple unless there is a strong need for custom Turbopack root.

## Development Notes for Teammates

- Keep backend logic modular:
	- `routes/` for API contracts
	- `services/` for external integrations
	- `utils/rules.py` for scoring rules
- Prefer adding tests for:
	- Rules (`air_safety`, `weather_safety`, `pollen_safety`, `overall_safety`)
	- Service adapters (mock Google/SpaceTimeDB HTTP responses)
- Rotate secrets immediately if a key is ever exposed.

## Quick Start (TL;DR)

```powershell
# Backend
./lifecheckai/backend/venv/Scripts/python.exe -m uvicorn lifecheckai.backend.app.main:app --host 127.0.0.1 --port 8000

# Frontend
cd lifecheckai/frontend
npm run dev
```

Open:

- `http://127.0.0.1:8000/docs`
- `http://localhost:3000`

