import { TrainingStep, TourSyncState, TrainingMode } from '../types/trainingTypes';
import { narrationService } from './narrationService';

export interface CursorPosition {
  x: number;
  y: number;
  visible: boolean;
  clicking: boolean;
  targetRect?: DOMRect;
}

type TourStateListener = (state: {
  syncState: TourSyncState;
  activeStep?: TrainingStep;
  cursor: CursorPosition;
  currentStepIndex: number;
  totalSteps: number;
  mode: TrainingMode;
  error?: string;
}) => void;

class GuidedTourEngine {
  private steps: TrainingStep[] = [];
  private currentStepIndex: number = -1;
  private mode: TrainingMode = 'guided';
  private syncState: TourSyncState = 'PAUSED';
  private cursor: CursorPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2, visible: false, clicking: false };
  private listeners: Set<TourStateListener> = new Set();
  private navigateFn?: (route: string) => void;
  private timeoutId?: NodeJS.Timeout;
  private animFrameId?: number;
  private activeError?: string;

  public setNavigateFunction(fn: (route: string) => void) {
    this.navigateFn = fn;
  }

  public subscribe(listener: TourStateListener) {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const activeStep = this.steps[this.currentStepIndex];
    this.listeners.forEach((l) =>
      l({
        syncState: this.syncState,
        activeStep,
        cursor: this.cursor,
        currentStepIndex: this.currentStepIndex,
        totalSteps: this.steps.length,
        mode: this.mode,
        error: this.activeError,
      })
    );
  }

  public startTour(steps: TrainingStep[], mode: TrainingMode = 'guided') {
    this.stopTour();
    this.steps = steps;
    this.mode = mode;
    this.currentStepIndex = 0;
    this.activeError = undefined;

    if (this.steps.length > 0) {
      this.executeStep(0);
    }
  }

  public stopTour() {
    this.syncState = 'PAUSED';
    this.cursor.visible = false;
    this.cursor.clicking = false;
    narrationService.stop();
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.notify();
  }

  public nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.executeStep(this.currentStepIndex);
    } else {
      this.syncState = 'COMPLETED';
      this.cursor.visible = false;
      narrationService.speak('Congratulations! You have completed this onboarding module.', () => {
        this.stopTour();
      });
      this.notify();
    }
  }

  public previousStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.executeStep(this.currentStepIndex);
    }
  }

  private executeStep(index: number) {
    const step = this.steps[index];
    if (!step) return;

    this.activeError = undefined;
    this.syncState = 'PREPARING';
    this.notify();

    // Step 1: Check Route
    if (window.location.hash.replace('#', '') !== step.route && this.navigateFn) {
      this.syncState = 'WAITING_FOR_ROUTE';
      this.notify();
      this.navigateFn(step.route);
    }

    // Step 2: Wait for Element & Move Cursor
    this.waitForElement(step, (el) => {
      this.syncState = 'NARRATING';
      this.notify();

      narrationService.speak(step.narration, () => {
        if (this.mode === 'guided') {
          this.animateCursorToElement(el, () => {
            if (step.action === 'click') {
              this.performClick(el, () => {
                setTimeout(() => this.nextStep(), 1000);
              });
            } else {
              setTimeout(() => this.nextStep(), 1500);
            }
          });
        }
      });
    });
  }

  private waitForElement(step: TrainingStep, callback: (el: HTMLElement) => void, attempts: number = 0) {
    const selector = step.targetSelector;
    const fallback = step.fallbackSelector;

    let el = document.querySelector(selector) as HTMLElement;
    if (!el && fallback) {
      el = document.querySelector(fallback) as HTMLElement;
    }

    if (el) {
      callback(el);
      return;
    }

    if (attempts > 20) { // 5 seconds timeout
      this.syncState = 'FAILED';
      this.activeError = `Element not found: ${selector}. Try returning to ${step.route}`;
      this.notify();
      return;
    }

    this.syncState = 'WAITING_FOR_ELEMENT';
    this.notify();

    this.timeoutId = setTimeout(() => {
      this.waitForElement(step, callback, attempts + 1);
    }, 250);
  }

  private animateCursorToElement(el: HTMLElement, onArrived: () => void) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const rect = el.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    this.syncState = 'MOVING_CURSOR';
    this.cursor.visible = true;
    this.cursor.targetRect = rect;
    this.notify();

    const startX = this.cursor.x;
    const startY = this.cursor.y;
    const startTime = performance.now();
    const duration = 1000;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress; // Ease in-out

      this.cursor.x = startX + (targetX - startX) * ease;
      this.cursor.y = startY + (targetY - startY) * ease;
      this.notify();

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(animate);
      } else {
        this.syncState = 'HIGHLIGHTING';
        this.notify();
        onArrived();
      }
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  private performClick(el: HTMLElement, onComplete: () => void) {
    this.syncState = 'EXECUTING_ACTION';
    this.cursor.clicking = true;
    this.notify();

    setTimeout(() => {
      this.cursor.clicking = false;
      this.notify();
      el.click();
      onComplete();
    }, 400);
  }
}

export const guidedTourEngine = new GuidedTourEngine();
