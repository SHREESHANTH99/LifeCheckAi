"use client";

import { useEffect, useMemo } from "react";
import { useCityWatchers, useSharedAlerts, useJoinCity, useLeaveCity } from "@/lib/spacetime-db";

type SharedAlertView = {
  id: string;
  city: string;
  severity: string;
  message: string;
  createdAt: number;
};

export function useSharedCityState(city?: string) {
  const normalizedCity = city?.trim();
  
  // Get data from SpaceTimeDB tables
  const [watcherRows] = useCityWatchers();
  const [alertRows] = useSharedAlerts();
  
  // Get reducer functions
  const joinCity = useJoinCity();
  const leaveCity = useLeaveCity();

  // Join city when mounted
  useEffect(() => {
    if (!normalizedCity) return;
    try {
      joinCity({ city: normalizedCity });
    } catch (err) {
      console.debug("SpaceTimeDB not available:", err);
    }
    
    return () => {
      try {
        leaveCity({});
      } catch (err) {
        console.debug("SpaceTimeDB cleanup failed:", err);
      }
    };
  }, [normalizedCity, joinCity, leaveCity]);

  // Count unique watchers for current city
  const watcherCount = useMemo(() => {
    if (!normalizedCity || !Array.isArray(watcherRows)) return 0;
    const cityWatchers = watcherRows.filter(
      (row: any) => row.city === normalizedCity
    );
    return new Set(cityWatchers.map((row: any) => row.sessionId)).size;
  }, [watcherRows, normalizedCity]);

  // Get alerts for current city, sorted by most recent
  const sharedAlerts = useMemo<SharedAlertView[]>(() => {
    if (!normalizedCity || !Array.isArray(alertRows)) return [];

    return alertRows
      .filter((row: any) => row.city === normalizedCity)
      .sort((a: any, b: any) => Number(b.createdAt) - Number(a.createdAt))
      .slice(0, 6)
      .map((row: any) => ({
        id: String(row.id ?? ""),
        city: String(row.city ?? normalizedCity),
        severity: String(row.severity ?? "info"),
        message: String(row.message ?? ""),
        createdAt: Number(row.createdAt ?? Date.now()),
      }));
  }, [alertRows, normalizedCity]);

  return {
    watcherCount,
    sharedAlerts,
  };
}