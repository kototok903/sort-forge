import type { SortEvent } from "@/types/events";
import type { ISortEngine } from "@/engines/types";
import type {
  Highlight,
  RenderState,
  IRenderer,
} from "@/renderer/types";
import { inverseEvent } from "@/types/events";
import {
  BASE_EVENTS_PER_SECOND,
  SPEED_DEFAULT,
  SPEED_MAX,
  SPEED_MIN,
} from "@/config";

export type PlaybackState = "idle" | "playing" | "paused" | "done";
export type PlaybackDirection = "forward" | "backward";

export interface ControllerState {
  playbackState: PlaybackState;
  direction: PlaybackDirection;
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
  private playbackState: PlaybackState = "idle";
  private direction: PlaybackDirection = "forward";
  private currentStep = 0;
  private totalSteps = 0;
  private speed = SPEED_DEFAULT;

  // Animation
  private animationId: number | null = null;
  private lastFrameTime = 0;
  private accumulatedTime = 0;

  // Visual state tracking
  private highlights: Highlight[] = [];
  private activeRange: { lo: number; hi: number } | null = null;
  private rangeStack: { lo: number; hi: number }[] = [];
  private isSorted = false;

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
  async initialize(
    engine: ISortEngine,
    algorithm: string,
    array: number[]
  ): Promise<void> {
    this.stop();

    this.engine = engine;
    this.initialArray = [...array];
    this.resetArrayState(array);
    this.updateMinMax(array);

    await engine.initialize(algorithm, array);

    this.totalSteps = engine.getTotalEvents();
    this.currentStep = 0;
    this.playbackState = "idle";

    this.notifyListeners();
    this.render();
  }

  /** Start or resume playback */
  play(): void {
    if (this.playbackState === "done") {
      this.reset();
    }
    if (this.engine) {
      this.engine.seek(this.currentStep);
    }
    this.direction = "forward";
    this.playbackState = "playing";
    this.lastFrameTime = performance.now();
    this.accumulatedTime = 0;
    this.startAnimationLoop();
    this.notifyListeners();
  }

  /** Start or resume backward playback */
  playBackward(): void {
    if (this.playbackState === "done") {
      // If at the end, just start playing backward from current position
    }
    if (this.currentStep <= 0) {
      // Already at start, nothing to play backward
      return;
    }
    this.direction = "backward";
    this.playbackState = "playing";
    this.lastFrameTime = performance.now();
    this.accumulatedTime = 0;
    this.startAnimationLoop();
    this.notifyListeners();
  }

  /** Pause playback */
  pause(): void {
    this.playbackState = "paused";
    this.stopAnimationLoop();
    this.notifyListeners();
  }

  /** Stop and reset to beginning */
  stop(): void {
    this.playbackState = "idle";
    this.stopAnimationLoop();
    this.reset();
  }

  /** Reset to initial state */
  reset(): void {
    this.resetArrayState(this.initialArray);
    this.currentStep = 0;
    this.engine?.reset();
    if (this.engine) {
      this.totalSteps = this.engine.getTotalEvents();
    }

    if (this.playbackState === "done") {
      this.playbackState = "idle";
    }

    this.notifyListeners();
    this.render();
  }

  /** Step forward one event */
  stepForward(): void {
    if (!this.engine) return;

    if (this.engine.canSeek) {
      if (this.currentStep >= this.totalSteps) return;

      const event = this.engine.getEventAt(this.currentStep);
      if (!event) return;

      this.applyEvent(event);
      this.currentStep++;
      this.engine.seek(this.currentStep);

      if (this.currentStep >= this.totalSteps) {
        this.playbackState = "done";
        this.stopAnimationLoop();
      }
    } else {
      const batch = this.engine.getNextEvents(1);
      if (batch.length === 0) {
        if (this.engine.isDone()) {
          this.playbackState = "done";
          this.stopAnimationLoop();
          this.totalSteps = this.currentStep;
        }
        this.notifyListeners();
        this.render();
        return;
      }

      this.applyEvent(batch[0]);
      this.currentStep++;
      this.totalSteps = this.engine.getTotalEvents();
    }

    this.notifyListeners();
    this.render();
  }

  /** Step backward one event */
  stepBackward(): void {
    if (!this.engine || this.currentStep <= 0) return;

    const targetStep = this.currentStep - 1;
    const event = this.engine.getEventAt(targetStep);
    if (!event) return;

    this.currentStep = targetStep;
    this.applyEventToArray(inverseEvent(event));
    this.applyVisualStateForStep(this.currentStep);
    this.engine.seek(this.currentStep);

    if (this.playbackState === "done") {
      this.playbackState = "paused";
    }

    this.notifyListeners();
    this.render();
  }

  /** Seek to a specific step */
  seekTo(step: number): void {
    if (!this.engine || !this.engine.canSeek) return;

    const targetStep = Math.max(0, Math.min(step, this.totalSteps));

    this.resetArrayState(this.initialArray);

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
      this.playbackState = "done";
      this.stopAnimationLoop();
    } else if (this.playbackState === "done") {
      this.playbackState = "paused";
    }

    this.notifyListeners();
    this.render();
  }

  /** Set playback speed */
  setSpeed(speed: number): void {
    this.speed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, speed));
    this.notifyListeners();
  }

  /** Force a re-render with current state (useful after theme changes) */
  forceRender(): void {
    this.render();
  }

  /** Get current state */
  getState(): ControllerState {
    return {
      playbackState: this.playbackState,
      direction: this.direction,
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
      if (this.playbackState !== "playing") return;

      const deltaTime = time - this.lastFrameTime;
      this.lastFrameTime = time;

      const msPerEvent = 1000 / (BASE_EVENTS_PER_SECOND * this.speed);
      this.accumulatedTime += deltaTime;

      const eventsToProcess = Math.floor(this.accumulatedTime / msPerEvent);
      if (eventsToProcess > 0 && this.engine) {
        this.accumulatedTime -= eventsToProcess * msPerEvent;

        if (this.direction === "forward") {
          // Forward playback (apply visuals once per frame)
          const batch = this.engine.getNextEvents(eventsToProcess);
          let lastEvent: SortEvent | null = null;
          for (const event of batch) {
            this.applyEventToArray(event);
            this.currentStep++;
            lastEvent = event;
          }
          if (lastEvent) {
            this.applyVisualState(lastEvent);
          }
        } else {
          // Backward playback
          let appliedBackward = false;
          for (let i = 0; i < eventsToProcess && this.currentStep > 0; i++) {
            const targetStep = this.currentStep - 1;
            const event = this.engine.getEventAt(targetStep);
            if (!event) {
              if (!this.engine.canSeek) {
                this.playbackState = "paused";
                this.stopAnimationLoop();
              }
              break;
            }

            this.currentStep = targetStep;
            this.applyEventToArray(inverseEvent(event));
            appliedBackward = true;
          }
          if (appliedBackward) {
            this.applyVisualStateForStep(this.currentStep);
          }
          this.engine.seek(this.currentStep);
        }
      }

      if (this.engine && !this.engine.canSeek) {
        this.totalSteps = this.engine.getTotalEvents();
      }

      // Check for completion
      if (this.direction === "forward") {
        if (this.engine?.canSeek && this.currentStep >= this.totalSteps) {
          this.playbackState = "done";
          this.stopAnimationLoop();
        } else if (!this.engine?.canSeek && this.engine?.isDone()) {
          this.playbackState = "done";
          this.stopAnimationLoop();
          this.totalSteps = this.currentStep;
        }
      } else if (this.direction === "backward" && this.currentStep <= 0) {
        this.playbackState = "paused";
        this.stopAnimationLoop();
      }

      this.notifyListeners();
      this.render();

      if (this.playbackState === "playing") {
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
      case "Swap": {
        const temp = this.array[event.i];
        this.array[event.i] = this.array[event.j];
        this.array[event.j] = temp;
        break;
      }
      case "Overwrite": {
        this.array[event.idx] = event.new_val;
        break;
      }
      case "EnterRange": {
        this.rangeStack.push({ lo: event.lo, hi: event.hi });
        this.activeRange = { lo: event.lo, hi: event.hi };
        break;
      }
      case "ExitRange": {
        this.rangeStack.pop();
        this.activeRange =
          this.rangeStack.length > 0
            ? this.rangeStack[this.rangeStack.length - 1]
            : null;
        break;
      }
    }
  }

  private applyVisualState(event: SortEvent): void {
    this.isSorted = false;
    this.highlights = [];

    switch (event.type) {
      case "Compare":
        this.highlights = [
          { kind: "comparing", indices: [event.i, event.j] },
        ];
        break;
      case "Swap":
        this.highlights = [
          { kind: "swapping", indices: [event.i, event.j] },
        ];
        break;
      case "Overwrite":
        this.highlights = [
          { kind: "writing", indices: [event.idx] },
        ];
        break;
      case "Done":
        this.isSorted = true;
        break;
    }
  }

  private applyVisualStateForStep(step: number): void {
    if (!this.engine) return;

    if (step <= 0) {
      this.isSorted = false;
      this.highlights = [];
      return;
    }

    const event = this.engine.getEventAt(step - 1);
    if (event) {
      this.applyVisualState(event);
    } else {
      this.isSorted = false;
      this.highlights = [];
    }
  }

  private render(): void {
    if (!this.renderer) return;

    const state: RenderState = {
      array: this.array,
      minValue: this.minValue,
      maxValue: this.maxValue,
      highlights: this.highlights,
      isSorted: this.isSorted,
      activeRange: this.activeRange,
    };

    this.renderer.render(state);
  }

  private resetArrayState(array: number[]): void {
    this.array = [...array];
    this.activeRange = null;
    this.rangeStack = [];
    this.isSorted = false;
    this.highlights = [];
  }

  private updateMinMax(array: number[]): void {
    if (array.length === 0) {
      this.minValue = 0;
      this.maxValue = 1;
      return;
    }

    let min = array[0];
    let max = array[0];
    for (let i = 1; i < array.length; i++) {
      min = Math.min(min, array[i]);
      max = Math.max(max, array[i]);
    }
    this.minValue = min;
    this.maxValue = max;
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
