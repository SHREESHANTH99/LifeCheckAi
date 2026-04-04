"use client";

import { useEffect, useMemo, useRef } from "react";
import { AudioAnalyzerState } from "@/lib/elevenlabs-voice";

interface VoiceWaveformProps {
  analyticsData?: AudioAnalyzerState;
  isPlaying?: boolean;
  className?: string;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  analyticsData,
  isPlaying = false,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frequencyRef = useRef<Uint8Array>(new Uint8Array(0));
  const passiveSeed = useMemo(() => Date.now() % 997, []);

  useEffect(() => {
    if (analyticsData?.frequency) {
      frequencyRef.current = analyticsData.frequency;
    }
  }, [analyticsData?.frequency]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isPlaying || frequencyRef.current.length === 0) {
      if (!isPlaying) {
        ctx.strokeStyle = "rgba(100, 150, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
      }

      const bars = 24;
      const sliceWidth = canvas.width / bars;
      ctx.strokeStyle = "rgba(100, 200, 255, 0.85)";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let index = 0; index < bars; index += 1) {
        const phase = (Date.now() / 180 + passiveSeed * 0.01 + index * 0.45) % (Math.PI * 2);
        const value = 0.35 + Math.abs(Math.sin(phase)) * 0.65;
        const y = (1 - value) * canvas.height;
        const x = index * sliceWidth;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      return;
    }

    // Draw waveform
    ctx.strokeStyle = "rgba(100, 200, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const sliceWidth = canvas.width / frequencyRef.current.length;
    let x = 0;

    ctx.beginPath();
    for (let i = 0; i < frequencyRef.current.length; i++) {
      const value = frequencyRef.current[i] / 255;
      const y = (1 - value) * canvas.height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Add glow effect for active state
    if (isPlaying) {
      ctx.strokeStyle = "rgba(100, 200, 255, 0.2)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className={`${className} ${isPlaying ? "opacity-100" : "opacity-60"}`}
    />
  );
};
