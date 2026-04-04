"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useVoiceSettings } from "@/app/context/VoiceContext";
import { speakText, stopSpeaking as stopAllSpeech } from "@/lib/elevenlabs";
import { type AudioAnalyzerState } from "@/lib/elevenlabs-voice";

/**
 * Hook for managing chat voice mode
 * Handles speaking AI responses and visual feedback
 */
export function useChatVoiceMode() {
  const { settings } = useVoiceSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioState, setAudioState] = useState<AudioAnalyzerState>({
    isPlaying: false,
    frequency: new Uint8Array(0),
    dataArray: new Uint8Array(0),
  });
  const waveformTimerRef = useRef<number | null>(null);

  const stopWaveform = useCallback(() => {
    if (waveformTimerRef.current !== null) {
      window.clearInterval(waveformTimerRef.current);
      waveformTimerRef.current = null;
    }
    setAudioState({
      isPlaying: false,
      frequency: new Uint8Array(0),
      dataArray: new Uint8Array(0),
    });
  }, []);

  useEffect(() => {
    return () => {
      stopAllSpeech();
      stopWaveform();
    };
  }, [stopWaveform]);

  const startWaveform = useCallback(() => {
    if (typeof window === "undefined") return;

    const renderFrame = () => {
      const bars = 24;
      const next = new Uint8Array(bars);
      const time = Date.now() / 140;
      for (let index = 0; index < bars; index += 1) {
        const base = Math.sin(time + index * 0.65);
        const pulse = Math.sin(time * 1.7 + index * 0.35);
        next[index] = Math.max(18, Math.min(255, Math.round(128 + base * 74 + pulse * 36)));
      }

      setAudioState({
        isPlaying: true,
        frequency: next,
        dataArray: next,
      });
    };

    renderFrame();
    waveformTimerRef.current = window.setInterval(renderFrame, 100);
  }, []);

  const speakResponse = useCallback(
    async (text: string) => {
      if (!settings.chatVoiceModeEnabled) return;

      try {
        setIsPlaying(true);
        startWaveform();

        await speakText(text, {
          rate: 1,
          pitch: 1,
          onStart: () => {
            setIsPlaying(true);
          },
          onEnd: () => {
            setIsPlaying(false);
            stopWaveform();
          },
        });
      } catch (error) {
        console.error("Failed to speak response:", error);
        setIsPlaying(false);
        stopWaveform();
      }
    },
    [settings.chatVoiceModeEnabled, startWaveform, stopWaveform],
  );

  const stopSpeaking = useCallback(() => {
    stopAllSpeech();
    setIsPlaying(false);
    stopWaveform();
  }, [stopWaveform]);

  return {
    isEnabled: settings.chatVoiceModeEnabled,
    isPlaying,
    audioState,
    speakResponse,
    stopSpeaking,
  };
}
