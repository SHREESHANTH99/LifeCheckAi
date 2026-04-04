"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import { SearchBar } from "@/components/ui/SearchBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AQIGauge } from "@/components/ui/AQIGauge";
import { MetricCard } from "@/components/ui/MetricCard";
import { LoadingPulse } from "@/components/ui/LoadingPulse";
import {
  Wind,
  Thermometer,
  Flower2,
  Sun,
  Droplets,
  CloudRain,
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Plus,
  Trash2,
  Radar,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { INDIAN_STATE_NAMES } from "@/lib/indiaLocations";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
const MONITORED_CITIES_KEY = "lifecheck_monitored_cities";
const QUICK_CITY_OPTIONS = INDIAN_STATE_NAMES;

type MonitoredStatusFilter = "ALL" | "SAFE" | "CAUTION" | "UNSAFE";
type MonitoredSortMode = "risk" | "aqi" | "name";

interface MonitoredCitySnapshot {
  city: string;
  verdict: "SAFE" | "CAUTION" | "UNSAFE" | "UNKNOWN";
  summary: string;
  aqi: number | null;
  temp: number | null;
  humidity: number | null;
  source: string;
  updatedAt: number;
}

interface LocationSuggestionResponse {
  suggestions?: Array<{
    city?: string;
    formatted_address?: string;
  }>;
}

function formatTime(date: Date | null): string {
  if (!date) return "—";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function getStatusColor(verdict: string | undefined): "safe" | "caution" | "unsafe" | "unknown" {
  if (!verdict) return "unknown";
  const v = verdict.toUpperCase();
  if (v === "SAFE") return "safe";
  if (v === "CAUTION") return "caution";
  if (v === "UNSAFE") return "unsafe";
  return "unknown";
}

function getUVLabel(uv: number | undefined): string {
  if (!uv) return "N/A";
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

function getPollenColor(category: string | undefined): string {
  if (!category) return "text-text-muted";
  const c = category.toLowerCase();
  if (c === "low" || c === "none") return "text-safe";
  if (c === "moderate" || c === "medium") return "text-caution";
  if (c === "high") return "text-accent-orange";
  return "text-unsafe";
}

function getPollenRingColor(category: string | undefined): string {
  if (!category) return "border-text-muted";
  const c = category.toLowerCase();
  if (c === "low" || c === "none") return "border-safe";
  if (c === "moderate" || c === "medium") return "border-caution";
  if (c === "high") return "border-accent-orange";
  return "border-unsafe";
}

function normalizeCityName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function getRiskScore(snapshot: MonitoredCitySnapshot): number {
  const verdictWeight: Record<MonitoredCitySnapshot["verdict"], number> = {
    SAFE: 10,
    CAUTION: 50,
    UNSAFE: 85,
    UNKNOWN: 5,
  };

  const aqiPenalty = snapshot.aqi != null ? Math.min(snapshot.aqi / 3, 40) : 0;
  return verdictWeight[snapshot.verdict] + aqiPenalty;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

import { Suspense } from "react";

function DashboardPageContent() {
  const { data, loading, error, city, search, refresh, lastUpdated, locateMe } = useSafetyData();
  const searchParams = useSearchParams();
  const [monitoredCities, setMonitoredCities] = useState<string[]>([]);
  const [monitoredData, setMonitoredData] = useState<Record<string, MonitoredCitySnapshot>>({});
  const [monitoredLoading, setMonitoredLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MonitoredStatusFilter>("ALL");
  const [sortMode, setSortMode] = useState<MonitoredSortMode>("risk");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MONITORED_CITIES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setMonitoredCities(
          parsed
            .map((item) => (typeof item === "string" ? normalizeCityName(item) : ""))
            .filter(Boolean),
        );
      }
    } catch {
      // Ignore malformed monitored city state in localStorage.
    }
  }, []);

  useEffect(() => {
    if (!data?.city || monitoredCities.length > 0) return;
    setMonitoredCities([normalizeCityName(data.city)]);
  }, [data?.city, monitoredCities.length]);

  useEffect(() => {
    if (monitoredCities.length === 0) return;
    localStorage.setItem(MONITORED_CITIES_KEY, JSON.stringify(monitoredCities));
  }, [monitoredCities]);

  const fetchMonitoredCity = useCallback(async (cityName: string): Promise<MonitoredCitySnapshot> => {
    const response = await fetch(`${API_BASE}/api/check-safety?city=${encodeURIComponent(cityName)}`);
    if (!response.ok) {
      throw new Error(`Unable to refresh ${cityName}`);
    }

    const payload = await response.json();
    const air = payload.air_quality ?? payload.air ?? {};
    const weather = payload.weather ?? {};
    return {
      city: payload.city || cityName,
      verdict: payload.overall?.verdict || "UNKNOWN",
      summary: payload.overall?.summary || "No summary available.",
      aqi: typeof air?.aqi === "number" ? air.aqi : null,
      temp:
        typeof weather?.temp_celsius === "number"
          ? weather.temp_celsius
          : typeof weather?.temp === "number"
            ? weather.temp
            : null,
      humidity:
        typeof weather?.humidity_percent === "number"
          ? weather.humidity_percent
          : typeof weather?.humidity === "number"
            ? weather.humidity
            : null,
      source: payload.source || "live",
      updatedAt: Date.now(),
    };
  }, []);

  const refreshMonitoredCities = useCallback(
    async (cityList: string[]) => {
      if (cityList.length === 0) return;
      setMonitoredLoading(true);
      try {
        const results = await Promise.all(
          cityList.map(async (entry) => {
            try {
              return await fetchMonitoredCity(entry);
            } catch {
              return {
                city: entry,
                verdict: "UNKNOWN",
                summary: "Latest city snapshot is unavailable right now.",
                aqi: null,
                temp: null,
                humidity: null,
                source: "cache",
                updatedAt: Date.now(),
              } as MonitoredCitySnapshot;
            }
          }),
        );

        const nextMap = results.reduce<Record<string, MonitoredCitySnapshot>>((acc, item) => {
          acc[item.city] = item;
          return acc;
        }, {});
        setMonitoredData(nextMap);
      } finally {
        setMonitoredLoading(false);
      }
    },
    [fetchMonitoredCity],
  );

  useEffect(() => {
    refreshMonitoredCities(monitoredCities);
  }, [monitoredCities, refreshMonitoredCities]);

  const addMonitoredCity = useCallback(
    (inputCity: string) => {
      const normalized = normalizeCityName(inputCity);
      if (!normalized) return;
      setMonitoredCities((prev) => {
        if (prev.some((entry) => entry.toLowerCase() === normalized.toLowerCase())) {
          return prev;
        }
        return [normalized, ...prev].slice(0, 8);
      });
    },
    [],
  );

  const removeMonitoredCity = useCallback((cityName: string) => {
    setMonitoredCities((prev) => prev.filter((entry) => entry.toLowerCase() !== cityName.toLowerCase()));
    setMonitoredData((prev) => {
      const next = { ...prev };
      delete next[cityName];
      return next;
    });
  }, []);

  const monitoredEntries = useMemo(() => {
    const available = monitoredCities.reduce<MonitoredCitySnapshot[]>((acc, cityName) => {
      const snapshot = monitoredData[cityName] || monitoredData[cityName.trim()];
      if (snapshot) acc.push(snapshot);
      return acc;
    }, []);

    const filtered =
      statusFilter === "ALL" ? available : available.filter((item) => item.verdict === statusFilter);

    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "name") {
        return a.city.localeCompare(b.city);
      }
      if (sortMode === "aqi") {
        return (b.aqi ?? -1) - (a.aqi ?? -1);
      }
      return getRiskScore(b) - getRiskScore(a);
    });

    return sorted;
  }, [monitoredCities, monitoredData, statusFilter, sortMode]);

  const monitoredSummary = useMemo(() => {
    const all = Object.values(monitoredData);
    const unsafeCount = all.filter((item) => item.verdict === "UNSAFE").length;
    const cautionCount = all.filter((item) => item.verdict === "CAUTION").length;
    const topRisk = [...all].sort((a, b) => getRiskScore(b) - getRiskScore(a))[0];
    return { total: all.length, unsafeCount, cautionCount, topRisk };
  }, [monitoredData]);

  const smartQuickCities = useMemo(() => {
    const merged = [...monitoredCities, ...QUICK_CITY_OPTIONS];
    return merged.filter((cityName, index) => merged.findIndex((x) => x.toLowerCase() === cityName.toLowerCase()) === index);
  }, [monitoredCities]);

  const fetchLocationSuggestions = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) return [];

      const response = await fetch(
        `${API_BASE}/api/location-suggestions?q=${encodeURIComponent(query)}&limit=8`,
      );
      if (!response.ok) return [];

      const payload = (await response.json()) as LocationSuggestionResponse;
      const suggestions = payload.suggestions || [];
      return suggestions
        .map((entry) => {
          const value = entry.city || entry.formatted_address || "";
          if (!value) return null;
          return {
            value,
            subtitle:
              entry.formatted_address && entry.formatted_address !== value
                ? entry.formatted_address
                : undefined,
          };
        })
        .filter((entry): entry is { value: string; subtitle?: string } => !!entry);
    },
    [],
  );

  // Auto-search if city query param is present
  useEffect(() => {
    const cityParam = searchParams.get("city");
    if (cityParam && cityParam !== city) {
      search(cityParam);
    }
  }, [searchParams, city, search]);

  const overallStatus = getStatusColor(data?.overall?.verdict);

  // Error state
  if (error && !data) {
    return (
      <div className="min-h-screen px-4 sm:px-8 lg:px-16 py-8">
        <div className="max-w-2xl mx-auto mt-8">
          <SearchBar
            onSearch={search}
            onUseCurrentLocation={locateMe}
            placeholder="Search any city..."
            isLoading={loading}
            isLocating={loading}
            quickCities={smartQuickCities}
            fetchSuggestions={fetchLocationSuggestions}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card border-unsafe/30 mt-8 text-center py-12"
          >
            <AlertTriangle size={48} className="text-unsafe mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text-primary mb-2">Error</h3>
            <p className="text-text-secondary mb-6">{error}</p>
            <button
              onClick={refresh}
              className="px-6 py-3 rounded-full bg-accent-blue text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              Try Again
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Empty state (no city searched yet)
  if (!data && !loading) {
    return (
      <div className="min-h-screen px-4 sm:px-8 lg:px-16 py-8">
        <div className="max-w-2xl mx-auto mt-8">
          <SearchBar
            onSearch={search}
            onUseCurrentLocation={locateMe}
            placeholder="Enter a city to check safety conditions..."
            isLoading={loading}
            isLocating={loading}
            quickCities={smartQuickCities}
            fetchSuggestions={fetchLocationSuggestions}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card mt-8 text-center py-16"
          >
            <Wind size={48} className="text-text-muted mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text-primary mb-2">Search a City</h3>
            <p className="text-text-secondary">
              Enter any city name above to view real-time safety conditions.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Sticky search bar */}
      <div className="sticky top-16 z-30 bg-bg-secondary/90 backdrop-blur-md border-b border-border-default px-4 sm:px-8 lg:px-16 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <SearchBar
              onSearch={search}
              onUseCurrentLocation={locateMe}
              placeholder="Search another city..."
              isLoading={loading}
              isLocating={loading}
              quickCities={smartQuickCities}
              fetchSuggestions={fetchLocationSuggestions}
            />
          </div>
          {data && (
            <div className="flex items-center gap-3 text-sm shrink-0">
              <span className="text-text-primary font-semibold">{data.city}</span>
              <span className="text-text-muted">·</span>
              <span className="text-text-muted">Updated {formatTime(lastUpdated)}</span>
              <button
                onClick={refresh}
                className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && <LoadingPulse inline text="Fetching safety data..." />}

      {data && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-8 flex flex-col gap-6"
        >
          {/* Overall Safety Banner */}
          <motion.div
            variants={itemVariants}
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border ${
              overallStatus === "safe"
                ? "border-safe/30 bg-safe/5"
                : overallStatus === "caution"
                ? "border-caution/30 bg-caution/5"
                : overallStatus === "unsafe"
                ? "border-unsafe/30 bg-unsafe/5"
                : "border-border-default bg-bg-card"
            }`}
          >
            <div className="flex items-center gap-3">
              {overallStatus === "safe" && <CheckCircle size={24} className="text-safe" />}
              {overallStatus === "caution" && <AlertTriangle size={24} className="text-caution" />}
              {overallStatus === "unsafe" && <XCircle size={24} className="text-unsafe" />}
              {overallStatus === "unknown" && <AlertTriangle size={24} className="text-text-muted" />}
              <span className="text-text-primary font-medium">
                {data.overall?.summary || "Conditions are being evaluated"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={data.overall?.verdict || "UNKNOWN"} />
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-safe" />
                </span>
                <span className="text-xs text-text-muted">Updated live</span>
              </div>
            </div>
          </motion.div>

          {/* Location Intelligence */}
          <motion.div variants={itemVariants} className="card">
            <h3 className="font-family-grotesk text-lg font-semibold text-text-primary mb-4">
              Location Intelligence
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border-default bg-bg-secondary/50">
                <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Resolved Address</p>
                <p className="text-sm text-text-primary">{data.formatted_address || data.city}</p>
              </div>
              <div className="p-4 rounded-xl border border-border-default bg-bg-secondary/50">
                <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Coordinates</p>
                <p className="text-sm text-text-primary font-family-mono">
                  {data.coordinates?.lat?.toFixed?.(4) ?? "--"}, {data.coordinates?.lon?.toFixed?.(4) ?? "--"}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border-default bg-bg-secondary/50">
                <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Geocoding Confidence</p>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-text-primary capitalize">{data.geocoding?.match || "standard"}</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {typeof data.geocoding?.confidence === "number"
                      ? `${Math.round(data.geocoding.confidence * 100)}%`
                      : "--"}
                  </p>
                </div>
                <div className="w-full h-1.5 rounded-full bg-border-default overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-blue"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.max(8, Math.round((data.geocoding?.confidence ?? 0.5) * 100))}%`,
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Source: {data.geocoding?.source || data.source || "live"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Monitored Cities */}
          <motion.div variants={itemVariants} className="card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div>
                <h3 className="font-family-grotesk text-lg font-semibold text-text-primary flex items-center gap-2">
                  <Radar size={18} className="text-accent-cyan" />
                  Monitored Cities
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  Track multiple city risk profiles and prioritize interventions faster.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => data?.city && addMonitoredCity(data.city)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border-default bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  Add Current City
                </button>
                <button
                  onClick={() => refreshMonitoredCities(monitoredCities)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border-default bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <RefreshCw size={14} className={monitoredLoading ? "animate-spin" : ""} />
                  Refresh All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="p-3 rounded-xl border border-border-default bg-bg-secondary/50">
                <p className="text-xs uppercase tracking-wide text-text-muted">Tracked</p>
                <p className="text-2xl font-family-mono font-bold text-text-primary mt-1">
                  {monitoredSummary.total}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-border-default bg-bg-secondary/50">
                <p className="text-xs uppercase tracking-wide text-text-muted">At Risk</p>
                <p className="text-2xl font-family-mono font-bold text-unsafe mt-1">
                  {monitoredSummary.unsafeCount}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-border-default bg-bg-secondary/50">
                <p className="text-xs uppercase tracking-wide text-text-muted">Watchlist</p>
                <p className="text-2xl font-family-mono font-bold text-caution mt-1">
                  {monitoredSummary.cautionCount}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} className="text-text-muted" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as MonitoredStatusFilter)}
                  className="px-3 py-2 rounded-lg border border-border-default bg-bg-secondary text-sm text-text-primary outline-none"
                >
                  <option value="ALL">All statuses</option>
                  <option value="UNSAFE">Unsafe only</option>
                  <option value="CAUTION">Caution only</option>
                  <option value="SAFE">Safe only</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-text-muted" />
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as MonitoredSortMode)}
                  className="px-3 py-2 rounded-lg border border-border-default bg-bg-secondary text-sm text-text-primary outline-none"
                >
                  <option value="risk">Sort by risk</option>
                  <option value="aqi">Sort by AQI</option>
                  <option value="name">Sort by name</option>
                </select>
              </div>
            </div>

            {monitoredSummary.topRisk && (
              <div className="mb-4 p-3 rounded-xl border border-unsafe/25 bg-unsafe/5">
                <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Highest Priority</p>
                <p className="text-sm text-text-primary">
                  <span className="font-semibold">{monitoredSummary.topRisk.city}</span>
                  {" "}requires attention. Risk score: {Math.round(getRiskScore(monitoredSummary.topRisk))}
                </p>
              </div>
            )}

            {monitoredEntries.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border-default text-center">
                <p className="text-sm text-text-secondary">
                  No monitored city matches the current filter. Add your current city to start tracking.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {monitoredEntries.map((entry) => (
                  <div key={entry.city} className="p-4 rounded-xl border border-border-default bg-bg-secondary/50">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{entry.city}</p>
                        <p className="text-xs text-text-muted">Updated {formatTime(new Date(entry.updatedAt))}</p>
                      </div>
                      <StatusBadge status={entry.verdict} />
                    </div>
                    <p className="text-sm text-text-secondary min-h-[42px]">{entry.summary}</p>
                    <div className="grid grid-cols-3 gap-2 mt-3 mb-4">
                      <div className="p-2 rounded-lg border border-border-default text-center">
                        <p className="text-[10px] uppercase tracking-wide text-text-muted">AQI</p>
                        <p className="text-sm font-family-mono font-semibold text-text-primary">
                          {entry.aqi ?? "—"}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg border border-border-default text-center">
                        <p className="text-[10px] uppercase tracking-wide text-text-muted">Temp</p>
                        <p className="text-sm font-family-mono font-semibold text-text-primary">
                          {entry.temp != null ? `${Math.round(entry.temp)}°` : "—"}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg border border-border-default text-center">
                        <p className="text-[10px] uppercase tracking-wide text-text-muted">Humidity</p>
                        <p className="text-sm font-family-mono font-semibold text-text-primary">
                          {entry.humidity != null ? `${Math.round(entry.humidity)}%` : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => search(entry.city)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-default text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <MapPin size={12} /> Open
                      </button>
                      <button
                        onClick={() => refreshMonitoredCities([entry.city])}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-default text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <RefreshCw size={12} /> Refresh
                      </button>
                      <button
                        onClick={() => removeMonitoredCity(entry.city)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-unsafe/40 text-xs text-unsafe hover:bg-unsafe/10 transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                    <p className="text-[11px] text-text-muted mt-3">Source: {entry.source}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* 4-Metric Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<Wind size={20} />}
              label="Air Quality Index"
              value={data.air_quality?.aqi ?? "—"}
              status={
                (data.air_quality?.aqi ?? 999) <= 50 ? "safe" : (data.air_quality?.aqi ?? 999) <= 100 ? "caution" : "unsafe"
              }
              sublabel={data.air_quality?.category || ""}
            />
            <MetricCard
              icon={<Thermometer size={20} />}
              label="Temperature"
              value={data.weather?.temp_celsius != null ? `${Math.round(data.weather.temp_celsius)}` : "—"}
              unit="°C"
              status={
                !data.weather?.temp_celsius
                  ? "unknown"
                  : data.weather.temp_celsius > 40 || data.weather.temp_celsius < 5
                  ? "unsafe"
                  : data.weather.temp_celsius > 35 || data.weather.temp_celsius < 10
                  ? "caution"
                  : "safe"
              }
              sublabel={data.weather?.feels_like != null ? `Feels like ${Math.round(data.weather.feels_like)}°C` : ""}
            />
            <MetricCard
              icon={<Flower2 size={20} />}
              label="Pollen"
              value={data.pollen?.level || "—"}
              status={
                data.pollen?.level?.toLowerCase() === "low"
                  ? "safe"
                  : data.pollen?.level?.toLowerCase() === "moderate"
                  ? "caution"
                  : data.pollen?.level?.toLowerCase() === "high"
                  ? "unsafe"
                  : "unknown"
              }
              sublabel={data.pollen?.advice || ""}
            />
            <MetricCard
              icon={<Sun size={20} />}
              label="UV Index"
              value={data.weather?.uv_index ?? "—"}
              status={
                !data.weather?.uv_index
                  ? "unknown"
                  : data.weather.uv_index <= 2
                  ? "safe"
                  : data.weather.uv_index <= 5
                  ? "caution"
                  : "unsafe"
              }
              sublabel={getUVLabel(data.weather?.uv_index)}
            />
          </motion.div>

          {/* AQI Detail + Weather Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* AQI Detail Panel */}
            <motion.div variants={itemVariants} className="lg:col-span-3 card">
              <h3 className="font-family-grotesk text-lg font-semibold text-text-primary mb-6">
                Air Quality Details
              </h3>
              <div className="flex flex-col items-center mb-6">
                <AQIGauge aqi={data.air_quality?.aqi ?? 0} size="lg" />
              </div>

              {/* Pollutants grid */}
              {data.air_quality?.pollutants && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {Object.entries(data.air_quality.pollutants).map(([name, info]) => {
                    const safeThresholds: Record<string, number> = {
                      "pm2.5": 35,
                      pm10: 150,
                      no2: 100,
                      o3: 100,
                      co: 9000,
                      so2: 75,
                    };
                    const threshold = safeThresholds[name.toLowerCase()] || 100;
                    const pct = Math.min((info.value / threshold) * 100, 100);
                    const barColor =
                      pct < 50 ? "bg-safe" : pct < 75 ? "bg-caution" : "bg-unsafe";

                    return (
                      <div key={name} className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary uppercase text-xs font-medium tracking-wide">
                            {name}
                          </span>
                          <span className="text-text-primary font-family-mono text-xs">
                            {info.value} {info.units}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-border-default overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${barColor}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {data.air_quality?.dominant_pollutant && (
                <div className="mt-6 p-4 rounded-xl bg-bg-secondary border border-border-default">
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
                    Dominant Pollutant
                  </p>
                  <p className="text-sm text-text-primary font-semibold">
                    {data.air_quality.dominant_pollutant}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Weather Detail Panel */}
            <motion.div variants={itemVariants} className="lg:col-span-2 card">
              <h3 className="font-family-grotesk text-lg font-semibold text-text-primary mb-6">
                Weather Conditions
              </h3>

              <div className="flex items-center gap-4 mb-6">
                <div className="text-4xl font-bold font-family-mono text-text-primary">
                  {data.weather?.temp_celsius != null ? `${Math.round(data.weather.temp_celsius)}°C` : "—"}
                </div>
                <CloudRain size={36} className="text-accent-blue" />
              </div>

              <div className="flex flex-col gap-4">
                {[
                  { label: "Humidity", value: data.weather?.humidity_percent != null ? `${data.weather.humidity_percent}%` : "—", icon: <Droplets size={16} className="text-accent-cyan" /> },
                  { label: "Wind Speed", value: data.weather?.wind_speed != null ? `${data.weather.wind_speed} km/h` : "—", icon: <Wind size={16} className="text-text-secondary" /> },
                  { label: "UV Index", value: data.weather?.uv_index != null ? `${data.weather.uv_index} (${getUVLabel(data.weather.uv_index)})` : "—", icon: <Sun size={16} className="text-accent-yellow" /> },
                  { label: "Feels Like", value: data.weather?.feels_like != null ? `${Math.round(data.weather.feels_like)}°C` : "—", icon: <Thermometer size={16} className="text-accent-orange" /> },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between pb-3 border-b border-border-default last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      {item.icon}
                      <span className="text-sm text-text-secondary">{item.label}</span>
                    </div>
                    <span className="text-sm text-text-primary font-medium">{item.value}</span>
                  </div>
                ))}
              </div>

              {data.weather?.advice && (
                <div className={`mt-6 p-4 rounded-xl border ${
                  data.weather.safe ? "bg-safe/5 border-safe/20" : "bg-unsafe/5 border-unsafe/20"
                }`}>
                  <p className="text-sm text-text-primary">{data.weather.advice}</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Pollen Breakdown */}
          {data.pollen?.types && (
            <motion.div variants={itemVariants} className="card">
              <h3 className="font-family-grotesk text-lg font-semibold text-text-primary mb-6">
                Pollen Forecast
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {Object.entries(data.pollen.types).map(([type, info]) => {
                  if (!info || typeof info !== "object") {
                    return null;
                  }

                  const pollenInfo = info as { level?: number | string; category?: string };
                  const category = typeof pollenInfo.category === "string" ? pollenInfo.category : undefined;
                  const level =
                    typeof pollenInfo.level === "number" || typeof pollenInfo.level === "string"
                      ? pollenInfo.level
                      : "—";

                  return (
                    <div key={type} className="flex flex-col items-center text-center">
                      <div className={`w-20 h-20 rounded-full border-4 ${getPollenRingColor(category)} flex items-center justify-center mb-3`}>
                        <span className={`text-2xl font-bold font-family-mono ${getPollenColor(category)}`}>
                          {level}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-text-primary capitalize mb-1">{type}</h4>
                      <p className={`text-xs font-medium ${getPollenColor(category)}`}>
                        {category || "Unknown"}
                      </p>
                    </div>
                  );
                })}
              </div>
              {data.pollen.advice && (
                <p className="text-sm text-text-secondary mt-6 text-center">{data.pollen.advice}</p>
              )}
            </motion.div>
          )}

          {/* AI Recommendation Banner */}
          <motion.div
            variants={itemVariants}
            className="card bg-accent-purple/5 border-accent-purple/20"
          >
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent-purple/15 flex items-center justify-center shrink-0">
                <Sparkles size={24} className="text-accent-purple" />
              </div>
              <div className="flex-1">
                <h3 className="font-family-grotesk text-lg font-semibold text-text-primary mb-2">
                  AI Safety Recommendation
                </h3>
                <p className="text-sm text-text-secondary italic leading-relaxed">
                  {data.overall?.summary || "Based on current conditions, please check individual metrics for detailed advice."}
                </p>
              </div>
              <Link
                href="/chat"
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent-purple/15 text-accent-purple text-sm font-medium hover:bg-accent-purple/25 transition-colors"
              >
                Ask Follow-up <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingPulse inline text="Loading dashboard..." />}>
      <DashboardPageContent />
    </Suspense>
  );
}
