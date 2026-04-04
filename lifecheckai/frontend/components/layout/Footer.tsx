"use client";

import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border-default bg-bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center">
            <Shield size={13} className="text-white" />
          </div>
          <span className="text-sm text-text-secondary">
            <span className="text-text-primary font-medium">LifeCheck AI</span>
            {" · "}Built for public safety
          </span>
        </div>
        <p className="text-xs text-text-muted">
          Powered by Google APIs + Gemini AI
        </p>
      </div>
    </footer>
  );
}
