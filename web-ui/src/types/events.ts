/** Shared semantic protocol; mirrors rust-core/src/events.rs. */
export type ArrayId = number;
export type ElementValue = number | null;
export const MAIN_ARRAY_ID: ArrayId = 0;

/** Identifies an array position, not a value moving between positions. */
export interface ElementRef {
  arrId: ArrayId;
  idx: number;
}

export interface SwapEvent {
  type: "Swap";
  i: ElementRef;
  j: ElementRef;
}

export interface OverwriteEvent {
  type: "Overwrite";
  dest: ElementRef;
  old_val: ElementValue;
  new_val: ElementValue;
}

/** Copies preserve the source, including when the destination value is equal. */
export interface CopyEvent {
  type: "Copy";
  src: ElementRef;
  dest: ElementRef;
  old_val: ElementValue;
  new_val: ElementValue;
}

export interface CompareEvent {
  type: "Compare";
  i: ElementRef;
  j: ElementRef;
}

export interface EnterRangeEvent {
  type: "EnterRange";
  arrId: ArrayId;
  lo: number;
  hi: number;
}

export interface ExitRangeEvent {
  type: "ExitRange";
  arrId: ArrayId;
  lo: number;
  hi: number;
}

export interface AddArrayEvent {
  type: "AddArray";
  arrId: ArrayId;
  length: number;
}

/** Undo requires the contents (array) retained in workspace state. */
export interface RemoveArrayEvent {
  type: "RemoveArray";
  arrId: ArrayId;
}

/** Marks the whole array as consumed (dimmed). */
export interface ConsumeArrayEvent {
  type: "ConsumeArray";
  arrId: ArrayId;
}

export interface DoneEvent {
  type: "Done";
}

export type SortEvent =
  | SwapEvent
  | OverwriteEvent
  | CopyEvent
  | CompareEvent
  | EnterRangeEvent
  | ExitRangeEvent
  | AddArrayEvent
  | RemoveArrayEvent
  | ConsumeArrayEvent
  | DoneEvent;

/**
 * Inverse without workspace history. Auxiliary writes, consumption, and
 * lifecycle events require directional workspace application. Copy undo writes only to its destination.
 */
export function inverseEvent(event: SortEvent): SortEvent | null {
  switch (event.type) {
    case "Swap":
      return event.i.arrId === MAIN_ARRAY_ID && event.j.arrId === MAIN_ARRAY_ID
        ? event
        : null;
    case "Overwrite":
      if (event.dest.arrId !== MAIN_ARRAY_ID) return null;
      return { ...event, old_val: event.new_val, new_val: event.old_val };
    case "Copy":
      if (event.dest.arrId !== MAIN_ARRAY_ID) return null;
      return {
        type: "Overwrite",
        dest: event.dest,
        old_val: event.new_val,
        new_val: event.old_val,
      };
    case "EnterRange":
      return { ...event, type: "ExitRange" };
    case "ExitRange":
      return { ...event, type: "EnterRange" };
    case "ConsumeArray":
      return null;
    case "AddArray":
    case "RemoveArray":
      return null;
    default:
      return event;
  }
}

/** Includes changes to element values, array membership, and usage. */
export function isMutationEvent(event: SortEvent): boolean {
  return (
    event.type === "Swap" ||
    event.type === "Overwrite" ||
    event.type === "Copy" ||
    event.type === "AddArray" ||
    event.type === "RemoveArray" ||
    event.type === "ConsumeArray"
  );
}
