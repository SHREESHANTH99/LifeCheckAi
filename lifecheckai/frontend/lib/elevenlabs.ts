const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
const VOICE_ID = "pNInz6obpgDQGcFmaJgB";

interface BriefingData {
  city: string;
  overall: { verdict: string; summary: string };
  air_quality: { aqi: number; level: string; advice: string };
  weather: { temp_celsius: number; condition: string; advice: string };
  pollen: { level: string; advice: string };
}

let currentAudio: HTMLAudioElement | null = null;

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

export async function speakText(text: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!ELEVENLABS_API_KEY || !text.trim()) return;

  stopSpeaking();

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
        },
      }),
    }
  ).catch(() => null);

  if (!response?.ok) return;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;

  audio.onended = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  };
  audio.onerror = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  };

  await audio.play().catch(() => {});
}

export async function speakSafetyBriefing(data: BriefingData): Promise<void> {
  const script = generateSafetyScript(data);
  await speakText(script);
}

export function stopSpeaking(): void {
  if (!currentAudio) return;
  currentAudio.pause();
  currentAudio.currentTime = 0;
  currentAudio = null;
}
