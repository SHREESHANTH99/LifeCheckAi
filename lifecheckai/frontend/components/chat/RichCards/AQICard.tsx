import React from 'react';

interface AQICardProps {
  city: string;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  advice: string;
}

const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-100', label: 'GOOD' };
  if (aqi <= 100) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-100', label: 'MODERATE' };
  if (aqi <= 150) return { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-100', label: 'UNHEALTHY' };
  if (aqi <= 200) return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-100', label: 'VERY UNHEALTHY' };
  return { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-100', label: 'HAZARDOUS' };
};

const getAQIBgColor = (aqi: number) => {
  if (aqi <= 50) return 'border-l-green-500';
  if (aqi <= 100) return 'border-l-yellow-500';
  if (aqi <= 150) return 'border-l-orange-500';
  if (aqi <= 200) return 'border-l-red-500';
  return 'border-l-purple-500';
};

export const AQICard: React.FC<AQICardProps> = ({ city, aqi, pm25, pm10, no2, advice }) => {
  const colors = getAQIColor(aqi);
  const borderColor = getAQIBgColor(aqi);

  return (
    <div className={`my-3 border-l-4 ${borderColor} ${colors.bg} border border-l-4 rounded-lg p-4 animate-slide-down`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌫️</span>
          <span className="font-semibold text-white">Air Quality — {city}</span>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-semibold ${colors.text}`}>
          {colors.label}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-2xl font-bold text-white">{aqi}</div>
          <div className="text-xs text-muted-foreground">{colors.label}</div>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>PM2.5:</span>
            <span className="text-white font-semibold">{pm25} μg/m³</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>PM10:</span>
            <span className="text-white font-semibold">{pm10}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>NO₂:</span>
            <span className="text-white font-semibold">{no2}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 pt-3">
        <p className="text-xs text-muted-foreground">{advice}</p>
      </div>
      <button className="mt-3 text-xs text-accent-blue hover:text-blue-300 transition-colors">
        View Full Report →
      </button>
    </div>
  );
};
