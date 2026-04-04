"use client";

import { motion } from "framer-motion";

type Status = "SAFE" | "CAUTION" | "UNSAFE" | "UNKNOWN";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { bg: string; border: string; text: string; dot: string }> = {
  SAFE: {
    bg: "bg-safe/15",
    border: "border-safe/40",
    text: "text-safe",
    dot: "bg-safe",
  },
  CAUTION: {
    bg: "bg-caution/15",
    border: "border-caution/40",
    text: "text-caution",
    dot: "bg-caution",
  },
  UNSAFE: {
    bg: "bg-unsafe/15",
    border: "border-unsafe/40",
    text: "text-unsafe",
    dot: "bg-unsafe",
  },
  UNKNOWN: {
    bg: "bg-text-muted/15",
    border: "border-text-muted/40",
    text: "text-text-muted",
    dot: "bg-text-muted",
  },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.UNKNOWN;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${config.bg} ${config.border} ${config.text} ${className}`}
    >
      <motion.span
        className={`w-2 h-2 rounded-full ${config.dot}`}
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {status}
    </span>
  );
}
