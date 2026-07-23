"use client";

import React, { useState } from "react";
import { useVoiceSettings } from "@/app/context/VoiceContext";
import { Volume2, Mic2, Volume, ChevronDown, ChevronUp } from "lucide-react";

interface VoiceSettingsPanelProps {
  embedded?: boolean;
}

export const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({ embedded = false }) => {
  const { settings, setProactiveAlertsEnabled, setChatVoiceModeEnabled } = useVoiceSettings();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={embedded ? "w-full" : "glass rounded-2xl border border-white/5 mt-4 overflow-hidden"}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-bg-card hover:bg-white/5 transition-colors cursor-pointer"
      >
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Volume2 size={16} className="text-accent-cyan" />
          Voice Settings
        </h3>
        {isExpanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-white/5 space-y-4 bg-bg-primary/30">
          {/* Proactive Alerts Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-cyan/10">
                <Mic2 size={16} className="text-accent-cyan" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white">Proactive Voice Alerts</h4>
                <p className="text-xs text-text-secondary mt-1">
                  Automatically speak safety alerts when conditions worsen
                </p>
              </div>
            </div>
            <button
              onClick={() => setProactiveAlertsEnabled(!settings.proactiveAlertsEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors ${
                settings.proactiveAlertsEnabled
                  ? "bg-accent-cyan border-accent-cyan"
                  : "border-text-muted bg-white/10"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                  settings.proactiveAlertsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Chat Voice Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Volume size={16} className="text-purple-500" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white">Chat Voice Mode</h4>
                <p className="text-xs text-text-secondary mt-1">
                  Speak and listen in chat with visual waveform feedback
                </p>
              </div>
            </div>
            <button
              onClick={() => setChatVoiceModeEnabled(!settings.chatVoiceModeEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors ${
                settings.chatVoiceModeEnabled
                  ? "bg-purple-500 border-purple-500"
                  : "border-text-muted bg-white/10"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                  settings.chatVoiceModeEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          
          <div className="mt-2 p-3 rounded-lg bg-accent-cyan/5 border border-accent-cyan/20 text-xs text-text-secondary">
            💡 <strong>Tip:</strong> Voice features require ElevenLabs API key configured in environment variables.
          </div>
        </div>
      )}
    </div>
  );
};
