import { MAIN_ARRAY_ID } from "@/types/events";
import type {
  ArrayId,
  ElementRef,
  ElementValue,
  SortEvent,
} from "@/types/events";
import type {
  ArrayState,
  EventDirection,
  Range,
  WorkspaceState,
} from "@/workspace/types";

export function createWorkspace(values: readonly number[]): WorkspaceState {
  return {
    mainArrayId: MAIN_ARRAY_ID,
    arrays: new Map([
      [
        MAIN_ARRAY_ID,
        {
          id: MAIN_ARRAY_ID,
          values: [...values],
          visible: true,
          consumed: Array<boolean>(values.length).fill(false),
          consumptionHistory: [],
          rangeStack: [],
        },
      ],
    ]),
    isSorted: false,
  };
}

function assertArrayId(arrId: ArrayId): void {
  if (!Number.isSafeInteger(arrId) || arrId < 0) {
    throw new Error(`Invalid array ID: ${arrId}`);
  }
}

/** Removed entries are history, never accessible storage. */
export function getArray(
  workspace: WorkspaceState,
  arrId: ArrayId
): ArrayState {
  assertArrayId(arrId);
  const array = workspace.arrays.get(arrId);
  if (!array?.visible) {
    throw new Error(`Array ${arrId} is not visible`);
  }
  return array;
}

function getElementArray(
  workspace: WorkspaceState,
  ref: ElementRef
): ArrayState {
  const array = getArray(workspace, ref.arrId);
  if (
    !Number.isSafeInteger(ref.idx) ||
    ref.idx < 0 ||
    ref.idx >= array.values.length
  ) {
    throw new Error(`Invalid index ${ref.idx} in array ${ref.arrId}`);
  }
  return array;
}

export function readElement(
  workspace: WorkspaceState,
  ref: ElementRef
): ElementValue {
  return getElementArray(workspace, ref).values[ref.idx];
}

function assertValue(value: ElementValue): void {
  if (
    value !== null &&
    (typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new Error("Element values must be finite numbers or null");
  }
}

function assertRange(array: ArrayState, range: Range): void {
  if (
    !Number.isSafeInteger(range.lo) ||
    !Number.isSafeInteger(range.hi) ||
    range.lo < 0 ||
    range.lo > range.hi ||
    range.hi >= array.values.length
  ) {
    throw new Error(`Invalid range in array ${array.id}`);
  }
}

function validateWriteConsumption(
  array: ArrayState,
  idx: number,
  mainId: ArrayId,
  forward: boolean,
  historyOffset = 1
): void {
  if (array.id === mainId || forward) return;
  const change = array.consumptionHistory.at(-historyOffset);
  if (
    !change ||
    change.consumed ||
    change.indices.length > 1 ||
    change.indices.some((changedIdx) => changedIdx !== idx) ||
    array.consumed[idx]
  ) {
    throw new Error("Write undo does not match consumption history");
  }
}

function recordConsumption(
  array: ArrayState,
  indices: number[],
  consumed: boolean
): void {
  // Empty entries preserve alignment for operations that change no flags.
  array.consumptionHistory.push({ indices, consumed });
  for (const idx of indices) array.consumed[idx] = consumed;
}

function undoConsumption(array: ArrayState): void {
  const change = array.consumptionHistory.pop()!;
  for (const idx of change.indices) array.consumed[idx] = !change.consumed;
}

function applyWriteConsumption(
  array: ArrayState,
  idx: number,
  mainId: ArrayId,
  forward: boolean
): void {
  if (array.id === mainId) return;
  if (forward) {
    recordConsumption(array, array.consumed[idx] ? [idx] : [], false);
  } else {
    undoConsumption(array);
  }
}

/**
 * Mutates the workspace in place; every playback path uses these same rules.
 * Resolve and validate an operation completely before changing its state.
 */
export function applyWorkspaceEvent(
  workspace: WorkspaceState,
  event: SortEvent,
  direction: EventDirection = "forward"
): void {
  const forward = direction === "forward";
  switch (event.type) {
    case "Swap": {
      const i = getElementArray(workspace, event.i);
      const j = getElementArray(workspace, event.j);
      // When both endpoints share storage, reverse their consumption changes in order.
      const sameSlot =
        event.i.arrId === event.j.arrId && event.i.idx === event.j.idx;
      if (forward) {
        applyWriteConsumption(i, event.i.idx, workspace.mainArrayId, true);
        if (!sameSlot)
          applyWriteConsumption(j, event.j.idx, workspace.mainArrayId, true);
      } else {
        validateWriteConsumption(j, event.j.idx, workspace.mainArrayId, false);
        // Check both history entries before changing either endpoint.
        if (!sameSlot && i === j && i.id !== workspace.mainArrayId) {
          validateWriteConsumption(
            i,
            event.i.idx,
            workspace.mainArrayId,
            false,
            2
          );
        } else if (!sameSlot)
          validateWriteConsumption(
            i,
            event.i.idx,
            workspace.mainArrayId,
            false
          );
        applyWriteConsumption(j, event.j.idx, workspace.mainArrayId, false);
        if (!sameSlot)
          applyWriteConsumption(i, event.i.idx, workspace.mainArrayId, false);
      }
      const value = i.values[event.i.idx];
      i.values[event.i.idx] = j.values[event.j.idx];
      j.values[event.j.idx] = value;
      break;
    }
    case "Overwrite":
    case "Copy": {
      const dest = getElementArray(workspace, event.dest);
      assertValue(event.old_val);
      assertValue(event.new_val);
      if (
        dest.values[event.dest.idx] !==
        (forward ? event.old_val : event.new_val)
      ) {
        throw new Error(
          "Recorded destination value does not match workspace state"
        );
      }
      if (
        event.type === "Copy" &&
        readElement(workspace, event.src) !== event.new_val
      ) {
        throw new Error("Recorded copy value does not match its source");
      }
      validateWriteConsumption(
        dest,
        event.dest.idx,
        workspace.mainArrayId,
        forward
      );
      applyWriteConsumption(
        dest,
        event.dest.idx,
        workspace.mainArrayId,
        forward
      );
      dest.values[event.dest.idx] = forward ? event.new_val : event.old_val;
      break;
    }
    case "Compare":
      readElement(workspace, event.i);
      readElement(workspace, event.j);
      break;
    case "EnterRange":
    case "ExitRange": {
      const array = getArray(workspace, event.arrId);
      assertRange(array, event);
      const push = (event.type === "EnterRange") === forward;
      if (push) {
        array.rangeStack.push({ lo: event.lo, hi: event.hi });
      } else {
        const top = array.rangeStack.at(-1);
        if (!top || top.lo !== event.lo || top.hi !== event.hi) {
          throw new Error(`Unbalanced range in array ${event.arrId}`);
        }
        array.rangeStack.pop();
      }
      break;
    }
    case "AddArray": {
      assertArrayId(event.arrId);
      if (event.arrId === workspace.mainArrayId) {
        throw new Error("Cannot add the main array");
      }
      if (forward) {
        for (const array of workspace.arrays.values()) {
          if (array.id >= event.arrId) {
            throw new Error("Array IDs must increase and cannot be reused");
          }
        }
        if (!Number.isSafeInteger(event.length) || event.length < 0) {
          throw new Error("Array length must be a nonnegative safe integer");
        }
        workspace.arrays.set(event.arrId, {
          id: event.arrId,
          values: Array<ElementValue>(event.length).fill(null),
          visible: true,
          consumed: Array<boolean>(event.length).fill(false),
          consumptionHistory: [],
          rangeStack: [],
        });
      } else {
        const array = getArray(workspace, event.arrId);
        if (
          array.consumed.some(Boolean) ||
          array.consumptionHistory.length !== 0 ||
          array.rangeStack.length !== 0 ||
          array.values.length !== event.length ||
          array.values.some((value) => value !== null)
        ) {
          throw new Error("Array addition undo requires its initial state");
        }
        workspace.arrays.delete(event.arrId);
      }
      break;
    }
    case "RemoveArray": {
      assertArrayId(event.arrId);
      if (event.arrId === workspace.mainArrayId) {
        throw new Error("Cannot remove the main array");
      }
      const array = workspace.arrays.get(event.arrId);
      if (!array || array.visible !== forward) {
        throw new Error(`Invalid removal state for array ${event.arrId}`);
      }
      array.visible = !forward;
      break;
    }
    case "ConsumeArray": {
      const array = getArray(workspace, event.arrId);
      if (event.arrId === workspace.mainArrayId) {
        throw new Error("Cannot consume the main array");
      }
      if (forward) {
        const active: number[] = [];
        for (let idx = 0; idx < array.values.length; idx++) {
          if (array.values[idx] !== null && !array.consumed[idx])
            active.push(idx);
        }
        recordConsumption(array, active, true);
      } else {
        const change = array.consumptionHistory.at(-1);
        if (
          !change?.consumed ||
          change.indices.some((idx) => !array.consumed[idx])
        ) {
          throw new Error(
            "Consumption undo does not match consumption history"
          );
        }
        undoConsumption(array);
      }
      break;
    }
    case "Done":
      workspace.isSorted = forward;
      break;
  }
}
