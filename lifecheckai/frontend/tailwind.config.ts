import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0f1e',
        'bg-secondary': '#0d1426',
        'bg-card': '#111827',
        'bg-card-hover': '#1a2235',
        'border-default': '#1e2d45',
        'border-light': '#243352',
        
        'text-primary': '#f0f4ff',
        'text-secondary': '#8b9cbe',
        'text-muted': '#4a5a7a',
        
        'accent-blue': '#3b82f6',
        'accent-cyan': '#06b6d4',
        'accent-green': '#10b981',
        'accent-yellow': '#f59e0b',
        'accent-orange': '#f97316',
        'accent-red': '#ef4444',
        'accent-purple': '#8b5cf6',
        
        safe: '#10b981',
        caution: '#f59e0b',
        unsafe: '#ef4444',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-dot': 'bounceDot 1.4s infinite ease-in-out both',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        }
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59,130,246,0.3)',
        'glow-green': '0 0 20px rgba(16,185,129,0.3)',
        'glow-red': '0 0 20px rgba(239,68,68,0.3)',
      }
    },
  },
  plugins: [],
};

export default config;
