"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
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
} from "lucide-react";
import Link from "next/link";

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
  const { data, loading, error, city, search, refresh, lastUpdated } = useSafetyData();
  const searchParams = useSearchParams();

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
          <SearchBar onSearch={search} placeholder="Search any city..." isLoading={loading} />
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
          <SearchBar onSearch={search} placeholder="Enter a city to check safety conditions..." isLoading={loading} />
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
            <SearchBar onSearch={search} placeholder="Search another city..." isLoading={loading} />
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
              <h3 className="font-[family-name:var(--font-family-grotesk)] text-lg font-semibold text-text-primary mb-6">
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
                          <span className="text-text-primary font-[family-name:var(--font-family-mono)] text-xs">
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
              <h3 className="font-[family-name:var(--font-family-grotesk)] text-lg font-semibold text-text-primary mb-6">
                Weather Conditions
              </h3>

              <div className="flex items-center gap-4 mb-6">
                <div className="text-4xl font-bold font-[family-name:var(--font-family-mono)] text-text-primary">
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
              <h3 className="font-[family-name:var(--font-family-grotesk)] text-lg font-semibold text-text-primary mb-6">
                Pollen Forecast
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {Object.entries(data.pollen.types).map(([type, info]) => (
                  <div key={type} className="flex flex-col items-center text-center">
                    <div className={`w-20 h-20 rounded-full border-4 ${getPollenRingColor(info.category)} flex items-center justify-center mb-3`}>
                      <span className={`text-2xl font-bold font-[family-name:var(--font-family-mono)] ${getPollenColor(info.category)}`}>
                        {info.level}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-text-primary capitalize mb-1">{type}</h4>
                    <p className={`text-xs font-medium ${getPollenColor(info.category)}`}>
                      {info.category}
                    </p>
                  </div>
                ))}
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
                <h3 className="font-[family-name:var(--font-family-grotesk)] text-lg font-semibold text-text-primary mb-2">
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
