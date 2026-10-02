import { MAIN_ARRAY_ID } from "@/types/events";
import type { PlaybackEvent } from "@/types/playback";

export interface OperationCounts {
  comparisons: number;
  mainWrites: number;
  auxWrites: number;
  swaps: number;
}

export function emptyOperationCounts(): OperationCounts {
  return { comparisons: 0, mainWrites: 0, auxWrites: 0, swaps: 0 };
}

/** Count recorded sort operations, excluding visualization bookkeeping. */
export function applyOperationCounts(
  counts: OperationCounts,
  event: PlaybackEvent,
  direction: "forward" | "backward" = "forward"
): void {
  const delta = direction === "forward" ? 1 : -1;
  switch (event.type) {
    case "Compare":
      counts.comparisons += delta;
      break;
    case "Swap":
      counts.swaps += delta;
      // Each endpoint contributes a write, including self-swaps and equal values.
      for (const ref of [event.i, event.j]) {
        counts[ref.arrId === MAIN_ARRAY_ID ? "mainWrites" : "auxWrites"] +=
          delta;
      }
      break;
    case "Copy":
    case "Overwrite":
      counts[event.dest.arrId === MAIN_ARRAY_ID ? "mainWrites" : "auxWrites"] +=
        delta;
      break;
  }
}
