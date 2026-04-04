const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
const VOICE_ID = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";

interface BriefingData {
  city: string;
  overall: { verdict: string; summary: string };
  air_quality: { aqi: number; level: string; advice: string };
  weather: { temp_celsius: number; condition: string; advice: string };
  pollen: { level: string; advice: string };
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  rate?: number;
  pitch?: number;
  volume?: number;
}

let currentAudio: HTMLAudioElement | null = null;
let currentSpeech: SpeechSynthesisUtterance | null = null;

function getDayPart() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function generateSafetyScript(data: BriefingData): string {
  const verdict = (data.overall?.verdict || "unknown").toLowerCase();
  return [
    `Good ${getDayPart()}. This is your LifeCheck safety briefing for ${data.city}.`,
    `Current conditions are ${verdict}. ${data.overall?.summary || "Stay aware of local conditions."}`,
    `Air quality: The Air Quality Index is ${data.air_quality?.aqi ?? "not available"}, rated ${data.air_quality?.level || "unknown"}. ${data.air_quality?.advice || ""}`,
    `Weather: Temperature is ${data.weather?.temp_celsius ?? "not available"} degrees Celsius with ${data.weather?.condition || "current weather"}. ${data.weather?.advice || ""}`,
    `Pollen: ${data.pollen?.level || "Unknown"} pollen levels detected. ${data.pollen?.advice || ""}`,
    "Stay safe and check LifeCheck AI for updates.",
  ].join(" ");
}

export async function speakText(text: string, options: SpeakOptions = {}): Promise<void> {
  if (typeof window === "undefined" || !text.trim()) return;

  stopSpeaking();

  try {
    if (ELEVENLABS_API_KEY) {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.85,
            style: 0.25,
            use_speaker_boost: true,
          },
        }),
      });

      if (response.ok) {
        await playAudioBlob(await response.blob(), options);
        return;
      }
    }
  } catch (error) {
    options.onError?.(error instanceof Error ? error : new Error("ElevenLabs playback failed."));
  }

  await speakWithBrowserFallback(text, options);
}

export async function speakSafetyBriefing(data: BriefingData, options: SpeakOptions = {}): Promise<void> {
  await speakText(generateSafetyScript(data), options);
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  if (currentSpeech) {
    currentSpeech = null;
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

async function playAudioBlob(blob: Blob, options: SpeakOptions): Promise<void> {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;

  return await new Promise<void>((resolve, reject) => {
    audio.onplaying = () => {
      options.onStart?.();
    };

    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      options.onEnd?.();
      resolve();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      const error = new Error("Audio playback failed.");
      options.onError?.(error);
      reject(error);
    };

    audio.play().catch((error) => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      reject(error instanceof Error ? error : new Error("Audio playback failed."));
    });
  });
}

async function speakWithBrowserFallback(text: string, options: SpeakOptions = {}): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    const error = new Error("Browser speech synthesis is unavailable.");
    options.onError?.(error);
    throw error;
  }

  return await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    currentSpeech = utterance;
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((voice) => /en/i.test(voice.lang) && /google|microsoft|natural/i.test(voice.name))
      || voices.find((voice) => /en/i.test(voice.lang))
      || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      if (currentSpeech === utterance) currentSpeech = null;
      options.onEnd?.();
      resolve();
    };

    utterance.onerror = () => {
      if (currentSpeech === utterance) currentSpeech = null;
      const error = new Error("Browser speech synthesis failed.");
      options.onError?.(error);
      reject(error);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}
