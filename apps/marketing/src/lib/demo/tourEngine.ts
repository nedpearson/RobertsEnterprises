/**
 * VowOS Declarative Guided Tour Engine
 * Manages deterministic state machine transitions, target element resolution, animated cursor movement,
 * ElevenLabs voice synchronization, and action validation.
 */

import { ScenarioDefinition, TourStepDefinition } from './scenariosLibrary';
import { elevenLabsService } from './elevenLabsService';

export type TourState =
  | 'idle'
  | 'preparing'
  | 'loadingRoute'
  | 'waitingForTarget'
  | 'scrolling'
  | 'movingCursor'
  | 'narrating'
  | 'performingAction'
  | 'waitingForState'
  | 'completedStep'
  | 'paused'
  | 'recovering'
  | 'failed'
  | 'completedTour';

export interface CursorPosition {
  x: number;
  y: number;
  visible: boolean;
  clicking: boolean;
}

export type TrainingMode = 'watch' | 'guide' | 'practice';

export interface TourEngineListener {
  onStateChange: (state: TourState) => void;
  onStepChange: (index: number, step: TourStepDefinition) => void;
  onCursorMove: (cursor: CursorPosition) => void;
  onProgress: (current: number, total: number) => void;
  onNavigateNeeded?: (route: string) => void;
}

class TourEngine {
  private currentScenario: ScenarioDefinition | null = null;
  private currentStepIndex: number = 0;
  private currentState: TourState = 'idle';
  private mode: TrainingMode = 'watch';
  private listeners: Set<TourEngineListener> = new Set();
  private cursor: CursorPosition = { x: -100, y: -100, visible: false, clicking: false };
  private playbackRate: number = 1.0;
  private isMuted: boolean = false;
  private isPaused: boolean = false;

  public subscribe(listener: TourEngineListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(state: TourState) {
    this.currentState = state;
    this.listeners.forEach((l) => l.onStateChange(state));
  }

  private setCursor(cursor: Partial<CursorPosition>) {
    this.cursor = { ...this.cursor, ...cursor };
    this.listeners.forEach((l) => l.onCursorMove(this.cursor));
  }

  public getScenario() {
    return this.currentScenario;
  }

  public getStepIndex() {
    return this.currentStepIndex;
  }

  public getState() {
    return this.currentState;
  }

  public getMode() {
    return this.mode;
  }

  public startTour(scenario: ScenarioDefinition, mode: TrainingMode = 'watch', onNavigateNeeded?: (route: string) => void) {
    this.stopTour();
    this.currentScenario = scenario;
    this.currentStepIndex = 0;
    this.mode = mode;
    this.isPaused = false;
    this.setState('preparing');

    if (onNavigateNeeded) {
      onNavigateNeeded(scenario.startRoute);
    }

    setTimeout(() => {
      this.executeCurrentStep(onNavigateNeeded);
    }, 500);
  }

  private waitForElement(targetId: string, timeout = 10000): Promise<HTMLElement | null> {
    return new Promise(resolve => {
      const selector = `[data-tour-id="${targetId}"]`;
      let el = document.querySelector(selector) as HTMLElement;
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        el = document.querySelector(selector) as HTMLElement;
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  private animateCursorTo(targetX: number, targetY: number, duration = 800): Promise<void> {
    return new Promise(resolve => {
      this.setState('movingCursor');
      
      const startX = this.cursor.x < 0 ? targetX : this.cursor.x;
      const startY = this.cursor.y < 0 ? targetY : this.cursor.y;
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress; // ease in out

        this.setCursor({ 
          visible: true, 
          x: startX + (targetX - startX) * ease, 
          y: startY + (targetY - startY) * ease 
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  public async executeCurrentStep(onNavigateNeeded?: (route: string) => void) {
    if (!this.currentScenario || this.isPaused) return;

    const step = this.currentScenario.steps[this.currentStepIndex];
    if (!step) {
      this.finishTour();
      return;
    }

    this.listeners.forEach((l) => l.onStepChange(this.currentStepIndex, step));
    this.listeners.forEach((l) => l.onProgress(this.currentStepIndex + 1, this.currentScenario!.steps.length));

    // 1. Trigger Route Navigation (no fixed timeout)
    if (step.route && onNavigateNeeded) {
      this.setState('loadingRoute');
      onNavigateNeeded(step.route);
    }

    // 2. Start Visual Action Sequence
    const visualActionPromise = (async () => {
      let targetEl: HTMLElement | null = null;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
      
      if (isMobile && step.requiresMobileDrawer) {
        window.dispatchEvent(new CustomEvent('vowos:open-mobile-drawer'));
        // small wait for drawer to animate open
        await new Promise((r) => setTimeout(r, 300));
      }

      // Strict Route Wait: If step requires a route, wait for the window location to match it
      if (step.waitForRoute && typeof window !== 'undefined') {
        this.setState('loadingRoute');
        await new Promise<void>((resolve) => {
          if (window.location.pathname.includes(step.waitForRoute!)) return resolve();
          
          const interval = setInterval(() => {
            if (window.location.pathname.includes(step.waitForRoute!)) {
              clearInterval(interval);
              resolve();
            }
          }, 100);
          
          // Fallback timeout so we don't hang forever
          setTimeout(() => {
            clearInterval(interval);
            resolve();
          }, 5000);
        });
      }

      const activeTargetId = isMobile && step.mobileTargetId ? step.mobileTargetId : step.targetId;

      if (activeTargetId) {
        this.setState('waitingForTarget');
        targetEl = await this.waitForElement(activeTargetId, 10000);
      }

      if (targetEl) {
        this.setState('scrolling');
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Allow a small beat for scroll position to establish
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => setTimeout(r, 100));

        const rect = targetEl.getBoundingClientRect();
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;

        await this.animateCursorTo(targetX, targetY, 600);

        if (this.mode === 'watch' && step.action === 'click') {
          this.setState('performingAction');
          this.setCursor({ clicking: true });
          await new Promise((r) => setTimeout(r, 200));
          this.setCursor({ clicking: false });
          targetEl.click();
          // Minimal delay to ensure DOM click propagation before moving on
          await new Promise((r) => setTimeout(r, 100));
        }
      } else {
        this.setCursor({ visible: false });
      }
    })();

    // 3. Start Narration
    const narrationPromise = new Promise<void>((resolve) => {
      this.setState('narrating');
      elevenLabsService.speak({
        text: step.narrationText,
        playbackRate: this.playbackRate,
        volume: this.isMuted ? 0 : 1.0,
        onEnded: resolve
      }).catch(resolve);
    });

    // 4. Synchronize: Wait for BOTH visual actions and narration to fully complete
    this.setState('waitingForState');
    await Promise.all([narrationPromise, visualActionPromise]);

    // 5. Proceed to next step if applicable
    if (this.mode === 'watch' && !this.isPaused) {
      this.nextStep(onNavigateNeeded);
    }
  }

  public nextStep(onNavigateNeeded?: (route: string) => void) {
    if (!this.currentScenario) return;
    if (this.currentStepIndex < this.currentScenario.steps.length - 1) {
      this.currentStepIndex++;
      this.executeCurrentStep(onNavigateNeeded);
    } else {
      this.finishTour();
    }
  }

  public prevStep(onNavigateNeeded?: (route: string) => void) {
    if (!this.currentScenario) return;
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.executeCurrentStep(onNavigateNeeded);
    }
  }

  public pauseTour() {
    this.isPaused = true;
    this.setState('paused');
    elevenLabsService.stop();
  }

  public resumeTour(onNavigateNeeded?: (route: string) => void) {
    this.isPaused = false;
    this.executeCurrentStep(onNavigateNeeded);
  }

  public stopTour() {
    this.currentScenario = null;
    this.currentStepIndex = 0;
    this.isPaused = false;
    this.setState('idle');
    this.setCursor({ visible: false, x: -100, y: -100 });
    elevenLabsService.stop();
  }

  private finishTour() {
    this.setState('completedTour');
    this.setCursor({ visible: false });
    // Do NOT call this.stopTour() automatically. 
    // This allows the CTA modal in TourControlBar to remain visible indefinitely 
    // until the user clicks a CTA button.
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    elevenLabsService.setMuted(muted);
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    elevenLabsService.setRate(rate);
  }
}

export const tourEngine = new TourEngine();
