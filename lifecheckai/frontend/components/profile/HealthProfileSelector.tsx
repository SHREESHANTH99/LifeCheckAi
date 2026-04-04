"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type HealthProfile =
  | "general"
  | "asthma"
  | "pregnant"
  | "elderly"
  | "child"
  | "athlete";

export interface ProfileConfig {
  id: HealthProfile;
  emoji: string;
  label: string;
  description: string;
  aqiMultiplier: number;
  uvMultiplier: number;
  heatThreshold: number;
  coldThreshold: number;
}

const STORAGE_KEY = "lifecheck_health_profile";

export const PROFILES: ProfileConfig[] = [
  { id: "general", emoji: "👤", label: "General", description: "Standard adult risk thresholds", aqiMultiplier: 1, uvMultiplier: 1, heatThreshold: 40, coldThreshold: 5 },
  { id: "asthma", emoji: "🫁", label: "Asthma", description: "Higher sensitivity to PM2.5 and ozone", aqiMultiplier: 0.6, uvMultiplier: 1, heatThreshold: 38, coldThreshold: 8 },
  { id: "pregnant", emoji: "🤰", label: "Pregnant", description: "Extra caution for air and UV exposure", aqiMultiplier: 0.7, uvMultiplier: 0.8, heatThreshold: 35, coldThreshold: 8 },
  { id: "elderly", emoji: "👴", label: "Elderly", description: "Heat stress and cold risk are elevated", aqiMultiplier: 0.7, uvMultiplier: 0.8, heatThreshold: 35, coldThreshold: 10 },
  { id: "child", emoji: "👶", label: "Child", description: "Children need stricter AQI thresholds", aqiMultiplier: 0.65, uvMultiplier: 0.7, heatThreshold: 33, coldThreshold: 10 },
  { id: "athlete", emoji: "🏃", label: "Athlete", description: "Exercise performance and breathing risk", aqiMultiplier: 0.8, uvMultiplier: 0.9, heatThreshold: 38, coldThreshold: 5 },
];

interface HealthProfileSelectorProps {
  onProfileChange: (profile: HealthProfile, config: ProfileConfig) => void;
}

export function HealthProfileSelector({ onProfileChange }: HealthProfileSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<HealthProfile>(() => {
    if (typeof window === "undefined") return "general";
    const saved = localStorage.getItem(STORAGE_KEY) as HealthProfile | null;
    return PROFILES.some((item) => item.id === saved) ? (saved as HealthProfile) : "general";
  });

  useEffect(() => {
    const match = PROFILES.find((item) => item.id === selected) || PROFILES[0];
    onProfileChange(match.id, match);
  }, [onProfileChange, selected]);

  const current = useMemo(
    () => PROFILES.find((item) => item.id === selected) || PROFILES[0],
    [selected]
  );

  const applyProfile = () => {
    const config = PROFILES.find((item) => item.id === selected) || PROFILES[0];
    localStorage.setItem(STORAGE_KEY, config.id);
    onProfileChange(config.id, config);
    setExpanded(false);
  };

  useEffect(() => {
    const openFromEvent = () => setExpanded(true);
    window.addEventListener("lifecheck:open-profile", openFromEvent);
    return () => window.removeEventListener("lifecheck:open-profile", openFromEvent);
  }, []);

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          Your Profile: <span className="text-text-primary font-semibold">{current.emoji} {current.label}</span>
        </p>
        <button onClick={() => setExpanded((prev) => !prev)} className="text-sm text-accent-blue hover:text-accent-cyan cursor-pointer min-h-11 px-2">
          {expanded ? "Close" : "Change"}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4"
          >
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setSelected(profile.id)}
                  className={`text-left rounded-xl border p-3 min-h-24 cursor-pointer transition-colors ${
                    selected === profile.id
                      ? "border-accent-blue bg-accent-blue/10"
                      : "border-border-default bg-bg-secondary/40 hover:border-border-light"
                  }`}
                >
                  <p className="text-2xl mb-1">{profile.emoji}</p>
                  <p className="text-sm font-semibold text-text-primary">{profile.label}</p>
                  <p className="text-xs text-text-secondary mt-1">{profile.description}</p>
                </button>
              ))}
            </div>
            <button onClick={applyProfile} className="mt-4 w-full min-h-11 rounded-lg bg-accent-blue text-white text-sm font-medium cursor-pointer">
              Apply Profile
            </button>
            <p className="text-xs text-text-muted mt-2">Profile affects risk scores and AI recommendations.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
