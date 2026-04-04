"use client";

import { useReducer as useSpacetimeReducer, useTable } from "spacetimedb/react";

// Type definitions for SpaceTimeDB tables
export interface CityData {
  id: bigint;
  city: string;
  data: string;
  timestamp: bigint;
}

export interface CityWatcher {
  sessionId: string;
  city: string;
  joinedAt: bigint;
}

export interface SharedAlert {
  id: bigint;
  city: string;
  severity: string;
  message: string;
  createdAt: bigint;
}

// Table subscriptions - with error boundary
export const useCityData = () => {
  try {
    return useTable("city_data");
  } catch {
    return [[]];
  }
};

export const useCityWatchers = () => {
  try {
    return useTable("city_watcher");
  } catch {
    return [[]];
  }
};

export const useSharedAlerts = () => {
  try {
    return useTable("shared_alert");
  } catch {
    return [[]];
  }
};

// Reducer wrappers - with error boundary
export const useSaveCityData = () => {
  try {
    return useSpacetimeReducer("save_city_data");
  } catch {
    return async () => {};
  }
};

export const useJoinCity = () => {
  try {
    return useSpacetimeReducer("join_city");
  } catch {
    return async () => {};
  }
};

export const useLeaveCity = () => {
  try {
    return useSpacetimeReducer("leave_city");
  } catch {
    return async () => {};
  }
};

export const usePushAlert = () => {
  try {
    return useSpacetimeReducer("push_alert");
  } catch {
    return async () => {};
  }
};