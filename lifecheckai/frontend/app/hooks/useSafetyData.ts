// frontend/app/hooks/useSafetyData.ts

import { useState, useEffect } from "react";

const API_BASE = "http://127.0.0.1:8000";

export function useSafetyData(city: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/check-safety?city=${city}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 60 seconds for real-time updates
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [city]);

  return { data, loading, error, refresh: fetchData };
}
