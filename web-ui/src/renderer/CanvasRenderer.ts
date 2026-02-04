import type { HighlightKind, IRenderer, RenderState } from "@/renderer/types";

/** Base colors */
const BASE_COLORS = {
  default: { fill: "#5a5a62", border: "#4a4a52" },
  sorted: { fill: "#14b8a6", border: "#0d9488" },
};

/** Highlight colors (fill, border, glow) */
const HIGHLIGHT_COLORS: Record<
  HighlightKind,
  { fill: string; border: string; glow?: string }
> = {
  comparing: {
    fill: "#fbbf24",
    border: "#f59e0b",
    glow: "rgba(251, 191, 36, 0.4)",
  },
  swapping: {
    fill: "#f97316",
    border: "#ea580c",
    glow: "rgba(249, 115, 22, 0.5)",
  },
  writing: {
    fill: "#ef4444",
    border: "#dc2626",
    glow: "rgba(239, 68, 68, 0.5)",
  },
};

/** Background color - matches --bg-base */
const BG_COLOR = "#18181b";

/** Padding */
const PADDING_TOP = 0;
const PADDING_BOTTOM = 0;
const PADDING_LEFT = 0;
const PADDING_RIGHT = 0;

/** Gap sizing for bars */
const BAR_BORDER_WIDTH = 1;

const BAR_GAP_ENABLED = false;
const BAR_GAP_RATIO = 0.15;
const BAR_GAP_MAX = 2;

const BAR_BASE_HEIGHT_RATIO = 0.05;
const BAR_BASE_HEIGHT_MIN = 2;
const BAR_BASE_HEIGHT_MAX = 10;

const ACTIVE_RANGE_COLOR = "#14b8a6";
const ACTIVE_RANGE_LINE_HEIGHT = 3;
const ACTIVE_RANGE_LINE_GAP = 4;

/** Glow settings */
const GLOW_BLUR_RADIUS = 8;

/**
 * Canvas-based renderer for sort visualization.
 */
export class CanvasRenderer implements IRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;

  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
  }

  resize(): void {
    if (!this.canvas || !this.ctx) return;

    // Match canvas internal size to display size for sharp rendering
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
  }

  clear(): void {
    if (!this.canvas || !this.ctx) return;

    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  render(state: RenderState): void {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;

    const { array, activeRange, minValue, maxValue, isSorted, highlights } =
      state;
    const width = this.width;
    const height = this.height;

    // Clear canvas
    this.clear();

    if (array.length === 0 || width === 0 || height === 0) return;

    // Calculate bar dimensions
    const barCount = array.length;
    const gap = BAR_GAP_ENABLED
      ? Math.min(BAR_GAP_MAX, (width / barCount) * BAR_GAP_RATIO)
      : 0;
    const barWidth =
      (width - gap * (barCount - 1) - PADDING_LEFT - PADDING_RIGHT) / barCount;
    const valueRange = maxValue - minValue || 1; // Prevent division by zero
    const maxBarHeight = Math.max(
      0,
      height -
        ACTIVE_RANGE_LINE_HEIGHT -
        ACTIVE_RANGE_LINE_GAP -
        PADDING_TOP -
        PADDING_BOTTOM
    );
    const barBaseHeight = Math.max(
      BAR_BASE_HEIGHT_MIN,
      Math.min(BAR_BASE_HEIGHT_MAX, maxBarHeight * BAR_BASE_HEIGHT_RATIO)
    );
    if (maxBarHeight < barBaseHeight) return;

    const drawBar = (
      index: number,
      colors: { fill: string; border: string; glow?: string },
      withGlow: boolean
    ) => {
      const value = array[index];
      const normalizedValue = (value - minValue) / valueRange;
      const barHeight =
        barBaseHeight + normalizedValue * (maxBarHeight - barBaseHeight);
      const x = PADDING_LEFT + index * (barWidth + gap);
      const y = PADDING_TOP + maxBarHeight - barHeight;

      if (withGlow && colors.glow) {
        ctx.save();
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = GLOW_BLUR_RADIUS;
        ctx.fillStyle = colors.fill;
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.restore();
      }

      ctx.fillStyle = colors.fill;
      ctx.fillRect(x, y, barWidth, barHeight);

      ctx.strokeStyle = colors.border;
      ctx.lineWidth = BAR_BORDER_WIDTH;
      ctx.strokeRect(x, y, barWidth, barHeight);
    };

    const baseColors = isSorted ? BASE_COLORS.sorted : BASE_COLORS.default;
    for (let i = 0; i < array.length; i++) {
      drawBar(i, baseColors, false);
    }

    if (!isSorted) {
      for (const highlight of highlights) {
        const colors = HIGHLIGHT_COLORS[highlight.kind];
        if (!colors) continue;
        for (const index of highlight.indices) {
          if (index < 0 || index >= array.length) continue;
          drawBar(index, colors, true);
        }
      }
    }

    // Draw active range line
    if (activeRange) {
      const lineX = PADDING_LEFT + activeRange.lo * (barWidth + gap);
      const lineWidth =
        (activeRange.hi - activeRange.lo + 1) * barWidth +
        (activeRange.hi - activeRange.lo) * gap;
      const lineY = height - PADDING_BOTTOM - ACTIVE_RANGE_LINE_HEIGHT;

      // Glow for range line
      ctx.save();
      ctx.shadowColor = "rgba(34, 211, 238, 0.4)";
      ctx.shadowBlur = 6;
      ctx.fillStyle = ACTIVE_RANGE_COLOR;
      ctx.fillRect(lineX, lineY, lineWidth, ACTIVE_RANGE_LINE_HEIGHT);
      ctx.restore();
    }
  }
}
