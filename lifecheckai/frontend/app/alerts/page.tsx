"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSafety } from "@/app/context/SafetyContext";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ShieldAlert,
  Wind,
  CloudLightning,
  Flower2,
  Sun,
  Droplets,
  Filter,
} from "lucide-react";
import type { AlertItem } from "@/types";

const categories = [
  { key: "all", label: "All", icon: <Filter size={14} /> },
  { key: "air", label: "Air Quality", icon: <Wind size={14} /> },
  { key: "weather", label: "Weather", icon: <CloudLightning size={14} /> },
  { key: "pollen", label: "Pollen", icon: <Flower2 size={14} /> },
  { key: "uv", label: "UV", icon: <Sun size={14} /> },
  { key: "water", label: "Water", icon: <Droplets size={14} /> },
];

const categoryIcons: Record<string, typeof Wind> = {
  air: Wind,
  weather: CloudLightning,
  pollen: Flower2,
  uv: Sun,
  water: Droplets,
};

const severityStyles = {
  SAFE: {
    border: "border-l-safe",
    bg: "bg-safe/5",
    iconBg: "bg-safe/15",
    iconColor: "text-safe",
  },
  CAUTION: {
    border: "border-l-caution",
    bg: "bg-caution/5",
    iconBg: "bg-caution/15",
    iconColor: "text-caution",
  },
  UNSAFE: {
    border: "border-l-unsafe",
    bg: "bg-unsafe/5",
    iconBg: "bg-unsafe/15",
    iconColor: "text-unsafe",
  },
};

function generateAlerts(data: ReturnType<typeof useSafety>["state"]["safetyData"]): AlertItem[] {
  if (!data) return [];

  const alerts: AlertItem[] = [];
  const now = new Date();

  // AQI alert
  if (data.air_quality) {
    const aqi = data.air_quality.aqi;
    const severity = aqi <= 50 ? "SAFE" : aqi <= 100 ? "CAUTION" : "UNSAFE";
    alerts.push({
      id: "air-1",
      city: data.city,
      category: "air",
      severity: severity as AlertItem["severity"],
      title: `${data.air_quality.category} Air Quality — ${data.city}`,
      description: data.air_quality.advice,
      timestamp: now,
    });
  }

  // Weather alert
  if (data.weather) {
    const temp = data.weather.temp_celsius;
    const severity = temp > 40 || temp < 5 ? "UNSAFE" : temp > 35 || temp < 10 ? "CAUTION" : "SAFE";
    alerts.push({
      id: "weather-1",
      city: data.city,
      category: "weather",
      severity: severity as AlertItem["severity"],
      title: `${data.weather.condition || "Weather"} — ${data.city}`,
      description: data.weather.advice,
      timestamp: now,
    });
  }

  // UV alert
  if (data.weather?.uv_index != null) {
    const uv = data.weather.uv_index;
    const severity = uv <= 2 ? "SAFE" : uv <= 5 ? "CAUTION" : "UNSAFE";
    alerts.push({
      id: "uv-1",
      city: data.city,
      category: "uv",
      severity: severity as AlertItem["severity"],
      title: `UV Index ${uv} — ${data.city}`,
      description: uv > 5 ? "High UV exposure. Use sunscreen and protective clothing." : uv > 2 ? "Moderate UV. Some protection recommended." : "Low UV risk.",
      timestamp: now,
    });
  }

  // Pollen alert
  if (data.pollen) {
    const level = data.pollen.level?.toLowerCase();
    const severity = level === "low" || level === "none" ? "SAFE" : level === "moderate" ? "CAUTION" : "UNSAFE";
    alerts.push({
      id: "pollen-1",
      city: data.city,
      category: "pollen",
      severity: severity as AlertItem["severity"],
      title: `${data.pollen.level} Pollen — ${data.city}`,
      description: data.pollen.advice,
      timestamp: now,
    });
  }

  return alerts;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function AlertsPage() {
  const { state } = useSafety();
  const { data, search, loading } = useSafetyData();
  const [activeFilter, setActiveFilter] = useState("all");

  // Generate alerts from current safety data
  const alerts = useMemo(() => generateAlerts(state.safetyData), [state.safetyData]);

  const filteredAlerts = useMemo(
    () => (activeFilter === "all" ? alerts : alerts.filter((a) => a.category === activeFilter)),
    [alerts, activeFilter]
  );

  const unsafeCount = useMemo(
    () => alerts.filter((a) => a.severity === "UNSAFE").length,
    [alerts]
  );

  // If no data yet, prompt search
  useEffect(() => {
    if (!state.safetyData && !loading) {
      search("Delhi");
    }
  }, [state.safetyData, loading, search]);

  return (
    <div className="min-h-screen px-4 sm:px-8 lg:px-16 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-[family-name:var(--font-family-grotesk)] text-3xl font-bold text-text-primary mb-1">
              Safety Alerts
            </h1>
            <p className="text-sm text-text-secondary">
              Real-time environmental and weather warnings
            </p>
          </div>
          {unsafeCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-unsafe/10 border border-unsafe/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-unsafe opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-unsafe" />
              </span>
              <span className="text-xs font-semibold text-unsafe">{unsafeCount} active alert{unsafeCount !== 1 ? "s" : ""}</span>
            </div>
          )}
        </motion.div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveFilter(cat.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeFilter === cat.key
                  ? "bg-accent-blue text-white"
                  : "border border-border-default text-text-secondary hover:border-accent-blue hover:text-text-primary"
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Alerts Feed */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card skeleton h-24" />
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card text-center py-16"
          >
            <ShieldAlert size={48} className="text-text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-text-primary mb-2">No Active Alerts</h3>
            <p className="text-sm text-text-secondary">
              No alerts match the current filter for monitored cities.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-4"
          >
            <AnimatePresence>
              {filteredAlerts.map((alert) => {
                const style = severityStyles[alert.severity] || severityStyles.CAUTION;
                const IconComp = categoryIcons[alert.category] || Wind;
                return (
                  <motion.div
                    key={alert.id}
                    variants={itemVariants}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    className={`card border-l-4 ${style.border} ${style.bg} flex flex-col sm:flex-row items-start gap-4 overflow-hidden`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center shrink-0`}>
                      <IconComp size={20} className={style.iconColor} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-text-primary mb-1 truncate">
                        {alert.title}
                      </h4>
                      <p className="text-xs text-text-secondary leading-relaxed mb-3 line-clamp-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-bg-primary border border-border-default text-[10px] text-text-muted font-medium">
                          {alert.city}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-bg-primary border border-border-default text-[10px] text-text-muted font-medium capitalize">
                          {alert.category}
                        </span>
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[10px] text-text-muted">Just now</span>
                      <StatusBadge status={alert.severity} />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
