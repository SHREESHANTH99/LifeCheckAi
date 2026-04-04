"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useRealtime } from "@/hooks/useRealtime";

interface LiveActivityTickerProps {
  city?: string;
  lat?: number;
  lon?: number;
}

function fromNow(timestamp: number) {
  const sec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `${min}m ago`;
}

export function LiveActivityTicker({ city, lat, lon }: LiveActivityTickerProps) {
  const { activityFeed, activeUserCount } = useRealtime({ city, lat, lon });

  const line = useMemo(() => {
    if (!activityFeed.length) {
      return "Monitoring India's air and safety in real-time";
    }
    return activityFeed
      .slice(0, 12)
      .map((event) => `${event.avatar} ${event.message} • ${fromNow(event.timestamp)}`)
      .join("   •   ");
  }, [activityFeed]);

  return (
    <div className="hidden md:flex fixed bottom-0 left-0 right-0 z-40 h-9 border-t border-border-default bg-[rgba(10,15,30,0.95)] items-center overflow-hidden">
      <div className="px-3 inline-flex items-center gap-2 shrink-0 border-r border-border-default h-full">
        <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
        <span className="text-[11px] text-safe">LIVE</span>
        <span className="text-[11px] text-text-secondary">👥 {activeUserCount}</span>
      </div>
      <motion.div
        className="whitespace-nowrap text-xs text-text-secondary pl-4"
        animate={{ x: ["0%", "-100%"] }}
        transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
      >
        {line} &nbsp;&nbsp;&nbsp; {line}
      </motion.div>
    </div>
  );
}
