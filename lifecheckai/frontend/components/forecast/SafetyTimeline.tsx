"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock3, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { SafetyData } from "@/types";
import { generateForecast, getTrendSummary } from "@/lib/forecast";

interface SafetyTimelineProps {
  currentData: SafetyData;
}

export function SafetyTimeline({ currentData }: SafetyTimelineProps) {
  const [selectedHour, setSelectedHour] = useState(0);
  const forecast = useMemo(() => generateForecast(currentData), [currentData]);
  const selected = forecast[selectedHour] || forecast[0];
  const trend = useMemo(() => getTrendSummary(forecast), [forecast]);

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-5 border-b border-border-default pb-4">
        <h3 className="font-family-grotesk text-lg font-semibold text-text-primary inline-flex items-center gap-2">
          <Clock3 size={18} className="text-accent-primary" /> 6-Hour Safety Forecast
        </h3>
        <span className="text-[10px] border border-accent-purple/30 bg-accent-purple/10 text-accent-purple px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
          AI Predicted
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {forecast.map((hour, idx) => {
          const barColor =
            hour.verdict === "SAFE" ? "bg-safe" : hour.verdict === "CAUTION" ? "bg-warning" : "bg-danger";
            
          const Icon = hour.verdict === "SAFE" ? CheckCircle : hour.verdict === "CAUTION" ? AlertTriangle : XCircle;
          const iconColor = hour.verdict === "SAFE" ? "text-safe" : hour.verdict === "CAUTION" ? "text-warning" : "text-danger";

          return (
            <button
              key={hour.label}
              onClick={() => setSelectedHour(idx)}
              className={`rounded-xl border p-2 min-h-28 flex flex-col items-center justify-between transition-all cursor-pointer ${
                hour.bestWindow
                  ? "border-accent-primary shadow-[0_0_15px_rgba(255,255,255,0.15)] bg-accent-primary/5"
                  : idx === selectedHour
                  ? "border-accent-blue bg-accent-blue/10"
                  : "border-border-default bg-bg-secondary/40 hover:border-border-light"
              }`}
            >
              <div className={`flex items-center justify-center w-6 h-6 rounded-full bg-bg-card border border-border-default ${iconColor}`}>
                 <Icon size={12} />
              </div>
              <div className="h-14 w-4 rounded bg-border-default/40 flex items-end overflow-hidden mt-2">
                <motion.span
                  className={`w-full ${barColor}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(15, Math.min(100, (hour.aqi / 300) * 100))}%` }}
                />
              </div>
              <div className="text-center mt-2">
                <p className="text-[10px] text-text-muted font-medium">{hour.label}</p>
                <p className="text-xs font-bold text-text-primary">{Math.round(hour.temperature)}°</p>
                {hour.bestWindow && <p className="text-[9px] text-accent-primary font-bold uppercase tracking-wider mt-1">Best</p>}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-4 rounded-xl border border-border-default bg-bg-secondary/40 p-3 text-sm">
          <p className="text-text-primary font-medium mb-1">{selected.label} Snapshot</p>
          <p className="text-text-secondary text-xs">
            AQI {selected.aqi} | Temp {selected.temperature}°C | Risk {selected.verdict} | {selected.advice}
          </p>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-border-default bg-bg-secondary/30 p-3 text-sm text-text-secondary">
        {trend}
      </div>
    </div>
  );
}
