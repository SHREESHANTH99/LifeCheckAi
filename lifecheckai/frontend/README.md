# LifeCheck AI Frontend

Frontend application for LifeCheck AI, built with Next.js App Router.

## Implemented Features

### Core Pages

- /: Landing page with quick location safety entry.
- /dashboard: Safety intelligence dashboard with search, metrics, and monitored locations.
- /map: Risk overlays and monitored location controls on Google Maps.
- /chat: AI assistant interface with streaming-ready chat flow.
- /alerts: Alert feed with filtering and status views.
- /water: State-driven water ML predictions, trend charts, violations, and AI analysis.

### Shared Frontend Capabilities

- Location suggestion and recent-search workflow.
- Realtime polling and UI refresh patterns.
- Client-side state management for safety and chat context.
- Responsive layout system for desktop and mobile.
- Reusable UI components across dashboard, map, alerts, chat, and water modules.

### Water Component System

Reusable components are available under components/water:

- WaterStateMap
- WaterMetrics
- WaterComparison
- WaterChart
- WaterInfoCard
- WaterRecommendations

Water docs:

- ../../WATER_COMPONENTS_QUICK_START.md
- ../../WATER_COMPONENTS_SUMMARY.md
- ../../WATER_COMPONENTS_INTEGRATION_CHECKLIST.md
- ../../WATER_FEATURE_DOCUMENTATION.md
- components/water/README.md

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts + Chart.js
- Zustand
- Lucide React

## Environment Variables

Create .env.local in this folder:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_BROWSER_MAPS_KEY
```

## Local Development

From this folder:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Quality Checks

```bash
npm run lint
npm run build
```

## Important Notes

- The frontend expects the FastAPI backend to run on port 8000 by default.
- Map functionality requires a browser-enabled Google Maps key.
- Water and chat features require backend API availability for full functionality.

## Related Files

- ../README.md: Full stack repository guide.
- app/chat/page.tsx: Chat page entrypoint.
- hooks/useStreamingChat.ts: Streaming chat client logic.
- app/water/page.tsx: Water feature page.
