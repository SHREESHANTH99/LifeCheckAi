"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type StatusType = "safe" | "caution" | "unsafe" | "unknown";

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  status?: StatusType;
  sublabel?: string;
  className?: string;
}

const borderColors: Record<StatusType, string> = {
  safe: "border-l-safe",
  caution: "border-l-caution",
  unsafe: "border-l-unsafe",
  unknown: "border-l-text-muted",
};

const glowColors: Record<StatusType, string> = {
  safe: "rgba(16, 185, 129, 0.15)",
  caution: "rgba(245, 158, 11, 0.15)",
  unsafe: "rgba(239, 68, 68, 0.15)",
  unknown: "transparent",
};

export function MetricCard({
  icon,
  label,
  value,
  unit,
  status = "unknown",
  sublabel,
  className = "",
}: MetricCardProps) {
  return (
    <motion.div
      className={`card border-l-4 ${borderColors[status]} overflow-hidden relative ${className}`}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      style={{
        boxShadow: `inset 4px 0 12px -4px ${glowColors[status]}`,
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="text-text-secondary">{icon}</div>
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold font-[family-name:var(--font-family-mono)] text-text-primary">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-text-secondary">{unit}</span>
        )}
      </div>
      {sublabel && (
        <p className="text-sm text-text-secondary mt-2">{sublabel}</p>
      )}
    </motion.div>
  );
}
