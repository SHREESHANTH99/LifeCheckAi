import type { SafetyData } from "@/types";
import type { ProfileConfig } from "@/components/profile/HealthProfileSelector";

export interface PersonalizedRisk {
  personalAQIThreshold: number;
  personalRiskLevel: "safe" | "caution" | "unsafe";
  personalAdvice: string;
  profileWarnings: string[];
  riskScore: number;
}

export function calculatePersonalizedRisk(
  data: SafetyData,
  profile: ProfileConfig
): PersonalizedRisk {
  const aqi = data.air_quality?.aqi ?? 0;
  const uv = data.weather?.uv_index ?? 0;
  const temp = data.weather?.temp_celsius ?? 0;
  const pollenLevel = String(data.pollen?.level || "unknown").toLowerCase();

  const effectiveAQI = aqi / profile.aqiMultiplier;
  const personalRiskLevel: PersonalizedRisk["personalRiskLevel"] =
    effectiveAQI <= 50 ? "safe" : effectiveAQI <= 100 ? "caution" : "unsafe";

  const warnings: string[] = [];

  if (profile.id === "asthma" && aqi > 60) {
    warnings.push(`Keep inhaler accessible. PM2.5-related AQI ${aqi} exceeds asthma comfort range.`);
  }
  if (profile.id === "pregnant" && uv > 5) {
    warnings.push(`UV index ${uv} can increase overheating risk. Limit direct sun exposure.`);
  }
  if (profile.id === "elderly" && temp > profile.heatThreshold) {
    warnings.push(`Heat stress risk is elevated at ${temp}°C for older adults.`);
  }
  if (profile.id === "child" && aqi > 100) {
    warnings.push("AQI above 100 is unsafe for children's developing lungs.");
  }
  if (profile.id === "athlete" && aqi > 80) {
    warnings.push(`AQI ${aqi} may reduce aerobic performance. Prefer indoor training.`);
  }

  const pollenPenalty = pollenLevel === "high" ? 25 : pollenLevel === "moderate" ? 12 : 0;
  const heatPenalty = temp > profile.heatThreshold ? 25 : 0;
  const uvPenalty = uv * 4 * profile.uvMultiplier;
  const aqiPenalty = Math.min(55, effectiveAQI / 3);

  const riskScore = Math.max(0, Math.min(100, Math.round(aqiPenalty * 0.4 + heatPenalty * 0.3 + uvPenalty * 0.2 + pollenPenalty * 0.1 + 35)));

  const advice =
    personalRiskLevel === "safe"
      ? "Conditions are acceptable for your profile with normal precautions."
      : personalRiskLevel === "caution"
      ? "Use additional protection and limit prolonged exposure."
      : "High personal risk right now. Avoid unnecessary outdoor exposure.";

  return {
    personalAQIThreshold: Math.round(100 * profile.aqiMultiplier),
    personalRiskLevel,
    personalAdvice: advice,
    profileWarnings: warnings,
    riskScore,
  };
}
