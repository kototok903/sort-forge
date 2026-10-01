import { expect, test } from "bun:test";
import { layoutArrays, ARRAY_PADDING } from "@/renderer/layout";
import { CanvasRenderer } from "@/renderer/CanvasRenderer";
import { createWorkspace, applyWorkspaceEvent } from "@/workspace/reducer";
import { THEMES, DEFAULT_THEME_ID } from "@/themes/themes";

function workspaceWith(lengths) {
  const workspace = createWorkspace(Array(10).fill(1));
  lengths.forEach((length, idx) =>
    applyWorkspaceEvent(workspace, { type: "AddArray", arrId: idx + 1, length })
  );
  return workspace;
}

test("main-only layout preserves the existing canvas padding", () => {
  const [main] = layoutArrays(workspaceWith([]), 114, 107);
  expect(main).toMatchObject({ x: 7, y: 7, width: 100, height: 100 });
});

test("top buffers share slot widths, preserve empty positions, and leave unused space", () => {
  const workspace = workspaceWith([2, 3]);
  workspace.arrays.get(1).values[0] = 10;
  const [main, left, right] = layoutArrays(workspace, 114, 107);
  expect(main).toMatchObject({ x: 7, y: 45, width: 100, height: 62 });
  expect(left).toMatchObject({ x: 7, y: 7, width: 20, height: 31 });
  expect(right).toMatchObject({ x: 34, y: 7, width: 30, height: 31 });
  expect(main.y - (left.y + left.height)).toBe(ARRAY_PADDING);
  expect(right.x + right.width).toBeLessThan(main.x + main.width);
  workspace.arrays.get(1).values.fill(null);
  expect(layoutArrays(workspace, 114, 107)).toEqual([main, left, right]);
});

test("large buffers use proportional widths without exceeding main's slot width", () => {
  const [main, left, right] = layoutArrays(workspaceWith([10, 20]), 114, 107);
  expect(left.width / right.width).toBeCloseTo(0.5);
  expect(left.width / 10).toBeLessThan(main.width / 10);
  expect(right.x - (left.x + left.width)).toBeCloseTo(7);
  expect(right.x + right.width).toBeCloseTo(107);
});

test("scalar-only buffers sit to the right with matching bar widths", () => {
  const [main, first, second] = layoutArrays(workspaceWith([1, 1]), 148, 107);
  expect(main.height).toBe(100);
  expect(first.width).toBe(main.width / 10);
  expect(second.width).toBe(first.width);
  expect(first.x - main.x - main.width).toBeCloseTo(7);
  expect(second.x + second.width).toBeCloseTo(141);
});

test("removed arrays close their space and rewind restores creation order", () => {
  const workspace = workspaceWith([2, 3]);
  // Map insertion order does not determine placement.
  const first = workspace.arrays.get(1);
  workspace.arrays.delete(1);
  workspace.arrays.set(1, first);
  const original = layoutArrays(workspace, 114, 107);
  expect(original.map(({ array }) => array.id)).toEqual([0, 1, 2]);
  applyWorkspaceEvent(workspace, { type: "RemoveArray", arrId: 1 });
  expect(
    layoutArrays(workspace, 114, 107).map(({ array }) => array.id)
  ).toEqual([0, 2]);
  applyWorkspaceEvent(workspace, { type: "RemoveArray", arrId: 1 }, "backward");
  expect(layoutArrays(workspace, 114, 107)).toEqual(original);
});

test("empty buffers and tiny canvases produce finite nonnegative rectangles", () => {
  for (const lengths of [[], [0], [1], [2, 10]]) {
    for (const size of [0, 5, 20]) {
      for (const rect of layoutArrays(workspaceWith(lengths), size, size)) {
        for (const key of ["x", "y", "width", "height"])
          expect(Number.isFinite(rect[key])).toBe(true);
        expect(rect.width).toBeGreaterThanOrEqual(0);
        expect(rect.height).toBeGreaterThanOrEqual(0);
      }
    }
  }
});

test("renderer targets highlights and ranges per array, skips nulls, and sorts only main", () => {
  const originalWindow = globalThis.window;
  globalThis.window = { devicePixelRatio: 1 };
  try {
    const draws = [];
    let clips = 0;
    const ctx = {
      setTransform() {},
      save() {},
      restore() {},
      beginPath() {},
      rect() {},
      clip() {
        clips++;
      },
      strokeRect() {},
      fillRect(x, y, width, height) {
        draws.push({ x, y, width, height, color: this.fillStyle });
      },
    };
    const renderer = new CanvasRenderer();
    renderer.setCanvas({
      getContext: () => ctx,
      getBoundingClientRect: () => ({ width: 114, height: 107 }),
    });
    const workspace = workspaceWith([2]);
    workspace.arrays.get(1).values[1] = 1;
    workspace.arrays.get(1).rangeStack.push({ lo: 0, hi: 1 });
    const state = {
      workspace,
      completedCount: 0,
      minValue: 0,
      maxValue: 1,
      highlights: [
        {
          kind: "writing",
          elements: [
            { arrId: 0, idx: 3 },
            { arrId: 1, idx: 1 },
          ],
        },
      ],
    };
    renderer.render(state);
    const colors = THEMES[DEFAULT_THEME_ID].viz;
    const writes = draws.filter((draw) => draw.color === colors.writing.fill);
    expect(new Set(writes.map(({ x, y }) => `${x},${y}`)).size).toBe(2);
    expect(writes.some(({ y }) => y === 45)).toBe(true);
    expect(writes.some(({ y }) => y === 7)).toBe(true);
    expect(draws.filter((draw) => draw.color === colors.range.fill)).toEqual([
      { x: 7, y: 35, width: 20, height: 3, color: colors.range.fill },
    ]);
    expect(clips).toBe(2);
    expect(
      draws.filter((draw) => draw.color === colors.default.fill)
    ).toHaveLength(11);
    draws.length = 0;
    workspace.isSorted = true;
    workspace.arrays.get(1).rangeStack = [];
    state.highlights = [];
    // Algorithm completion alone does not color the main array.
    renderer.render(state);
    expect(
      draws.filter((draw) => draw.color === colors.sorted.fill)
    ).toHaveLength(0);
    draws.length = 0;
    state.completedCount = 3;
    renderer.render(state);
    expect(
      draws
        .filter((draw) => draw.color === colors.sorted.fill)
        .map(({ x }) => x)
    ).toEqual([7, 17, 27]);
    expect(
      draws.filter((draw) => draw.color === colors.default.fill)
    ).toHaveLength(8);
    draws.length = 0;
    state.completedCount = 10;
    renderer.render(state);
    expect(
      draws.filter((draw) => draw.color === colors.sorted.fill)
    ).toHaveLength(10);
    expect(
      draws.filter((draw) => draw.color === colors.default.fill)
    ).toHaveLength(1);
    for (const draw of draws)
      for (const key of ["x", "y", "width", "height"])
        expect(Number.isFinite(draw[key])).toBe(true);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
