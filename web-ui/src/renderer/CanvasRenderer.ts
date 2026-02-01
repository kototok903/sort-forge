import type { IRenderer, RenderState, BarState } from '@/renderer/types';

/** Bar state colors (fill, border, glow) - matches CSS --viz-* tokens */
const COLORS: Record<BarState, { fill: string; border: string; glow?: string }> = {
  default: { fill: '#5a5a62', border: '#4a4a52' },
  comparing: { fill: '#fbbf24', border: '#f59e0b', glow: 'rgba(251, 191, 36, 0.4)' },
  swapping: { fill: '#f97316', border: '#ea580c', glow: 'rgba(249, 115, 22, 0.5)' },
  writing: { fill: '#ef4444', border: '#dc2626', glow: 'rgba(239, 68, 68, 0.5)' },
  sorted: { fill: '#22d3ee', border: '#06b6d4', glow: 'rgba(34, 211, 238, 0.3)' },
};

/** Background color - matches --bg-base */
const BG_COLOR = '#18181b';

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

const ACTIVE_RANGE_COLOR = '#22d3ee';
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
    this.ctx = canvas.getContext('2d');
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

    const { array, barStates, activeRange, minValue, maxValue } = state;
    const width = this.width;
    const height = this.height;

    // Clear canvas
    this.clear();

    if (array.length === 0 || width === 0 || height === 0) return;

    // Calculate bar dimensions
    const barCount = array.length;
    const gap = BAR_GAP_ENABLED ? Math.min(BAR_GAP_MAX, width / barCount * BAR_GAP_RATIO) : 0;
    const barWidth = (width - gap * (barCount - 1) - PADDING_LEFT - PADDING_RIGHT) / barCount;
    const valueRange = maxValue - minValue || 1; // Prevent division by zero
    const maxBarHeight = Math.max(0, height - ACTIVE_RANGE_LINE_HEIGHT - ACTIVE_RANGE_LINE_GAP - PADDING_TOP - PADDING_BOTTOM);
    const barBaseHeight = Math.max(BAR_BASE_HEIGHT_MIN, Math.min(BAR_BASE_HEIGHT_MAX, maxBarHeight * BAR_BASE_HEIGHT_RATIO));
    if (maxBarHeight < barBaseHeight) return;

    // First pass: Draw bars with glow effects (active states only)
    for (let i = 0; i < array.length; i++) {
      const barState = barStates[i] || 'default';
      const colors = COLORS[barState];

      if (colors.glow) {
        const value = array[i];
        const normalizedValue = (value - minValue) / valueRange;
        const barHeight = barBaseHeight + normalizedValue * (maxBarHeight - barBaseHeight);
        const x = PADDING_LEFT + i * (barWidth + gap);
        const y = PADDING_TOP + maxBarHeight - barHeight;

        // Draw glow
        this.ctx.save();
        this.ctx.shadowColor = colors.glow;
        this.ctx.shadowBlur = GLOW_BLUR_RADIUS;
        this.ctx.fillStyle = colors.fill;
        this.ctx.fillRect(x, y, barWidth, barHeight);
        this.ctx.restore();
      }
    }

    // Second pass: Draw all bars
    for (let i = 0; i < array.length; i++) {
      const value = array[i];
      const barState = barStates[i] || 'default';
      const colors = COLORS[barState];

      // Calculate bar height
      const normalizedValue = (value - minValue) / valueRange;
      const barHeight = barBaseHeight + normalizedValue * (maxBarHeight - barBaseHeight);

      // Calculate bar position
      const x = PADDING_LEFT + i * (barWidth + gap);
      const y = PADDING_TOP + maxBarHeight - barHeight;

      // Fill bar
      this.ctx.fillStyle = colors.fill;
      this.ctx.fillRect(x, y, barWidth, barHeight);

      // Draw bar border
      this.ctx.strokeStyle = colors.border;
      this.ctx.lineWidth = BAR_BORDER_WIDTH;
      this.ctx.strokeRect(x, y, barWidth, barHeight);
    }

    // Draw active range line
    if (activeRange) {
      const lineX = PADDING_LEFT + activeRange.lo * (barWidth + gap);
      const lineWidth = (activeRange.hi - activeRange.lo + 1) * barWidth + (activeRange.hi - activeRange.lo) * gap;
      const lineY = height - PADDING_BOTTOM - ACTIVE_RANGE_LINE_HEIGHT;

      // Glow for range line
      this.ctx.save();
      this.ctx.shadowColor = 'rgba(34, 211, 238, 0.4)';
      this.ctx.shadowBlur = 6;
      this.ctx.fillStyle = ACTIVE_RANGE_COLOR;
      this.ctx.fillRect(lineX, lineY, lineWidth, ACTIVE_RANGE_LINE_HEIGHT);
      this.ctx.restore();
    }
  }
}
