"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import { SearchBar } from "@/components/ui/SearchBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Wind, Thermometer, ArrowRight, MapPin, RefreshCw, Radar, ShieldAlert, Layers3, Eye, EyeOff, AlertTriangle, Menu, PanelLeftClose } from "lucide-react";
import Link from "next/link";
import { INDIAN_STATE_LOCATIONS } from "@/lib/indiaLocations";
import { useRealtime } from "@/hooks/useRealtime";
import { UserPresenceMarkers } from "@/components/realtime/UserPresenceMarkers";
import { CrowdReportMarkers } from "@/components/realtime/CrowdReportMarkers";
import { CrowdReportModal } from "@/components/realtime/CrowdReportModal";
import { LiveActivityTicker } from "@/components/realtime/LiveActivityTicker";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
const MAP_MONITORED_CITIES_KEY = "lifecheck_map_monitored_cities";

const baseMonitoredCities = INDIAN_STATE_LOCATIONS;

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

interface SuggestedLocation {
  city?: string;
  formatted_address?: string;
  lat?: number;
  lon?: number;
}

interface LocationSuggestionResponse {
  suggestions?: SuggestedLocation[];
}

interface GoogleLatLng {
  lat: number;
  lng: number;
}

interface GoogleMapInstance {
  setCenter: (latLng: GoogleLatLng) => void;
  setZoom: (zoom: number) => void;
}

interface GoogleOverlayInstance {
  setMap: (map: GoogleMapInstance | null) => void;
}

interface GoogleMapsAPI {
  maps: {
    Map: new (
      element: HTMLElement,
      options: {
        center: GoogleLatLng;
        zoom: number;
        mapTypeId?: string;
        streetViewControl?: boolean;
        fullscreenControl?: boolean;
        mapTypeControl?: boolean;
      },
    ) => GoogleMapInstance;
    Marker: new (options: {
      position: GoogleLatLng;
      map: GoogleMapInstance;
      title?: string;
      label?: { text: string; color: string; fontSize: string; fontWeight: string };
      icon?: {
        path: number;
        scale: number;
        fillColor: string;
        fillOpacity: number;
        strokeColor: string;
        strokeWeight: number;
      };
      zIndex?: number;
    }) => GoogleOverlayInstance;
    Circle: new (options: {
      map: GoogleMapInstance;
      center: GoogleLatLng;
      radius: number;
      fillColor: string;
      fillOpacity: number;
      strokeColor: string;
      strokeOpacity: number;
      strokeWeight: number;
    }) => GoogleOverlayInstance;
    SymbolPath: {
      CIRCLE: number;
    };
  };
}

interface WindowWithGoogle extends Window {
  google?: GoogleMapsAPI;
}

let googleMapsLoader: Promise<GoogleMapsAPI> | null = null;

function loadGoogleMapsApi(apiKey: string): Promise<GoogleMapsAPI> {
  if (googleMapsLoader) return googleMapsLoader;

  googleMapsLoader = new Promise((resolve, reject) => {
    const win = window as WindowWithGoogle;
    if (win.google?.maps) {
      resolve(win.google);
      return;
    }

    const existing = document.getElementById("google-maps-script");
    if (existing) {
      existing.addEventListener("load", () => {
        const loaded = (window as WindowWithGoogle).google;
        if (loaded?.maps) resolve(loaded);
        else reject(new Error("Google Maps failed to initialize"));
      });
      existing.addEventListener("error", () => reject(new Error("Google Maps script failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const loaded = (window as WindowWithGoogle).google;
      if (loaded?.maps) resolve(loaded);
      else reject(new Error("Google Maps failed to initialize"));
    };
    script.onerror = () => reject(new Error("Google Maps script failed to load"));
    document.head.appendChild(script);
  });

  return googleMapsLoader;
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
  const { data, search, loading, refresh, locateMe } = useSafetyData();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [monitoredSeedCities, setMonitoredSeedCities] = useState<Array<{ name: string; lat: number; lon: number }>>(
    () => {
      if (typeof window === "undefined") return baseMonitoredCities;
      try {
        const raw = localStorage.getItem(MAP_MONITORED_CITIES_KEY);
        if (!raw) return baseMonitoredCities;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return baseMonitoredCities;

        const valid = parsed
          .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const row = entry as { name?: string; lat?: number; lon?: number };
            if (typeof row.name !== "string") return null;
            if (typeof row.lat !== "number" || typeof row.lon !== "number") return null;
            return { name: row.name, lat: row.lat, lon: row.lon };
          })
          .filter((entry): entry is { name: string; lat: number; lon: number } => !!entry);

        return valid.length > 0 ? valid : baseMonitoredCities;
      } catch {
        return baseMonitoredCities;
      }
    },
  );
  const [selectedCity, setSelectedCity] = useState<MonitoredCity | null>(null);
  const [sortMode, setSortMode] = useState<"risk" | "name">("risk");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CityStatus>("ALL");
  const [liveMap, setLiveMap] = useState<Record<string, Omit<MonitoredCity, "name" | "lat" | "lon">>>({});
  const [refreshingLive, setRefreshingLive] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lon: 78.9629 });
  const [mapZoom, setMapZoom] = useState(5);
  const [showZones, setShowZones] = useState(true);
  const [mapInitError, setMapInitError] = useState<string | null>(null);
  const [crowdModalOpen, setCrowdModalOpen] = useState(false);
  const mapHolderRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null);
  const mapApiRef = useRef<GoogleMapsAPI | null>(null);
  const zoneOverlaysRef = useRef<GoogleOverlayInstance[]>([]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const { presence, crowdReports, activeUserCount, addCrowdReport } = useRealtime({
    city: data?.city || selectedCity?.name,
    lat: mapCenter.lat,
    lon: mapCenter.lon,
    enabled: true,
  });

  const persistMonitoredCities = useCallback(
    (entries: Array<{ name: string; lat: number; lon: number }>) => {
      if (typeof window === "undefined") return;
      localStorage.setItem(MAP_MONITORED_CITIES_KEY, JSON.stringify(entries));
    },
    [],
  );

  const upsertMonitoredCity = useCallback(
    (entry: { name: string; lat: number; lon: number }) => {
      setMonitoredSeedCities((prev) => {
        const exists = prev.some((row) => row.name.toLowerCase() === entry.name.toLowerCase());
        const next = exists ? prev : [entry, ...prev].slice(0, 20);
        persistMonitoredCities(next);
        return next;
      });
    },
    [persistMonitoredCities],
  );

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
    return monitoredSeedCities.map((entry) => {
      const live = liveMap[entry.name.toLowerCase()];
      return {
        ...entry,
        status: live?.status || "UNKNOWN",
        aqi: live?.aqi ?? null,
        temp: live?.temp ?? null,
        updatedAt: live?.updatedAt ?? null,
      };
    });
  }, [liveMap, monitoredSeedCities]);

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

  const highestRisk = useMemo(() => {
    return [...monitoredCities].sort((a, b) => getRiskWeight(b.status, b.aqi) - getRiskWeight(a.status, a.aqi))[0] || null;
  }, [monitoredCities]);

  useEffect(() => {
    if (!apiKey || !mapHolderRef.current || mapInstanceRef.current) return;

    loadGoogleMapsApi(apiKey)
      .then((googleApi) => {
        mapApiRef.current = googleApi;
        const instance = new googleApi.maps.Map(mapHolderRef.current as HTMLElement, {
          center: { lat: mapCenter.lat, lng: mapCenter.lon },
          zoom: mapZoom,
          mapTypeId: "roadmap",
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: false,
        });
        mapInstanceRef.current = instance;
        setMapInitError(null);
      })
      .catch((err) => {
        setMapInitError(err instanceof Error ? err.message : "Failed to initialize map");
      });
  }, [apiKey, mapCenter.lat, mapCenter.lon, mapZoom]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setCenter({ lat: mapCenter.lat, lng: mapCenter.lon });
    mapInstanceRef.current.setZoom(mapZoom);
  }, [mapCenter, mapZoom]);

  useEffect(() => {
    zoneOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    zoneOverlaysRef.current = [];

    if (!showZones || !mapInstanceRef.current || !mapApiRef.current) return;

    const googleApi = mapApiRef.current;
    const map = mapInstanceRef.current;

    monitoredCities.forEach((cityItem) => {
      if (cityItem.status === "UNKNOWN") return;

      const statusColor =
        cityItem.status === "SAFE"
          ? "#10b981"
          : cityItem.status === "CAUTION"
            ? "#f59e0b"
            : "#ef4444";

      const circle = new googleApi.maps.Circle({
        map,
        center: { lat: cityItem.lat, lng: cityItem.lon },
        radius: cityItem.status === "UNSAFE" ? 55000 : cityItem.status === "CAUTION" ? 42000 : 30000,
        fillColor: statusColor,
        fillOpacity: 0.18,
        strokeColor: statusColor,
        strokeOpacity: 0.7,
        strokeWeight: 1.5,
      });

      const marker = new googleApi.maps.Marker({
        map,
        position: { lat: cityItem.lat, lng: cityItem.lon },
        title: `${cityItem.name} (${cityItem.status})`,
        label: {
          text: cityItem.name.slice(0, 1),
          color: "#ffffff",
          fontSize: "10px",
          fontWeight: "700",
        },
        icon: {
          path: googleApi.maps.SymbolPath.CIRCLE,
          scale: cityItem.status === "UNSAFE" ? 8 : cityItem.status === "CAUTION" ? 7 : 6,
          fillColor: statusColor,
          fillOpacity: 1,
          strokeColor: "#0a0f1e",
          strokeWeight: 1.5,
        },
        zIndex: 20,
      });

      zoneOverlaysRef.current.push(circle, marker);
    });
  }, [monitoredCities, showZones]);

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

  useEffect(() => {
    if (!data?.city || !data?.coordinates) return;
    const lat = data.coordinates.lat;
    const lon = data.coordinates.lon;
    if (typeof lat !== "number" || typeof lon !== "number") return;

    const mapped: MonitoredCity = {
      name: data.city,
      lat,
      lon,
      status: data.overall?.verdict || "UNKNOWN",
      aqi: data.air_quality?.aqi ?? null,
      temp: data.weather?.temp_celsius ?? null,
      updatedAt: Date.now(),
    };

    setSelectedCity(mapped);
    setMapCenter({ lat, lon });
    setMapZoom(11);
    upsertMonitoredCity({ name: mapped.name, lat, lon });
  }, [data, upsertMonitoredCity]);

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

  useEffect(() => {
    const onLocate = () => {
      locateMe();
    };
    const onRefresh = () => {
      refresh();
      refreshLiveCities();
    };
    window.addEventListener("lifecheck:locate-me", onLocate);
    window.addEventListener("lifecheck:refresh", onRefresh);
    return () => {
      window.removeEventListener("lifecheck:locate-me", onLocate);
      window.removeEventListener("lifecheck:refresh", onRefresh);
    };
  }, [locateMe, refresh, refreshLiveCities]);

  return (
    <div className="min-h-screen flex lg:flex-row relative">
      {/* Sidebar backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.button
            type="button"
            aria-label="Close monitored cities panel"
            onClick={() => setIsSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-bg-primary/50 backdrop-blur-[1px] lg:bg-bg-primary/30"
          />
        )}
      </AnimatePresence>

      {/* Sidebar — city operations drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -420, opacity: 0.85 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -420, opacity: 0.85 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed top-16 bottom-0 left-0 z-50 w-[min(92vw,26rem)] border-r border-border-default bg-bg-secondary/95 backdrop-blur-md overflow-y-auto"
          >
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
            quickCities={monitoredSeedCities.map((entry) => entry.name)}
            fetchSuggestions={fetchLocationSuggestions}
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
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Map Area */}
      <div className="flex-1 relative">
        {/* Monitored cities hamburger (all devices) */}
        <button
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className="fixed top-20 left-4 z-[60] inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border-default bg-bg-secondary/90 backdrop-blur text-xs text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.28)]"
          aria-label={isSidebarOpen ? "Hide map sidebar" : "Show map sidebar"}
          title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          {isSidebarOpen ? <PanelLeftClose size={14} /> : <Menu size={14} />}
          {isSidebarOpen ? "Hide Monitored" : "Monitored"}
        </button>

        {apiKey ? (
          <div className="w-full h-[60vh] lg:h-[calc(100vh-64px)] relative">
            <div
              ref={(node) => {
                mapHolderRef.current = node;
              }}
              className="w-full h-full"
            />
            {mapInitError && (
              <div className="absolute inset-0 bg-bg-primary/80 flex items-center justify-center">
                <div className="text-center px-6">
                  <p className="text-sm text-unsafe">{mapInitError}</p>
                  <p className="text-xs text-text-muted mt-1">Please verify your Google Maps key and billing setup.</p>
                </div>
              </div>
            )}
            <UserPresenceMarkers presence={presence} map={mapInstanceRef.current as unknown} />
            <CrowdReportMarkers reports={crowdReports} map={mapInstanceRef.current as unknown} />
          </div>
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
        <div className={`absolute top-16 right-4 z-10 w-[min(92vw,20rem)] transition-all duration-300 ${isSidebarOpen ? "left-4 lg:left-[27rem]" : "left-4"}`}>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-text-muted mb-2">City operations</p>
            <p className="text-sm text-text-primary">
              {selectedCity ? `${selectedCity.name} selected. Drag map or choose another city.` : "Click a monitored city or search to jump map focus."}
            </p>
          </div>
        </div>

        {/* Overlay — legend top-right */}
        <div className="absolute top-4 right-4 z-10 hidden lg:block">
          <div className="glass rounded-xl p-3 flex flex-col gap-2 min-w-44">
            <div className="rounded-lg border border-safe/30 bg-safe/10 px-2.5 py-2 text-xs text-safe inline-flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-safe animate-pulse" /> 👥 {activeUserCount} checking India right now
              </span>
            </div>
            <button
              onClick={() => setShowZones((prev) => !prev)}
              className="mb-1 inline-flex items-center justify-between gap-2 rounded-lg border border-border-default px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                <Layers3 size={12} /> Zone Layer
              </span>
              {showZones ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
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

        <button
          onClick={() => setCrowdModalOpen(true)}
          className="fixed z-[65] bottom-24 right-6 min-h-11 px-4 rounded-full bg-accent-blue text-white text-sm font-medium shadow-[0_12px_30px_rgba(0,0,0,0.3)] hover:opacity-90 transition-opacity cursor-pointer"
        >
          Report Condition
        </button>

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

      <CrowdReportModal
        isOpen={crowdModalOpen}
        onClose={() => setCrowdModalOpen(false)}
        lat={mapCenter.lat}
        lon={mapCenter.lon}
        city={selectedCity?.name || data?.city || "Unknown"}
        onSubmit={addCrowdReport}
      />

      <LiveActivityTicker city={data?.city || selectedCity?.name} lat={mapCenter.lat} lon={mapCenter.lon} />

      {/* Right sidebar — zone analytics */}
      <aside className="hidden xl:flex xl:w-72 border-l border-border-default bg-bg-secondary/35 flex-col">
        <div className="p-4 border-b border-border-default">
          <h3 className="font-family-grotesk text-base font-semibold text-text-primary">Zone Intelligence</h3>
          <p className="text-xs text-text-muted mt-1">Operational risk distribution</p>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="rounded-xl border border-border-default bg-bg-card p-3">
            <p className="text-[11px] uppercase tracking-wide text-text-muted">Unsafe Zones</p>
            <p className="text-2xl font-family-mono font-bold text-unsafe mt-1">{summary.unsafe}</p>
          </div>
          <div className="rounded-xl border border-border-default bg-bg-card p-3">
            <p className="text-[11px] uppercase tracking-wide text-text-muted">Caution Zones</p>
            <p className="text-2xl font-family-mono font-bold text-caution mt-1">{summary.caution}</p>
          </div>
          <div className="rounded-xl border border-border-default bg-bg-card p-3">
            <p className="text-[11px] uppercase tracking-wide text-text-muted">Highest Risk City</p>
            {highestRisk ? (
              <div className="mt-2">
                <p className="text-sm font-semibold text-text-primary">{highestRisk.name}</p>
                <p className="text-xs text-text-secondary mt-1">AQI: {highestRisk.aqi ?? "—"}</p>
                <button
                  onClick={() => handleCityClick(highestRisk)}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-unsafe/40 text-xs text-unsafe hover:bg-unsafe/10 transition-colors cursor-pointer"
                >
                  <AlertTriangle size={12} /> Focus on map
                </button>
              </div>
            ) : (
              <p className="text-xs text-text-secondary mt-2">No active risk signals yet.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
