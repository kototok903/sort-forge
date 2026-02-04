# SortForge - Implementation Plan

## Overview

This plan outlines the phased implementation of a dual-mode sorting algorithm visualizer using Rust/WebAssembly for algorithm logic and React + TypeScript + Canvas for the frontend.

---

## Phase 1: Project Setup & Foundation

### 1.1 Initialize Project Structure

- [x] Create `rust-core/` directory with Cargo workspace
- [x] Create `web-ui/` directory with Vite + React + TypeScript
- [x] Configure `wasm-pack` and `wasm-bindgen` in Rust
- [x] Set up build scripts for Rust → Wasm compilation
- [x] Configure Vite to load `.wasm` modules

### 1.2 Define Shared Types

- [x] Create `events.rs` with `SortEvent` enum:
  - `Swap(usize, usize)`
  - `Overwrite { idx, old_val, new_val }`
  - `Compare(usize, usize)`
  - `EnterRange { lo, hi }`
  - `ExitRange { lo, hi }`
  - `Done`
- [x] Set up `serde` serialization for events
- [x] Create corresponding TypeScript types in `types.ts`

---

## Phase 2: V1 Engine (Pregeneration)

### 2.1 Rust - Pregeneration Module

- [x] Create `pregen/mod.rs` with trait for pregeneration algorithms
- [x] Implement `pregen/bubble_sort.rs` - standard bubble sort with event emission
- [x] Implement `pregen/quicksort.rs` - standard quicksort with event emission
- [x] Create public Wasm functions:
  - `pregen_sort(algorithm: &str, array: JsValue) -> JsValue`
  - `pregen_sort_with_result(algorithm: &str, array: JsValue) -> JsValue`
- [x] Add unit tests for event correctness

### 2.2 TypeScript - Pregen Engine Wrapper

- [x] Create `engines/PregenEngine.ts` implementing `ISortEngine` interface
- [x] Load Wasm module and call pregeneration function
- [x] Store full event list in memory
- [x] Implement `getEventAt(index)` for random access

---

## Phase 3: Core UI & Rendering

### 3.1 Canvas Renderer

- [x] Create `renderer/CanvasRenderer.ts` with `IRenderer` interface
- [x] Implement bar drawing (height = value, width = canvas_width / array_length)
- [x] Implement color states:
  - Default (neutral)
  - Comparing (highlight)
  - Swapping (accent)
  - Sorted (success)
- [x] Handle range visualization (optional dimming/highlighting of subarrays)

### 3.2 Animation Controller

- [x] Create `controller/AnimationController.ts` with `requestAnimationFrame` loop
- [x] Implement playback controls:
  - Play / Pause
  - Step forward
  - Speed control
- [x] Maintain local array state synchronized with events
- [x] Connect controller to renderer

### 3.3 Basic UI (React Components)

- [x] Create React components:
  - `<App />` - main container
  - `<Canvas />` - canvas element with ref
  - `<Controls />` - playback controls (play/pause, step, speed slider)
  - `<Settings />` - algorithm selector, array size input, generate button, reset
- [x] Wire React state to controller
- [x] Use React hooks for animation lifecycle management

---

## Phase 4: Time Travel (V1)

### 4.1 Forward/Backward Playback

- [ ] Implement circular buffer in TypeScript for recent events (defer)
- [x] Implement inverse event application:
  - `Swap(a, b)` → `Swap(a, b)` (self-inverse)
  - `Overwrite { idx, old_val, new_val }` → `Overwrite { idx, new_val, old_val }`
- [x] Add step backward control
- [x] Add timeline scrubber/slider for random seek (V1 has full history)

---

## Phase 5: V2 Engine (State Machine)

### 5.1 Rust - State Machine Module

- [x] Create `live/mod.rs` with `Stepper` trait:
  ```rust
  trait Stepper {
      fn step(&mut self, arr: &mut [i32], limit: usize) -> Vec<SortEvent>;
      fn is_done(&self) -> bool;
  }
  ```
- [x] Create `live/bubble_sort.rs` - iterative bubble sort with explicit `i`, `j` state
- [x] Create `live/quicksort_ll.rs` - explicit stack pattern with `Vec<(usize, usize)>`
- [ ] Implement checkpointing every ~500 steps (deferred - not needed for initial release)
- [x] Create `LiveStepper` wasm wrapper with:
  - `new(algorithm: &str, array: JsValue) -> LiveStepper`
  - `step(limit: usize) -> JsValue`
  - `is_done() -> bool`
  - `get_array() -> JsValue`
- [x] Add `get_live_algorithms()` function

### 5.2 TypeScript - Live Engine Wrapper

- [x] Create `engines/LiveEngine.ts` implementing `ISortEngine` interface
- [x] Manage stepper lifecycle (create, free, reset)
- [x] Request batches on-demand during animation
- [x] Implement sliding buffer (BATCH_SIZE=200, BUFFER_BATCHES=3) for smooth playback
- [ ] Handle deep rewind via checkpoint restoration (deferred - uses buffer for local rewind)

---

## Phase 6: Engine Abstraction & Switching

### 6.1 Unified Engine Interface

- [x] Define `ISortEngine` interface in TypeScript:
  ```typescript
  interface ISortEngine {
    readonly name: string;
    readonly canSeek: boolean;
    initialize(algorithm: string, array: number[]): Promise<void>;
    getNextEvents(count: number): SortEvent[];
    getAllEvents(): SortEvent[];
    getEventAt(index: number): SortEvent | null;
    getTotalEvents(): number;
    getCurrentPosition(): number;
    seek(position: number): void;
    reset(): void;
    isDone(): boolean;
  }
  ```
- [x] Update controller to use `ISortEngine` abstraction
- [x] Add explicit UI toggle for V1 (Pregen) / V2 (Live) mode selection
- [x] Different array size controls per engine (slider for V1, number input for V2)
- [x] Hide timeline scrubber when V2 engine selected (canSeek=false)

---

## Phase 7: Additional Algorithms

### 7.1 V1 Implementations (20 algorithms complete)

- [x] Bubble sort
- [x] Selection sort
- [x] Insertion sort
- [x] Binary insertion sort
- [x] Cocktail sort
- [x] Odd-even sort
- [x] Gnome sort
- [x] Pancake sort
- [x] Shell sort
- [x] Comb sort
- [x] Cycle sort
- [x] QuickSort (LL - Lomuto)
- [x] QuickSort (LR - Hoare)
- [x] Merge sort
- [x] Heap sort
- [x] Timsort
- [x] Introsort
- [x] Radix LSD sort
- [x] Radix MSD sort
- [x] Bitonic sort

### 7.2 V2 Implementations (State Machines)

- [x] Bubble sort
- [ ] Selection sort
- [ ] Insertion sort
- [x] QuickSort (LL - Lomuto)
- [ ] QuickSort (LR - Hoare)
- [ ] Merge sort (iterative bottom-up or explicit stack)
- [ ] Heap sort

---

## Phase 8: Polish & Optimization

### 8.1 Performance

- [ ] Profile Canvas rendering for large arrays
- [ ] Optimize event batch sizes
- [ ] Add seek checkpoints for timeline scrubbing to avoid replay-from-start (defer)

### 8.2 UX Enhancements

- [ ] Add algorithm statistics display (comparisons, swaps, time)
- [ ] Add array presets (random, nearly sorted, reversed, few unique)
- [ ] Add sound option (optional, map events to tones)
- [ ] Add multiple color themes
- [ ] Improve mobile responsiveness

---

## Future Enhancements (Out of Initial Scope)

These are nice-to-haves for later iterations:

- [ ] Video/GIF export of visualization
- [ ] Side-by-side algorithm comparison view
- [ ] WebGL renderer for 10k+ elements

---

## Technical Decisions & Notes

### Build Commands

```bash
# Rust → Wasm
cd rust-core && wasm-pack build --target web --release

# Frontend dev
cd web-ui && npm run dev

# Frontend build
cd web-ui && npm run build
```

### Key Architectural Boundaries

1. **Rust knows nothing about rendering** - only emits semantic events
2. **TypeScript owns timing/animation** - Rust has no concept of "speed"
3. **Events are invertible** - all state changes can be undone
4. **Engines are swappable** - controller doesn't know V1 vs V2

### Memory Considerations

- V1: O(N²) events stored for full sort (limit to ~256 elements in UI)
- V2: O(N) array + sliding buffer (~1200 events) for smooth playback (suitable for 100k+ elements)
- V2 sliding buffer: 3 batches × 200 events in each direction from current position

---

## Decisions Made

1. **Initial algorithms**: Bubble Sort + QuickSort only for initial implementation
2. **UI Framework**: Vite + React + TypeScript + Tailwind CSS
3. **Mode switching**: Explicit UI toggle for V1/V2 mode (no auto-selection)
4. **Export**: Low priority, moved to future enhancements
5. **Comparison view**: Future enhancement, not in initial scope
6. **V2 Wasm interface**: Direct object exposure via enum wrapper (not opaque handles)
7. **V2 seeking**: No timeline scrubber initially; uses sliding buffer for forward/backward playback
8. **V2 checkpointing**: Deferred; not needed for initial release since buffer handles local rewind

---

## Implementation Order

```
Phase 1: Project Setup
    ↓
Phase 2: V1 Engine (Rust/Wasm - Pregeneration)
    ↓
Phase 3: Web UI + Canvas Renderer
    ↓
Phase 4: Time Travel (V1)
    ↓
Phase 5: V2 Engine (Rust/Wasm - State Machine)
    ↓
Phase 6: Engine Abstraction & UI Switching
    ↓
Phase 7: Additional Algorithms
    ↓
Phase 8: Polish & Improvements
```

This order ensures we have a working V1 visualizer before tackling the more complex V2 state machines.
