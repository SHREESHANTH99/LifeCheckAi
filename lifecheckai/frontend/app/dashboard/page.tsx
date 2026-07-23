"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import { SearchBar } from "@/components/ui/SearchBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AQIGauge } from "@/components/ui/AQIGauge";
import { Card } from "@/components/ui/Card";
import { LoadingPulse } from "@/components/ui/LoadingPulse";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import {
  HealthProfileSelector,
  type HealthProfile,
  type ProfileConfig,
  PROFILES,
} from "@/components/profile/HealthProfileSelector";
import { PersonalRiskCard } from "@/components/profile/PersonalRiskCard";
import { calculatePersonalizedRisk } from "@/lib/profileRisk";
import { SafetyTimeline } from "@/components/forecast/SafetyTimeline";
import { VoiceBriefingButton } from "@/components/voice/VoiceBriefingButton";
import { VoiceSettingsPanel } from "@/components/voice/VoiceSettingsPanel";
import { useSharedCityState } from "@/hooks/useSharedCityState";
import { useProactiveVoiceAlerts } from "@/hooks/useProactiveVoiceAlerts";
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
  Activity,
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
  pollenLevel: string;
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

function getAqiStatus(category: string | undefined): "safe" | "warning" | "danger" | "unknown" {
  if (!category) return "unknown";
  const cat = category.toLowerCase();
  if (cat.includes("good")) return "safe";
  if (cat.includes("moderate")) return "warning";
  if (cat.includes("unhealthy") || cat.includes("severe") || cat.includes("hazardous")) return "danger";
  return "unknown";
}

function getTempStatus(temp: number | undefined): "safe" | "warning" | "danger" | "unknown" {
  if (temp === undefined || temp === null) return "unknown";
  if (temp >= 40) return "danger";
  if (temp >= 35) return "warning";
  return "safe";
}

function getPollenStatus(category: string | undefined): "safe" | "warning" | "danger" | "unknown" {
  if (!category) return "unknown";
  const c = category.toLowerCase();
  if (c === "low" || c === "none") return "safe";
  if (c === "moderate" || c === "medium") return "warning";
  if (c === "high" || c === "very high") return "danger";
  return "unknown";
}

function getUvStatus(uv: number | undefined): "safe" | "warning" | "danger" | "unknown" {
  if (uv === undefined || uv === null) return "unknown";
  if (uv <= 2) return "safe";
  if (uv <= 5) return "warning";
  if (uv <= 7) return "danger";
  return "danger";
}

function normalizeCityName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function calculateUniversalSafetyScore(
  aqi: number | null | undefined, 
  temp: number | null | undefined, 
  pollenLevel: string | undefined
): number {
  const safeAqi = aqi ?? 100;
  const safeTemp = temp ?? 28;
  const pLevel = (pollenLevel || "").toLowerCase();
  const pollenPenalty = pLevel === "high" ? 15 : pLevel === "moderate" ? 8 : 0;
  const baseScore = 100 - safeAqi / 5;
  const heatPenalty = safeTemp > 40 ? 20 : safeTemp > 35 ? 10 : 0;
  return Math.max(0, Math.min(100, Math.round(baseScore - heatPenalty - pollenPenalty)));
}

function getStatusDotColor(status: string | undefined): string {
  if (status === "safe") return "bg-safe";
  if (status === "warning") return "bg-warning";
  if (status === "danger") return "bg-danger";
  return "bg-text-muted";
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
  const { watcherCount } = useSharedCityState(data?.city || city);
  const [monitoredCities, setMonitoredCities] = useState<string[]>([]);
  const [monitoredData, setMonitoredData] = useState<Record<string, MonitoredCitySnapshot>>({});
  const [monitoredLoading, setMonitoredLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MonitoredStatusFilter>("ALL");
  const [sortMode, setSortMode] = useState<MonitoredSortMode>("risk");

  // Trigger proactive voice alerts when safety verdict changes
  useProactiveVoiceAlerts(
    data?.city,
    data?.overall?.verdict,
    data?.air_quality?.aqi,
    data?.weather?.temp_celsius,
  );
  const [selectedProfile, setSelectedProfile] = useState<HealthProfile>("general");
  const [profileConfig, setProfileConfig] = useState<ProfileConfig>(PROFILES[0]);

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
      pollenLevel: payload.pollen?.level || "",
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
                pollenLevel: "",
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
      return calculateUniversalSafetyScore(a.aqi, a.temp, a.pollenLevel) - calculateUniversalSafetyScore(b.aqi, b.temp, b.pollenLevel);
    });

    return sorted;
  }, [monitoredCities, monitoredData, statusFilter, sortMode]);

  const monitoredSummary = useMemo(() => {
    const all = Object.values(monitoredData);
    const unsafeCount = all.filter((item) => item.verdict === "UNSAFE").length;
    const cautionCount = all.filter((item) => item.verdict === "CAUTION").length;
    const topRisk = [...all].sort((a, b) => calculateUniversalSafetyScore(a.aqi, a.temp, a.pollenLevel) - calculateUniversalSafetyScore(b.aqi, b.temp, b.pollenLevel))[0];
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
        .filter(Boolean) as Array<{ value: string; subtitle?: string }>;
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

  useEffect(() => {
    const onLocate = () => {
      locateMe();
    };
    const onRefresh = () => {
      refresh();
    };
    window.addEventListener("lifecheck:locate-me", onLocate);
    window.addEventListener("lifecheck:refresh", onRefresh);
    return () => {
      window.removeEventListener("lifecheck:locate-me", onLocate);
      window.removeEventListener("lifecheck:refresh", onRefresh);
    };
  }, [locateMe, refresh]);

  const overallStatus = getStatusColor(data?.overall?.verdict);

  const safetyScore = useMemo(() => {
    if (!data) return 0;
    return calculateUniversalSafetyScore(
      data.air_quality?.aqi,
      data.weather?.temp_celsius,
      data.pollen?.level
    );
  }, [data]);

  const personalRisk = useMemo(() => {
    if (!data) return null;
    return calculatePersonalizedRisk(data, profileConfig);
  }, [data, profileConfig]);

  useEffect(() => {
    if (!data) return;
    document.title = `${data.city} Safety Report — ${profileConfig.label} Profile`;
  }, [data, profileConfig.label]);

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
            className="mt-8"
          >
            <Card className="border-unsafe/30 text-center py-12">
              <AlertTriangle size={48} className="text-unsafe mx-auto mb-4" />
              <h3 className="h3-card mb-2">Error</h3>
              <p className="body-base mb-6">{error}</p>
              <button
                onClick={refresh}
                className="btn-primary"
              >
                Try Again
              </button>
            </Card>
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
            className="mt-8"
          >
            <Card className="text-center py-16">
              <Wind size={48} className="text-text-muted mx-auto mb-4" />
              <h3 className="h3-card mb-2">Search a City</h3>
              <p className="body-base">
                Enter any city name above to view real-time safety conditions.
              </p>
            </Card>
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
              <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-cyan/20 bg-accent-cyan/10 text-accent-cyan text-xs font-semibold uppercase tracking-wider">
                👥 {watcherCount} live
              </span>
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
          className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6"
        >
          <motion.div variants={itemVariants} className="card !p-0 overflow-hidden mb-2">
            <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border-default">
              <div className="flex-1 p-4 bg-bg-card">
                <HealthProfileSelector
                  onProfileChange={(profile, config) => {
                    setSelectedProfile(profile);
                    setProfileConfig(config);
                  }}
                  embedded={true}
                />
              </div>
              <div className="flex-1 p-4 bg-bg-card">
                <VoiceSettingsPanel embedded={true} />
              </div>
            </div>
          </motion.div>

          {/* Typographic Hero */}
          <motion.div variants={itemVariants} className="mb-4 mt-6">
            <div className="flex flex-col gap-2 mb-4">
              {data.data_incomplete && (
                <div className="inline-flex items-center gap-2 bg-warning/10 border border-warning/30 text-warning px-3 py-1.5 rounded-lg text-sm font-medium w-fit">
                  <AlertTriangle size={16} /> Limited data — verdict may be incomplete
                </div>
              )}
              {data.realtime_sync === "degraded" && (
                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-text-muted px-3 py-1.5 rounded-lg text-sm font-medium w-fit">
                  <Activity size={16} className="opacity-70" /> Data may be delayed
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-2">
              <h1 className={`text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight ${overallStatus === "safe" ? "text-safe" : overallStatus === "caution" ? "text-warning" : "text-danger"} ${data.data_incomplete ? "opacity-75" : ""}`}>
                {data.overall?.verdict === "SAFE" ? `Safe to go outside in ${data.city}` : data.overall?.verdict === "CAUTION" ? `Caution advised in ${data.city}` : `Unsafe conditions in ${data.city}`}
              </h1>
              <span className="text-2xl font-bold text-text-muted mt-2 sm:mt-0">{safetyScore} <span className="text-sm font-normal">Score</span></span>
            </div>
            <p className="text-lg sm:text-xl text-text-secondary font-medium max-w-3xl leading-snug">{data.overall?.summary}</p>
          </motion.div>

          {/* Unified Stat Rail */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/10 rounded-2xl bg-bg-card border border-white/5 overflow-hidden">
             {/* AQI Stat */}
             <div className="flex-1 p-5 flex flex-col justify-between hover:bg-white/5 transition-colors">
               <div className="flex items-center gap-2 text-text-secondary mb-3">
                 <Wind size={16} /> <span className="text-sm font-medium">Air Quality</span>
               </div>
               <div className="flex items-baseline gap-1">
                 <span className="text-4xl font-mono font-bold text-white">{data.air_quality?.aqi ?? "—"}</span>
               </div>
               <div className="flex items-center gap-2 mt-2">
                 <div className={`w-2 h-2 rounded-full ${getStatusDotColor(getAqiStatus(data.air_quality?.category))}`} />
                 <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold truncate">{data.air_quality?.category || "Unknown"}</span>
               </div>
             </div>

             {/* Temp Stat */}
             <div className="flex-1 p-5 flex flex-col justify-between hover:bg-white/5 transition-colors">
               <div className="flex items-center gap-2 text-text-secondary mb-3">
                 <Thermometer size={16} /> <span className="text-sm font-medium">Temperature</span>
               </div>
               <div className="flex items-baseline gap-1">
                 <span className="text-4xl font-mono font-bold text-white">{data.weather?.temp_celsius != null ? `${Math.round(data.weather.temp_celsius)}` : "—"}</span>
                 <span className="text-sm text-text-muted">°C</span>
               </div>
               <div className="flex items-center gap-2 mt-2">
                 <div className={`w-2 h-2 rounded-full ${getStatusDotColor(getTempStatus(data.weather?.temp_celsius))}`} />
                 <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold truncate">{data.weather?.feels_like != null ? `Feels like ${Math.round(data.weather.feels_like)}°C` : "Unknown"}</span>
               </div>
             </div>

             {/* Pollen Stat */}
             <div className="flex-1 p-5 flex flex-col justify-between hover:bg-white/5 transition-colors">
               <div className="flex items-center gap-2 text-text-secondary mb-3">
                 <Flower2 size={16} /> <span className="text-sm font-medium">Pollen Risk</span>
               </div>
               <div className="flex items-baseline gap-1">
                 <span className="text-2xl sm:text-3xl font-mono font-bold text-white capitalize truncate">{data.pollen?.level || "N/A"}</span>
               </div>
               <div className="flex items-center gap-2 mt-2">
                 <div className={`w-2 h-2 rounded-full ${getStatusDotColor(getPollenStatus(data.pollen?.level))}`} />
                 <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold truncate">{data.pollen?.advice || "No advice available"}</span>
               </div>
             </div>

             {/* UV Stat */}
             <div className="flex-1 p-5 flex flex-col justify-between hover:bg-white/5 transition-colors">
               <div className="flex items-center gap-2 text-text-secondary mb-3">
                 <Sun size={16} /> <span className="text-sm font-medium">UV Severity</span>
               </div>
               <div className="flex items-baseline gap-1">
                 <span className="text-4xl font-mono font-bold text-white">{data.weather?.uv_index ?? "—"}</span>
               </div>
               <div className="flex items-center gap-2 mt-2">
                 <div className={`w-2 h-2 rounded-full ${getStatusDotColor(getUvStatus(data.weather?.uv_index))}`} />
                 <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold truncate">{!data.weather?.uv_index ? "Unknown" : getUVLabel(data.weather.uv_index)}</span>
               </div>
             </div>
          </motion.div>

          {selectedProfile !== "general" && personalRisk && (
            <motion.div variants={itemVariants}>
              <PersonalRiskCard
                risk={personalRisk}
                profile={profileConfig}
                onChangeProfile={() => window.dispatchEvent(new CustomEvent("lifecheck:open-profile"))}
              />
            </motion.div>
          )}

          {/* Monitored Territories Demoted */}
          <motion.div variants={itemVariants} className="mt-8 pt-8 border-t border-border-default">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Radar size={16} /> Monitored Territories
              </h3>
              <button
                  onClick={() => data?.city && addMonitoredCity(data.city)}
                  className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1 text-accent-cyan hover:text-white transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Track City
              </button>
            </div>

            {monitoredEntries.length === 0 ? (
              <div className="text-sm text-text-muted italic">
                You are not tracking any additional locations yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {monitoredEntries.map((entry) => {
                  return (
                    <div 
                      key={entry.city} 
                      onClick={() => search(entry.city)}
                      className="flex items-center gap-3 px-4 py-2 rounded-full bg-bg-card border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                    >
                      <div className={`w-2 h-2 rounded-full ${getStatusDotColor(getStatusColor(entry.verdict))}`} />
                      <span className="text-sm font-semibold text-white">{entry.city}</span>
                      <div className="w-px h-3 bg-white/20" />
                      <span className="text-xs font-mono text-text-muted">{entry.aqi ?? "—"} AQI</span>
                      <span className="text-xs font-mono text-text-muted">{entry.temp != null ? `${Math.round(entry.temp)}°C` : "—"}</span>
                      <button
                          onClick={(e) => { e.stopPropagation(); removeMonitoredCity(entry.city); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-text-muted hover:text-danger cursor-pointer"
                          title="Remove City"
                        >
                          <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <SafetyTimeline currentData={data} />
          </motion.div>
        </motion.div>
      )}
      <VoiceBriefingButton safetyData={data || null} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
}
