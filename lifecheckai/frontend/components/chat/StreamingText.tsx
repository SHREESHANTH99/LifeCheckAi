import React, { useMemo } from 'react';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  onComplete?: () => void;
}

const PLACEHOLDER = 'Analyzing live safety context...';

function renderLine(line: string, key: number) {
  const trimmed = line.trim();
  if (!trimmed) {
    return <div key={key} className="h-2" />;
  }

  const sectionMatch = trimmed.match(/^(Summary|Air|Weather|Water|Action):\s*(.*)$/i);
  if (sectionMatch) {
    const label = sectionMatch[1];
    const value = sectionMatch[2];
    return (
      <div key={key} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-300/85">{label}</div>
        <div className="mt-1 text-sm text-slate-100 leading-6">{value}</div>
      </div>
    );
  }

  return (
    <div key={key} className="text-sm text-slate-100 leading-6">
      {trimmed}
    </div>
  );
}

export const StreamingText: React.FC<StreamingTextProps> = ({ text, isStreaming }) => {
  const safeText = text || '';
  const renderedText = safeText;
  const lines = useMemo(() => renderedText.split('\n'), [renderedText]);

  if (isStreaming && (safeText.trim() === '' || safeText === PLACEHOLDER)) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-200">
        <span className="inline-flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-300/85 animate-bounce" />
          <span className="h-2 w-2 rounded-full bg-cyan-300/75 animate-bounce [animation-delay:120ms]" />
          <span className="h-2 w-2 rounded-full bg-cyan-300/65 animate-bounce [animation-delay:240ms]" />
        </span>
        <span className="text-slate-300">Thinking and preparing an answer...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => renderLine(line, idx))}
      {isStreaming && (
        <span className="inline-block h-4 w-0.5 bg-cyan-300 animate-pulse align-middle ml-1" />
      )}
    </div>
  );
};
