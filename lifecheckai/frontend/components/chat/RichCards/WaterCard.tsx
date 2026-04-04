import React from 'react';

interface WaterCardProps {
  state: string;
  wqi: number;
  violations: number;
  primaryConcern: string;
}

export const WaterCard: React.FC<WaterCardProps> = ({ state, wqi, violations, primaryConcern }) => {
  const getWaterColor = (wqi: number) => {
    if (wqi >= 70) return { bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'SAFE' };
    if (wqi >= 50) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'MODERATE' };
    return { bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'UNSAFE' };
  };

  const colors = getWaterColor(wqi);

  return (
    <div className={`my-3 border ${colors.border} ${colors.bg} rounded-lg p-4 animate-slide-down`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">💧</span>
          <span className="font-semibold text-white">Water Quality — {state}</span>
        </div>
        <div className="text-xs px-2 py-1 bg-white/10 rounded text-white font-semibold">
          {colors.label}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Predicted WQI</span>
            <span className="text-lg font-bold text-white">{wqi.toFixed(1)}</span>
          </div>
          <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                wqi >= 70 ? 'bg-green-500' : wqi >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${(wqi / 100) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">BIS Violations</span>
          <span className="text-white font-semibold">{violations} parameters</span>
        </div>

        <div className="text-sm">
          <div className="text-muted-foreground mb-1">Primary Concern</div>
          <div className="text-white">{primaryConcern}</div>
        </div>
      </div>

      <button className="text-xs text-accent-blue hover:text-blue-300 transition-colors">
        Full Water Analysis →
      </button>
    </div>
  );
};
