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

function checkProtocol(events, length) {
  const arrays = new Map([[0, length]]);
  for (const event of events) {
    let refs = [];
    switch (event.type) {
      case "Compare":
      case "Swap":
        refs = [event.i, event.j];
        break;
      case "Copy":
      case "Overwrite":
        refs = event.type === "Copy" ? [event.src, event.dest] : [event.dest];
        expect(
          event.old_val === null || typeof event.old_val === "number"
        ).toBe(true);
        expect(typeof event.new_val).toBe("number");
        break;
      case "AddArray":
        expect(arrays.has(event.arrId)).toBe(false);
        expect(event).toEqual({
          type: "AddArray",
          arrId: expect.any(Number),
          length: expect.any(Number),
        });
        arrays.set(event.arrId, event.length);
        break;
      case "RemoveArray":
        expect(arrays.delete(event.arrId)).toBe(true);
        break;
      case "EnterRange":
      case "ExitRange":
        expect(arrays.has(event.arrId)).toBe(true);
        expect(event.lo).toBeGreaterThanOrEqual(0);
        expect(event.hi).toBeLessThan(arrays.get(event.arrId));
        break;
      case "Done":
        break;
      default:
        throw new Error(`Unexpected event: ${event.type}`);
    }
    for (const ref of refs) {
      expect(ref).toEqual({
        arrId: expect.any(Number),
        idx: expect.any(Number),
      });
      expect(arrays.has(ref.arrId)).toBe(true);
      expect(ref.idx).toBeGreaterThanOrEqual(0);
      expect(ref.idx).toBeLessThan(arrays.get(ref.arrId));
    }
  }
}

const inputs = [[], [0], [5, 3, 5, 1, 0, 2], [5, 4, 3, 2, 1], [0, 1, 2, 3, 4]];

describe("rebuilt Wasm protocol and controller compatibility", () => {
  for (const algorithm of get_available_algorithms()) {
    test(`pregen ${algorithm}: serialized references, replay, seek, and rewind`, async () => {
      for (const input of inputs) {
        const result = pregen_sort_with_result(algorithm, input);
        checkProtocol(result.events, input.length);
        expect(result.sorted_array).toEqual([...input].sort((a, b) => a - b));
        const engine = new PregenEngine();
        const controller = new AnimationController();
        await controller.initialize(engine, algorithm, input);
        const snapshots = [[...input]];
        const workspaces = [structuredClone(controller.getState().workspace)];
        for (const event of engine.getAllEvents()) {
          if (event.type === "Overwrite") {
            expect(
              controller.getState().workspace.arrays.get(0).values[
                event.dest.idx
              ]
            ).toBe(event.old_val);
          }
          controller.stepForward();
          workspaces.push(structuredClone(controller.getState().workspace));
          snapshots.push([
            ...controller.getState().workspace.arrays.get(0).values,
          ]);
        }
        expect(controller.getState().workspace.arrays.get(0).values).toEqual(
          result.sorted_array
        );
        for (let step = snapshots.length - 2; step >= 0; step--) {
          controller.stepBackward();
          expect(controller.getState().workspace).toEqual(workspaces[step]);
          expect(controller.getState().workspace.arrays.get(0).values).toEqual(
            snapshots[step]
          );
        }
        const midpoint = Math.floor(result.events.length / 2);
        controller.seekTo(midpoint);
        expect(controller.getState().workspace.arrays.get(0).values).toEqual(
          snapshots[midpoint]
        );
        controller.seekTo(result.events.length);
        expect(controller.getState().workspace.arrays.get(0).values).toEqual(
          result.sorted_array
        );
        controller.reset();
        expect(controller.getState().workspace.arrays.get(0).values).toEqual(
          input
        );
      }
    });
  }

  for (const algorithm of get_live_algorithms()) {
    test(`live ${algorithm}: serialized references, streamed replay, and reset`, async () => {
      const input = Array.from({ length: 40 }, (_, i) => 40 - i);
      const engine = new LiveEngine();
      const controller = new AnimationController();
      await controller.initialize(engine, algorithm, input);
      checkProtocol(engine.getAllEvents(), input.length);
      let steps = 0;
      while (controller.getState().playbackState !== "done") {
        controller.stepForward();
        if (++steps > 10000) throw new Error("Live playback did not complete");
      }
      expect(controller.getState().workspace.arrays.get(0).values).toEqual(
        [...input].sort((a, b) => a - b)
      );
      controller.reset();
      expect(controller.getState().workspace.arrays.get(0).values).toEqual(
        input
      );
      controller.stepForward();
      expect(controller.getState().currentStep).toBe(1);
    });
  }
});

test("merge's reusable buffer restores full workspace at every seek and rewind position", async () => {
  for (const input of [
    [2, 1],
    [1, 1],
    [4, 1, 3, 1, 0],
    [-2, 5, 0, -2, 1, 7, 3],
  ]) {
    const engine = new PregenEngine();
    const controller = new AnimationController();
    await controller.initialize(engine, "merge", input);
    const events = engine.getAllEvents();
    expect(events.filter((event) => event.type === "AddArray")).toEqual([
      { type: "AddArray", arrId: 1, length: Math.ceil(input.length / 2) },
    ]);
    expect(events.filter((event) => event.type === "RemoveArray")).toEqual([
      { type: "RemoveArray", arrId: 1 },
    ]);
    expect(events.some((event) => event.type === "Overwrite")).toBe(false);
    for (const event of events.filter((event) => event.type === "Compare")) {
      expect(event.i.arrId).toBe(1);
      expect(event.j.arrId).toBe(0);
    }
    const states = [structuredClone(controller.getState().workspace)];
    for (const _ of events) {
      controller.stepForward();
      states.push(structuredClone(controller.getState().workspace));
    }
    expect(states.at(-1).arrays.get(0).values).toEqual(
      [...input].sort((a, b) => a - b)
    );
    expect(states.at(-1).arrays.get(1).visible).toBe(false);
    controller.stepBackward();
    controller.stepBackward();
    expect(controller.getState().workspace.arrays.get(1).visible).toBe(true);
    expect(controller.getState().workspace.arrays.get(1).values).toEqual(
      states.at(-1).arrays.get(1).values
    );
    for (let step = 0; step <= events.length; step++) {
      controller.seekTo(step);
      expect(controller.getState().workspace).toEqual(states[step]);
    }
    for (let step = events.length - 1; step >= 0; step--) {
      controller.stepBackward();
      expect(controller.getState().workspace).toEqual(states[step]);
    }
    expect(controller.getState().workspace.arrays.size).toBe(1);
  }
});

test("merge chooses the buffered left value on ties and leaves the right tail untouched", () => {
  for (const input of [
    [1, 1],
    [1, 2],
  ]) {
    const result = pregen_sort_with_result("merge", input);
    expect(result.sorted_array).toEqual(input);
    expect(result.events.filter((event) => event.type === "Copy")).toEqual([
      {
        type: "Copy",
        src: { arrId: 0, idx: 0 },
        dest: { arrId: 1, idx: 0 },
        old_val: null,
        new_val: 1,
      },
      {
        type: "Copy",
        src: { arrId: 1, idx: 0 },
        dest: { arrId: 0, idx: 0 },
        old_val: 1,
        new_val: 1,
      },
    ]);
  }
  const reverse = pregen_sort_with_result("merge", [2, 1]);
  expect(reverse.events).toContainEqual({
    type: "Copy",
    src: { arrId: 0, idx: 1 },
    dest: { arrId: 0, idx: 0 },
    old_val: 2,
    new_val: 1,
  });
});
