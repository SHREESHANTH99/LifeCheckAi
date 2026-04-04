import React, { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';

interface PollutantData {
  name: string;
  value: number;
  unit: string;
  whoLimit: number;
  description: string;
  icon: string;
}

interface PollutantDrilldownProps {
  pollutants: PollutantData[];
  sources?: string[];
}

export const PollutantDrilldown: React.FC<PollutantDrilldownProps> = ({
  pollutants = [
    { name: 'PM2.5', value: 142, unit: 'μg/m³', whoLimit: 15, icon: '💨', description: 'Fine particles penetrate deep into lungs. Primary cause of respiratory disease.' },
    { name: 'PM10', value: 89, unit: 'μg/m³', whoLimit: 45, icon: '💨', description: 'Coarse particles affect upper respiratory tract.' },
    { name: 'NO₂', value: 45, unit: 'ppb', whoLimit: 40, icon: '🏭', description: 'From vehicle emissions. Aggravates asthma.' },
    { name: 'O₃', value: 62, unit: 'ppb', whoLimit: 70, icon: '☀️', description: 'Ground-level ozone causes lung irritation.' },
  ],
  sources = ['🚗 Vehicle Emissions', '🏭 Industrial', '🌾 Burning'],
}) => {
  const [expanded, setExpanded] = useState(false);

  const getBarColor = (value: number, limit: number) => {
    const ratio = value / limit;
    if (ratio < 1) return 'bg-green-500';
    if (ratio < 2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-800/50 border border-border rounded-lg hover:border-accent-blue transition-colors"
      >
        <span className="font-semibold text-white">📊 Detailed Pollutant Breakdown</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-3 p-4 bg-gray-800/30 rounded-lg border border-border animate-slide-down">
          {/* Pollutants */}
          <div className="space-y-3">
            {pollutants.map((p, idx) => {
              const ratio = p.value / p.whoLimit;
              const color = getBarColor(p.value, p.whoLimit);

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.icon}</span>
                      <span className="font-semibold text-white text-sm">{p.name}</span>
                    </div>
                    <span className="text-sm font-bold text-white">
                      {p.value} {p.unit}
                    </span>
                  </div>

                  <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${color}`}
                      style={{ width: `${Math.min((ratio / 2) * 100, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="text-xs text-muted-foreground">
                      WHO Safe: {p.whoLimit} {p.unit}
                    </div>
                    {ratio > 1 && (
                      <span className="text-xs text-red-300 font-semibold">
                        {ratio.toFixed(1)}x over limit
                      </span>
                    )}
                  </div>

                  {/* Tooltip */}
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-gray-900/50 p-2 rounded border border-border/50 hover:border-border transition-colors cursor-help">
                    <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>{p.description}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sources */}
          <div className="pt-3 border-t border-border/50">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Primary pollution sources:
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((source, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-xs font-medium"
                >
                  {source}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
