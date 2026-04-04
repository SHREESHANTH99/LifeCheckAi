import React from 'react';

interface WeatherCardProps {
  city: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  uvAdvice: string;
  weatherIcon: string;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  city,
  temperature,
  humidity,
  windSpeed,
  uvIndex,
  uvAdvice,
  weatherIcon = '🌤️',
}) => {
  const uvColor = uvIndex < 3 ? 'text-green-400' : uvIndex < 6 ? 'text-yellow-400' : uvIndex < 8 ? 'text-orange-400' : 'text-red-400';

  return (
    <div className="my-3 space-y-0 border border-border rounded-lg p-4 bg-blue-500/5 animate-slide-down">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{weatherIcon}</span>
          <span className="font-semibold text-white">Weather — {city}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{temperature}°C</div>
          <div className="text-xs text-muted-foreground">Temperature</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400">{humidity}%</div>
          <div className="text-xs text-muted-foreground">Humidity</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-cyan-400">{windSpeed}</div>
          <div className="text-xs text-muted-foreground">km/h Wind</div>
        </div>
      </div>

      <div className="border-t border-border/50 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-white">UV Index: <span className={uvColor}>{uvIndex}</span></span>
          <span className="text-xs text-amber-200">(Very High)</span>
        </div>
        <p className="text-xs text-muted-foreground">⚠️ {uvAdvice}</p>
      </div>
    </div>
  );
};
