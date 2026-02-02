import type { SortEvent } from "@/types/events";
import type { ISortEngine } from "@/engines/types";

// Wasm module - will be initialized lazily
let wasmModule: typeof import("sort-forge-core") | null = null;
let wasmInitPromise: Promise<void> | null = null;

/**
 * Initialize the Wasm module (call once at app start).
 */
export async function initWasm(): Promise<void> {
  if (wasmModule) return;

  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      const wasm = await import("sort-forge-core");
      await wasm.default();
      wasmModule = wasm;
    })();
  }

  await wasmInitPromise;
}

/**
 * Get list of available algorithms from Wasm.
 */
export function getAvailableAlgorithms(): string[] {
  if (!wasmModule) {
    throw new Error("Wasm module not initialized. Call initWasm() first.");
  }
  return wasmModule.get_available_algorithms() as string[];
}

/**
 * V1 Pregeneration Engine.
 *
 * Runs the entire sort upfront and stores all events in memory.
 * Supports random seeking and timeline scrubbing.
 * Best for arrays up to ~2000 elements.
 */
export class PregenEngine implements ISortEngine {
  readonly name = "Pregeneration (V1)";
  readonly canSeek = true;

  private events: SortEvent[] = [];
  private position = 0;
  private initialized = false;

  async initialize(algorithm: string, array: number[]): Promise<void> {
    await initWasm();

    if (!wasmModule) {
      throw new Error("Wasm module not initialized");
    }

    // Run the full sort and get all events
    const events = wasmModule.pregen_sort(algorithm, array);

    this.events = events;
    this.position = 0;
    this.initialized = true;
  }

  getNextEvents(count: number): SortEvent[] {
    if (!this.initialized) return [];

    const endPos = Math.min(this.position + count, this.events.length);
    const batch = this.events.slice(this.position, endPos);
    this.position = endPos;
    return batch;
  }

  getAllEvents(): SortEvent[] {
    return this.events;
  }

  getEventAt(index: number): SortEvent | null {
    if (index < 0 || index >= this.events.length) return null;
    return this.events[index];
  }

  getTotalEvents(): number {
    return this.events.length;
  }

  getCurrentPosition(): number {
    return this.position;
  }

  seek(position: number): void {
    if (!this.canSeek) return;
    this.position = Math.max(0, Math.min(position, this.events.length));
  }

  reset(): void {
    this.position = 0;
  }

  isDone(): boolean {
    return this.position >= this.events.length;
  }
}
