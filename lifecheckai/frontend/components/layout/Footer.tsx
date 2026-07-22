"use client";

import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border-default bg-bg-secondary w-full mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo and Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-cyan flex items-center justify-center">
            <Shield size={18} className="text-bg-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-text-primary font-bold">LifeCheck AI</span>
            <span className="text-xs text-text-muted">Built for public safety</span>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-text-secondary hover:text-white transition-colors interactive-base">
            Documentation
          </a>
          <a href="https://github.com/SHREESHANTH99/LifeCheckAi" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-text-secondary hover:text-white transition-colors interactive-base">
            GitHub
          </a>
        </div>

        {/* Powered By Badges */}
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted mr-2">Powered by</span>
          <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-semibold text-text-secondary flex items-center gap-1.5 shadow-sm">
            Google APIs
          </div>
          <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-semibold text-text-secondary flex items-center gap-1.5 shadow-sm">
            Gemini AI
          </div>
        </div>

      </div>
    </footer>
  );
}
