import React, { useState } from 'react';
import { Droplets, AlertCircle, TrendingUp } from 'lucide-react';

interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  type: 'wqi' | 'parameter' | 'health-impact';
  status: 'safe' | 'warning' | 'danger';
  historicalValue?: number;
}

interface WaterMetricsProps {
  metrics: Metric[];
  isLoading?: boolean;
  onMetricClick?: (metricId: string) => void;
}

export const WaterMetrics: React.FC<WaterMetricsProps> = ({
  metrics,
  isLoading = false,
  onMetricClick,
}) => {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'wqi':
        return <Droplets className="w-5 h-5" />;
      case 'health-impact':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <TrendingUp className="w-5 h-5" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'safe':
        return {
          bg: 'bg-green-500/20',
          border: 'border-green-500/30',
          text: 'text-green-400',
          badge: 'bg-green-500/30 text-green-300',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-500/30',
          text: 'text-yellow-400',
          badge: 'bg-yellow-500/30 text-yellow-300',
        };
      case 'danger':
        return {
          bg: 'bg-red-500/20',
          border: 'border-red-500/30',
          text: 'text-red-400',
          badge: 'bg-red-500/30 text-red-300',
        };
      default:
        return {
          bg: 'bg-gray-500/20',
          border: 'border-gray-500/30',
          text: 'text-gray-400',
          badge: 'bg-gray-500/30 text-gray-300',
        };
    }
  };

  const getChangePercentage = (historical?: number, current?: number) => {
    if (!historical || !current) return null;
    return (((current - historical) / historical) * 100).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-gray-800/30 rounded-lg border border-border/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {metrics.map((metric) => {
        const style = getStatusStyle(metric.status);
        const change = getChangePercentage(metric.historicalValue, metric.value);
        const isExpanded = expandedMetric === metric.id;

        return (
          <button
            key={metric.id}
            onClick={() => {
              setExpandedMetric(isExpanded ? null : metric.id);
              onMetricClick?.(metric.id);
            }}
            className={`w-full p-3 rounded-lg border-2 transition-all text-left ${style.bg} ${style.border} hover:border-opacity-100`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`${style.text}`}>
                  {getMetricIcon(metric.type)}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{metric.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {metric.type === 'wqi' && 'Water Quality Index'}
                    {metric.type === 'parameter' && 'Water Parameter'}
                    {metric.type === 'health-impact' && 'Health Impact'}
                  </p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-semibold ${style.badge}`}>
                {metric.status.toUpperCase()}
              </div>
            </div>

            {/* Main Value */}
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-white">{metric.value.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">{metric.unit}</span>
            </div>

            {/* Change Indicator */}
            {change !== null && (
              <div className="text-xs text-muted-foreground">
                {parseFloat(change) > 0 ? '↑' : '↓'} {Math.abs(parseFloat(change))}% from last reading
              </div>
            )}

            {/* Expanded Details */}
            {isExpanded && metric.historicalValue !== undefined && (
              <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Previous Value:</span>
                  <span className="text-white font-medium">{metric.historicalValue.toFixed(1)} {metric.unit}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Change:</span>
                  <span className={change && parseFloat(change) > 0 ? 'text-red-400' : 'text-green-400'}>
                    {change && (parseFloat(change) > 0 ? '+' : '')}
                    {change}%
                  </span>
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
