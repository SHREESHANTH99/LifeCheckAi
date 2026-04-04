"use client";

import { useEffect, useRef } from "react";
import type { UserPresence } from "@/lib/spacetime";

interface MarkerLike {
  setMap: (map: unknown | null) => void;
}

interface GoogleMapsLike {
  Marker: new (options: {
    map: unknown;
    position: { lat: number; lng: number };
    title: string;
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
  SymbolPath: { CIRCLE: number };
}

interface UserPresenceMarkersProps {
  presence: UserPresence[];
  map: unknown | null;
}

export function UserPresenceMarkers({ presence, map }: UserPresenceMarkersProps) {
  const markersRef = useRef<MarkerLike[]>([]);

  useEffect(() => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const googleApi = (window as Window & { google?: { maps?: GoogleMapsLike } }).google;
    if (!map || !googleApi?.maps) return;
    const maps = googleApi.maps;

    presence.forEach((item) => {
      const marker = new maps.Marker({
        map,
        position: { lat: item.lat, lng: item.lon },
        title: `${item.avatar} ${item.city}`,
        label: {
          text: item.avatar,
          color: "#f0f4ff",
          fontSize: "16px",
          fontWeight: "700",
        },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#0ea5e9",
          fillOpacity: 0.85,
          strokeColor: "#0a0f1e",
          strokeWeight: 2,
        },
      });
      markersRef.current.push(marker as unknown as MarkerLike);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [map, presence]);

  return null;
}
