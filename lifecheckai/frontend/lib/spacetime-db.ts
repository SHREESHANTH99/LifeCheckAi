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
export const useCityData = (): [CityData[], boolean] => {
  try {
    return useTable("city_data" as any) as unknown as [CityData[], boolean];
  } catch {
    return [[], false];
  }
};

export const useCityWatchers = (): [CityWatcher[], boolean] => {
  try {
    return useTable("city_watcher" as any) as unknown as [CityWatcher[], boolean];
  } catch {
    return [[], false];
  }
};

export const useSharedAlerts = (): [SharedAlert[], boolean] => {
  try {
    return useTable("shared_alert" as any) as unknown as [SharedAlert[], boolean];
  } catch {
    return [[], false];
  }
};

// Reducer wrappers - with error boundary
export const useSaveCityData = () => {
  try {
    return useSpacetimeReducer("save_city_data" as any);
  } catch {
    return async () => {};
  }
};

export const useJoinCity = () => {
  try {
    return useSpacetimeReducer("join_city" as any);
  } catch {
    return async () => {};
  }
};

export const useLeaveCity = () => {
  try {
    return useSpacetimeReducer("leave_city" as any);
  } catch {
    return async () => {};
  }
};

export const usePushAlert = () => {
  try {
    return useSpacetimeReducer("push_alert" as any);
  } catch {
    return async () => {};
  }
};