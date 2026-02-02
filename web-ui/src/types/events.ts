/**
 * Semantic events emitted by sorting algorithms.
 * These types mirror the Rust SortEvent enum in rust-core/src/events.rs.
 *
 * Events describe *what* happened, not *how* to render it.
 * Events support the Inverse Command Pattern for rewinding.
 */

export interface SwapEvent {
  type: "Swap";
  i: number;
  j: number;
}

export interface OverwriteEvent {
  type: "Overwrite";
  idx: number;
  old_val: number;
  new_val: number;
}

export interface CompareEvent {
  type: "Compare";
  i: number;
  j: number;
}

export interface EnterRangeEvent {
  type: "EnterRange";
  lo: number;
  hi: number;
}

export interface ExitRangeEvent {
  type: "ExitRange";
  lo: number;
  hi: number;
}

export interface DoneEvent {
  type: "Done";
}

/** Discriminated union of all sort events */
export type SortEvent =
  | SwapEvent
  | OverwriteEvent
  | CompareEvent
  | EnterRangeEvent
  | ExitRangeEvent
  | DoneEvent;

/**
 * Returns the inverse of a sort event for rewinding.
 * Stateless events (Compare, Done) return themselves.
 * EnterRange and ExitRange are inverses of each other.
 */
export function inverseEvent(event: SortEvent): SortEvent {
  switch (event.type) {
    case "Swap":
      // Swap is self-inverse
      return event;
    case "Overwrite":
      // Swap old and new values
      return {
        type: "Overwrite",
        idx: event.idx,
        old_val: event.new_val,
        new_val: event.old_val,
      };
    case "EnterRange":
      // EnterRange inverse is ExitRange with same bounds
      return {
        type: "ExitRange",
        lo: event.lo,
        hi: event.hi,
      };
    case "ExitRange":
      // ExitRange inverse is EnterRange with same bounds
      return {
        type: "EnterRange",
        lo: event.lo,
        hi: event.hi,
      };
    default:
      // Stateless events (Compare, Done) are their own inverse
      return event;
  }
}

/**
 * Returns true if the event mutates the array.
 */
export function isMutationEvent(event: SortEvent): boolean {
  return event.type === "Swap" || event.type === "Overwrite";
}
