import React from 'react';

interface ForecastHour {
  hour: number;
  aqi: number;
  temp: number;
}

interface TimelineCardProps {
  city: string;
  forecast: ForecastHour[];
  bestWindow?: number;
}

export const TimelineCard: React.FC<TimelineCardProps> = ({ city, forecast, bestWindow = 0 }) => {
  const maxAQI = Math.max(...forecast.map(f => f.aqi), 200);

  return (
    <div className="my-3 border border-border rounded-lg p-4 bg-purple-500/5 animate-slide-down">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📅</span>
        <span className="font-semibold text-white">Next 6 Hours — {city}</span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {forecast.map((hour, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center gap-2 flex-shrink-0 p-2 rounded-lg transition-all ${
              idx === bestWindow ? 'bg-green-500/30 border border-green-500/50' : 'bg-gray-800/50'
            }`}
          >
            <div className="text-xs font-semibold text-muted-foreground">{hour.hour}:00</div>
            <div className="w-6 bg-gray-700 rounded-full overflow-hidden h-20">
              <div
                className={`w-full transition-all ${
                  hour.aqi <= 50 ? 'bg-green-500' : hour.aqi <= 100 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ height: `${(hour.aqi / maxAQI) * 100}%` }}
              />
            </div>
            <div className="text-xs text-white font-semibold">{hour.aqi}</div>
            <div className="text-xs text-muted-foreground">{hour.temp}°</div>
            {idx === bestWindow && <div className="text-lg">⭐</div>}
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground mt-3 px-2 py-1.5 bg-gray-800/30 rounded">
        ✨ Best window: {forecast[bestWindow]?.hour}:00 (lowest AQI)
      </div>
    </div>
  );
};
