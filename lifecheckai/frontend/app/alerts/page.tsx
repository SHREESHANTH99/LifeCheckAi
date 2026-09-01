"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSafety } from "@/app/context/SafetyContext";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import { useSharedCityState } from "@/hooks/useSharedCityState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { SkeletonBase } from "@/components/ui/SkeletonBase";
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
    border: "border-safe/30",
    bg: "bg-safe/5",
    iconBg: "bg-safe/10",
    iconColor: "text-safe",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
    timelineBadge: "border-safe text-safe shadow-[0_0_8px_rgba(16,185,129,0.4)]"
  },
  CAUTION: {
    border: "border-warning/30",
    bg: "bg-warning/5",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.15)]",
    timelineBadge: "border-warning text-warning shadow-[0_0_8px_rgba(245,158,11,0.4)]"
  },
  UNSAFE: {
    border: "border-danger/30",
    bg: "bg-danger/5",
    iconBg: "bg-danger/10",
    iconColor: "text-danger",
    glow: "shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    timelineBadge: "border-danger text-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]"
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
  const { watcherCount, sharedAlerts } = useSharedCityState(state.safetyData?.city);
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
    <div className="min-h-screen px-4 sm:px-8 lg:px-16 py-8 relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_40%)] z-0" />

      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="h1-display mb-1">
              Safety Timeline
            </h1>
            <p className="caption-muted">
              Chronological Environmental Alerts
            </p>
          </div>
          {unsafeCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/10 border border-danger/30 shadow-glow">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-danger" />
              </span>
              <span className="text-xs font-bold text-danger uppercase tracking-wider">{unsafeCount} active alert{unsafeCount !== 1 ? "s" : ""}</span>
            </div>
          )}
        </motion.div>

        <Card className="mb-8 border border-white/5 shadow-glow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="h2-section">Shared Alert Board</h2>
              <p className="body-base">Live community reports for {state.safetyData?.city || "the current city"}</p>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-xs font-bold uppercase tracking-wider">
              👥 {watcherCount} watching
            </div>
          </div>

          {sharedAlerts.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 text-sm text-text-secondary">
              No community alerts have been shared for this city yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sharedAlerts.slice(0, 6).map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-accent-primary">{alert.severity}</span>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">
                      {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">{alert.message}</p>
                  <p className="text-xs text-text-secondary">Reported for {alert.city}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Notification Section */}
        <Card className="mb-8 border border-white/5 shadow-glow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="h2-section flex items-center gap-2">
                {unreadAlerts.length > 0 ? <BellRing size={18} className="text-accent-primary" /> : <Bell size={18} className="text-text-muted" />}
                Unread Diagnostics
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                unreadAlerts.length > 0
                  ? "bg-accent-primary/10 border-accent-primary/30 text-accent-primary"
                  : "bg-safe/10 border-safe/30 text-safe"
              }`}>
                {unreadAlerts.length} Dispatch(s)
              </span>
              <button
                onClick={markAllAsRead}
                disabled={alerts.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <CheckCircle2 size={13} /> Clear
              </button>
            </div>
          </div>

          {topNotifications.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 text-sm text-text-secondary text-center">
              No recent anomaly dispatches found for monitored parameters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className={`w-full text-left rounded-2xl glass p-4 transition-all hover:-translate-y-1 cursor-pointer ${
                      unread
                        ? "border border-accent-primary/50"
                        : "border border-white/5 opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] text-accent-primary font-bold uppercase tracking-wider mb-1">{item.category} Vector</p>
                        <p className="text-sm text-white font-semibold line-clamp-1">{item.title}</p>
                      </div>
                      {unread && <span className="w-2 h-2 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(255,255,255,0.8)] shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-text-secondary mt-3 line-clamp-2 leading-relaxed">{item.description}</p>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-8 scrollbar-hide hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveFilter(cat.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 cursor-pointer ${
                activeFilter === cat.key
                  ? "bg-white text-black"
                  : "border border-white/10 text-text-secondary hover:border-white/30 hover:text-white"
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Alerts Timeline Feed */}
        {loading ? (
          <div className="flex flex-col gap-6">
            {[1, 2, 3].map((i) => (
              <SkeletonBase key={i} className="h-32 border border-white/5 opacity-50" />
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <Card
            className="text-center py-20 border border-white/5 shadow-glow"
          >
            <ShieldAlert size={48} className="text-white/20 mx-auto mb-6" />
            <h3 className="h3-card mb-2">No Active Telemetry Alerts</h3>
            <p className="body-base w-2/3 mx-auto">
              Based on the latest data inputs, no critical alerts are matching this criteria for your monitored zones.
            </p>
          </Card>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-6 relative"
          >
            {/* The vertical timeline bar */}
            <div className="absolute left-[39px] sm:left-[39px] top-6 bottom-0 w-[2px] bg-gradient-to-b from-white/20 via-white/5 to-transparent z-0" />

            <AnimatePresence>
              {filteredAlerts.map((alert) => {
                const style = severityStyles[alert.severity as keyof typeof severityStyles] || severityStyles.CAUTION;
                const IconComp = categoryIcons[alert.category] || Wind;
                return (
                  <motion.div
                    key={alert.id}
                    variants={itemVariants}
                    className="flex items-start gap-4 sm:gap-6 relative z-10 group"
                  >
                     {/* Timeline Node */}
                     <div className="flex flex-col items-center pt-3 shrink-0">
                        <div className={`w-20 h-20 sm:w-16 sm:h-16 rounded-full glass border ${style.timelineBadge} flex flex-col items-center justify-center transition-transform group-hover:scale-110`}>
                           <IconComp size={20} className={style.iconColor} />
                           <span className="text-[9px] uppercase font-bold tracking-widest mt-1 opacity-70">Now</span>
                        </div>
                     </div>

                     {/* Main Card */}
                     <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          markAsRead(alert.id);
                        }}
                        className={`flex-1 text-left glass rounded-card p-5 border ${style.border} ${style.bg} ${style.glow} hover:bg-white/5 transition-all w-full cursor-pointer overflow-hidden`}
                     >
                       <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                           <div className="flex-1">
                               <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-0.5 rounded mr-2 bg-black/20 border border-white/5 text-[10px] uppercase tracking-wider text-text-muted font-bold">
                                      {alert.city}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-black/20 border border-white/5 text-[10px] uppercase tracking-wider text-accent-violet font-bold">
                                      {alert.category}
                                  </span>
                               </div>
                               <h4 className="text-base font-bold text-white mb-2 leading-tight pr-4">
                                  {alert.title}
                               </h4>
                               <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 max-w-2xl">
                                  {alert.description}
                               </p>
                           </div>

                           <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 shrink-0">
                               <StatusBadge status={alert.severity} className="scale-90 origin-right" />
                               <span className="text-[10px] uppercase tracking-wide text-text-muted font-bold block sm:mt-1">Details &rarr;</span>
                           </div>
                       </div>
                     </button>
                  </motion.div>
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
              className="fixed inset-0 z-50 bg-[#0A0F1E]/80 backdrop-blur-md p-4 flex items-center justify-center"
              onClick={() => setSelectedAlert(null)}
            >
              <Card
                className="w-full max-w-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden !p-0"
              >
                <div className="p-6 border-b border-white/10 flex items-start justify-between bg-black/20">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center">
                        <MapPin size={18} className="text-accent-primary" />
                     </div>
                     <div>
                        <p className="text-[10px] uppercase tracking-widest text-accent-violet font-bold mb-0.5">Emergency Dispatch</p>
                        <h3 className="text-lg font-bold text-white leading-tight">{selectedAlert.title}</h3>
                     </div>
                  </div>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="w-8 h-8 rounded-full glass text-text-secondary hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-8">
                    <p className="text-base text-text-secondary leading-relaxed mb-8">{selectedAlert.description}</p>
                    
                    <div className="grid grid-cols-3 gap-4 mb-8">
                       <div className="glass rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border border-white/5">
                           <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Classification</span>
                           <StatusBadge status={selectedAlert.severity} />
                       </div>
                       <div className="glass rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border border-white/5">
                           <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Region</span>
                           <span className="text-sm font-bold text-white uppercase">{selectedAlert.city}</span>
                       </div>
                       <div className="glass rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border border-white/5">
                           <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Vector</span>
                           <span className="text-sm font-bold text-accent-primary uppercase">{selectedAlert.category}</span>
                       </div>
                    </div>

                    <button
                       onClick={() => setSelectedAlert(null)}
                       className="w-full text-center py-4 rounded-xl bg-white text-black font-bold uppercase tracking-wider text-sm hover:brightness-105 transition-all cursor-pointer"
                    >
                       Acknowledge Protocol
                    </button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}