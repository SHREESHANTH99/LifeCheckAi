// ElevenLabs Voice Integration
// Handles both proactive safety alerts and chat voice mode

const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "";
const ELEVENLABS_VOICE_ID = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVY5Zi5"; // Default voice
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export interface VoiceAlertConfig {
  text: string;
  voiceId?: string;
  onComplete?: () => void;
  urgency?: "low" | "medium" | "high";
}

export interface AudioAnalyzerState {
  isPlaying: boolean;
  frequency: Uint8Array;
  dataArray: Uint8Array;
}

class ElevenLabsVoiceManager {
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private onAnalyzerUpdate: ((state: AudioAnalyzerState) => void) | null = null;
  private animationId: number | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      // @ts-expect-error - Browser API compatibility
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
  }

  /**
   * Speak text using ElevenLabs API
   */
  async speak(config: VoiceAlertConfig): Promise<void> {
    if (!ELEVENLABS_API_KEY) {
      console.debug("ElevenLabs API key not configured");
      return;
    }

    try {
      // Get audio stream from ElevenLabs
      const response = await fetch(
        `${ELEVENLABS_API_URL}/text-to-speech/${config.voiceId || ELEVENLABS_VOICE_ID}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: config.text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play audio
      await this.playAudio(audioUrl, config.onComplete);
    } catch (error) {
      console.error("Voice playback failed:", error);
    }
  }

  /**
   * Play audio with optional analyser visualization
   */
  private async playAudio(
    audioUrl: string,
    onComplete?: () => void
  ): Promise<void> {
    if (!this.audioContext) {
      // Fallback: use native audio element without analyzer
      const audio = new Audio(audioUrl);
    if (onComplete) {
      audio.onended = onComplete;
    }
      audio.play().catch(err => console.error("Audio playback error:", err));
      return;
    }

    // Stop any currently playing audio
    if (this.currentAudio) {
      this.currentAudio.pause();
    }

    const audio = new Audio(audioUrl);
    this.currentAudio = audio;

    // Create analyser if not already created
    if (!this.analyser && this.audioContext) {
      const source = this.audioContext.createMediaElementSource(audio);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    // Start visualization loop
    this.startVisualization();

    // Play and wait for completion
    audio.onended = () => {
      this.stopVisualization();
      onComplete?.();
    };

    audio.play().catch(err => console.error("Audio playback error:", err));
  }

  /**
   * Start real-time frequency visualization
   */
  private startVisualization(): void {
    if (!this.analyser || !this.dataArray) return;

    const animate = () => {
      if (this.analyser && this.dataArray) {
          // @ts-expect-error - TypeScript version compatibility
          this.analyser.getByteFrequencyData(this.dataArray);

        if (this.onAnalyzerUpdate) {
          this.onAnalyzerUpdate({
            isPlaying: true,
            frequency: new Uint8Array([...this.dataArray]),
            dataArray: new Uint8Array([...this.dataArray]),
          });
        }
      }

      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Stop visualization
   */
  private stopVisualization(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.onAnalyzerUpdate) {
      this.onAnalyzerUpdate({
        isPlaying: false,
        frequency: new Uint8Array(0),
        dataArray: new Uint8Array(0),
      });
    }
  }

  /**
   * Set callback for analyzer updates (for visualization)
   */
  setOnAnalyzerUpdate(callback: (state: AudioAnalyzerState) => void): void {
    this.onAnalyzerUpdate = callback;
  }

  /**
   * Stop current playback
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    this.stopVisualization();
  }
}

// Singleton instance
export const voiceManager = new ElevenLabsVoiceManager();

/**
 * Hook for proactive voice alerts
 * Triggers when conditions worsen (SAFE/CAUTION → UNSAFE)
 */
export function useProactiveVoiceAlert(enabled: boolean) {
  return async (
    city: string,
    previousVerdict: string,
    newVerdict: string,
    aqi?: number,
    temperature?: number
  ) => {
    if (!enabled) return;

    // Only alert when transitioning to UNSAFE
    if (newVerdict !== "UNSAFE" || previousVerdict === "UNSAFE") return;

    let alertText = `Warning: Air quality in ${city} has worsened. Conditions are now unsafe. `;

    if (aqi && aqi > 200) {
      alertText += `Air quality index is ${Math.round(aqi)}, which is severe. Take precautions immediately. `;
    }

    if (temperature && temperature > 45) {
      alertText += `Temperature has reached ${Math.round(temperature)} degrees. Stay hydrated and seek cool shelter. `;
    }

    await voiceManager.speak({
      text: alertText,
      urgency: "high",
    });
  };
}

/**
 * Hook for chat voice mode
 * Speaks AI responses and provides visual feedback
 */
export function useChatVoiceMode(enabled: boolean) {
  return {
    /**
     * Speak an AI response
     */
    speakResponse: async (text: string) => {
      if (!enabled) return;

      await voiceManager.speak({
        text,
        urgency: "low",
      });
    },

    /**
     * Stop current speech
     */
    stop: () => {
      voiceManager.stop();
    },

    /**
     * Set visualization callback
     */
    onVisualize: (callback: (state: AudioAnalyzerState) => void) => {
      voiceManager.setOnAnalyzerUpdate(callback);
    },
  };
}
