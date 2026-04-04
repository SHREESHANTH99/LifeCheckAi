"use client";

import { useEffect, useRef } from "react";
import type { CrowdReport } from "@/lib/spacetime";

interface MarkerLike {
  setMap: (map: unknown | null) => void;
  addListener?: (event: string, callback: () => void) => void;
}

interface InfoWindowLike {
  setContent: (value: string) => void;
  open: (opts: { anchor: unknown; map: unknown }) => void;
}

interface GoogleMapsLike {
  Marker: new (options: {
    map: unknown;
    position: { lat: number; lng: number };
    label: { text: string; color: string; fontSize: string; fontWeight: string };
    icon: {
      path: number;
      scale: number;
      fillColor: string;
      fillOpacity: number;
      strokeColor: string;
      strokeWeight: number;
    };
  }) => MarkerLike;
  InfoWindow: new () => InfoWindowLike;
  SymbolPath: { CIRCLE: number };
}

interface CrowdReportMarkersProps {
  reports: CrowdReport[];
  map: unknown | null;
}

const TYPE_STYLE: Record<CrowdReport["type"], { emoji: string; color: string }> = {
  smoke: { emoji: "🔥", color: "#ef4444" },
  flood: { emoji: "🌊", color: "#3b82f6" },
  dust_storm: { emoji: "💨", color: "#f97316" },
  chemical: { emoji: "⚠️", color: "#eab308" },
  road_block: { emoji: "🚧", color: "#9ca3af" },
  safe_zone: { emoji: "✅", color: "#10b981" },
};

function ageMinutes(ts: number) {
  return Math.max(0, Math.floor((Date.now() - ts) / 60000));
}

export function CrowdReportMarkers({ reports, map }: CrowdReportMarkersProps) {
  const markersRef = useRef<MarkerLike[]>([]);
  const infoRef = useRef<InfoWindowLike | null>(null);

  useEffect(() => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const googleApi = (window as Window & { google?: { maps?: GoogleMapsLike } }).google;
    if (!map || !googleApi?.maps) return;
    const maps = googleApi.maps;

    if (!infoRef.current) infoRef.current = new maps.InfoWindow();

    reports.forEach((report) => {
      const style = TYPE_STYLE[report.type] || TYPE_STYLE.road_block;
      const stale = Date.now() - report.timestamp > 2 * 60 * 60 * 1000;

      const marker = new maps.Marker({
        map,
        position: { lat: report.lat, lng: report.lon },
        label: {
          text: style.emoji,
          color: "#ffffff",
          fontSize: "15px",
          fontWeight: "700",
        },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: style.color,
          fillOpacity: stale ? 0.5 : 0.92,
          strokeColor: "#0a0f1e",
          strokeWeight: 2,
        },
      });

      marker.addListener?.("click", () => {
        const age = ageMinutes(report.timestamp);
        infoRef.current?.setContent(`
          <div style="max-width:220px;padding:6px 4px;color:#d8e3ff;font-family:DM Sans,sans-serif;">
            <div style="font-weight:700;margin-bottom:4px;">${style.emoji} ${report.type.replace("_", " ")}</div>
            <div style="font-size:12px;opacity:0.9;">${report.description || "No description provided."}</div>
            <div style="font-size:11px;opacity:0.7;margin-top:6px;">${age} min ago · 👍 ${report.upvotes}</div>
            <button style="margin-top:8px;padding:4px 8px;border-radius:8px;border:1px solid #1e2d45;background:#111827;color:#d8e3ff;font-size:11px;">👍 Helpful</button>
          </div>
        `);
        infoRef.current?.open({ anchor: marker, map });
      });

      markersRef.current.push(marker as unknown as MarkerLike);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [map, reports]);

  return null;
}
