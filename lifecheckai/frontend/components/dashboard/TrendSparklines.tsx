import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SparklineData {
  value: number;
  timestamp: string;
}

interface TrendSparklineProps {
  metric: 'aqi' | 'temperature' | 'uv' | 'pollen';
  data: SparklineData[];
  current: number;
  unit: string;
  label: string;
}

export const TrendSparklines: React.FC<TrendSparklineProps> = ({
  metric,
  data,
  current,
  unit,
  label,
}) => {
  const maxValue = Math.max(...data.map(d => d.value), 100);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;

  // Calculate trend
  const firstValue = data[0]?.value || current;
  const lastValue = data[data.length - 1]?.value || current;
  const changePercent = ((lastValue - firstValue) / firstValue) * 100;
  const trend = Math.abs(changePercent) > 10 ? (changePercent > 0 ? 'up' : 'down') : 'stable';

  // Generate SVG sparkline
  const points = data.map((d, idx) => {
    const x = (idx / (data.length - 1)) * 80;
    const y = 32 - ((d.value - minValue) / range) * 30;
    return `${x},${y}`;
  });

  const getColor = (metric: string) => {
    const metricLower = metric.toLowerCase();
    if (metricLower === 'aqi') return '#ef4444';
    if (metricLower === 'temperature') return '#f97316';
    if (metricLower === 'uv') return '#eab308';
    return '#10b981';
  };

  return (
    <div className="p-3 bg-gradient-to-br from-gray-800/50 to-gray-900/30 rounded-lg border border-border/50 hover:border-border transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{current}</span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {trend === 'up' && (
            <>
              <TrendingUp className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-red-400 font-semibold">{changePercent.toFixed(0)}%</span>
            </>
          )}
          {trend === 'down' && (
            <>
              <TrendingDown className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-green-400 font-semibold">{Math.abs(changePercent).toFixed(0)}%</span>
            </>
          )}
        </div>
      </div>

      {/* Sparkline chart */}
      <svg viewBox="0 0 80 32" className="w-full h-12">
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={getColor(metric)}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Labels */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>{data[0]?.timestamp || '6h ago'}</span>
        <span>Now</span>
      </div>
    </div>
  );
};
