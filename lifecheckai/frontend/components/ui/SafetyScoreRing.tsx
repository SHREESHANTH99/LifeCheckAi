"use client";

import { motion } from "framer-motion";

interface SafetyScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
}

const SIZES = {
  sm: 80,
  md: 120,
  lg: 180,
};

function colorForScore(score: number) {
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export function SafetyScoreRing({
  score,
  size = "md",
  showLabel = true,
  animate = true,
}: SafetyScoreRingProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const px = SIZES[size];
  const stroke = Math.max(6, Math.floor(px / 14));
  const radius = (px - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safeScore / 100);
  const color = colorForScore(safeScore);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: px, height: px }}>
      <svg width={px} height={px} className="-rotate-90">
        <circle
          cx={px / 2}
          cy={px / 2}
          r={radius}
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={stroke}
          fill="none"
          className="text-text-muted"
        />
        <motion.circle
          cx={px / 2}
          cy={px / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: animate ? dashOffset : dashOffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-family-mono font-bold" style={{ color }}>{safeScore}</p>
        {showLabel && <p className="text-[10px] uppercase tracking-wide text-text-muted">Safety Score</p>}
      </div>
      <span className="absolute bottom-2 w-1.5 h-1.5 rounded-full" style={{ background: color }} />
    </div>
  );
}
