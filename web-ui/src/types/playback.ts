import type { SortEvent } from "@/types/events";

/** Frontend-only event marking one main-array position visually complete. */
export interface CompletionEvent {
  type: "CompleteElement";
  idx: number;
}

export type PlaybackEvent = SortEvent | CompletionEvent;
