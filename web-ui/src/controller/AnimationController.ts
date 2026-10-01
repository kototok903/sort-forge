import type { PlaybackEvent } from "@/types/playback";
import type { ISortEngine } from "@/engines/types";
import type { Highlight, RenderState, IRenderer } from "@/renderer/types";
import { applyWorkspaceEvent, createWorkspace } from "@/workspace/reducer";
import type { WorkspaceState } from "@/workspace/types";
import {
  BASE_EVENTS_PER_SECOND,
  COMPLETION_EVENTS_PER_SECOND,
  SPEED_DEFAULT,
  SPEED_MAX,
  SPEED_MIN,
} from "@/config";
import { SoundEngine } from "@/sound/SoundEngine";
import type { SoundConfig } from "@/sound/types";

export type PlaybackState = "idle" | "playing" | "paused" | "done";
export type PlaybackDirection = "forward" | "backward";

export interface ControllerState {
  playbackState: PlaybackState;
  direction: PlaybackDirection;
  currentStep: number;
  totalSteps: number;
  speed: number;
  workspace: WorkspaceState;
  completedCount: number;
}

type StateListener = (state: ControllerState) => void;

/**
 * Animation controller that orchestrates playback of sort events.
 */
export class AnimationController {
  private engine: ISortEngine | null = null;
  private renderer: IRenderer | null = null;

  // Workspace state
  private initialArray: number[] = [];
  private workspace: WorkspaceState = createWorkspace([]);
  private minValue = 0;
  private maxValue = 1;

  // Playback state
  private playbackState: PlaybackState = "idle";
  private direction: PlaybackDirection = "forward";
  private currentStep = 0;
  private totalSteps = 0;
  // Live streams reveal this boundary after their final event is consumed.
  private sortSteps: number | null = null;
  private speed = SPEED_DEFAULT;

  // Animation
  private animationId: number | null = null;
  private lastFrameTime = 0;
  private accumulatedTime = 0;

  // Visual state tracking
  private highlights: Highlight[] = [];

  // Listeners
  private listeners: Set<StateListener> = new Set();

  // Sound
  private soundEngine: SoundEngine = new SoundEngine();

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
    this.resetWorkspaceState(array);
    this.updateMinMax(array);
    this.soundEngine.setValueRange(this.minValue, this.maxValue);

    await engine.initialize(algorithm, array);

    this.sortSteps = engine.canSeek ? engine.getTotalEvents() : null;
    this.updateTotalSteps();
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
      this.seekEngine();
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
    this.resetWorkspaceState(this.initialArray);
    this.currentStep = 0;
    this.engine?.reset();
    if (this.engine) {
      this.sortSteps = this.engine.canSeek
        ? this.engine.getTotalEvents()
        : null;
      this.updateTotalSteps();
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

    const event = this.getNextPlaybackEvents(1)[0];
    if (event) {
      this.applyEvent(event);
      this.currentStep++;
    }
    this.checkForwardCompletion();

    this.notifyListeners();
    this.render();
  }

  /** Step backward one event */
  stepBackward(): void {
    if (!this.engine || this.currentStep <= 0) return;

    const targetStep = this.currentStep - 1;
    const event = this.getPlaybackEventAt(targetStep);
    if (!event) return;

    if (event.type !== "CompleteElement") {
      applyWorkspaceEvent(this.workspace, event, "backward");
    }
    this.currentStep = targetStep;
    this.applyVisualStateForStep(this.currentStep);
    this.seekEngine();

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

    this.resetWorkspaceState(this.initialArray);

    for (let i = 0; i < Math.min(targetStep, this.sortSteps ?? 0); i++) {
      const event = this.engine.getEventAt(i);
      if (event) {
        applyWorkspaceEvent(this.workspace, event);
      }
    }

    // Apply visual state for the current event
    if (targetStep > 0 && targetStep <= this.totalSteps) {
      const event = this.getPlaybackEventAt(targetStep - 1);
      if (event) {
        this.applyVisualState(event);
      }
    }

    this.currentStep = targetStep;
    if (this.engine.canSeek) {
      this.seekEngine();
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
      workspace: this.workspace,
      completedCount: this.getCompletedCount(),
    };
  }

  /** Initialize sound engine (call after user interaction) */
  initSound(): void {
    this.soundEngine.init();
  }

  /** Resume sound context if suspended */
  resumeSound(): void {
    this.soundEngine.resume();
  }

  /** Update sound configuration */
  setSoundConfig(config: Partial<SoundConfig>): void {
    this.soundEngine.setConfig(config);
  }

  /** Get current sound configuration */
  getSoundConfig(): SoundConfig {
    return this.soundEngine.getConfig();
  }

  /** Subscribe to state changes */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Private methods ---

  private getCompletedCount(): number {
    return this.sortSteps === null
      ? 0
      : Math.max(
          0,
          Math.min(this.initialArray.length, this.currentStep - this.sortSteps)
        );
  }

  private isSweeping(): boolean {
    if (this.sortSteps === null) return false;
    return this.direction === "forward"
      ? this.currentStep >= this.sortSteps
      : this.currentStep > this.sortSteps;
  }

  private updateTotalSteps(): void {
    this.totalSteps =
      (this.sortSteps ?? this.engine?.getTotalEvents() ?? 0) +
      this.initialArray.length;
  }

  private seekEngine(): void {
    this.engine?.seek(
      Math.min(this.currentStep, this.sortSteps ?? this.currentStep)
    );
  }

  private getPlaybackEventAt(step: number): PlaybackEvent | null {
    if (this.sortSteps !== null && step >= this.sortSteps) {
      const idx = step - this.sortSteps;
      return idx < this.initialArray.length
        ? { type: "CompleteElement", idx }
        : null;
    }
    return this.engine?.getEventAt(step) ?? null;
  }

  /** Generate the completion tail on demand without storing another event array. */
  private getNextPlaybackEvents(count: number): PlaybackEvent[] {
    if (!this.engine) return [];
    if (this.sortSteps !== null && this.currentStep >= this.sortSteps) {
      const idx = this.getCompletedCount();
      const length = Math.min(count, this.initialArray.length - idx);
      return Array.from({ length }, (_, offset) => ({
        type: "CompleteElement",
        idx: idx + offset,
      }));
    }

    let batch: PlaybackEvent[];
    if (this.engine.canSeek) {
      const length = Math.min(count, (this.sortSteps ?? 0) - this.currentStep);
      batch = [];
      for (let i = 0; i < length; i++) {
        const event = this.engine.getEventAt(this.currentStep + i);
        if (!event) break;
        batch.push(event);
      }
      this.engine.seek(this.currentStep + batch.length);
    } else {
      batch = this.engine.getNextEvents(count);
      if (this.engine.isDone())
        this.sortSteps = this.currentStep + batch.length;
    }
    this.updateTotalSteps();
    return batch;
  }

  private checkForwardCompletion(): void {
    if (this.sortSteps !== null && this.currentStep >= this.totalSteps) {
      this.playbackState = "done";
      this.stopAnimationLoop();
    }
  }

  private startAnimationLoop(): void {
    if (this.animationId !== null) return;

    const animate = (time: number) => {
      if (this.playbackState !== "playing") return;

      const deltaTime = time - this.lastFrameTime;
      this.lastFrameTime = time;

      const sweeping = this.isSweeping();
      const rate = sweeping
        ? COMPLETION_EVENTS_PER_SECOND
        : BASE_EVENTS_PER_SECOND * this.speed;
      const msPerEvent = 1000 / rate;
      this.accumulatedTime += deltaTime;

      const eventsToProcess = Math.floor(this.accumulatedTime / msPerEvent);
      if (eventsToProcess > 0 && this.engine) {
        this.accumulatedTime -= eventsToProcess * msPerEvent;

        if (this.direction === "forward") {
          // Forward playback (apply visuals once per frame)
          const batch = this.getNextPlaybackEvents(eventsToProcess);
          let lastEvent: PlaybackEvent | null = null;
          for (const event of batch) {
            this.soundEngine.playEvent(event, this.workspace);
            if (event.type !== "CompleteElement") {
              applyWorkspaceEvent(this.workspace, event);
            }
            this.currentStep++;
            lastEvent = event;
          }
          if (lastEvent) {
            this.applyVisualState(lastEvent);
          }
        } else {
          // Backward playback
          let appliedBackward = false;
          // Stop at the phase boundary so sort events keep their own timing.
          const limit = sweeping ? this.getCompletedCount() : this.currentStep;
          for (let i = 0; i < Math.min(eventsToProcess, limit); i++) {
            const targetStep = this.currentStep - 1;
            const event = this.getPlaybackEventAt(targetStep);
            if (!event) {
              if (!this.engine.canSeek) {
                this.playbackState = "paused";
                this.stopAnimationLoop();
              }
              break;
            }

            if (event.type !== "CompleteElement") {
              applyWorkspaceEvent(this.workspace, event, "backward");
            }
            this.currentStep = targetStep;
            appliedBackward = true;
          }
          if (appliedBackward) {
            this.applyVisualStateForStep(this.currentStep);
          }
          this.seekEngine();
        }
      }

      // Start a fresh timing interval when switching between sorting and sweeping.
      if (sweeping !== this.isSweeping()) this.accumulatedTime = 0;
      this.updateTotalSteps();

      // Check for completion
      if (this.direction === "forward") {
        this.checkForwardCompletion();
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

  private applyEvent(event: PlaybackEvent): void {
    this.soundEngine.playEvent(event, this.workspace);
    if (event.type !== "CompleteElement") {
      applyWorkspaceEvent(this.workspace, event);
    }
    this.applyVisualState(event);
  }

  private applyVisualState(event: PlaybackEvent): void {
    this.highlights = [];

    switch (event.type) {
      case "Compare":
        this.highlights = [
          {
            kind: "comparing",
            elements: [event.i, event.j],
          },
        ];
        break;
      case "Swap":
        this.highlights = [
          {
            kind: "swapping",
            elements: [event.i, event.j],
          },
        ];
        break;
      case "Overwrite":
        this.highlights = [{ kind: "writing", elements: [event.dest] }];
        break;
      case "Copy":
        this.highlights = [
          {
            kind: "writing",
            elements: [event.src, event.dest],
          },
        ];
        break;
    }
  }

  private applyVisualStateForStep(step: number): void {
    if (!this.engine) return;

    if (step <= 0) {
      this.highlights = [];
      return;
    }

    const event = this.getPlaybackEventAt(step - 1);
    if (event) {
      this.applyVisualState(event);
    } else {
      this.highlights = [];
    }
  }

  private render(): void {
    if (!this.renderer) return;

    const state: RenderState = {
      workspace: this.workspace,
      completedCount: this.getCompletedCount(),
      minValue: this.minValue,
      maxValue: this.maxValue,
      highlights: this.highlights,
    };

    this.renderer.render(state);
  }

  private resetWorkspaceState(array: number[]): void {
    this.workspace = createWorkspace(array);
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
