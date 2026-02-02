/**
 * Type declarations for sort-forge-core wasm module.
 * These mirror the exports from rust-core/pkg/sort_forge_core.d.ts
 */
declare module "sort-forge-core" {
  import type { SortEvent } from "@/types/events";

  /** Get list of available algorithms */
  export function get_available_algorithms(): string[];

  /** Initialize panic hook for better error messages */
  export function init(): void;

  /** Run a pregeneration sort on the given array */
  export function pregen_sort(algorithm: string, array: number[]): SortEvent[];

  /** Run a pregeneration sort and return both events and sorted array */
  export function pregen_sort_with_result(
    algorithm: string,
    array: number[]
  ): {
    events: SortEvent[];
    sorted_array: number[];
  };

  /** Initialize the wasm module */
  export default function init(): Promise<void>;
}
