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
- [ ] Create `live/traits.rs` with `Stepper` trait:
  ```rust
  trait Stepper {
      fn execute_batch(&mut self, limit: usize) -> Vec<SortEvent>;
      fn is_done(&self) -> bool;
      fn checkpoint(&self) -> Checkpoint;
      fn restore(&mut self, checkpoint: Checkpoint);
  }
  ```
- [ ] Create `live/bubble.rs` - iterative bubble sort with explicit `i`, `j` state
- [ ] Create `live/quick_sort.rs` - explicit stack pattern with `Vec<SortJob>`
- [ ] Implement checkpointing every ~500 steps
- [ ] Create public Wasm functions:
  - `live_create_stepper(algorithm: &str, array: Vec<i32>) -> StepperHandle`
  - `live_execute_batch(handle, limit) -> Vec<SortEvent>`
  - `live_seek_checkpoint(handle, checkpoint_id)`

### 5.2 TypeScript - Live Engine Wrapper
- [ ] Create `engines/LiveEngine.ts` implementing `ISortEngine` interface
- [ ] Manage stepper handle lifecycle
- [ ] Request batches on-demand during animation
- [ ] Handle deep rewind via checkpoint restoration + re-simulation

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
- [ ] Add explicit UI toggle for V1 (Pregen) / V2 (Live) mode selection

---

## Phase 7: Additional Algorithms

### 7.1 V1 Implementations
- [ ] Merge sort (with `EnterRange`/`ExitRange` events)
- [ ] Insertion sort
- [ ] Selection sort
- [ ] Heap sort

### 7.2 V2 Implementations (State Machines)
- [ ] Merge sort (iterative bottom-up or explicit stack)
- [ ] Insertion sort
- [ ] Selection sort
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
- V1: O(N²) events stored for full sort (limit to ~2000 elements)
- V2: O(N) + checkpoint storage (suitable for 10k+ elements)
- Circular buffer in TS: ~1000 events for smooth local rewind

---

## Decisions Made

1. **Initial algorithms**: Bubble Sort + QuickSort only for initial implementation
2. **UI Framework**: Vite + React + TypeScript + Tailwind CSS
3. **Mode switching**: Explicit UI toggle for V1/V2 mode (no auto-selection)
4. **Export**: Low priority, moved to future enhancements
5. **Comparison view**: Future enhancement, not in initial scope

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
