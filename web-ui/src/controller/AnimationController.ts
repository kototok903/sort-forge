import type { SortEvent } from '../types';
import type { ISortEngine } from '../engines/types';
import type { RenderState, BarState, IRenderer } from '../renderer';
import { inverseEvent } from '../types';

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'done';

export interface ControllerState {
  playbackState: PlaybackState;
  currentStep: number;
  totalSteps: number;
  speed: number;
  array: number[];
}

type StateListener = (state: ControllerState) => void;

/**
 * Animation controller that orchestrates playback of sort events.
 */
export class AnimationController {
  private engine: ISortEngine | null = null;
  private renderer: IRenderer | null = null;

  // Array state
  private initialArray: number[] = [];
  private array: number[] = [];
  private minValue = 0;
  private maxValue = 1;

  // Playback state
  private playbackState: PlaybackState = 'idle';
  private currentStep = 0;
  private totalSteps = 0;
  private speed = 1; // events per frame
  private eventsPerSecond = 60;

  // Animation
  private animationId: number | null = null;
  private lastFrameTime = 0;
  private accumulatedTime = 0;

  // Visual state tracking
  private barStates: BarState[] = [];
  private activeRange: { lo: number; hi: number } | null = null;
  private rangeStack: { lo: number; hi: number }[] = [];

  // Listeners
  private listeners: Set<StateListener> = new Set();

  /** Set the renderer to use */
  setRenderer(renderer: IRenderer): void {
    this.renderer = renderer;
  }

  /** Set the sort engine */
  setEngine(engine: ISortEngine): void {
    this.engine = engine;
  }

  /** Initialize with a new sort */
  async initialize(engine: ISortEngine, algorithm: string, array: number[]): Promise<void> {
    this.stop();

    this.engine = engine;
    this.initialArray = [...array];
    this.array = [...array];
    if (array.length > 0) {
      this.minValue = Math.min(...array);
      this.maxValue = Math.max(...array);
    } else {
      this.minValue = 0;
      this.maxValue = 1;
    }

    await engine.initialize(algorithm, array);

    this.totalSteps = engine.getTotalEvents();
    this.currentStep = 0;
    this.playbackState = 'idle';
    this.barStates = new Array(array.length).fill('default');
    this.activeRange = null;
    this.rangeStack = [];

    this.notifyListeners();
    this.render();
  }

  /** Start or resume playback */
  play(): void {
    if (this.playbackState === 'done') {
      this.reset();
    }
    if (this.engine?.canSeek) {
      this.engine.seek(this.currentStep);
    }
    this.playbackState = 'playing';
    this.lastFrameTime = performance.now();
    this.accumulatedTime = 0;
    this.startAnimationLoop();
    this.notifyListeners();
  }

  /** Pause playback */
  pause(): void {
    this.playbackState = 'paused';
    this.stopAnimationLoop();
    this.notifyListeners();
  }

  /** Stop and reset to beginning */
  stop(): void {
    this.playbackState = 'idle';
    this.stopAnimationLoop();
    this.reset();
  }

  /** Reset to initial state */
  reset(): void {
    this.array = [...this.initialArray];
    this.currentStep = 0;
    this.barStates = new Array(this.array.length).fill('default');
    this.activeRange = null;
    this.rangeStack = [];
    this.engine?.reset();

    if (this.playbackState === 'done') {
      this.playbackState = 'idle';
    }

    this.notifyListeners();
    this.render();
  }

  /** Step forward one event */
  stepForward(): void {
    if (!this.engine || this.currentStep >= this.totalSteps) return;

    const event = this.engine.getEventAt(this.currentStep);
    if (event) {
      this.applyEvent(event);
      this.currentStep++;
      if (this.engine.canSeek) {
        this.engine.seek(this.currentStep);
      }

      if (this.currentStep >= this.totalSteps) {
        this.playbackState = 'done';
        this.stopAnimationLoop();
      }
    }

    this.notifyListeners();
    this.render();
  }

  /** Step backward one event */
  stepBackward(): void {
    if (!this.engine || this.currentStep <= 0) return;

    this.currentStep--;
    const event = this.engine.getEventAt(this.currentStep);
    if (event) {
      this.applyEventToArray(inverseEvent(event));
    }
    this.applyVisualStateForStep(this.currentStep);
    if (this.engine.canSeek) {
      this.engine.seek(this.currentStep);
    }

    if (this.playbackState === 'done') {
      this.playbackState = 'paused';
    }

    this.notifyListeners();
    this.render();
  }

  /** Seek to a specific step */
  seekTo(step: number): void {
    if (!this.engine) return;

    const targetStep = Math.max(0, Math.min(step, this.totalSteps));

    // Reset and replay to target
    this.array = [...this.initialArray];
    this.barStates = new Array(this.array.length).fill('default');
    this.activeRange = null;
    this.rangeStack = [];

    for (let i = 0; i < targetStep; i++) {
      const event = this.engine.getEventAt(i);
      if (event) {
        this.applyEventToArray(event);
      }
    }

    // Apply visual state for the current event
    if (targetStep > 0 && targetStep <= this.totalSteps) {
      const event = this.engine.getEventAt(targetStep - 1);
      if (event) {
        this.applyVisualState(event);
      }
    }

    this.currentStep = targetStep;
    if (this.engine.canSeek) {
      this.engine.seek(this.currentStep);
    }

    if (this.currentStep >= this.totalSteps) {
      this.playbackState = 'done';
      this.stopAnimationLoop();
    } else if (this.playbackState === 'done') {
      this.playbackState = 'paused';
    }

    this.notifyListeners();
    this.render();
  }

  /** Set playback speed (events per frame at 60fps) */
  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(100, speed));
    this.notifyListeners();
  }

  /** Get current state */
  getState(): ControllerState {
    return {
      playbackState: this.playbackState,
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      speed: this.speed,
      array: this.array,
    };
  }

  /** Subscribe to state changes */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Private methods ---

  private startAnimationLoop(): void {
    if (this.animationId !== null) return;

    const animate = (time: number) => {
      if (this.playbackState !== 'playing') return;

      const deltaTime = time - this.lastFrameTime;
      this.lastFrameTime = time;

      // Calculate how many events to process based on speed and time
      const msPerEvent = 1000 / (this.eventsPerSecond * this.speed);
      this.accumulatedTime += deltaTime;

      const eventsToProcess = Math.floor(this.accumulatedTime / msPerEvent);
      if (eventsToProcess > 0 && this.engine) {
        this.accumulatedTime -= eventsToProcess * msPerEvent;
        const batch = this.engine.getNextEvents(eventsToProcess);
        for (const event of batch) {
          this.applyEvent(event);
          this.currentStep++;
        }
      }

      if (this.currentStep >= this.totalSteps) {
        this.playbackState = 'done';
        this.stopAnimationLoop();
      }

      this.notifyListeners();
      this.render();

      if (this.playbackState === 'playing') {
        this.animationId = requestAnimationFrame(animate);
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  private stopAnimationLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private applyEvent(event: SortEvent): void {
    this.applyEventToArray(event);
    this.applyVisualState(event);
  }

  private applyEventToArray(event: SortEvent): void {
    switch (event.type) {
      case 'Swap': {
        const temp = this.array[event.i];
        this.array[event.i] = this.array[event.j];
        this.array[event.j] = temp;
        break;
      }
      case 'Overwrite': {
        this.array[event.idx] = event.new_val;
        break;
      }
      case 'EnterRange': {
        this.rangeStack.push({ lo: event.lo, hi: event.hi });
        this.activeRange = { lo: event.lo, hi: event.hi };
        break;
      }
      case 'ExitRange': {
        this.rangeStack.pop();
        this.activeRange = this.rangeStack.length > 0
          ? this.rangeStack[this.rangeStack.length - 1]
          : null;
        break;
      }
    }
  }

  private applyVisualState(event: SortEvent): void {
    // Reset all bar states to default first
    this.barStates.fill('default');

    switch (event.type) {
      case 'Compare':
        this.barStates[event.i] = 'comparing';
        this.barStates[event.j] = 'comparing';
        break;
      case 'Swap':
        this.barStates[event.i] = 'swapping';
        this.barStates[event.j] = 'swapping';
        break;
      case 'Overwrite':
        this.barStates[event.idx] = 'writing';
        break;
      case 'Done':
        // Mark all as sorted
        this.barStates.fill('sorted');
        break;
    }
  }

  private applyVisualStateForStep(step: number): void {
    if (!this.engine) return;

    if (step <= 0) {
      this.barStates.fill('default');
      return;
    }

    const event = this.engine.getEventAt(step - 1);
    if (event) {
      this.applyVisualState(event);
    } else {
      this.barStates.fill('default');
    }
  }

  private render(): void {
    if (!this.renderer) return;

    const state: RenderState = {
      array: this.array,
      minValue: this.minValue,
      maxValue: this.maxValue,
      barStates: this.barStates,
      activeRange: this.activeRange,
    };

    this.renderer.render(state);
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
