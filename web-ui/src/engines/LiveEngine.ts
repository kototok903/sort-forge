import type { SortEvent } from "@/types/events";
import type { ISortEngine } from "@/engines/types";
import { initWasm } from "@/engines/PregenEngine";

// Will be set after wasm init
let LiveStepperClass: typeof import("sort-forge-core").LiveStepper | null = null;
let getLiveAlgorithms: typeof import("sort-forge-core").get_live_algorithms | null = null;

/**
 * Initialize Live engine Wasm bindings.
 */
export async function initLiveWasm(): Promise<void> {
  await initWasm();
  const wasm = await import("sort-forge-core");
  LiveStepperClass = wasm.LiveStepper;
  getLiveAlgorithms = wasm.get_live_algorithms;
}

/**
 * Get list of available live algorithms.
 */
export function getAvailableLiveAlgorithms(): string[] {
  if (!getLiveAlgorithms) {
    throw new Error("Live Wasm not initialized. Call initLiveWasm() first.");
  }
  return getLiveAlgorithms() as string[];
}

/**
 * V2 Live Engine.
 *
 * Generates events on-demand via state machine steppers.
 * Suitable for large arrays where pregeneration would use too much memory.
 */
export class LiveEngine implements ISortEngine {
  readonly name = "Live (V2)";
  readonly canSeek = false;

  private stepper: InstanceType<typeof import("sort-forge-core").LiveStepper> | null = null;
  private originalArray: number[] = [];
  private algorithm: string = "";
  private position = 0;
  private eventBuffer: SortEvent[] = [];
  private bufferStart = 0;
  private totalEventsGenerated = 0;
  private done = false;

  private readonly BATCH_SIZE = 200;
  private readonly BUFFER_BATCHES = 3;

  async initialize(algorithm: string, array: number[]): Promise<void> {
    await initLiveWasm();

    if (!LiveStepperClass) {
      throw new Error("LiveStepper not available");
    }

    // Clean up previous stepper
    if (this.stepper) {
      this.stepper.free();
    }

    this.originalArray = [...array];
    this.algorithm = algorithm;
    this.stepper = new LiveStepperClass(algorithm, array);
    this.position = 0;
    this.eventBuffer = [];
    this.bufferStart = 0;
    this.totalEventsGenerated = 0;
    this.done = false;

    // Pre-fill buffer
    this.fillBufferAhead();
  }

  getNextEvents(count: number): SortEvent[] {
    if (!this.stepper) return [];

    this.ensureBufferAhead();

    const bufferOffset = this.position - this.bufferStart;
    const available = this.eventBuffer.slice(bufferOffset, bufferOffset + count);
    this.position += available.length;

    this.trimBufferBehind();

    return available;
  }

  getAllEvents(): SortEvent[] {
    // Not supported for live engine - would defeat the purpose
    return this.eventBuffer;
  }

  getEventAt(index: number): SortEvent | null {
    if (index < this.bufferStart) return null;
    const bufferOffset = index - this.bufferStart;
    if (bufferOffset >= this.eventBuffer.length) return null;
    return this.eventBuffer[bufferOffset];
  }

  getTotalEvents(): number {
    // For live engine, this is an estimate/current count
    return this.totalEventsGenerated;
  }

  getCurrentPosition(): number {
    return this.position;
  }

  seek(position: number): void {
    // Limited seeking within buffer only
    if (position >= this.bufferStart && position <= this.bufferStart + this.eventBuffer.length) {
      this.position = position;
    }
  }

  reset(): void {
    if (this.stepper) {
      this.stepper.free();
    }

    // Recreate stepper with original array
    if (LiveStepperClass && this.algorithm) {
      this.stepper = new LiveStepperClass(this.algorithm, [...this.originalArray]);
    } else {
      this.stepper = null;
    }

    this.position = 0;
    this.eventBuffer = [];
    this.bufferStart = 0;
    this.totalEventsGenerated = 0;
    this.done = false;

    // Pre-fill buffer for the new stepper
    this.fillBufferAhead();
  }

  isDone(): boolean {
    return this.done && this.position >= this.totalEventsGenerated;
  }

  // --- Private methods ---

  private fillBufferAhead(): void {
    if (!this.stepper || this.done) return;

    const targetSize = this.BATCH_SIZE * this.BUFFER_BATCHES;
    const bufferOffset = this.position - this.bufferStart;
    const eventsAhead = this.eventBuffer.length - bufferOffset;

    while (eventsAhead < targetSize && !this.stepper.is_done()) {
      const events = this.stepper.step(this.BATCH_SIZE) as SortEvent[];
      this.eventBuffer.push(...events);
      this.totalEventsGenerated += events.length;

      if (this.stepper.is_done()) {
        this.done = true;
        break;
      }
    }
  }

  private ensureBufferAhead(): void {
    const bufferOffset = this.position - this.bufferStart;
    const eventsAhead = this.eventBuffer.length - bufferOffset;
    const threshold = this.BATCH_SIZE * 2;

    if (eventsAhead < threshold) {
      this.fillBufferAhead();
    }
  }

  private trimBufferBehind(): void {
    const maxBehind = this.BATCH_SIZE * this.BUFFER_BATCHES;
    const eventsBehind = this.position - this.bufferStart;

    if (eventsBehind > maxBehind) {
      const trimCount = eventsBehind - maxBehind;
      this.eventBuffer = this.eventBuffer.slice(trimCount);
      this.bufferStart += trimCount;
    }
  }
}
