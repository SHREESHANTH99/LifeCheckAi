export interface Coordinates {
  lat: number;
  lon: number;
}

export interface SafetyResult {
  level: string;
  safe: boolean | null;
  advice: string;
}

export interface AirQuality {
  aqi: number;
  category: string;
  dominant_pollutant: string;
  pollutants: Record<string, { value: number; units: string }>;
  level: string;
  safe: boolean;
  advice: string;
}

export interface Weather {
  temp_celsius: number;
  feels_like: number;
  humidity_percent: number;
  condition: string;
  uv_index: number;
  wind_speed: number;
  level: string;
  safe: boolean;
  advice: string;
}

export interface Pollen {
  types: Record<string, { level: number; category: string }>;
  level: string;
  advice: string;
}

export interface Overall {
  verdict: "SAFE" | "CAUTION" | "UNSAFE";
  color: "green" | "yellow" | "red";
  summary: string;
}

export interface SafetyData {
  city: string;
  formatted_address: string;
  coordinates: Coordinates;
  overall: Overall;
  air_quality: AirQuality;
  weather: Weather;
  pollen: Pollen;
  source: "live" | "realtime_cache";
  cache_hit: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
}

export interface AlertItem {
  id: string;
  city: string;
  category: "air" | "weather" | "pollen" | "uv" | "water";
  severity: "SAFE" | "CAUTION" | "UNSAFE";
  title: string;
  description: string;
  timestamp: Date;
}
