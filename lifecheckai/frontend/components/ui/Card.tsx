import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive = false, className = '', children, ...props }: CardProps) {
  const baseClasses = "bg-bg-card border border-border-default rounded-card p-4 sm:p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]";
  const interactiveClasses = interactive ? "interactive-base cursor-pointer" : "";
  
  return (
    <div className={`${baseClasses} ${interactiveClasses} ${className}`} {...props}>
      {children}
    </div>
  );
}
