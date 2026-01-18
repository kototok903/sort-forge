/**
 * Visual state for each bar in the visualization.
 */
export type BarState = 'default' | 'comparing' | 'swapping' | 'writing' | 'sorted';

/**
 * Render state passed to the renderer each frame.
 */
export interface RenderState {
  /** The current array values */
  array: number[];

  /** Fixed minimum value for consistent scaling during a run */
  minValue: number;

  /** Fixed maximum value for consistent scaling during a run */
  maxValue: number;

  /** Visual state for each bar (indexed by array position) */
  barStates: BarState[];

  /** Currently active range (for highlighting subarrays), null if none */
  activeRange: { lo: number; hi: number } | null;
}

/**
 * Interface for renderers (Canvas, WebGL, etc.)
 */
export interface IRenderer {
  /** Set the canvas element to render to */
  setCanvas(canvas: HTMLCanvasElement): void;

  /** Render the current state */
  render(state: RenderState): void;

  /** Clear the canvas */
  clear(): void;

  /** Handle resize */
  resize(): void;
}
