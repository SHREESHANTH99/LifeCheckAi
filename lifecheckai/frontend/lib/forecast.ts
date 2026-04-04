import type { SafetyData } from "@/types";

export interface ForecastHour {
  hour: number;
  label: string;
  aqi: number;
  temperature: number;
  condition: string;
  riskLevel: "safe" | "caution" | "unsafe";
  verdict: "SAFE" | "CAUTION" | "UNSAFE";
  advice: string;
  bestWindow?: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function riskFromAqi(aqi: number): "SAFE" | "CAUTION" | "UNSAFE" {
  if (aqi <= 50) return "SAFE";
  if (aqi <= 100) return "CAUTION";
  return "UNSAFE";
}

function nowLabel(offset: number) {
  return offset === 0 ? "Now" : `+${offset}h`;
}

function temperatureAtHour(baseTemp: number, hourOffset: number): number {
  const date = new Date();
  const hour = (date.getHours() + hourOffset) % 24;
  const dayCurve = Math.sin(((hour - 4) / 24) * Math.PI * 2);
  return clamp(baseTemp + dayCurve * 4, -5, 52);
}

function aqiAtHour(baseAqi: number, hourOffset: number): number {
  const date = new Date();
  const hour = (date.getHours() + hourOffset) % 24;
  let factor = 1;
  if (hour >= 6 && hour <= 12) factor = 1.08;
  else if (hour > 12 && hour <= 16) factor = 1.14;
  else if (hour > 16 && hour <= 20) factor = 1.02;
  else factor = 0.92;

  const noise = 1 + (Math.random() * 0.1 - 0.05);
  return Math.round(clamp(baseAqi * factor * noise, baseAqi * 0.6, baseAqi * 1.4));
}

export function generateForecast(currentData: SafetyData): ForecastHour[] {
  const baseAqi = currentData.air_quality?.aqi ?? 80;
  const baseTemp = currentData.weather?.temp_celsius ?? 28;

  const result: ForecastHour[] = Array.from({ length: 7 }).map((_, offset) => {
    const aqi = aqiAtHour(baseAqi, offset);
    const temperature = Number(temperatureAtHour(baseTemp, offset).toFixed(1));
    const verdict = riskFromAqi(aqi);
    const riskLevel = verdict.toLowerCase() as ForecastHour["riskLevel"];

    return {
      hour: offset,
      label: nowLabel(offset),
      aqi,
      temperature,
      condition: currentData.weather?.condition || "Mixed conditions",
      riskLevel,
      verdict,
      advice:
        verdict === "SAFE"
          ? "Good window for outdoor tasks."
          : verdict === "CAUTION"
          ? "Limit prolonged outdoor exposure."
          : "Avoid unnecessary outdoor activity.",
    };
  });

  const best = getBestWindow(result);
  return result.map((entry) => ({ ...entry, bestWindow: entry.hour === best.hour }));
}

export function getBestWindow(forecast: ForecastHour[]): ForecastHour {
  return [...forecast].sort((a, b) => {
    const score = (item: ForecastHour) => {
      const risk = item.verdict === "SAFE" ? 1 : item.verdict === "CAUTION" ? 2 : 3;
      return risk * 100 + item.aqi;
    };
    return score(a) - score(b);
  })[0];
}

export function getTrendSummary(forecast: ForecastHour[]): string {
  if (forecast.length < 2) return "Forecast is stabilizing.";
  const first = forecast[0].aqi;
  const last = forecast[forecast.length - 1].aqi;
  if (last < first - 8) return "Air quality improving over next hours.";
  if (last > first + 8) return "Conditions deteriorating. Best time to go out is earlier.";
  return "Conditions expected to remain stable.";
}
