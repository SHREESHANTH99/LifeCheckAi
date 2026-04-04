"use client";

import { useTheme } from "./ThemeContext";
import { Palette } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const themes = [
    { id: "default", label: "Neon Cyan", color: "bg-[#00D4FF]" },
    { id: "light", label: "Beige Light", color: "bg-[#FDE68A]" },
    { id: "violet", label: "Neon Violet", color: "bg-[#A855F7]" },
  ] as const;

  return (
    <div className="relative z-[100]" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:border-white/30 hover:bg-white/10 transition-colors shadow-[0_0_15px_var(--color-accent-cyan)] cursor-pointer"
        title="Change Theme"
      >
        <Palette size={18} style={{ color: "var(--color-accent-cyan)" }} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[110%] mt-2 w-44 rounded-2xl bg-[#0A0F1E]/95 backdrop-blur-xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="p-2 flex flex-col gap-1.5">
            <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted px-2 pt-1 pb-1">App Theme</p>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  theme === t.id ? "bg-white/10 text-white border border-white/10" : "border border-transparent text-text-secondary hover:text-white hover:bg-white/5 cursor-pointer"
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${t.color} shadow-glow`} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
