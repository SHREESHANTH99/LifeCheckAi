"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Square, Loader2 } from "lucide-react";
import type { SafetyData } from "@/types";
import { showToast } from "@/components/ui/Toast";
import { speakSafetyBriefing, stopSpeaking } from "@/lib/elevenlabs";

type AudioState = "idle" | "loading" | "playing" | "error";

interface VoiceBriefingButtonProps {
  safetyData: SafetyData | null;
}

export function VoiceBriefingButton({ safetyData }: VoiceBriefingButtonProps) {
  const [state, setState] = useState<AudioState>("idle");

  const disabled = useMemo(() => !safetyData, [safetyData]);

  useEffect(() => {
    const onPlayBriefing = () => {
      if (!safetyData || state === "loading") return;
      if (state === "playing") {
        stopSpeaking();
        setState("idle");
        return;
      }
      setState("loading");
      speakSafetyBriefing(safetyData, {
        onStart: () => setState("playing"),
        onEnd: () => setState("idle"),
      })
        .then(() => setState("idle"))
        .catch((err: unknown) => {
          setState("error");
          const message = err instanceof Error ? err.message : "Audio unavailable right now.";
          showToast("warning", message);
        });
    };

    window.addEventListener("lifecheck:voice-briefing", onPlayBriefing);
    return () => window.removeEventListener("lifecheck:voice-briefing", onPlayBriefing);
  }, [safetyData, state]);

  useEffect(() => {
    if (state !== "error") return;
    const timer = setTimeout(() => setState("idle"), 3000);
    return () => clearTimeout(timer);
  }, [state]);

  const onClick = async () => {
    if (disabled || !safetyData) return;

    if (state === "playing") {
      stopSpeaking();
      setState("idle");
      return;
    }

    setState("loading");
    try {
      await speakSafetyBriefing(safetyData, {
        onStart: () => setState("playing"),
        onEnd: () => setState("idle"),
      });
      setState("idle");
    } catch (err: unknown) {
      setState("error");
      const message = err instanceof Error ? err.message : "Audio unavailable";
      showToast("warning", message);
    }
  };

  const icon =
    state === "loading" ? (
      <Loader2 size={18} className="animate-spin" />
    ) : state === "playing" ? (
      <Square size={18} />
    ) : state === "error" ? (
      <VolumeX size={18} />
    ) : (
      <Volume2 size={18} />
    );

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={`fixed z-50 bottom-24 right-6 min-w-14 min-h-14 rounded-full border flex items-center justify-center gap-2 px-4 ${
        state === "error"
          ? "border-unsafe/50 text-unsafe bg-unsafe/10"
          : "border-accent-blue/60 text-accent-cyan bg-bg-card/95"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      title="Listen to Safety Briefing"
      aria-label="Listen to Safety Briefing"
    >
      {icon}
      {(state === "loading" || state === "playing" || state === "error") && (
        <span className="text-xs pr-1">
          {state === "loading"
            ? "Generating..."
            : state === "playing"
            ? "Playing..."
            : "Audio unavailable"}
        </span>
      )}
      {state === "playing" && (
        <span className="inline-flex items-end gap-0.5 h-4 ml-1">
          {[0, 1, 2].map((bar) => (
            <motion.span
              key={bar}
              className="w-1 rounded-full bg-accent-cyan"
              animate={{ height: [6, 14, 8, 12, 6] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: bar * 0.12 }}
            />
          ))}
        </span>
      )}
    </motion.button>
  );
}
