import React from 'react';
import { X, Trash2 } from 'lucide-react';

export type MemoryItem = {
  type: 'city' | 'profile' | 'topic' | 'preference';
  value: string;
  addedAt: Date;
};

interface ConversationMemoryProps {
  memory: MemoryItem[];
  onRemove?: (item: MemoryItem) => void;
  onClear?: () => void;
  exchangeCount?: number;
}

const getMemoryIcon = (type: string) => {
  switch (type) {
    case 'city': return '📍';
    case 'profile': return '🫁';
    case 'topic': return '📋';
    case 'preference': return '⭐';
    default: return '•';
  }
};

const getMemoryLabel = (type: string) => {
  switch (type) {
    case 'city': return 'Cities';
    case 'profile': return 'Profile';
    case 'topic': return 'Topics';
    case 'preference': return 'Preferences';
    default: return 'Memory';
  }
};

export const ConversationMemory: React.FC<ConversationMemoryProps> = ({
  memory,
  onRemove,
  onClear,
  exchangeCount = 0,
}) => {
  // Group memory by type
  const grouped = memory.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, MemoryItem[]>);

  if (memory.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400">
        Memory will update as you chat.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
          <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            <span>{getMemoryIcon(type)}</span>
            <span>{getMemoryLabel(type)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 transition-all hover:border-white/30 hover:bg-white/10"
              >
                <span>{item.value}</span>
                {onRemove && (
                  <button
                    onClick={() => onRemove(item)}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
        {exchangeCount} exchange{exchangeCount !== 1 ? 's' : ''} in memory
      </div>

      {onClear && (
        <button
          onClick={onClear}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 transition-colors hover:bg-red-500/15 hover:text-red-200"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear memory
        </button>
      )}

      <div className="text-xs italic text-slate-400">
        Memory resets when tab closes
      </div>
    </div>
  );
};
