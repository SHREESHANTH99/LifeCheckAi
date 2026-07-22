import React from 'react';

interface SkeletonBaseProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SkeletonBase({ className = '', ...props }: SkeletonBaseProps) {
  return (
    <div 
      className={`animate-pulse bg-white/5 rounded-card border border-white/5 ${className}`} 
      {...props} 
    />
  );
}
