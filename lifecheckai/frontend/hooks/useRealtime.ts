"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type UserPresence,
  type CrowdReport,
  type ActivityEvent,
  broadcastPresence,
  getActivePResence,
  getCrowdReports,
  getActivityFeed,
  submitCrowdReport,
  getSessionId,
  getAvatar,
} from "@/lib/spacetime";

interface UseRealtimeOptions {
  city?: string;
  lat?: number;
  lon?: number;
  enabled?: boolean;
}

export function useRealtime({ city, lat, lon, enabled = true }: UseRealtimeOptions) {
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [crowdReports, setCrowdReports] = useState<CrowdReport[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const sessionId = getSessionId();
  const presenceInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !city || typeof lat !== "number" || typeof lon !== "number") return;

    const broadcast = async () => {
      await broadcastPresence({
        sessionId,
        city,
        lat,
        lon,
        timestamp: Date.now(),
        avatar: getAvatar(sessionId),
      });
    };

    broadcast();
    presenceInterval.current = setInterval(broadcast, 15000);
    return () => {
      if (presenceInterval.current) clearInterval(presenceInterval.current);
    };
  }, [city, enabled, lat, lon, sessionId]);

  useEffect(() => {
    if (!enabled) return;

    const fetchPresence = async () => {
      const data = await getActivePResence();
      const fresh = data.filter(
        (p) => p.sessionId !== sessionId && Date.now() - p.timestamp < 30000
      );
      setPresence(fresh);
      setActiveUserCount(data.length || 1);
    };

    fetchPresence();
    const interval = setInterval(fetchPresence, 8000);
    return () => clearInterval(interval);
  }, [enabled, sessionId]);

  useEffect(() => {
    if (!enabled || typeof lat !== "number" || typeof lon !== "number") return;

    const fetchReports = async () => {
      const data = await getCrowdReports(lat, lon, 50);
      setCrowdReports(data);
    };

    fetchReports();
    const interval = setInterval(fetchReports, 20000);
    return () => clearInterval(interval);
  }, [lat, lon, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const fetchActivity = async () => {
      const data = await getActivityFeed(15);
      setActivityFeed(data);
    };

    fetchActivity();
    feedInterval.current = setInterval(fetchActivity, 10000);
    return () => {
      if (feedInterval.current) clearInterval(feedInterval.current);
    };
  }, [enabled]);

  const addCrowdReport = useCallback(
    async (report: Omit<CrowdReport, "id" | "upvotes" | "timestamp" | "sessionId">) => {
      const optimistic: CrowdReport = {
        ...report,
        id: `optimistic-${Date.now()}`,
        upvotes: 0,
        timestamp: Date.now(),
        sessionId,
      };
      setCrowdReports((prev) => [optimistic, ...prev]);

      const result = await submitCrowdReport({ ...report, sessionId });
      if (result) {
        setCrowdReports((prev) => [result, ...prev.filter((item) => item.id !== optimistic.id)]);
      }
      return result;
    },
    [sessionId]
  );

  return {
    presence,
    crowdReports,
    activityFeed,
    activeUserCount,
    sessionId,
    addCrowdReport,
  };
}
