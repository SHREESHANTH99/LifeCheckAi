// @ts-nocheck
import { useState, useCallback, useEffect } from 'react';

interface WaterQualityData {
  wqi: number;
  status: string;
  location: string;
  timestamp: string;
  temperature?: number;
  ph?: number;
  conductivity?: number;
  parameters: Record<string, number>;
  metrics: Array<{
    id: string;
    name: string;
    value: number;
    unit: string;
    type: 'wqi' | 'parameter' | 'health-impact';
    status: 'safe' | 'warning' | 'danger';
  }>;
}

interface UseWaterQualityReturn {
  data: WaterQualityData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setLocation: (location: string) => void;
}

export function useWaterQuality(initialLocation: string = 'Delhi'): UseWaterQualityReturn {
  const [data, setData] = useState<WaterQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [location, setLocation] = useState(initialLocation);

  const fetchWaterData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/water/quality?location=${encodeURIComponent(location)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch water quality data: ${response.statusText}`);
      }

      const waterData = await response.json();
      setData(waterData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchWaterData();

    // Set up polling for updates every 5 minutes
    const interval = setInterval(fetchWaterData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchWaterData]);

  return {
    data,
    loading,
    error,
    refetch: fetchWaterData,
    setLocation,
  };
}

/**
 * Hook for managing water quality alerts
 */
export function useWaterAlerts(location: string) {
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/water/alerts?location=${encodeURIComponent(location)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch water alerts');
      }

      const alertsData = await response.json();
      setAlerts(alertsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (location) {
      fetchAlerts();
    }
  }, [location, fetchAlerts]);

  return {
    alerts,
    loading,
    error,
    refetch: fetchAlerts,
  };
}

/**
 * Hook for water quality historical data
 */
export function useWaterHistory(location: string, period: 'day' | 'week' | 'month' = 'day') {
  const [data, setData] = useState<Array<{
    timestamp: string;
    wqi: number;
    temperature: number;
    ph: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/water/history?location=${encodeURIComponent(location)}&period=${period}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch water history');
      }

      const historyData = await response.json();
      setData(historyData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [location, period]);

  useEffect(() => {
    if (location) {
      fetchHistory();
    }
  }, [location, period, fetchHistory]);

  return {
    data,
    loading,
    error,
    refetch: fetchHistory,
  };
}

/**
 * Hook for water quality recommendations
 */
export function useWaterRecommendations(location: string) {
  const [recommendations, setRecommendations] = useState<Array<{
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    action: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/water/recommendations?location=${encodeURIComponent(location)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const recsData = await response.json();
      setRecommendations(recsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (location) {
      fetchRecommendations();
    }
  }, [location, fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    refetch: fetchRecommendations,
  };
}

/**
 * Hook for comparing water quality across locations
 */
export function useWaterComparison(locations: string[]) {
  const [data, setData] = useState<Record<string, WaterQualityData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchComparison = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const promises = locations.map((location) =>
        fetch(`/api/water/quality?location=${encodeURIComponent(location)}`).then((res) =>
          res.json()
        )
      );

      const results = await Promise.all(promises);
      const comparisonData: Record<string, WaterQualityData> = {};

      locations.forEach((location, index) => {
        comparisonData[location] = results[index];
      });

      setData(comparisonData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      setData({});
    } finally {
      setLoading(false);
    }
  }, [locations.join(',')]);

  useEffect(() => {
    if (locations.length > 0) {
      fetchComparison();
    }
  }, [locations.join(','), fetchComparison]);

  return {
    data,
    loading,
    error,
    refetch: fetchComparison,
  };
}
