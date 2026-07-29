import React from 'react';

export function LogoMark({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M 19 9 L 4 24 L 24 44 L 44 24 L 29 9" 
        transform="rotate(8 24 24)" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M -2 24 L 14 24 L 19 12 L 29 36 L 34 24 L 50 24" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}
