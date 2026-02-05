import type { HighlightKind, IRenderer, RenderState } from "@/renderer/types";
import { DEFAULT_THEME_ID, THEMES } from "@/themes/themes";
import type { ThemeVizColors } from "@/themes/types";

/** Padding */
const PADDING_TOP = 7;
const PADDING_BOTTOM = 0;
const PADDING_LEFT = 7;
const PADDING_RIGHT = 7;

/** Gap sizing for bars */
const BAR_BORDER_WIDTH = 1;

const BAR_GAP_ENABLED = false;
const BAR_GAP_RATIO = 0.15;
const BAR_GAP_MAX = 2;

const BAR_BASE_HEIGHT_RATIO = 0.05;
const BAR_BASE_HEIGHT_MIN = 2;
const BAR_BASE_HEIGHT_MAX = 10;

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
  private colors = THEMES[DEFAULT_THEME_ID].viz;

  setTheme(colors: ThemeVizColors): void {
    this.colors = colors;
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
  }

  resize(): void {
    if (!this.canvas || !this.ctx) return;

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

    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  render(state: RenderState): void {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const colors = this.colors;

    const { array, activeRange, minValue, maxValue, isSorted, highlights } =
      state;
    const width = this.width;
    const height = this.height;

    this.clear();

    if (array.length === 0 || width === 0 || height === 0) return;

    const barCount = array.length;
    const gap = BAR_GAP_ENABLED
      ? Math.min(BAR_GAP_MAX, (width / barCount) * BAR_GAP_RATIO)
      : 0;
    const barWidth =
      (width - gap * (barCount - 1) - PADDING_LEFT - PADDING_RIGHT) / barCount;
    const valueRange = maxValue - minValue || 1;
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
      barColors: { fill: string; border: string; glow?: string },
      withGlow: boolean
    ) => {
      const value = array[index];
      const normalizedValue = (value - minValue) / valueRange;
      const barHeight =
        barBaseHeight + normalizedValue * (maxBarHeight - barBaseHeight);
      const x = PADDING_LEFT + index * (barWidth + gap);
      const y = PADDING_TOP + maxBarHeight - barHeight;

      if (withGlow && barColors.glow) {
        ctx.save();
        ctx.shadowColor = barColors.glow;
        ctx.shadowBlur = GLOW_BLUR_RADIUS;
        ctx.fillStyle = barColors.fill;
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.restore();
      }

      ctx.fillStyle = barColors.fill;
      ctx.fillRect(x, y, barWidth, barHeight);

      ctx.strokeStyle = barColors.border;
      ctx.lineWidth = BAR_BORDER_WIDTH;
      ctx.strokeRect(x, y, barWidth, barHeight);
    };

    const baseColors = isSorted ? colors.sorted : colors.default;
    for (let i = 0; i < array.length; i++) {
      drawBar(i, baseColors, false);
    }

    if (!isSorted) {
      const highlightColorMap: Record<
        HighlightKind,
        { fill: string; border: string; glow: string }
      > = {
        comparing: colors.comparing,
        swapping: colors.swapping,
        writing: colors.writing,
      };

      for (const highlight of highlights) {
        const hlColors = highlightColorMap[highlight.kind];
        if (!hlColors) continue;
        for (const index of highlight.indices) {
          if (index < 0 || index >= array.length) continue;
          drawBar(index, hlColors, true);
        }
      }
    }

    if (activeRange) {
      const lineX = PADDING_LEFT + activeRange.lo * (barWidth + gap);
      const lineWidth =
        (activeRange.hi - activeRange.lo + 1) * barWidth +
        (activeRange.hi - activeRange.lo) * gap;
      const lineY = height - PADDING_BOTTOM - ACTIVE_RANGE_LINE_HEIGHT;

      ctx.save();
      ctx.shadowColor = colors.range.glow;
      ctx.shadowBlur = 6;
      ctx.fillStyle = colors.range.fill;
      ctx.fillRect(lineX, lineY, lineWidth, ACTIVE_RANGE_LINE_HEIGHT);
      ctx.restore();
    }
  }
}
