import type {
  WaterModelMetrics,
  WaterNearbyResponse,
  WaterPrediction,
  WaterStatesResponse,
  WaterStationsResponse,
  WaterTrends,
} from "@/types/water";

export const WATER_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export const WATER_PARAMETER_META: Record<
  string,
  { label: string; unit: string; accent: string }
> = {
  temperature: { label: "Temperature", unit: "C", accent: "#f59e0b" },
  ph: { label: "pH", unit: "", accent: "#22c55e" },
  conductivity: { label: "Conductivity", unit: "uS/cm", accent: "#38bdf8" },
  bod: { label: "BOD", unit: "mg/L", accent: "#f97316" },
  nitrate: { label: "Nitrate", unit: "mg/L", accent: "#eab308" },
  fecal_coliform: { label: "Fecal Coliform", unit: "MPN/100mL", accent: "#ef4444" },
  total_coliform: { label: "Total Coliform", unit: "MPN/100mL", accent: "#ec4899" },
  tds: { label: "TDS", unit: "mg/L", accent: "#4FA8C4" },
  fluoride: { label: "Fluoride", unit: "mg/L", accent: "#8b5cf6" },
  arsenic: { label: "Arsenic", unit: "mg/L", accent: "#a855f7" },
};

async function fetchJson<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, WATER_API_BASE);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchWaterStates(): Promise<WaterStatesResponse> {
  return fetchJson<WaterStatesResponse>("/api/water/states");
}

export function fetchWaterStations(state: string, query?: string): Promise<WaterStationsResponse> {
  return fetchJson<WaterStationsResponse>("/api/water/stations", {
    state,
    q: query,
  });
}

export function fetchWaterPrediction(args: {
  state: string;
  stationId?: string;
  location?: string;
}): Promise<WaterPrediction> {
  return fetchJson<WaterPrediction>("/api/water/predict", {
    state: args.state,
    station_id: args.stationId,
    location: args.location,
  });
}

export function fetchWaterTrends(args: {
  state: string;
  stationId?: string;
  location?: string;
}): Promise<WaterTrends> {
  return fetchJson<WaterTrends>("/api/water/trends", {
    state: args.state,
    station_id: args.stationId,
    location: args.location,
  });
}

export function fetchWaterNearby(lat: number, lon: number): Promise<WaterNearbyResponse> {
  return fetchJson<WaterNearbyResponse>("/api/water/nearby", { lat, lon });
}

export function fetchWaterModelMetrics(): Promise<WaterModelMetrics> {
  return fetchJson<WaterModelMetrics>("/api/water/model-metrics");
}

export function formatWaterValue(param: string, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "No data";
  }

  if (param === "ph") return value.toFixed(2);
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function trendTone(direction: "up" | "down" | "stable"): string {
  if (direction === "up") return "text-danger";
  if (direction === "down") return "text-safe";
  return "text-text-secondary";
}
