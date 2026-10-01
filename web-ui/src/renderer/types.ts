import type { ElementRef } from "@/types/events";
import type { WorkspaceState } from "@/workspace/types";
import type { ThemeVizColors } from "@/themes/types";

/**
 * Highlight types for overlay rendering.
 */
export type HighlightKind = "comparing" | "swapping" | "writing";

export interface Highlight {
  kind: HighlightKind;
  elements: ElementRef[];
}

/**
 * Render state passed to the renderer each frame.
 */
export interface RenderState {
  /** All arrays and their independent range stacks; removed entries are history. */
  workspace: WorkspaceState;

  /** Length of the main-array prefix colored complete by the frontend sweep. */
  completedCount: number;

  /** Fixed minimum value for consistent scaling during a run */
  minValue: number;

  /** Fixed maximum value for consistent scaling during a run */
  maxValue: number;

  /** Highlight overlays for the current frame */
  highlights: Highlight[];
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
