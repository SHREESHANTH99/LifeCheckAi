"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import { SearchBar } from "@/components/ui/SearchBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Wind, Thermometer, ArrowRight, MapPin, RefreshCw, Radar, ShieldAlert, Layers3, Eye, EyeOff, AlertTriangle, Menu, PanelLeftClose, X } from "lucide-react";
import Link from "next/link";
import { INDIAN_STATE_LOCATIONS } from "@/lib/indiaLocations";
import { useRealtime } from "@/hooks/useRealtime";
import { UserPresenceMarkers } from "@/components/realtime/UserPresenceMarkers";
import { CrowdReportMarkers } from "@/components/realtime/CrowdReportMarkers";
import { CrowdReportModal } from "@/components/realtime/CrowdReportModal";
import { LiveActivityTicker } from "@/components/realtime/LiveActivityTicker";
import { VoiceBriefingButton } from "@/components/voice/VoiceBriefingButton";

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
  panTo: (latLng: GoogleLatLng) => void;
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
        styles?: Array<Record<string, unknown>>;
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
          mapTypeControl: false, styles: [
  { "elementType": "geometry", "stylers": [{"color": "#1d2c4d"}] },
  { "elementType": "labels.text.fill", "stylers": [{"color": "#8ec3b9"}] },
  { "elementType": "labels.text.stroke", "stylers": [{"color": "#1a3646"}] },
  { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{"color": "#4b6878"}] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{"color": "#64779e"}] },
  { "featureType": "administrative.province", "elementType": "geometry.stroke", "stylers": [{"color": "#4b6878"}] },
  { "featureType": "landscape.man_made", "elementType": "geometry.stroke", "stylers": [{"color": "#334e87"}] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{"color": "#023e58"}] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{"color": "#283d6a"}] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{"color": "#6f9ba5"}] },
  { "featureType": "poi", "elementType": "labels.text.stroke", "stylers": [{"color": "#1d2c4d"}] },
  { "featureType": "poi.park", "elementType": "geometry.fill", "stylers": [{"color": "#023e58"}] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{"color": "#3C7680"}] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{"color": "#304a7d"}] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{"color": "#98a5be"}] },
  { "featureType": "road", "elementType": "labels.text.stroke", "stylers": [{"color": "#1d2c4d"}] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{"color": "#2c6675"}] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{"color": "#255763"}] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{"color": "#b0d5ce"}] },
  { "featureType": "road.highway", "elementType": "labels.text.stroke", "stylers": [{"color": "#023e58"}] },
  { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{"color": "#98a5be"}] },
  { "featureType": "transit", "elementType": "labels.text.stroke", "stylers": [{"color": "#1d2c4d"}] },
  { "featureType": "transit.line", "elementType": "geometry.fill", "stylers": [{"color": "#283d6a"}] },
  { "featureType": "transit.station", "elementType": "geometry", "stylers": [{"color": "#3a4762"}] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{"color": "#0e1626"}] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{"color": "#4e6d70"}] }
],
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

      const baseRadius = cityItem.status === "UNSAFE" ? 55000 : cityItem.status === "CAUTION" ? 42000 : 30000;

      // Simulate a radial gradient using nested circles
      const circleOuter = new googleApi.maps.Circle({
        map,
        center: { lat: cityItem.lat, lng: cityItem.lon },
        radius: baseRadius,
        fillColor: statusColor,
        fillOpacity: 0.05,
        strokeColor: statusColor,
        strokeOpacity: 0.6,
        strokeWeight: 1.5,
      });
      
      const circleMiddle = new googleApi.maps.Circle({
        map,
        center: { lat: cityItem.lat, lng: cityItem.lon },
        radius: baseRadius * 0.7,
        fillColor: statusColor,
        fillOpacity: 0.1,
        strokeColor: 'transparent',
        strokeOpacity: 0,
        strokeWeight: 0,
      });

      const circleInner = new googleApi.maps.Circle({
        map,
        center: { lat: cityItem.lat, lng: cityItem.lon },
        radius: baseRadius * 0.4,
        fillColor: statusColor,
        fillOpacity: 0.15,
        strokeColor: 'transparent',
        strokeOpacity: 0,
        strokeWeight: 0,
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

      zoneOverlaysRef.current.push(circleOuter, circleMiddle, circleInner, marker);
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

  useEffect(() => {
    if (mapInstanceRef.current && mapCenter) {
      mapInstanceRef.current.panTo({ lat: mapCenter.lat, lng: mapCenter.lon });
      mapInstanceRef.current.setZoom(mapZoom);
    }
  }, [mapCenter, mapZoom]);

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
    <div className="h-screen w-full relative overflow-hidden flex bg-bg-primary">
      {/* Background Map Container */}
      <div className="absolute inset-0">
        {apiKey ? (
          <div className="w-full h-full relative">
            <div
              ref={(node) => {
                mapHolderRef.current = node;
              }}
              className="w-full h-full"
            />
            {mapInitError && (
              <div className="absolute inset-0 bg-bg-primary/80 flex items-center justify-center">
                <div className="text-center px-6 glass p-6 rounded-2xl">
                  <p className="text-sm text-unsafe">{mapInitError}</p>
                  <p className="text-xs text-text-muted mt-2">Please verify your Google Maps key.</p>
                </div>
              </div>
            )}
            <UserPresenceMarkers presence={presence} map={mapInstanceRef.current as unknown} />
            <CrowdReportMarkers reports={crowdReports} map={mapInstanceRef.current as unknown} />
          </div>
        ) : (
          <div className="w-full h-full bg-bg-primary flex items-center justify-center">
            <div className="text-center bg-bg-card border border-border-default p-8 rounded-2xl relative z-20">
              <MapPin size={48} className="text-text-muted mx-auto mb-4" />
              <p className="text-white">Map requires Google Maps API key.</p>
              <p className="text-accent-primary text-sm mt-2">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local</p>
            </div>
          </div>
        )}
      </div>

      {/* Left Sidebar (Search + Legend Unified) */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-20 left-4 lg:left-[170px] bottom-[4.5rem] z-[40] w-[min(92vw,22rem)] pointer-events-none"
      >
        <Card className="bg-bg-card/90 backdrop-blur-md border-border-default shadow-2xl flex flex-col h-full pointer-events-auto">
          {/* Search Panel */}
          <div className="p-5 flex flex-col gap-4">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search city to focus map..."
              isLoading={loading}
              quickCities={monitoredSeedCities.map((entry) => entry.name)}
              fetchSuggestions={fetchLocationSuggestions}
            />
            <div className="flex items-center justify-between">
              <p className="caption-muted">Currently Tracking</p>
              <p className="text-sm font-bold text-accent-primary font-mono">{summary.total} Cities</p>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-unsafe/10 border border-unsafe/20 rounded-md text-[10px] uppercase text-unsafe font-bold">Unsafe: {summary.unsafe}</span>
              <span className="px-2 py-1 bg-warning/10 border border-warning/20 rounded-md text-[10px] uppercase text-warning font-bold">Watch: {summary.caution}</span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Legend */}
          <div className="p-5 border-t border-border-default bg-bg-primary/50">
            <p className="caption-muted text-text-primary mb-3 flex items-center gap-2">
              <Layers3 size={14} className="text-accent-primary" /> Map Legend
            </p>
            <div className="flex flex-col gap-3">
               <div className="flex items-center gap-3">
                 <span className="w-3 h-3 rounded-full bg-safe shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                 <span className="text-xs text-text-secondary font-medium uppercase tracking-wide">Safe Conditions</span>
               </div>
               <div className="flex items-center gap-3">
                 <span className="w-3 h-3 rounded-full bg-warning shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                 <span className="text-xs text-text-secondary font-medium uppercase tracking-wide">Moderate Risk</span>
               </div>
               <div className="flex items-center gap-3">
                 <span className="w-3 h-3 rounded-full bg-unsafe shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                 <span className="text-xs text-text-secondary font-medium uppercase tracking-wide">High Danger</span>
               </div>
            </div>
            <button
                onClick={() => setShowZones((prev) => !prev)}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-bg-card py-2 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer border border-border-default"
              >
                <Radar size={12} /> Toggle Zones
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Right Drawer (Sliding Glass Panel) */}
      <AnimatePresence>
        {selectedCity && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="absolute top-16 bottom-0 right-0 z-[60] w-[min(100vw,24rem)] bg-bg-card border-l border-border-default shadow-[-20px_0_40px_rgba(0,0,0,0.3)] flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="p-6 border-b border-border-default flex justify-between items-start">
               <div>
                  <h2 className="h2-section mb-2">{selectedCity.name}</h2>
                  <div className="flex items-center gap-2">
                     <StatusBadge status={selectedCity.status} />
                     <span className="text-[10px] text-text-muted px-2 py-0.5 rounded-full border border-border-default uppercase">
                        {data?.city === selectedCity.name ? "Viewing Live" : "Stale"}
                     </span>
                  </div>
               </div>
               <button onClick={() => setSelectedCity(null)} className="p-2 rounded-full hover:bg-bg-primary text-text-primary transition-colors cursor-pointer" title="Close Sidebar">
                  <X size={18} />
               </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                
                {/* Metric Cards */}
                <div className="grid grid-cols-2 gap-3">
                   <Card className="p-4 border-border-default flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                          <Wind className="text-accent-primary" size={16} />
                          <span className="caption-muted">AQI Score</span>
                      </div>
                      <span className="text-2xl font-mono text-white mt-1">{selectedCity.aqi ?? "—"}</span>
                   </Card>
                   <Card className="p-4 border-border-default flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                          <Thermometer className="text-accent-violet" size={16} />
                          <span className="caption-muted">Temp</span>
                      </div>
                      <span className="text-2xl font-mono text-white mt-1">{selectedCity.temp != null ? `${Math.round(selectedCity.temp)}°C` : "—"}</span>
                   </Card>
                </div>

                {data?.city === selectedCity.name ? (
                  <Card className={`p-5 border-border-default shadow-sm body-base ${selectedCity.status === 'UNSAFE' ? 'bg-danger/10 border-danger/20 text-danger-light' : selectedCity.status === 'CAUTION' ? 'bg-warning/10 border-warning/20 text-warning-light' : 'bg-safe/10 border-safe/20 text-safe-light'}`}>
                     {data.overall?.summary || "Real-time conditions are available."}
                  </Card>
                ) : (
                  <Card className="p-5 border-border-default body-base flex flex-col items-center justify-center text-center gap-3">
                     <ShieldAlert size={24} className="opacity-50" />
                     Load full real-time data to see complete analysis, safety score rings, and AI insights.
                  </Card>
                )}
            </div>

            {/* Footer */}
             <div className="p-6 border-t border-border-default pb-8 flex flex-col gap-3 shrink-0">
                <button
                    onClick={() => setCrowdModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl border border-border-default text-text-primary font-bold uppercase tracking-wider text-sm hover:border-accent-primary/40 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <ShieldAlert size={16} /> Report Risk
                </button>
                <Link
                  href={`/dashboard?city=${encodeURIComponent(selectedCity.name)}`}
                  className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-accent-primary text-bg-primary font-bold uppercase tracking-wider text-sm hover:brightness-110 transition-all shadow-md"
                >
                  View Full Details <ArrowRight size={16} />
                </Link>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CrowdReportModal
        isOpen={crowdModalOpen}
        onClose={() => setCrowdModalOpen(false)}
        lat={mapCenter.lat}
        lon={mapCenter.lon}
        city={selectedCity?.name || data?.city || "Unknown"}
        onSubmit={addCrowdReport}
      />
      <LiveActivityTicker city={selectedCity?.name || data?.city} lat={mapCenter.lat} lon={mapCenter.lon} />
      <VoiceBriefingButton safetyData={data || null} />

    </div>  );
}
