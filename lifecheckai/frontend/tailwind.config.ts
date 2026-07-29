import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'card': '1rem',
        'button': '0.75rem',
      },
      colors: {
        'bg-primary': '#18181b', /* neutral-900 */
        'bg-secondary': '#1c1c1f', /* neutral-800/900 range */
        'bg-card': '#18181b', /* neutral-900 */
        'bg-card-hover': '#27272a', /* neutral-800 */
        'border-default': '#3f3f46', /* neutral-700 */
        'border-light': '#52525b', /* neutral-600 */
        
        'text-primary': '#F5F5F5',
        'text-secondary': '#9ca3af',
        'text-muted': '#6b7280',
        
        'accent-primary': '#4FA8C4', /* Muted teal-blue accent */
        
        'safe': '#10B981', /* Restored to functional green */
        'warning': '#F59E0B',
        'danger': '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-dot': 'bounceDot 1.4s infinite ease-in-out both',
        'orb-pulse': 'orbPulse 4s ease-in-out infinite',
        'marquee': 'marquee 25s linear infinite',
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
        },
        orbPulse: {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
};

export default config;
