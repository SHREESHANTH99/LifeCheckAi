import React from 'react';

interface DataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

interface WaterChartProps {
  data: DataPoint[];
  title: string;
  unit: string;
  min?: number;
  max?: number;
  threshold?: number;
  isLoading?: boolean;
}

export const WaterChart: React.FC<WaterChartProps> = ({
  data,
  title,
  unit,
  min = 0,
  max = 100,
  threshold,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-lg border border-border/50 h-64 animate-pulse">
        <div className="h-6 bg-gray-700 rounded mb-4 w-1/4" />
        <div className="h-48 bg-gray-700 rounded" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-lg border border-border/50 h-64 flex items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Calculate min and max values from data
  const values = data.map(d => d.value);
  const dataMin = Math.min(...values, min);
  const dataMax = Math.max(...values, max);
  const range = dataMax - dataMin;
  const normalizedMin = dataMin - range * 0.1;
  const normalizedMax = dataMax + range * 0.1;

  const getColor = (value: number) => {
    if (threshold && value > threshold) return '#ef4444'; // red
    if (value > (max * 0.75)) return '#f59e0b'; // amber
    if (value > (max * 0.5)) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  const getBarHeight = (value: number, minVal: number, maxVal: number) => {
    return ((value - minVal) / (maxVal - minVal)) * 100;
  };

  // Limit to last 24 points for readability
  const displayData = data.slice(-24);

  return (
    <div className="p-4 bg-gray-800/30 rounded-lg border border-border/50 space-y-4">
      {/* Title */}
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">Last {displayData.length} readings</p>
      </div>

      {/* Chart Area */}
      <div className="flex items-end gap-1 h-32 bg-gray-900/30 rounded p-3">
        {displayData.map((point, index) => {
          const height = getBarHeight(point.value, normalizedMin, normalizedMax);
          const color = getColor(point.value);

          return (
            <div
              key={`${point.timestamp}-${index}`}
              className="flex-1 group relative"
              title={`${point.value} ${unit} at ${point.timestamp}`}
            >
              <div
                className="w-full rounded-t transition-all hover:opacity-80 cursor-pointer"
                style={{
                  height: `${Math.max(height, 5)}%`,
                  backgroundColor: color,
                }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="bg-gray-900 border border-border/50 rounded px-2 py-1 whitespace-nowrap text-xs">
                    <p className="text-white font-semibold">{point.value.toFixed(1)} {unit}</p>
                    <p className="text-muted-foreground">{point.timestamp}</p>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scale Info */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Latest: {displayData[displayData.length - 1]?.value.toFixed(2)} {unit}</span>
          <span>
            Avg: {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)} {unit}
          </span>
        </div>

        {/* Color Legend */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Normal</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">Caution</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-muted-foreground">Warning</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Critical</span>
          </div>
        </div>
      </div>
    </div>
  );
};
