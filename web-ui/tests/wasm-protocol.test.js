import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { AnimationController } from "@/controller/AnimationController";
import { PregenEngine } from "@/engines/PregenEngine";
import { LiveEngine } from "@/engines/LiveEngine";
import {
  get_available_algorithms,
  get_live_algorithms,
  initSync,
  pregen_sort_with_result,
} from "../../rust-core/pkg/sort_forge_core.js";

// Build rust-core with wasm-pack before running this integration suite.
initSync({
  module: readFileSync(
    new URL("../../rust-core/pkg/sort_forge_core_bg.wasm", import.meta.url)
  ),
});

function checkMainProtocol(events, length) {
  for (const event of events) {
    let refs = [];
    switch (event.type) {
      case "Compare":
      case "Swap":
        refs = [event.i, event.j];
        break;
      case "Overwrite":
        refs = [event.dest];
        expect(typeof event.old_val).toBe("number");
        expect(typeof event.new_val).toBe("number");
        break;
      case "EnterRange":
      case "ExitRange":
        expect(event.arrId).toBe(0);
        expect(event.lo).toBeGreaterThanOrEqual(0);
        expect(event.hi).toBeLessThan(length);
        break;
      case "Done":
        break;
      default:
        throw new Error(
          `Unexpected event before auxiliary instrumentation: ${event.type}`
        );
    }
    for (const ref of refs) {
      expect(ref).toEqual({ arrId: 0, idx: expect.any(Number) });
      expect(ref.idx).toBeGreaterThanOrEqual(0);
      expect(ref.idx).toBeLessThan(length);
    }
  }
}

const inputs = [[], [0], [5, 3, 5, 1, 0, 2], [5, 4, 3, 2, 1], [0, 1, 2, 3, 4]];

describe("rebuilt Wasm protocol and controller compatibility", () => {
  for (const algorithm of get_available_algorithms()) {
    test(`pregen ${algorithm}: serialized references, replay, seek, and rewind`, async () => {
      for (const input of inputs) {
        const result = pregen_sort_with_result(algorithm, input);
        checkMainProtocol(result.events, input.length);
        expect(result.sorted_array).toEqual([...input].sort((a, b) => a - b));
        const engine = new PregenEngine();
        const controller = new AnimationController();
        await controller.initialize(engine, algorithm, input);
        const snapshots = [[...input]];
        for (const event of engine.getAllEvents()) {
          if (event.type === "Overwrite") {
            expect(controller.getState().array[event.dest.idx]).toBe(
              event.old_val
            );
          }
          controller.stepForward();
          snapshots.push([...controller.getState().array]);
        }
        expect(controller.getState().array).toEqual(result.sorted_array);
        for (let step = snapshots.length - 2; step >= 0; step--) {
          controller.stepBackward();
          expect(controller.getState().array).toEqual(snapshots[step]);
        }
        const midpoint = Math.floor(result.events.length / 2);
        controller.seekTo(midpoint);
        expect(controller.getState().array).toEqual(snapshots[midpoint]);
        controller.seekTo(result.events.length);
        expect(controller.getState().array).toEqual(result.sorted_array);
        controller.reset();
        expect(controller.getState().array).toEqual(input);
      }
    });
  }

  for (const algorithm of get_live_algorithms()) {
    test(`live ${algorithm}: serialized references, streamed replay, and reset`, async () => {
      const input = Array.from({ length: 40 }, (_, i) => 40 - i);
      const engine = new LiveEngine();
      const controller = new AnimationController();
      await controller.initialize(engine, algorithm, input);
      checkMainProtocol(engine.getAllEvents(), input.length);
      let steps = 0;
      while (controller.getState().playbackState !== "done") {
        controller.stepForward();
        if (++steps > 10000) throw new Error("Live playback did not complete");
      }
      expect(controller.getState().array).toEqual(
        [...input].sort((a, b) => a - b)
      );
      controller.reset();
      expect(controller.getState().array).toEqual(input);
      controller.stepForward();
      expect(controller.getState().currentStep).toBe(1);
    });
  }
});
