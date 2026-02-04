# SortForge

Interactive sorting algorithm visualizer with 20+ algorithms, time-travel debugging, and sound synthesis.

![Rust](https://img.shields.io/badge/Rust-WebAssembly-orange)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)

## Features

- **20 sorting algorithms** — bubble, quick, merge, heap, radix, timsort, introsort, and more
- **Two sort engine modes:**
  - **Pregen** — pre-generates all events for full time-travel (scrub timeline, step backward)
  - **Live** — streams events in real-time for large arrays (O(n) space complexity, supports 100k+ elements)
- **Time travel** — step forward/backward, seek to any point (Pregen mode)
- **Sound synthesis** — audible sorting feedback, multiple waveforms are available
- **Multiple color themes** — would fit any mood
- **Keyboard shortcuts** — full playback control without mouse

## Tech Stack

| Layer          | Tech                      |
| -------------- | ------------------------- |
| Algorithm core | Rust → WebAssembly        |
| Frontend       | React + TypeScript + Vite |
| Styling        | Tailwind CSS v4           |
| Rendering      | Canvas 2D                 |

## Quick Start

```bash
# Build Wasm module
cd rust-core && wasm-pack build --target web --release

# Install and run frontend
cd web-ui && bun install && bun run dev
```

Open http://localhost:5173

## Keyboard Shortcuts

| Key           | Action                |
| ------------- | --------------------- |
| `Space`       | Play/Pause            |
| `Shift+Space` | Play backward         |
| `←` / `→`     | Step backward/forward |
| `R`           | Reset to start        |
| `+` / `-`     | Speed up/down         |

**Key design principles:**

- Rust emits semantic events (Swap, Compare, etc.) — knows nothing about rendering
- TypeScript owns timing/animation — Rust has no concept of speed
- All events are invertible — enables backward playback
- Engines are swappable — controller is engine-agnostic
