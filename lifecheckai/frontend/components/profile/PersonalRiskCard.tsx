"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { PersonalizedRisk } from "@/lib/profileRisk";
import type { ProfileConfig } from "@/components/profile/HealthProfileSelector";

interface PersonalRiskCardProps {
  risk: PersonalizedRisk;
  profile: ProfileConfig;
  onChangeProfile: () => void;
}

export function PersonalRiskCard({ risk, profile, onChangeProfile }: PersonalRiskCardProps) {
  const color =
    risk.personalRiskLevel === "safe"
      ? "border-safe text-safe"
      : risk.personalRiskLevel === "caution"
      ? "border-caution text-caution"
      : "border-unsafe text-unsafe";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card border-l-4 ${color}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Your Personal Risk Level</p>
          <p className="text-2xl font-semibold mt-1">{profile.emoji} {profile.label}</p>
          <p className="text-sm text-text-secondary mt-2">{risk.personalAdvice}</p>
        </div>
        <div className="w-24 h-24 rounded-full border-4 border-border-default flex items-center justify-center">
          <span className="text-2xl font-family-mono font-bold">{risk.riskScore}</span>
        </div>
      </div>

      {risk.profileWarnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {risk.profileWarnings.map((warning) => (
            <p key={warning} className="text-sm text-caution inline-flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5" /> {warning}
            </p>
          ))}
        </div>
      )}

      <button onClick={onChangeProfile} className="mt-4 text-sm text-accent-blue hover:text-accent-cyan cursor-pointer min-h-11 px-1">
        Change Profile
      </button>
    </motion.div>
  );
}
