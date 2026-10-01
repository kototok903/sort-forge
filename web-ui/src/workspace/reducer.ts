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
          rangeStack: [],
        });
      } else {
        const array = getArray(workspace, event.arrId);
        if (
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
    case "Done":
      workspace.isSorted = forward;
      break;
  }
}
