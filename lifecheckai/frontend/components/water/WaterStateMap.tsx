import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

interface StateWaterData {
  state: string;
  wqi: number;
  status: string;
}

interface WaterStateMapProps {
  onStateSelect?: (state: string) => void;
  selectedState?: string;
}

export const WaterStateMap: React.FC<WaterStateMapProps> = ({
  onStateSelect,
  selectedState = '',
}) => {
  const [states] = useState<StateWaterData[]>([
    { state: 'Delhi', wqi: 62, status: 'MODERATE' },
    { state: 'Maharashtra', wqi: 75, status: 'SAFE' },
    { state: 'Karnataka', wqi: 68, status: 'MODERATE' },
    { state: 'Tamil Nadu', wqi: 55, status: 'MODERATE' },
    { state: 'Telangana', wqi: 72, status: 'SAFE' },
    { state: 'West Bengal', wqi: 48, status: 'MODERATE' },
    { state: 'Punjab', wqi: 45, status: 'MODERATE' },
    { state: 'Gujarat', wqi: 58, status: 'MODERATE' },
  ]);

  const getWQIColor = (wqi: number) => {
    if (wqi >= 80) return { bg: 'bg-green-500/30', border: 'border-green-500/50', text: 'text-green-300' };
    if (wqi >= 60) return { bg: 'bg-yellow-500/30', border: 'border-yellow-500/50', text: 'text-yellow-300' };
    if (wqi >= 40) return { bg: 'bg-orange-500/30', border: 'border-orange-500/50', text: 'text-orange-300' };
    return { bg: 'bg-red-500/30', border: 'border-red-500/50', text: 'text-red-300' };
  };

  return (
    <div className="space-y-4">
      {/* Map placeholder (text-based for simplicity) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {states.map((state) => {
          const colors = getWQIColor(state.wqi);
          const isSelected = selectedState === state.state;

          return (
            <button
              key={state.state}
              onClick={() => onStateSelect?.(state.state)}
              className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                isSelected
                  ? `${colors.border} ${colors.bg} ring-2 ring-accent-blue`
                  : `border-border bg-gray-800/30 hover:${colors.border}`
              }`}
            >
              <div className="flex items-start gap-2 mb-1">
                <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5 text-gray-400" />
                <span className="text-xs font-semibold text-white line-clamp-1">{state.state}</span>
              </div>
              <div className={`text-lg font-bold ${colors.text}`}>{state.wqi.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">{state.status}</div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-3 bg-gray-800/30 rounded-lg border border-border/50 space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">WQI Scale</div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">80+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">60-80</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-muted-foreground">40-60</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">&lt;40</span>
          </div>
        </div>
      </div>
    </div>
  );
};
