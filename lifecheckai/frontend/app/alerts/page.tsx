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
  Bell,
  BellRing,
  CheckCircle2,
  X,
  MapPin,
  Clock3,
} from "lucide-react";
import type { AlertItem } from "@/types";

const ALERTS_READ_KEY = "lifecheck_alerts_read_ids";

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
  const { search, loading } = useSafetyData();
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [readAlertIds, setReadAlertIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(ALERTS_READ_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
    } catch {
      return [];
    }
  });

  // Generate alerts from current safety data
  const alerts = useMemo(() => generateAlerts(state.safetyData), [state.safetyData]);

  const filteredAlerts = useMemo(
    () => (activeFilter === "all" ? alerts : alerts.filter((a) => a.category === activeFilter)),
    [alerts, activeFilter]
  );

  const unreadAlerts = useMemo(
    () => {
      const validIds = new Set(alerts.map((alert) => alert.id));
      return alerts.filter((alert) => !readAlertIds.includes(alert.id) && validIds.has(alert.id));
    },
    [alerts, readAlertIds],
  );

  const topNotifications = useMemo(() => {
    const severityWeight: Record<AlertItem["severity"], number> = {
      UNSAFE: 3,
      CAUTION: 2,
      SAFE: 1,
    };

    return [...alerts]
      .sort((a, b) => {
        const severityDelta = severityWeight[b.severity] - severityWeight[a.severity];
        if (severityDelta !== 0) return severityDelta;
        return b.timestamp.getTime() - a.timestamp.getTime();
      })
      .slice(0, 4);
  }, [alerts]);

  const unsafeCount = useMemo(
    () => alerts.filter((a) => a.severity === "UNSAFE").length,
    [alerts]
  );

  const markAllAsRead = useCallback(() => {
    const ids = alerts.map((alert) => alert.id);
    setReadAlertIds(ids);
    localStorage.setItem(ALERTS_READ_KEY, JSON.stringify(ids));
  }, [alerts]);

  const markAsRead = useCallback((id: string) => {
    setReadAlertIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(ALERTS_READ_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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
            <h1 className="font-family-grotesk text-3xl font-bold text-text-primary mb-1">
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

        {/* Notification Section */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="font-family-grotesk text-lg font-semibold text-text-primary flex items-center gap-2">
                {unreadAlerts.length > 0 ? <BellRing size={18} className="text-accent-blue" /> : <Bell size={18} className="text-text-muted" />}
                Notifications
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Latest alert updates and priorities for your monitored city.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                unreadAlerts.length > 0
                  ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                  : "bg-safe/10 border-safe/30 text-safe"
              }`}>
                {unreadAlerts.length} unread
              </span>
              <button
                onClick={markAllAsRead}
                disabled={alerts.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <CheckCircle2 size={13} /> Mark all read
              </button>
            </div>
          </div>

          {topNotifications.length === 0 ? (
            <div className="rounded-xl border border-border-default bg-bg-secondary/40 p-4 text-sm text-text-secondary">
              No notifications yet. Alerts will appear here as soon as conditions update.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topNotifications.map((item) => {
                const unread = !readAlertIds.includes(item.id);
                return (
                  <button
                    key={`notification-${item.id}`}
                    onClick={() => {
                      setActiveFilter(item.category);
                      markAsRead(item.id);
                      setSelectedAlert(item);
                    }}
                    className={`w-full text-left rounded-xl border p-3 transition-colors cursor-pointer ${
                      unread
                        ? "border-accent-blue/35 bg-accent-blue/8"
                        : "border-border-default bg-bg-secondary/40 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-text-muted capitalize mb-1">{item.category} alert</p>
                        <p className="text-sm text-text-primary font-semibold line-clamp-1">{item.title}</p>
                      </div>
                      {unread && <span className="w-2.5 h-2.5 rounded-full bg-accent-blue shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-text-secondary mt-2 line-clamp-2">{item.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <StatusBadge status={item.severity} />
                      <span className="text-[10px] text-text-muted">Tap to view details</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.section>

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
                  <motion.button
                    key={alert.id}
                    variants={itemVariants}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    onClick={() => {
                      setSelectedAlert(alert);
                      markAsRead(alert.id);
                    }}
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
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        <AnimatePresence>
          {selectedAlert && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm p-4 flex items-center justify-center"
              onClick={() => setSelectedAlert(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-xl rounded-2xl border border-border-default glass p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Alert Details</p>
                    <h3 className="text-lg font-semibold text-text-primary leading-snug">{selectedAlert.title}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="w-8 h-8 rounded-lg bg-white/5 text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center cursor-pointer"
                    aria-label="Close alert popup"
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="text-sm text-text-secondary leading-relaxed mb-4">{selectedAlert.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
                  <div className="rounded-lg border border-border-default bg-bg-secondary/40 px-3 py-2">
                    <p className="text-[10px] text-text-muted mb-1">Severity</p>
                    <StatusBadge status={selectedAlert.severity} />
                  </div>
                  <div className="rounded-lg border border-border-default bg-bg-secondary/40 px-3 py-2">
                    <p className="text-[10px] text-text-muted mb-1">City</p>
                    <p className="text-sm text-text-primary inline-flex items-center gap-1.5">
                      <MapPin size={13} /> {selectedAlert.city}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border-default bg-bg-secondary/40 px-3 py-2">
                    <p className="text-[10px] text-text-muted mb-1">Updated</p>
                    <p className="text-sm text-text-primary inline-flex items-center gap-1.5">
                      <Clock3 size={13} /> Just now
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setActiveFilter(selectedAlert.category);
                      setSelectedAlert(null);
                    }}
                    className="text-xs px-3 py-2 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Filter by {selectedAlert.category}
                  </button>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="text-xs px-3 py-2 rounded-lg bg-accent-blue text-white hover:bg-accent-cyan transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
