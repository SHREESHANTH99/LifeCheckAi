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
      <div className="flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(prompt)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full border border-border hover:border-accent-blue hover:text-white text-xs text-muted-foreground transition-all hover:bg-blue-500/10 whitespace-nowrap"
            style={{
              animation: `slideInFromRight 300ms ease-out ${idx * 50}ms backwards`,
            }}
          >
            {prompt}
          </button>
        ))}
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
