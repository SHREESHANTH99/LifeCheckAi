"use client";

import type { ReactNode } from "react";
import { AnimatedNumber } from "./AnimatedNumber";
import { Card } from "./Card";

type StatusType = "safe" | "caution" | "warning" | "unsafe" | "danger" | "unknown";

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  status?: StatusType;
  sublabel?: string;
  className?: string;
  isLive?: boolean;
}

const borderColors: Record<StatusType, string> = {
  safe: "border-safe/50",
  caution: "border-warning/50",
  warning: "border-warning/50",
  unsafe: "border-danger/50",
  danger: "border-danger/50",
  unknown: "border-border-default",
};

export function MetricCard({
  icon,
  label,
  value,
  unit,
  status = "unknown",
  sublabel,
  className = "",
  isLive = false,
}: MetricCardProps) {
  const isNumeric = typeof value === "number" || (!isNaN(Number(value)) && value !== "—");
  const numValue = isNumeric ? Number(value) : 0;

  return (
    <Card
      className={`relative flex flex-col group ${className} border ${borderColors[status]}`}
    >
      {isLive && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-safe/10 border border-safe/30 px-2 py-0.5 rounded-full z-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-safe" />
          </span>
          <span className="text-[9px] font-bold text-safe uppercase tracking-wider">Live</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="text-text-secondary w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 transition-colors group-hover:border-accent-primary/40">
          {icon}
        </div>
        <span className="text-sm font-medium text-text-primary capitalize tracking-wide">
          {label}
        </span>
      </div>
      
      <div className="flex items-baseline gap-1.5 mt-auto">
        <span className="text-4xl font-bold font-family-mono tabular-nums text-white">
          {isNumeric ? <AnimatedNumber value={numValue} /> : value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-text-secondary">{unit}</span>
        )}
      </div>
      
      {sublabel && (
        <p className="text-sm text-text-secondary mt-3 line-clamp-2">{sublabel}</p>
      )}
    </Card>
  );
}
