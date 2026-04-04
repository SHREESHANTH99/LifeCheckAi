import React, { useEffect, useState } from 'react';

interface ComparisonCardProps {
  cities: [string, string];
  onDataLoaded?: (data: any) => void;
}

interface CityData {
  city: string;
  aqi: number;
  temperature: number;
  status: string;
  verdict: string;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({ cities, onDataLoaded }) => {
  const [data, setData] = useState<{ city1: CityData; city2: CityData } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [res1, res2] = await Promise.all([
          fetch(`/api/check-safety?city=${cities[0]}`),
          fetch(`/api/check-safety?city=${cities[1]}`),
        ]);

        if (res1.ok && res2.ok) {
          const d1 = await res1.json();
          const d2 = await res2.json();

          const city1Data: CityData = {
            city: cities[0],
            aqi: d1.aqi || 0,
            temperature: d1.temperature || 0,
            status: d1.status || 'UNKNOWN',
            verdict: d1.verdict || 'UNKNOWN',
          };

          const city2Data: CityData = {
            city: cities[1],
            aqi: d2.aqi || 0,
            temperature: d2.temperature || 0,
            status: d2.status || 'UNKNOWN',
            verdict: d2.verdict || 'UNKNOWN',
          };

          setData({ city1: city1Data, city2: city2Data });
          onDataLoaded?.({ city1: city1Data, city2: city2Data });
        }
      } catch (error) {
        console.error('Error fetching comparison data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cities, onDataLoaded]);

  if (loading) {
    return (
      <div className="my-3 border border-border rounded-lg p-4 bg-gray-800/50 animate-pulse">
        <div className="h-32 bg-gray-700/50 rounded"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="my-3 border border-border rounded-lg p-4 bg-red-500/10 text-red-200 text-sm">
        Failed to load comparison data
      </div>
    );
  }

  const isSafer = data.city1.aqi < data.city2.aqi;
  const winnerCity = isSafer ? data.city1 : data.city2;
  const difference = Math.abs(data.city1.aqi - data.city2.aqi);

  const getVerdictColor = (verdict: string) => {
    if (verdict === 'SAFE') return { bg: 'bg-green-500/20', text: 'text-green-100' };
    if (verdict === 'CAUTION') return { bg: 'bg-yellow-500/20', text: 'text-yellow-100' };
    return { bg: 'bg-red-500/20', text: 'text-red-100' };
  };

  return (
    <div className="my-3 border border-blue-500/20 rounded-lg overflow-hidden bg-blue-500/5 animate-slide-down">
      <div className="px-4 py-3 border-b border-blue-500/10 flex items-center gap-2">
        <span className="text-lg">🔄</span>
        <span className="font-semibold text-white">City Comparison</span>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4">
        {/* City 1 */}
        <div className="space-y-2">
          <div className="font-semibold text-white">{data.city1.city}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{Math.round(data.city1.aqi)}</span>
            <div className={`text-xs px-1.5 py-0.5 rounded ${getVerdictColor(data.city1.verdict).bg} ${getVerdictColor(data.city1.verdict).text}`}>
              {data.city1.verdict}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <div>🌡️ {Math.round(data.city1.temperature)}°C</div>
            <div>AQI Score</div>
          </div>
        </div>

        {/* City 2 */}
        <div className="space-y-2">
          <div className="font-semibold text-white">{data.city2.city}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{Math.round(data.city2.aqi)}</span>
            <div className={`text-xs px-1.5 py-0.5 rounded ${getVerdictColor(data.city2.verdict).bg} ${getVerdictColor(data.city2.verdict).text}`}>
              {data.city2.verdict}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <div>🌡️ {Math.round(data.city2.temperature)}°C</div>
            <div>AQI Score</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-amber-500/10 border-t border-amber-500/10">
        <div className="text-sm font-semibold text-amber-100 mb-1">
          🏆 {winnerCity.city} is safer right now
        </div>
        <div className="text-xs text-amber-100/70">
          {difference.toFixed(0)} point difference in AQI (lower is better)
        </div>
      </div>
    </div>
  );
};
