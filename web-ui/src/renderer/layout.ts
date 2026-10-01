import type { ArrayState, WorkspaceState } from "@/workspace/types";

export const ARRAY_PADDING = 7;

export interface ArrayLayout {
  array: ArrayState;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Drawing rectangles contain slots and the range line; gaps separate rectangles. */
export function layoutArrays(
  workspace: WorkspaceState,
  width: number,
  height: number
): ArrayLayout[] {
  const main = workspace.arrays.get(workspace.mainArrayId);
  if (!main?.visible) return [];
  const auxiliaries = [...workspace.arrays.values()]
    .filter(
      (array) =>
        array.visible && array.id !== main.id && array.values.length > 0
    )
    .sort((a, b) => a.id - b.id);
  const availableWidth = Math.max(0, width - 2 * ARRAY_PADDING);
  const availableHeight = Math.max(0, height - ARRAY_PADDING);
  const mainRect: ArrayLayout = {
    array: main,
    x: ARRAY_PADDING,
    y: ARRAY_PADDING,
    width: availableWidth,
    height: availableHeight,
  };
  if (auxiliaries.length === 0) return [mainRect];

  const auxiliarySlots = auxiliaries.reduce(
    (sum, array) => sum + array.values.length,
    0
  );
  if (auxiliaries.every((array) => array.values.length === 1)) {
    const slotsWidth = Math.max(
      0,
      availableWidth - auxiliaries.length * ARRAY_PADDING
    );
    const slotWidth =
      slotsWidth / Math.max(1, main.values.length + auxiliarySlots);
    mainRect.width = main.values.length * slotWidth;
    let x = mainRect.x + mainRect.width + ARRAY_PADDING;
    return [
      mainRect,
      ...auxiliaries.map((array) => {
        const rect = {
          array,
          x,
          y: ARRAY_PADDING,
          width: slotWidth,
          height: availableHeight,
        };
        x += slotWidth + ARRAY_PADDING;
        return rect;
      }),
    ];
  }

  const bandHeight = Math.max(0, (availableHeight - ARRAY_PADDING) / 2);
  mainRect.y += bandHeight + ARRAY_PADDING;
  mainRect.height = bandHeight;
  const mainSlotWidth = availableWidth / Math.max(1, main.values.length);
  const topSlotsWidth = Math.max(
    0,
    availableWidth - (auxiliaries.length - 1) * ARRAY_PADDING
  );
  const auxiliarySlotWidth = Math.min(
    mainSlotWidth,
    topSlotsWidth / auxiliarySlots
  );
  let x = ARRAY_PADDING;
  return [
    mainRect,
    ...auxiliaries.map((array) => {
      const rect = {
        array,
        x,
        y: ARRAY_PADDING,
        width: array.values.length * auxiliarySlotWidth,
        height: bandHeight,
      };
      x += rect.width + ARRAY_PADDING;
      return rect;
    }),
  ];
}
