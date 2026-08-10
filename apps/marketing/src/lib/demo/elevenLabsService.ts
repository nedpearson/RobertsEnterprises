/**
 * ElevenLabs Voice-Over Narration Service for VowOS Demo & Training System
 *
 * Security model:
 * - Browser code never receives the ElevenLabs API key.
 * - Audio is synthesized through POST /api/demo/narration.
 * - The server owns ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID.
 */

interface NarrationOptions {
  text: string;
  playbackRate?: number;
  volume?: number;
  onEnded?: () => void;
  onError?: (err: Error) => void;
}

class ElevenLabsService {
  private cache: Map<string, string> = new Map();
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMuted = false;
  private playbackRate = 1.0;
  private volume = 1.0;

  public async speak({ text, playbackRate = 1.0, volume = 1.0, onEnded, onError }: NarrationOptions): Promise<void> {
    this.stop();
    this.playbackRate = playbackRate;
    this.volume = volume;

    if (this.isMuted) {
      onEnded?.();
      return;
    }

    try {
      let audioUrl = this.cache.get(text);

      if (!audioUrl) {
        const response = await fetch('/api/demo/narration', {
          method: 'POST',
          headers: {
            Accept: 'audio/mpeg',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            stability: 0.5,
            similarityBoost: 0.78,
          }),
        });

        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          throw new Error(detail?.error || `Narration API error ${response.status}`);
        }

        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        this.cache.set(text, audioUrl);
      }

      const audio = new Audio(audioUrl);
      audio.preload = 'auto';
      audio.playbackRate = this.playbackRate;
      audio.volume = this.volume;

      audio.onended = () => {
        this.currentAudio = null;
        onEnded?.();
      };

      audio.onerror = () => {
        this.currentAudio = null;
        this.fallbackSpeak(text, onEnded, onError);
      };

      this.currentAudio = audio;
      await audio.play();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.warn('ElevenLabs TTS failed; using Web Speech API fallback:', err.message);
      this.fallbackSpeak(text, onEnded, onError);
    }
  }

  private fallbackSpeak(text: string, onEnded?: () => void, onError?: (err: Error) => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onError?.(new Error('No speech synthesis provider is available.'));
      onEnded?.();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.playbackRate;
    utterance.volume = this.volume;

    utterance.onend = () => {
      this.currentUtterance = null;
      onEnded?.();
    };

    utterance.onerror = (event) => {
      this.currentUtterance = null;
      onError?.(new Error(event.error));
      onEnded?.();
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.currentUtterance = null;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.currentAudio) this.currentAudio.muted = muted;
  }

  public setRate(rate: number) {
    this.playbackRate = rate;
    if (this.currentAudio) this.currentAudio.playbackRate = rate;
  }
}

export const elevenLabsService = new ElevenLabsService();
