class NarrationService {
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMuted: boolean = false;
  private rate: number = 1.0;
  private activeCaption: string = '';
  private listeners: Set<(caption: string) => void> = new Set();

  public speak(text: string, onEnd?: () => void) {
    this.activeCaption = text;
    this.notifyListeners();

    if (this.isMuted || !this.synth) {
      if (onEnd) setTimeout(onEnd, 1500);
      return;
    }

    this.stop();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.rate = this.rate;
    this.currentUtterance.volume = 1.0;

    const voices = this.synth.getVoices();
    const preferredVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (preferredVoice) {
      this.currentUtterance.voice = preferredVoice;
    }

    this.currentUtterance.onend = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    this.currentUtterance.onerror = (e) => {
      console.warn('Narration Speech Error:', e);
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    this.synth.speak(this.currentUtterance);
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  public pause() {
    if (this.synth) {
      this.synth.pause();
    }
  }

  public resume() {
    if (this.synth) {
      this.synth.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) this.stop();
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setRate(rate: number) {
    this.rate = rate;
  }

  public getActiveCaption(): string {
    return this.activeCaption;
  }

  public subscribe(listener: (caption: string) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.activeCaption));
  }
}

export const narrationService = new NarrationService();
