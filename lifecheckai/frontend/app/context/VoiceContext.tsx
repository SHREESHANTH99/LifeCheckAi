"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface VoiceSettings {
  proactiveAlertsEnabled: boolean;
  chatVoiceModeEnabled: boolean;
}

interface VoiceContextType {
  settings: VoiceSettings;
  setProactiveAlertsEnabled: (enabled: boolean) => void;
  setChatVoiceModeEnabled: (enabled: boolean) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

const VOICE_SETTINGS_KEY = "lifecheck_voice_settings";

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<VoiceSettings>(() => {
    if (typeof window === "undefined") {
      return {
        proactiveAlertsEnabled: false,
        chatVoiceModeEnabled: false,
      };
    }

    try {
      const stored = localStorage.getItem(VOICE_SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      console.debug("Failed to load voice settings");
    }

    return {
      proactiveAlertsEnabled: false,
      chatVoiceModeEnabled: false,
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const setProactiveAlertsEnabled = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, proactiveAlertsEnabled: enabled }));
  };

  const setChatVoiceModeEnabled = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, chatVoiceModeEnabled: enabled }));
  };

  return (
    <VoiceContext.Provider
      value={{
        settings,
        setProactiveAlertsEnabled,
        setChatVoiceModeEnabled,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoiceSettings() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoiceSettings must be used within VoiceProvider");
  }
  return context;
}
