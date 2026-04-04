"use client";

import { useRef, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import { showToast } from "@/components/ui/Toast";

type VoiceState = "idle" | "recording" | "processing";

interface VoiceChatInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function VoiceChatInput({ onTranscript, disabled = false }: VoiceChatInputProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const startRecognition = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      showToast("warning", "Voice input is not supported on this browser.");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) onTranscript(transcript);
      setState("processing");
    };

    recognition.onerror = () => {
      setState("idle");
      showToast("warning", "Microphone access denied or unavailable.");
    };

    recognition.onend = () => {
      setState("idle");
    };

    recognitionRef.current = recognition;
    setState("recording");
    recognition.start();
  };

  const stopRecognition = () => {
    recognitionRef.current?.stop();
    setState("idle");
  };

  return (
    <button
      onClick={state === "recording" ? stopRecognition : startRecognition}
      disabled={disabled}
      className={`min-w-12 min-h-12 rounded-full border flex items-center justify-center transition-colors ${
        state === "recording"
          ? "border-unsafe/50 bg-unsafe/10 text-unsafe"
          : "border-border-default bg-bg-card text-text-secondary hover:text-text-primary"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      aria-label="Voice input"
      title={state === "recording" ? "Listening..." : "Use voice input"}
    >
      {state === "processing" ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
    </button>
  );
}
