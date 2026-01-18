import type { SortEvent } from "@/types/events";

/**
 * Common interface for sorting engines.
 * Allows swapping between V1 (Pregen) and V2 (Live) implementations.
 */
export interface ISortEngine {
  /** Name of this engine for display purposes */
  readonly name: string;

  /** Whether this engine supports random seeking */
  readonly canSeek: boolean;

  /** Initialize the engine with an algorithm and array */
  initialize(algorithm: string, array: number[]): Promise<void>;

  /** Get the next batch of events (up to count) */
  getNextEvents(count: number): SortEvent[];

  /** Get all remaining events (for pregen engine) */
  getAllEvents(): SortEvent[];

  /** Get event at specific index (for seeking) */
  getEventAt(index: number): SortEvent | null;

  /** Total number of events (known after initialization for pregen) */
  getTotalEvents(): number;

  /** Current position in the event stream */
  getCurrentPosition(): number;

  /** Seek to a specific position (if supported) */
  seek(position: number): void;

  /** Reset to beginning */
  reset(): void;

  /** Whether the sort has completed */
  isDone(): boolean;
}
