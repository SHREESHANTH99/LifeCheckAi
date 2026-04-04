"use client";

import { useEffect, useRef } from "react";
import { useVoiceSettings } from "@/app/context/VoiceContext";
import { speakText } from "@/lib/elevenlabs";

/**
 * Hook for managing proactive voice alerts
 * Detects when safety verdict changes and triggers voice notifications
 */
export function useProactiveVoiceAlerts(
  city: string | undefined,
  currentVerdict: string | undefined,
  aqi: number | null | undefined,
  temperature: number | null | undefined,
) {
  const { settings } = useVoiceSettings();
  const previousVerdictRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!settings.proactiveAlertsEnabled || !city || !currentVerdict) {
      previousVerdictRef.current = currentVerdict;
      return;
    }

    const previousVerdict = previousVerdictRef.current;
    previousVerdictRef.current = currentVerdict;

    // Only alert when transitioning TO UNSAFE from a safer state
    if (currentVerdict !== "UNSAFE" || previousVerdict === "UNSAFE") {
      return;
    }

    // Build alert text
    let alertText = `Warning: Air quality in ${city} has worsened. Conditions are now unsafe. `;

    if (aqi && aqi > 200) {
      alertText += `Air quality index is ${Math.round(aqi)}, which is severe. Take precautions immediately. `;
    } else if (aqi && aqi > 150) {
      alertText += `Air quality index is ${Math.round(aqi)}, which is unhealthy. Limit outdoor activities. `;
    }

    if (temperature && temperature > 45) {
      alertText += `Temperature has reached ${Math.round(temperature)} degrees Celsius. This is extreme heat. Stay hydrated and seek cool shelter. `;
    } else if (temperature && temperature > 40) {
      alertText += `Temperature is ${Math.round(temperature)} degrees Celsius. Heat warnings are in effect. `;
    }

    // Trigger voice alert
    void speakText(alertText, {
      rate: 0.98,
      pitch: 0.95,
    });
  }, [city, currentVerdict, aqi, temperature, settings.proactiveAlertsEnabled]);
}
