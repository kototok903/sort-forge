import type { IRenderer, RenderState, BarState } from '@/renderer/types';

/** Color palette for bar states */
const COLORS: Record<BarState, string> = {
  default: '#6366f1',   // indigo
  comparing: '#facc15', // yellow
  swapping: '#f97316',  // orange
  writing: '#22c55e',   // green
  sorted: '#8b5cf6',    // purple
};

/** Color for bars outside the active range (dimmed) */
const DIMMED_COLOR = '#374151'; // gray-700

/** Background color */
const BG_COLOR = '#111827'; // gray-900

/** Gap sizing for bars */
const BAR_GAP_RATIO = 0.15;
const BAR_GAP_MAX = 2;

/**
 * Canvas-based renderer for sort visualization.
 */
export class CanvasRenderer implements IRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

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
  }

  clear(): void {
    if (!this.canvas || !this.ctx) return;

    const rect = this.canvas.getBoundingClientRect();
    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, rect.width, rect.height);
  }

  render(state: RenderState): void {
    if (!this.canvas || !this.ctx) return;

    const { array, barStates, activeRange, minValue, maxValue } = state;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    this.clear();

    if (array.length === 0) return;

    // Calculate bar dimensions
    const barCount = array.length;
    const rawBarWidth = width / barCount;
    let gap = barCount > 1 ? Math.min(BAR_GAP_MAX, rawBarWidth * BAR_GAP_RATIO) : 0;
    let totalGapWidth = gap * (barCount - 1);
    let barWidth = (width - totalGapWidth) / barCount;
    if (barWidth <= 0) {
      gap = 0;
      totalGapWidth = 0;
      barWidth = width / barCount;
    }
    const valueRange = maxValue - minValue || 1;

    // Draw each bar
    for (let i = 0; i < array.length; i++) {
      const value = array[i];
      const barState = barStates[i] || 'default';

      // Calculate bar height (normalize to canvas height with some padding)
      const normalizedValue = (value - minValue) / valueRange;
      const barHeight = Math.max(2, normalizedValue * (height - 20) + 10);

      // Calculate bar position
      const x = i * (barWidth + gap);
      const y = height - barHeight;

      // Determine color based on state and range
      let color: string;
      if (activeRange && (i < activeRange.lo || i > activeRange.hi)) {
        // Outside active range - dim the bar
        color = DIMMED_COLOR;
      } else {
        color = COLORS[barState];
      }

      // Draw the bar
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, barWidth, barHeight);
    }
  }
}
