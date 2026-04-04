"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSafety } from "@/app/context/SafetyContext";
import type { SafetyData } from "@/types";
import { showToast } from "@/components/ui/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

type RawSafetyPayload = Record<string, unknown> & {
  air_quality?: Record<string, unknown>;
  air?: Record<string, unknown>;
  weather?: Record<string, unknown>;
  pollen?: Record<string, unknown>;
};

function normalizeSafetyData(payload: RawSafetyPayload): SafetyData {
  const airSource = payload?.air_quality ?? payload?.air ?? {};
  const weatherSource = payload?.weather ?? {};
  const pollenSource = payload?.pollen ?? {};

  const weather = {
    temp_celsius:
      typeof weatherSource?.temp_celsius === "number"
        ? weatherSource.temp_celsius
        : typeof weatherSource?.temp === "number"
          ? weatherSource.temp
          : null,
    feels_like:
      typeof weatherSource?.feels_like === "number" ? weatherSource.feels_like : null,
    humidity_percent:
      typeof weatherSource?.humidity_percent === "number"
        ? weatherSource.humidity_percent
        : typeof weatherSource?.humidity === "number"
          ? weatherSource.humidity
          : null,
    condition:
      typeof weatherSource?.condition === "string" ? weatherSource.condition : "Unknown",
    uv_index: typeof weatherSource?.uv_index === "number" ? weatherSource.uv_index : null,
    wind_speed:
      typeof weatherSource?.wind_speed === "number" ? weatherSource.wind_speed : null,
    level:
      typeof weatherSource?.level === "string"
        ? weatherSource.level
        : typeof weatherSource?.status === "string"
          ? weatherSource.status
          : "Unknown",
    safe:
      typeof weatherSource?.safe === "boolean"
        ? weatherSource.safe
        : String(weatherSource?.status || "").toUpperCase() === "SAFE",
    advice:
      typeof weatherSource?.advice === "string" ? weatherSource.advice : "",
  };

  const air_quality = {
    aqi: typeof airSource?.aqi === "number" ? airSource.aqi : null,
    category:
      typeof airSource?.category === "string"
        ? airSource.category
        : typeof airSource?.status === "string"
          ? airSource.status
          : "Unknown",
    dominant_pollutant:
      typeof airSource?.dominant_pollutant === "string" ? airSource.dominant_pollutant : "",
    pollutants:
      airSource?.pollutants && typeof airSource.pollutants === "object"
        ? airSource.pollutants
        : {},
    level:
      typeof airSource?.level === "string"
        ? airSource.level
        : typeof airSource?.status === "string"
          ? airSource.status
          : "Unknown",
    safe:
      typeof airSource?.safe === "boolean"
        ? airSource.safe
        : String(airSource?.status || "").toUpperCase() === "SAFE",
    advice: typeof airSource?.advice === "string" ? airSource.advice : "",
  };

  const pollen = {
    types:
      pollenSource?.types && typeof pollenSource.types === "object"
        ? pollenSource.types
        : typeof pollenSource === "object" && pollenSource !== null
          ? pollenSource
          : {},
    level: typeof pollenSource?.level === "string" ? pollenSource.level : "Unknown",
    advice: typeof pollenSource?.advice === "string" ? pollenSource.advice : "",
  };

  return {
    ...payload,
    air_quality,
    weather,
    pollen,
  } as SafetyData;
}

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

        const raw = await res.json();
        const data: SafetyData = normalizeSafetyData(raw);
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

  const locateMe = useCallback(async () => {
    if (!navigator.geolocation) {
      showToast("error", "Geolocation is not supported in this browser.");
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "CLEAR_ERROR" });

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      const res = await fetch(
        `${API_BASE}/api/check-safety-by-coordinates?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
      );

      if (!res.ok) {
        throw new Error(`Unable to resolve current location (${res.status})`);
      }

      const raw = await res.json();
      const data: SafetyData = normalizeSafetyData(raw);
      dispatch({ type: "SET_DATA", payload: data });
      setCache(data.city || "current-location", data);
      showToast("success", `Using your current location: ${data.city}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to use current location.";
      dispatch({ type: "SET_ERROR", payload: message });
      showToast("error", message);
    }
  }, [dispatch]);

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
    locateMe,
  };
}
