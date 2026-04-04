"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import { SearchBar } from "@/components/ui/SearchBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Wind, Thermometer, ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";

const monitoredCities = [
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

export default function MapPage() {
  const { data, search, loading, city } = useSafetyData();
  const [selectedCity, setSelectedCity] = useState<(typeof monitoredCities)[0] | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lon: 78.9629 });
  const [mapZoom, setMapZoom] = useState(5);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const handleCityClick = useCallback(
    (cityItem: (typeof monitoredCities)[0]) => {
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
    [search]
  );

  const mapUrl = apiKey
    ? `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${mapCenter.lat},${mapCenter.lon}&zoom=${mapZoom}&maptype=roadmap`
    : null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar — city list */}
      <div className="lg:w-80 border-b lg:border-b-0 lg:border-r border-border-default bg-bg-secondary/30 overflow-y-auto max-h-[40vh] lg:max-h-[calc(100vh-64px)]">
        <div className="p-4 border-b border-border-default">
          <h2 className="font-[family-name:var(--font-family-grotesk)] text-lg font-semibold text-text-primary mb-3">
            Monitored Cities
          </h2>
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search city..."
            isLoading={loading}
            className="!h-10"
          />
        </div>
        <div className="flex flex-col">
          {monitoredCities.map((cityItem) => (
            <button
              key={cityItem.name}
              onClick={() => handleCityClick(cityItem)}
              className={`flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5 cursor-pointer border-b border-border-default/50 ${
                selectedCity?.name === cityItem.name ? "bg-accent-blue/10 border-l-2 border-l-accent-blue" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <MapPin size={14} className="text-text-muted" />
                <span className="text-sm text-text-primary font-medium">{cityItem.name}</span>
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
            <p className="text-xs text-text-muted mb-2">Click a city or search to check safety</p>
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
                    <h3 className="font-[family-name:var(--font-family-grotesk)] text-xl font-bold text-text-primary">
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
