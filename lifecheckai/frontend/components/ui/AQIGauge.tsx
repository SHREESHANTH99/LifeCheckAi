"use client";

import { motion } from "framer-motion";

interface AQIGaugeProps {
  aqi: number;
  size?: "sm" | "md" | "lg";
}

function getAQIColor(aqi: number): string {
  if (aqi <= 50) return "#10b981";
  if (aqi <= 100) return "#f59e0b";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  return "#8b5cf6";
}

function getAQILabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy (SG)";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

const sizeConfig = {
  sm: { width: 120, strokeWidth: 8, fontSize: 20, labelSize: 10 },
  md: { width: 180, strokeWidth: 10, fontSize: 32, labelSize: 12 },
  lg: { width: 240, strokeWidth: 12, fontSize: 44, labelSize: 14 },
};

export function AQIGauge({ aqi, size = "md" }: AQIGaugeProps) {
  const config = sizeConfig[size];
  const color = getAQIColor(aqi);
  const label = getAQILabel(aqi);

  const centerX = config.width / 2;
  const centerY = config.width / 2;
  const radius = (config.width - config.strokeWidth * 2) / 2;

  // Semicircle arc from 180° to 0° (bottom half)
  const startAngle = Math.PI;
  const endAngle = 0;
  const maxAQI = 500;
  const clampedAQI = Math.min(aqi, maxAQI);
  const progress = clampedAQI / maxAQI;
  const sweepAngle = startAngle - (startAngle - endAngle) * progress;

  const bgStartX = centerX + radius * Math.cos(startAngle);
  const bgStartY = centerY - radius * Math.sin(startAngle);
  const bgEndX = centerX + radius * Math.cos(endAngle);
  const bgEndY = centerY - radius * Math.sin(endAngle);

  const fillEndX = centerX + radius * Math.cos(sweepAngle);
  const fillEndY = centerY - radius * Math.sin(sweepAngle);

  const bgPath = `M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 0 1 ${bgEndX} ${bgEndY}`;
  const largeArcFlag = progress > 0.5 ? 1 : 0;
  const fillPath = `M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${fillEndX} ${fillEndY}`;

  const circumference = Math.PI * radius;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={config.width}
        height={config.width / 2 + config.strokeWidth + 8}
        viewBox={`0 0 ${config.width} ${config.width / 2 + config.strokeWidth + 8}`}
      >
        {/* Background arc */}
        <path
          d={bgPath}
          fill="none"
          stroke="var(--color-border-default)"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <motion.path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
        {/* Center text */}
        <text
          x={centerX}
          y={centerY - 4}
          textAnchor="middle"
          fill="var(--color-text-primary)"
          fontSize={config.fontSize}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="600"
        >
          {aqi}
        </text>
        <text
          x={centerX}
          y={centerY + config.labelSize + 4}
          textAnchor="middle"
          fill={color}
          fontSize={config.labelSize}
          fontFamily="'DM Sans', sans-serif"
          fontWeight="500"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
