import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Parameter {
  name: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  range: { min: number; max: number };
  status: 'safe' | 'warning' | 'danger';
}

interface WaterComparisonProps {
  parameters: Parameter[];
  location: string;
  timestamp?: string;
}

export const WaterComparison: React.FC<WaterComparisonProps> = ({ 
  parameters, 
  location,
  timestamp 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe':
        return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
      case 'warning':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
      case 'danger':
        return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
      default:
        return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' };
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-400" />;
      default:
        return <div className="w-1 h-1 rounded-full bg-gray-400" />;
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'safe':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'danger':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-white">{location}</h3>
          {timestamp && (
            <p className="text-xs text-muted-foreground mt-1">{timestamp}</p>
          )}
        </div>
      </div>

      {/* Parameters Grid */}
      <div className="space-y-3">
        {parameters.map((param) => {
          const colors = getStatusColor(param.status);
          const percentage = ((param.value - param.range.min) / (param.range.max - param.range.min)) * 100;

          return (
            <div
              key={param.name}
              className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
            >
              {/* Name and Value */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-white">{param.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Range: {param.range.min} - {param.range.max} {param.unit}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {param.value.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">{param.unit}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(param.status)} transition-all`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                  />
                </div>
              </div>

              {/* Trend */}
              <div className="flex items-center gap-2 mt-2">
                {getTrendIcon(param.trend)}
                <span className="text-xs text-muted-foreground">
                  {param.trend === 'up' && 'Increasing'}
                  {param.trend === 'down' && 'Decreasing'}
                  {param.trend === 'stable' && 'Stable'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
        <div className="p-2 bg-gray-800/30 rounded-lg text-center">
          <div className="text-xs text-muted-foreground mb-1">Safe</div>
          <div className={`text-sm font-semibold text-green-400`}>
            {parameters.filter(p => p.status === 'safe').length}
          </div>
        </div>
        <div className="p-2 bg-gray-800/30 rounded-lg text-center">
          <div className="text-xs text-muted-foreground mb-1">Warning</div>
          <div className={`text-sm font-semibold text-yellow-400`}>
            {parameters.filter(p => p.status === 'warning').length}
          </div>
        </div>
        <div className="p-2 bg-gray-800/30 rounded-lg text-center">
          <div className="text-xs text-muted-foreground mb-1">Danger</div>
          <div className={`text-sm font-semibold text-red-400`}>
            {parameters.filter(p => p.status === 'danger').length}
          </div>
        </div>
      </div>
    </div>
  );
};
