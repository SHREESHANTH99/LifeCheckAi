"use client";

import React, { useMemo } from 'react';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

const PLACEHOLDER = 'Analyzing live safety context...';

// Simple parser for [City Metric: Value - Status]
function parseSafetyBadges(line: string) {
  const regex = /\[([^\]]+:\s*[^\]]+(?:\s*-\s*[^\]]+)?)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.substring(lastIndex, match.index));
    }
    const inlineContent = match[1];
    
    let badgeColor = "bg-white/5 border-white/20 text-white";
    if (inlineContent.toLowerCase().includes("hazardous") || inlineContent.toLowerCase().includes("unsafe") || inlineContent.toLowerCase().includes("danger") || inlineContent.toLowerCase().includes("severe")) {
      badgeColor = "bg-danger/20 border-danger/50 text-danger shadow-[0_0_12px_rgba(239,68,68,0.3)]";
    } else if (inlineContent.toLowerCase().includes("moderate") || inlineContent.toLowerCase().includes("warning") || inlineContent.toLowerCase().includes("caution") || inlineContent.toLowerCase().includes("unhealthy")) {
      badgeColor = "bg-warning/20 border-warning/50 text-warning shadow-[0_0_12px_rgba(245,158,11,0.3)]";
    } else if (inlineContent.toLowerCase().includes("safe") || inlineContent.toLowerCase().includes("good") || inlineContent.toLowerCase().includes("clear") || inlineContent.toLowerCase().includes("low")) {
      badgeColor = "bg-safe/20 border-safe/50 text-safe shadow-[0_0_12px_rgba(16,185,129,0.3)]";
    }

    parts.push(
      <span key={match.index} className={`inline-flex items-center px-2 py-[1px] rounded border text-[10px] uppercase font-bold tracking-wider mx-1 align-baseline ${badgeColor}`}>
         {inlineContent}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(line.substring(lastIndex));
  }

  return parts.length > 0 ? parts : line;
}

function renderLine(line: string, key: number) {
  const trimmed = line.trim();
  if (!trimmed) {
    return <div key={key} className="h-2" />;
  }

  return (
    <div key={key} className="text-[15px] text-text-primary leading-[1.8]">
      {parseSafetyBadges(trimmed)}
    </div>
  );
}

export const StreamingText: React.FC<StreamingTextProps> = ({ text, isStreaming }) => {
  const safeText = text || '';
  const renderedText = safeText;
  const lines = useMemo(() => renderedText.split('\n'), [renderedText]);

  if (isStreaming && (safeText.trim() === '' || safeText === PLACEHOLDER)) {
    return (
      <div className="flex items-center gap-3 text-sm text-text-secondary">
        <span className="inline-flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent-violet animate-pulse shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
          <span className="h-2 w-2 rounded-full bg-accent-violet animate-pulse shadow-[0_0_8px_rgba(124,58,237,0.8)] [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-accent-violet animate-pulse shadow-[0_0_8px_rgba(124,58,237,0.8)] [animation-delay:300ms]" />
        </span>
        <span className="tracking-wide">Synthesizing environmental intelligence...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => renderLine(line, idx))}
      {isStreaming && (
        <span className="inline-block h-4 w-1.5 bg-accent-violet animate-pulse align-middle ml-1 shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
      )}
    </div>
  );
};
