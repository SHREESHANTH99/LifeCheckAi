"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import { SearchBar } from "@/components/ui/SearchBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Wind, Thermometer, ArrowRight, MapPin, RefreshCw, Radar, ShieldAlert } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

const baseMonitoredCities = [
  { name: "Delhi", lat: 28.6139, lon: 77.209 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777 },
  { name: "Bangalore", lat: 12.9716, lon: 77.5946 },
  { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  { name: "Hyderabad", lat: 17.385, lon: 78.4867 },
  { name: "Kolkata", lat: 22.5726, lon: 88.3639 },
  { name: "Pune", lat: 18.5204, lon: 73.8567 },
  { name: "Ahmedabad", lat: 23.0225, lon: 72.5714 },
  { name: "Jaipur", lat: 26.9124, lon: 75.7873 },
  { name: "Lucknow", lat: 26.8467, lon: 80.9462 },
];

type CityStatus = "SAFE" | "CAUTION" | "UNSAFE" | "UNKNOWN";

interface MonitoredCity {
  name: string;
  lat: number;
  lon: number;
  status: CityStatus;
  aqi: number | null;
  temp: number | null;
  updatedAt: number | null;
}

interface LiveCityRow {
  city?: string;
  age_seconds?: number;
  data?: {
    overall?: { verdict?: CityStatus };
    air_quality?: { aqi?: number };
    air?: { aqi?: number };
    weather?: { temp_celsius?: number; temp?: number };
  };
}

function getRiskWeight(status: CityStatus, aqi: number | null): number {
  const statusWeight: Record<CityStatus, number> = {
    SAFE: 20,
    CAUTION: 60,
    UNSAFE: 90,
    UNKNOWN: 10,
  };

  const aqiWeight = aqi != null ? Math.min(aqi / 2.5, 45) : 0;
  return statusWeight[status] + aqiWeight;
}

export default function MapPage() {
  const { data, search, loading } = useSafetyData();
  const [selectedCity, setSelectedCity] = useState<MonitoredCity | null>(null);
  const [sortMode, setSortMode] = useState<"risk" | "name">("risk");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CityStatus>("ALL");
  const [liveMap, setLiveMap] = useState<Record<string, Omit<MonitoredCity, "name" | "lat" | "lon">>>({});
  const [refreshingLive, setRefreshingLive] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lon: 78.9629 });
  const [mapZoom, setMapZoom] = useState(5);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const refreshLiveCities = useCallback(async () => {
    setRefreshingLive(true);
    try {
      const response = await fetch(`${API_BASE}/api/cities/live`);
      if (!response.ok) {
        throw new Error("Unable to load live city snapshots");
      }

      const payload = await response.json();
      const cities = Array.isArray(payload?.cities) ? payload.cities : [];
      const next: Record<string, Omit<MonitoredCity, "name" | "lat" | "lon">> = {};

      cities.forEach((row: LiveCityRow) => {
        const rowCity = typeof row?.city === "string" ? row.city : "";
        if (!rowCity) return;
        const snapshot = row?.data ?? {};
        const air = snapshot?.air_quality ?? snapshot?.air ?? {};
        const weather = snapshot?.weather ?? {};
        const updatedAt = typeof row?.age_seconds === "number" ? Date.now() - row.age_seconds * 1000 : Date.now();

        next[rowCity.toLowerCase()] = {
          status: (snapshot?.overall?.verdict || "UNKNOWN") as CityStatus,
          aqi: typeof air?.aqi === "number" ? air.aqi : null,
          temp:
            typeof weather?.temp_celsius === "number"
              ? weather.temp_celsius
              : typeof weather?.temp === "number"
                ? weather.temp
                : null,
          updatedAt,
        };
      });

      setLiveMap(next);
    } catch {
      // Keep stale values if refresh fails.
    } finally {
      setRefreshingLive(false);
    }
  }, []);

  useEffect(() => {
    refreshLiveCities();
    const interval = setInterval(refreshLiveCities, 90000);
    return () => clearInterval(interval);
  }, [refreshLiveCities]);

  const monitoredCities = useMemo<MonitoredCity[]>(() => {
    return baseMonitoredCities.map((entry) => {
      const live = liveMap[entry.name.toLowerCase()];
      return {
        ...entry,
        status: live?.status || "UNKNOWN",
        aqi: live?.aqi ?? null,
        temp: live?.temp ?? null,
        updatedAt: live?.updatedAt ?? null,
      };
    });
  }, [liveMap]);

  const filteredCities = useMemo(() => {
    const filtered = statusFilter === "ALL" ? monitoredCities : monitoredCities.filter((entry) => entry.status === statusFilter);
    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name);
      return getRiskWeight(b.status, b.aqi) - getRiskWeight(a.status, a.aqi);
    });
    return sorted;
  }, [monitoredCities, sortMode, statusFilter]);

  const summary = useMemo(() => {
    const total = monitoredCities.length;
    const unsafe = monitoredCities.filter((entry) => entry.status === "UNSAFE").length;
    const caution = monitoredCities.filter((entry) => entry.status === "CAUTION").length;
    return { total, unsafe, caution };
  }, [monitoredCities]);

  const handleCityClick = useCallback(
    (cityItem: MonitoredCity) => {
      setSelectedCity(cityItem);
      setMapCenter({ lat: cityItem.lat, lon: cityItem.lon });
      setMapZoom(11);
      search(cityItem.name);
    },
    [search]
  );

  const handleSearch = useCallback(
    (cityName: string) => {
      search(cityName);
      const found = monitoredCities.find(
        (c) => c.name.toLowerCase() === cityName.toLowerCase()
      );
      if (found) {
        setSelectedCity(found);
        setMapCenter({ lat: found.lat, lon: found.lon });
        setMapZoom(11);
      }
    },
    [search, monitoredCities]
  );

  const mapUrl = apiKey
    ? `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${mapCenter.lat},${mapCenter.lon}&zoom=${mapZoom}&maptype=roadmap`
    : null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar — city operations */}
      <div className="lg:w-[26rem] border-b lg:border-b-0 lg:border-r border-border-default bg-bg-secondary/30 overflow-y-auto max-h-[46vh] lg:max-h-[calc(100vh-64px)]">
        <div className="p-4 border-b border-border-default">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-family-grotesk text-lg font-semibold text-text-primary flex items-center gap-2">
              <Radar size={18} className="text-accent-cyan" /> Monitored Cities
            </h2>
            <button
              onClick={refreshLiveCities}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-default text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} className={refreshingLive ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search city to jump on map..."
            isLoading={loading}
            quickCities={baseMonitoredCities.map((entry) => entry.name)}
            className="!h-10"
          />

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="rounded-lg border border-border-default bg-bg-card px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Tracked</p>
              <p className="text-sm font-family-mono font-semibold text-text-primary">{summary.total}</p>
            </div>
            <div className="rounded-lg border border-border-default bg-bg-card px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">At Risk</p>
              <p className="text-sm font-family-mono font-semibold text-unsafe">{summary.unsafe}</p>
            </div>
            <div className="rounded-lg border border-border-default bg-bg-card px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Watch</p>
              <p className="text-sm font-family-mono font-semibold text-caution">{summary.caution}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <ShieldAlert size={13} className="text-text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | CityStatus)}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-border-default bg-bg-card text-xs text-text-primary"
            >
              <option value="ALL">All status</option>
              <option value="UNSAFE">Unsafe</option>
              <option value="CAUTION">Caution</option>
              <option value="SAFE">Safe</option>
            </select>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as "risk" | "name")}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-border-default bg-bg-card text-xs text-text-primary"
            >
              <option value="risk">Sort by risk</option>
              <option value="name">Sort by name</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-2">
          {filteredCities.map((cityItem) => (
            <button
              key={cityItem.name}
              onClick={() => handleCityClick(cityItem)}
              className={`rounded-xl border px-3 py-3 text-left transition-all cursor-pointer ${
                selectedCity?.name === cityItem.name
                  ? "border-accent-blue/40 bg-accent-blue/10"
                  : "border-border-default bg-bg-card hover:bg-bg-card-hover"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-text-muted" />
                    <span className="text-sm text-text-primary font-medium">{cityItem.name}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-text-secondary">
                    <span>AQI: {cityItem.aqi ?? "—"}</span>
                    <span>{cityItem.temp != null ? `${Math.round(cityItem.temp)}°C` : "—"}</span>
                  </div>
                </div>
                <StatusBadge status={cityItem.status} className="scale-90" />
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-border-default overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    cityItem.status === "SAFE"
                      ? "bg-safe"
                      : cityItem.status === "CAUTION"
                        ? "bg-caution"
                        : cityItem.status === "UNSAFE"
                          ? "bg-unsafe"
                          : "bg-text-muted"
                  }`}
                  style={{ width: `${Math.min(100, Math.round(getRiskWeight(cityItem.status, cityItem.aqi)))}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {mapUrl ? (
          <iframe
            src={mapUrl}
            className="w-full h-[60vh] lg:h-[calc(100vh-64px)] border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Safety Map"
          />
        ) : (
          <div className="w-full h-[60vh] lg:h-[calc(100vh-64px)] bg-bg-card flex items-center justify-center">
            <div className="text-center">
              <MapPin size={48} className="text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary">
                Map requires Google Maps API key.
              </p>
              <p className="text-text-muted text-sm mt-1">
                Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local
              </p>
            </div>
          </div>
        )}

        {/* Overlay — top-left search */}
        <div className="absolute top-4 left-4 right-4 lg:right-auto lg:w-80 z-10">
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-text-muted mb-2">City operations</p>
            <p className="text-sm text-text-primary">
              {selectedCity ? `${selectedCity.name} selected. Drag map or choose another city.` : "Click a monitored city or search to jump map focus."}
            </p>
          </div>
        </div>

        {/* Overlay — legend top-right */}
        <div className="absolute top-4 right-4 z-10 hidden lg:block">
          <div className="glass rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-safe" />
              <span className="text-xs text-text-secondary">Safe</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-caution" />
              <span className="text-xs text-text-secondary">Caution</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-unsafe" />
              <span className="text-xs text-text-secondary">Unsafe</span>
            </div>
          </div>
        </div>

        {/* Bottom slide-up panel */}
        <AnimatePresence>
          {data && selectedCity && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 z-10 glass border-t border-border-default rounded-t-2xl"
            >
              <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-family-grotesk text-xl font-bold text-text-primary">
                      {data.city}
                    </h3>
                    <StatusBadge status={data.overall?.verdict || "UNKNOWN"} />
                  </div>
                  <div className="flex items-center gap-6 text-sm text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <Wind size={14} />
                      <span>AQI: {data.air_quality?.aqi ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Thermometer size={14} />
                      <span>{data.weather?.temp_celsius != null ? `${Math.round(data.weather.temp_celsius)}°C` : "—"}</span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/dashboard?city=${encodeURIComponent(data.city)}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent-blue text-white text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
                >
                  Full Report <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
