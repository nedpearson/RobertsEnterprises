/**
 * ElevenLabs Voice-Over Narration Service for VowOS Demo & Training System
 * Voice ID: FFIa0EpESD5acerigJF7
 */

const ELEVENLABS_VOICE_ID = 'FFIa0EpESD5acerigJF7';
const ELEVENLABS_API_KEY = 'sk_e1e83b48e25a6ff73fb79e16a7717525f5e2510dd6e20415';

interface NarrationOptions {
  text: string;
  playbackRate?: number;
  volume?: number;
  onEnded?: () => void;
  onError?: (err: Error) => void;
}

class ElevenLabsService {
  private cache: Map<string, string> = new Map(); // text -> objectURL
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMuted: boolean = false;
  private playbackRate: number = 1.0;
  private volume: number = 1.0;

  /**
   * Synthesize or retrieve cached audio for a given narration segment
   */
  public async speak({ text, playbackRate = 1.0, volume = 1.0, onEnded, onError }: NarrationOptions): Promise<void> {
    this.stop();
    this.playbackRate = playbackRate;
    this.volume = volume;

    if (this.isMuted) {
      if (onEnded) setTimeout(onEnded, 1000);
      return;
    }

    try {
      let audioUrl = this.cache.get(text);

      if (!audioUrl) {
        // Fetch from ElevenLabs API
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`ElevenLabs API error ${response.status}`);
        }

        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        this.cache.set(text, audioUrl);
      }

      const audio = new Audio(audioUrl);
      audio.playbackRate = this.playbackRate;
      audio.volume = this.volume;

      audio.onended = () => {
        this.currentAudio = null;
        if (onEnded) onEnded();
      };

      audio.onerror = (e) => {
        console.warn('ElevenLabs audio playback failed, falling back to Web Speech API', e);
        this.fallbackSpeak(text, onEnded, onError);
      };

      this.currentAudio = audio;
      await audio.play();
    } catch (err: any) {
      console.warn('ElevenLabs TTS failed, using Web Speech API fallback:', err.message);
      this.fallbackSpeak(text, onEnded, onError);
    }
  }

  /**
   * Fallback using browser Web Speech API
   */
  private fallbackSpeak(text: string, onEnded?: () => void, onError?: (err: Error) => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnded) setTimeout(onEnded, 2000);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.playbackRate;
    utterance.volume = this.volume;

    utterance.onend = () => {
      this.currentUtterance = null;
      if (onEnded) onEnded();
    };

    utterance.onerror = (e) => {
      if (onError) onError(new Error(e.error));
      else if (onEnded) onEnded();
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.currentAudio) {
      this.currentAudio.muted = muted;
    }
  }

  public setRate(rate: number) {
    this.playbackRate = rate;
    if (this.currentAudio) {
      this.currentAudio.playbackRate = rate;
    }
  }
}

export const elevenLabsService = new ElevenLabsService();
