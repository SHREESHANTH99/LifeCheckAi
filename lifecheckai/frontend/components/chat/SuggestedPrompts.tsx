import React, { useEffect } from 'react';
import { Zap } from 'lucide-react';

interface SuggestedPromptsProps {
  suggestions: string[];
  onSelect: (prompt: string) => void;
  isVisible: boolean;
}

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ suggestions, onSelect, isVisible }) => {
  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 space-y-2 animate-fade-in">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Zap className="w-3.5 h-3.5" />
        <span>Suggested follow-ups</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
        {suggestions.map((prompt, idx) => {
          let Icon = Zap;
          const lower = prompt.toLowerCase();
          if (lower.includes('air') || lower.includes('aqi') || lower.includes('smog') || lower.includes('pollution')) {
            Icon = require('lucide-react').Wind;
          } else if (lower.includes('weather') || lower.includes('temperature') || lower.includes('heat') || lower.includes('cold')) {
            Icon = require('lucide-react').ThermometerSun;
          } else if (lower.includes('water') || lower.includes('drink')) {
            Icon = require('lucide-react').Droplets;
          }

          return (
            <button
              key={idx}
              onClick={() => onSelect(prompt)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:border-accent-cyan/40 hover:bg-accent-cyan/10 hover:text-white text-xs text-slate-300 transition-all whitespace-nowrap shadow-sm cursor-pointer"
              style={{
                animation: `slideInFromRight 300ms ease-out ${idx * 50}ms backwards`,
              }}
            >
              <Icon className="w-3.5 h-3.5 text-accent-cyan opacity-80" />
              {prompt}
            </button>
          );
        })}
      </div>
      <style>{`
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};
