import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CityLiveData {
  name: string;
  aqi: number;
  status: string;
  timestamp: string;
  trend?: 'up' | 'down' | 'stable';
}

interface LiveDemoTickerProps {
  autoplay?: boolean;
  interval?: number;
}

export const LiveDemoTicker: React.FC<LiveDemoTickerProps> = ({ autoplay = true, interval = 4000 }) => {
  const [cities, setCities] = useState<CityLiveData[]>([
    { name: 'Delhi', aqi: 187, status: 'UNSAFE', timestamp: 'Just now', trend: 'up' },
    { name: 'Mumbai', aqi: 112, status: 'MODERATE', timestamp: '2 min ago', trend: 'down' },
    { name: 'Bangalore', aqi: 89, status: 'MODERATE', timestamp: '3 min ago', trend: 'stable' },
    { name: 'Chennai', aqi: 73, status: 'SAFE', timestamp: '5 min ago', trend: 'down' },
    { name: 'Hyderabad', aqi: 95, status: 'MODERATE', timestamp: 'Just now', trend: 'up' },
    { name: 'Kolkata', aqi: 156, status: 'UNSAFE', timestamp: '1 min ago', trend: 'stable' },
  ]);

  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    if (!autoplay) return;

    const interval = setInterval(() => {
      setScrollPos((prev) => (prev + 1) % cities.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [autoplay, cities.length]);

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return { bg: 'bg-green-500/20', text: 'text-green-300', badge: 'bg-green-500' };
    if (aqi <= 100) return { bg: 'bg-yellow-500/20', text: 'text-yellow-300', badge: 'bg-yellow-500' };
    if (aqi <= 150) return { bg: 'bg-orange-500/20', text: 'text-orange-300', badge: 'bg-orange-500' };
    return { bg: 'bg-red-500/20', text: 'text-red-300', badge: 'bg-red-500' };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-semibold text-red-400">LIVE</span>
        </div>
        <span className="text-xs text-muted-foreground">Real-time data from across India</span>
      </div>

      {/* Scrolling ticker */}
      <div className="overflow-hidden bg-gray-900/40 rounded-lg border border-border">
        <div className="flex gap-3 p-3 overflow-x-auto scrollbar-hide">
          {[...cities, ...cities].map((city, idx) => {
            const colors = getAQIColor(city.aqi);
            const isCurrent = Math.floor(idx / cities.length) === 0 && idx === scrollPos;

            return (
              <div
                key={`${city.name}-${idx}`}
                className={`flex-shrink-0 w-36 p-3 rounded-lg border transition-all ${
                  isCurrent
                    ? 'border-accent-blue bg-blue-500/10 scale-105'
                    : `border-border ${colors.bg}`
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white text-sm">{city.name}</span>
                  {city.trend === 'up' && <TrendingUp className="w-3 h-3 text-red-400" />}
                  {city.trend === 'down' && <TrendingDown className="w-3 h-3 text-green-400" />}
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold text-white">{city.aqi}</span>
                  <span className="text-xs text-muted-foreground">AQI</span>
                </div>

                <div className="text-xs text-muted-foreground">{city.timestamp}</div>
                <div className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-semibold ${colors.text}`}>
                  {city.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* City quick access */}
      <div className="flex flex-wrap gap-2">
        {cities.slice(0, 4).map((city) => (
          <button
            key={city.name}
            onClick={() => setScrollPos(cities.indexOf(city))}
            className="px-3 py-1.5 text-xs rounded-full border border-border bg-gray-800/30 hover:border-accent-blue hover:bg-blue-500/10 transition-all text-muted-foreground hover:text-white"
          >
            {city.name}
          </button>
        ))}
      </div>
    </div>
  );
};
