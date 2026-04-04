"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSafety } from "@/app/context/SafetyContext";
import type { SafetyData } from "@/types";
import { showToast } from "@/components/ui/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

function getCached(city: string): { data: SafetyData; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(`lifecheck_${city.toLowerCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

function setCache(city: string, data: SafetyData) {
  try {
    localStorage.setItem(
      `lifecheck_${city.toLowerCase()}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // localStorage full or unavailable
  }
}

export function useSafetyData() {
  const { state, dispatch } = useSafety();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(
    async (city: string) => {
      if (!city.trim()) return;

      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "CLEAR_ERROR" });

      try {
        const res = await fetch(`${API_BASE}/api/check-safety?city=${encodeURIComponent(city)}`);

        if (!res.ok) {
          throw new Error(res.status === 404 ? "City not found. Please check spelling." : `Server error (${res.status})`);
        }

        const data: SafetyData = await res.json();
        dispatch({ type: "SET_DATA", payload: data });
        setCache(city, data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch safety data";

        // Try cached data
        const cached = getCached(city);
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
          dispatch({ type: "SET_DATA", payload: cached.data });
          showToast("warning", "Using cached data. Connection issue detected.");
        } else {
          dispatch({ type: "SET_ERROR", payload: message });
          showToast("error", message);
        }
      }
    },
    [dispatch]
  );

  const search = useCallback(
    (city: string) => {
      dispatch({ type: "SET_CITY", payload: city });
      fetchData(city);
    },
    [dispatch, fetchData]
  );

  const refresh = useCallback(() => {
    if (state.city) {
      fetchData(state.city);
    }
  }, [state.city, fetchData]);

  // Auto-poll every 60s
  useEffect(() => {
    if (state.city) {
      intervalRef.current = setInterval(() => {
        fetchData(state.city);
      }, 60000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.city, fetchData]);

  return {
    data: state.safetyData,
    loading: state.loading,
    error: state.error,
    city: state.city,
    lastUpdated: state.lastUpdated,
    search,
    refresh,
  };
}
