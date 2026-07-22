"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import { SearchBar } from "@/components/ui/SearchBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AQIGauge } from "@/components/ui/AQIGauge";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card } from "@/components/ui/Card";
import { LoadingPulse } from "@/components/ui/LoadingPulse";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { SafetyScoreRing } from "@/components/ui/SafetyScoreRing";
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
    const aqi = data.air_quality?.aqi ?? 100;
    const temp = data.weather?.temp_celsius ?? 28;
    const pollenLevel = String(data.pollen?.level || "").toLowerCase();
    const pollenPenalty = pollenLevel === "high" ? 15 : pollenLevel === "moderate" ? 8 : 0;
    const baseScore = 100 - aqi / 5;
    const heatPenalty = temp > 40 ? 20 : temp > 35 ? 10 : 0;
    return Math.max(0, Math.min(100, Math.round(baseScore - heatPenalty - pollenPenalty)));
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
          <motion.div variants={itemVariants}>
            <HealthProfileSelector
              onProfileChange={(profile, config) => {
                setSelectedProfile(profile);
                setProfileConfig(config);
              }}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <VoiceSettingsPanel />
          </motion.div>

          {/* Bento Grid Layout */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <Card className="flex flex-col items-center justify-center group relative border-l-4 border-l-accent-violet">
                {overallStatus !== "unknown" && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-safe/10 border border-safe/30 px-2 py-0.5 rounded-full z-10">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-safe" />
                    </span>
                    <span className="text-[9px] font-bold text-safe uppercase tracking-wider">Live</span>
                  </div>
                )}
                <h3 className="h3-card mb-6">Overall Safety Score</h3>
                <SafetyScoreRing score={safetyScore} size="lg" />
                <div className="mt-6 flex flex-col items-center">
                    <StatusBadge status={data.overall?.verdict || "UNKNOWN"} />
                    <span className="body-base mt-3 text-center px-4">{data.overall?.summary}</span>
                    <span className="caption-muted mt-2 text-accent-cyan/80">
                      {watcherCount} people monitoring this city
                    </span>
                </div>
            </Card>

            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <MetricCard
                icon={<Wind size={20} />}
                label="Air Quality Index"
                value={data.air_quality?.aqi ?? "—"}
                status={(data.air_quality?.aqi ?? 999) <= 50 ? "safe" : (data.air_quality?.aqi ?? 999) <= 100 ? "warning" : "danger"}
                sublabel={data.air_quality?.category || "Fetching..."}
                isLive
              />
              <MetricCard
                icon={<Thermometer size={20} />}
                label="Temperature"
                value={data.weather?.temp_celsius != null ? `${Math.round(data.weather.temp_celsius)}` : "—"}
                unit="°C"
                status={!data.weather?.temp_celsius ? "unknown" : data.weather.temp_celsius > 40 ? "danger" : data.weather.temp_celsius > 35 ? "warning" : "safe"}
                sublabel={data.weather?.feels_like != null ? `Feels like ${Math.round(data.weather.feels_like)}°C` : ""}
                isLive
              />
              <MetricCard
                icon={<Flower2 size={20} />}
                label="Pollen Risk"
                value={data.pollen?.level || "—"}
                status={data.pollen?.level?.toLowerCase() === "low" ? "safe" : data.pollen?.level?.toLowerCase() === "moderate" ? "warning" : data.pollen?.level?.toLowerCase() === "high" ? "danger" : "unknown"}
                sublabel={data.pollen?.advice || ""}
              />
              <MetricCard
                icon={<Sun size={20} />}
                label="UV Severity"
                value={data.weather?.uv_index ?? "—"}
                status={!data.weather?.uv_index ? "unknown" : data.weather.uv_index <= 2 ? "safe" : data.weather.uv_index <= 5 ? "warning" : "danger"}
                sublabel={getUVLabel(data.weather?.uv_index)}
                isLive
              />
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

          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-accent-cyan">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-4 border-b border-border-default">
              <div>
                <h3 className="h3-card flex items-center gap-2">
                  <Radar size={18} className="text-accent-cyan" />
                  Monitored Territories
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => data?.city && addMonitoredCity(data.city)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={16} /> Track Current
                </button>
              </div>
            </div>

            {monitoredEntries.length === 0 ? (
              <div className="p-8 border border-dashed border-border-default rounded-2xl text-center text-text-secondary">
                You are not tracking any additional locations yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {monitoredEntries.map((entry) => (
                  <div key={entry.city} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-accent-cyan hover:-translate-y-1 transition-all overflow-hidden relative group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-base font-bold text-white mb-1">{entry.city}</h4>
                        <p className="text-[10px] text-text-muted">UPDATED {formatTime(new Date(entry.updatedAt))}</p>
                      </div>
                      <StatusBadge status={entry.verdict} />
                    </div>
                    
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-text-muted">AQI</span>
                        <span className="font-mono text-sm font-bold text-accent-cyan">{entry.aqi ?? "—"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-text-muted">Temp</span>
                        <span className="font-mono text-sm font-bold text-accent-cyan">{entry.temp != null ? `${Math.round(entry.temp)}°` : "—"}</span>
                      </div>
                       <div className="flex gap-2">
                        <button
                          onClick={() => search(entry.city)}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-accent-cyan hover:text-black flex items-center justify-center transition-colors text-text-secondary cursor-pointer"
                        >
                          <MapPin size={14} />
                        </button>
                        <button
                          onClick={() => removeMonitoredCity(entry.city)}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-danger text-text-secondary hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </Card>
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
