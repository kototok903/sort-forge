import type { ThemeVizColors } from "@/themes/types";

/**
 * Highlight types for overlay rendering.
 */
export type HighlightKind = "comparing" | "swapping" | "writing";

export interface Highlight {
  kind: HighlightKind;
  indices: number[];
}

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

  /** Highlight overlays for the current frame */
  highlights: Highlight[];

  /** Whether the array is fully sorted */
  isSorted: boolean;

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

  /** Set theme colors for visualization */
  setTheme(colors: ThemeVizColors): void;
}
