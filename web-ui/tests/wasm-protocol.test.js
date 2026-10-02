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
  const consumed = new Map([[0, Array(length).fill(false)]]);
  for (const event of events) {
    let refs = [];
    switch (event.type) {
      case "Compare":
      case "Swap":
        refs = [event.i, event.j];
        if (event.type === "Swap")
          for (const ref of refs) consumed.get(ref.arrId)[ref.idx] = false;
        break;
      case "Copy":
      case "Overwrite":
        refs = event.type === "Copy" ? [event.src, event.dest] : [event.dest];
        expect(
          event.old_val === null || typeof event.old_val === "number"
        ).toBe(true);
        expect(typeof event.new_val).toBe("number");
        consumed.get(event.dest.arrId)[event.dest.idx] = false;
        break;
      case "AddArray":
        expect(arrays.has(event.arrId)).toBe(false);
        expect(event).toEqual({
          type: "AddArray",
          arrId: expect.any(Number),
          length: expect.any(Number),
        });
        arrays.set(event.arrId, event.length);
        consumed.set(event.arrId, Array(event.length).fill(false));
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
      case "ConsumeArray":
        expect(arrays.has(event.arrId)).toBe(true);
        expect(event.arrId).not.toBe(0);
        consumed.get(event.arrId).fill(true);
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
      expect(consumed.get(ref.arrId)[ref.idx]).toBe(false);
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

for (const algorithm of ["merge", "merge_half_buffer"]) {
  test(`${algorithm}: reusable buffer restores full workspace at every seek and rewind position`, async () => {
    for (const input of [
      [2, 1],
      [1, 1],
      [4, 1, 3, 1, 0],
      [-2, 5, 0, -2, 1, 7, 3],
    ]) {
      const engine = new PregenEngine();
      const controller = new AnimationController();
      await controller.initialize(engine, algorithm, input);
      const events = engine.getAllEvents();
      expect(events.filter((event) => event.type === "AddArray")).toEqual([
        {
          type: "AddArray",
          arrId: 1,
          length:
            algorithm === "merge" ? input.length : Math.ceil(input.length / 2),
        },
      ]);
      expect(events.filter((event) => event.type === "RemoveArray")).toEqual([
        { type: "RemoveArray", arrId: 1 },
      ]);
      expect(events.some((event) => event.type === "Overwrite")).toBe(false);
      for (const event of events.filter((event) => event.type === "Compare")) {
        expect(event.i.arrId).toBe(1);
        expect(event.j.arrId).toBe(algorithm === "merge" ? 1 : 0);
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
}

test("merge chooses the buffered left value on ties and leaves the right tail untouched", () => {
  for (const input of [
    [1, 1],
    [1, 2],
  ]) {
    const result = pregen_sort_with_result("merge_half_buffer", input);
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
  const reverse = pregen_sort_with_result("merge_half_buffer", [2, 1]);
  expect(reverse.events).toContainEqual({
    type: "Copy",
    src: { arrId: 0, idx: 1 },
    dest: { arrId: 0, idx: 0 },
    old_val: 2,
    new_val: 1,
  });
});

for (const algorithm of [
  "insertion",
  "binary_insertion",
  "shell",
  "cycle",
  "introsort",
]) {
  test(`${algorithm}: saved storage is reused and restored at every playback position`, async () => {
    for (const input of [
      [0, -2, 0, 3, 1],
      [1, 1, 1],
      [0, 1, 2],
      [3, 2, 1],
    ]) {
      const engine = new PregenEngine();
      const controller = new AnimationController();
      await controller.initialize(engine, algorithm, input);
      const events = engine.getAllEvents();
      expect(events.filter((event) => event.type === "AddArray")).toEqual([
        { type: "AddArray", arrId: 1, length: 1 },
      ]);
      expect(events.filter((event) => event.type === "RemoveArray")).toEqual([
        { type: "RemoveArray", arrId: 1 },
      ]);
      expect(events.some((event) => event.type === "Overwrite")).toBe(false);
      for (const event of events.filter((event) => event.type === "Compare")) {
        expect([event.i.arrId, event.j.arrId].sort()).toEqual([0, 1]);
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
      for (let step = events.length - 1; step >= 0; step--) {
        controller.stepBackward();
        expect(controller.getState().workspace).toEqual(states[step]);
      }
      for (let step = 0; step <= events.length; step++) {
        controller.seekTo(step);
        expect(controller.getState().workspace).toEqual(states[step]);
      }
      controller.stepBackward();
      controller.stepBackward();
      expect(controller.getState().workspace.arrays.get(1).visible).toBe(true);
      controller.reset();
      expect(controller.getState().workspace.arrays.size).toBe(1);
      for (const small of [[], [0]]) {
        const result = pregen_sort_with_result(algorithm, small);
        expect(result.events).toEqual([{ type: "Done" }]);
      }
    }
  });
}

test("cycle's held value becomes the displaced main value, and rewind restores both", async () => {
  const engine = new PregenEngine();
  const controller = new AnimationController();
  await controller.initialize(engine, "cycle", [3, 1, 2]);
  const events = engine.getAllEvents();
  const firstSwap = events.findIndex((event) => event.type === "Swap");
  controller.seekTo(firstSwap);
  const before = structuredClone(controller.getState().workspace);
  expect(before.arrays.get(1).values).toEqual([3]);
  controller.stepForward();
  expect(controller.getState().workspace.arrays.get(1).values).toEqual([2]);
  expect(controller.getState().workspace.arrays.get(0).values).toEqual([
    3, 1, 3,
  ]);
  controller.stepBackward();
  expect(controller.getState().workspace).toEqual(before);
});

test("introsort reuses one saved slot across multiple insertion ranges", async () => {
  const input = Array.from({ length: 65 }, (_, idx) => ((idx * 17) % 23) - 11);
  const result = pregen_sort_with_result("introsort", input);
  const events = result.events;
  expect(events.filter((event) => event.type === "AddArray")).toEqual([
    { type: "AddArray", arrId: 1, length: 1 },
  ]);
  expect(events.filter((event) => event.type === "RemoveArray")).toEqual([
    { type: "RemoveArray", arrId: 1 },
  ]);
  expect(events.some((event) => event.type === "EnterRange")).toBe(true);
  expect(
    events.filter((event) => event.type === "Copy" && event.dest.arrId === 1)
      .length
  ).toBeGreaterThan(16);
  const controller = new AnimationController();
  await controller.initialize(new PregenEngine(), "introsort", input);
  const states = [structuredClone(controller.getState().workspace)];
  for (const _ of events) {
    controller.stepForward();
    states.push(structuredClone(controller.getState().workspace));
  }
  expect(controller.getState().workspace.arrays.get(0).values).toEqual(
    [...input].sort((a, b) => a - b)
  );
  for (let step = events.length - 1; step >= 0; step--) {
    controller.stepBackward();
    expect(controller.getState().workspace).toEqual(states[step]);
  }
  for (const step of [
    1,
    Math.floor(events.length / 2),
    events.length - 2,
    events.length,
  ]) {
    controller.seekTo(step);
    expect(controller.getState().workspace).toEqual(states[step]);
  }
});

async function checkWorkspaceHistory(algorithm, input, everySeek = true) {
  const engine = new PregenEngine();
  const controller = new AnimationController();
  await controller.initialize(engine, algorithm, input);
  const events = engine.getAllEvents();
  checkProtocol(events, input.length);
  const states = [structuredClone(controller.getState().workspace)];
  for (const _ of events) {
    controller.stepForward();
    states.push(structuredClone(controller.getState().workspace));
  }
  expect(states.at(-1).arrays.get(0).values).toEqual(
    [...input].sort((a, b) => a - b)
  );
  for (const array of states.at(-1).arrays.values()) {
    expect(array.rangeStack).toEqual([]);
    expect(array.visible).toBe(array.id === 0);
  }
  for (let step = events.length - 1; step >= 0; step--) {
    controller.stepBackward();
    expect(controller.getState().workspace).toEqual(states[step]);
  }
  const steps = everySeek ? states.map((_, idx) => idx) : [0, events.length];
  if (!everySeek) {
    events.forEach((event, idx) => {
      if (
        [
          "AddArray",
          "RemoveArray",
          "EnterRange",
          "ExitRange",
          "ConsumeArray",
        ].includes(event.type)
      )
        steps.push(idx, idx + 1);
    });
  }
  for (const step of steps) {
    controller.seekTo(step);
    expect(controller.getState().workspace).toEqual(states[step]);
  }
  controller.reset();
  expect(controller.getState().workspace.arrays.size).toBe(1);
  return { events, states };
}

test("timsort restores scalar-to-buffer transitions and two reused buffers", async () => {
  for (const length of [5, 33, 65, 129]) {
    const input = Array.from(
      { length },
      (_, idx) => ((idx * 17 + length) % 23) - 11
    );
    const { events, states } = await checkWorkspaceHistory(
      "timsort",
      input,
      length <= 33
    );
    const additions = events.filter((event) => event.type === "AddArray");
    expect(additions[0]).toEqual({ type: "AddArray", arrId: 1, length: 1 });
    expect(events.some((event) => event.type === "Overwrite")).toBe(false);
    if (length === 5) expect(additions).toHaveLength(1);
    else {
      expect(additions).toHaveLength(3);
      expect(additions.map((event) => event.arrId)).toEqual([1, 2, 3]);
      const scalarRemoval = events.findIndex(
        (event) => event.type === "RemoveArray" && event.arrId === 1
      );
      const firstBuffer = events.findIndex(
        (event) => event.type === "AddArray" && event.arrId === 2
      );
      expect(scalarRemoval).toBeLessThan(firstBuffer);
      expect(states[firstBuffer].arrays.get(1).visible).toBe(false);
      expect(
        events.some(
          (event) =>
            event.type === "Compare" &&
            event.i.arrId === 2 &&
            event.j.arrId === 3
        )
      ).toBe(true);
      if (length === 65)
        expect(additions.slice(1)).toEqual([
          { type: "AddArray", arrId: 2, length: 34 },
          { type: "AddArray", arrId: 3, length: 31 },
        ]);
      for (const id of [2, 3]) {
        const firstWrite = events.findIndex(
          (event) => event.type === "Copy" && event.dest.arrId === id
        );
        expect(events[firstWrite].old_val).toBeNull();
        expect(
          states[firstWrite].arrays
            .get(id)
            .values.every((value) => value === null)
        ).toBe(true);
      }
    }
  }
});

for (const algorithm of ["radix_lsd", "radix_msd"]) {
  test(`${algorithm}: one scratch buffer survives digit/bucket reuse and full reversal`, async () => {
    for (const input of [
      [90, 10, 90, 0, 100, 9, 1],
      [101, 105, 109, 102, 105, 101, 0],
      [999, 0, 1000, 1000, 1, 10, 100, 99],
      [2147483647, 0, 2147483646, 10],
      [5, 5, 5],
    ]) {
      const { events } = await checkWorkspaceHistory(algorithm, input);
      expect(events.filter((event) => event.type === "AddArray")).toEqual([
        { type: "AddArray", arrId: 1, length: input.length },
      ]);
      expect(events.filter((event) => event.type === "RemoveArray")).toEqual([
        { type: "RemoveArray", arrId: 1 },
      ]);
      expect(
        events.some(
          (event) => event.type === "Compare" || event.type === "Overwrite"
        )
      ).toBe(false);
      expect(
        events.some(
          (event) => event.type === "Copy" && event.old_val === event.new_val
        )
      ).toBe(true);
      const writes = events.filter(
        (event) => event.type === "Copy" && event.dest.arrId === 1
      );
      expect(writes.filter((event) => event.old_val === null)).toHaveLength(
        input.length
      );
      for (const event of events.filter((event) => event.type === "Copy")) {
        expect([event.src.arrId, event.dest.arrId].sort()).toEqual([0, 1]);
      }
    }
    for (const input of [[], [0], [0, 0, 0]]) {
      expect(pregen_sort_with_result(algorithm, input).events).toEqual([
        { type: "Done" },
      ]);
    }
  });
}

test("full-buffer merge has no initial clone and stably copies both halves", () => {
  const events = pregen_sort_with_result("merge", [1, 1]).events;
  expect(events.slice(0, 2)).toEqual([
    { type: "AddArray", arrId: 1, length: 2 },
    { type: "EnterRange", arrId: 0, lo: 0, hi: 1 },
  ]);
  expect(events.filter((event) => event.type === "Copy")).toEqual([
    {
      type: "Copy",
      src: { arrId: 0, idx: 0 },
      dest: { arrId: 1, idx: 0 },
      old_val: null,
      new_val: 1,
    },
    {
      type: "Copy",
      src: { arrId: 0, idx: 1 },
      dest: { arrId: 1, idx: 1 },
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
    {
      type: "Copy",
      src: { arrId: 1, idx: 1 },
      dest: { arrId: 0, idx: 1 },
      old_val: 1,
      new_val: 1,
    },
  ]);
});

test("every tracked auxiliary is consumed between uses and before removal", async () => {
  for (const algorithm of [
    "merge",
    "merge_half_buffer",
    "timsort",
    "radix_lsd",
    "radix_msd",
    "insertion",
    "binary_insertion",
    "shell",
    "cycle",
    "introsort",
  ]) {
    for (const input of [
      [0, 1, 2, 2, 3],
      [3, 0, 2, 2, 1],
    ]) {
      const { events, states } = await checkWorkspaceHistory(algorithm, input);
      expect(events.some((event) => event.type === "ConsumeArray")).toBe(true);
      for (let idx = 0; idx < events.length; idx++) {
        const event = events[idx];
        if (
          (event.type === "Copy" || event.type === "Overwrite") &&
          event.dest.arrId !== 0
        ) {
          const before = states[idx].arrays.get(event.dest.arrId);
          const after = states[idx + 1].arrays.get(event.dest.arrId);
          expect(after.consumed).toEqual(
            before.consumed.map((flag, slot) =>
              slot === event.dest.idx ? false : flag
            )
          );
        }
        if (event.type === "ConsumeArray") {
          const before = states[idx].arrays.get(event.arrId);
          const after = states[idx + 1].arrays.get(event.arrId);
          expect(after.values).toEqual(before.values);
          expect(after.rangeStack).toEqual(before.rangeStack);
          expect(after.consumed).toEqual(
            before.values.map((value) => value !== null)
          );
        }
        if (event.type === "RemoveArray") {
          const array = states[idx].arrays.get(event.arrId);
          expect(array.consumed).toEqual(
            array.values.map((value) => value !== null)
          );
        }
      }
    }
  }
});

// Check the counters through the rebuilt Wasm -> event -> controller path.
async function verifyOperationPlayback(algorithm, input) {
  const engine = new PregenEngine();
  const controller = new AnimationController();
  await controller.initialize(engine, algorithm, input);
  const events = engine.getAllEvents();
  checkProtocol(events, input.length);
  const snapshots = [structuredClone(controller.getState())];
  for (const event of events) {
    controller.stepForward();
    const state = structuredClone(controller.getState());
    const previous = snapshots.at(-1).operationCounts;
    const expected = { ...previous };
    if (event.type === "Compare") expected.comparisons++;
    if (event.type === "Swap") {
      expected.swaps++;
      for (const ref of [event.i, event.j])
        expected[ref.arrId === 0 ? "mainWrites" : "auxWrites"]++;
    }
    if (event.type === "Copy" || event.type === "Overwrite")
      expected[event.dest.arrId === 0 ? "mainWrites" : "auxWrites"]++;
    expect(state.operationCounts).toEqual(expected);
    snapshots.push(state);
  }
  expect(controller.getState().workspace.arrays.get(0).values).toEqual(
    [...input].sort((a, b) => a - b)
  );
  const counts = controller.getState().operationCounts;
  for (let step = events.length - 1; step >= 0; step--) {
    controller.stepBackward();
    expect(controller.getState().operationCounts).toEqual(
      snapshots[step].operationCounts
    );
    expect(controller.getState().workspace).toEqual(snapshots[step].workspace);
  }
  for (let step = 0; step <= events.length; step++) {
    controller.seekTo(step);
    expect(controller.getState().operationCounts).toEqual(
      snapshots[step].operationCounts
    );
    expect(controller.getState().workspace).toEqual(snapshots[step].workspace);
  }
  return { counts, events };
}

for (const algorithm of ["radix_lsd", "radix_msd"]) {
  test(`${algorithm}: zero comparisons, OR digit bounds, and reversible write counts`, async () => {
    for (const [input, writes] of [
      [[9, 8], 2],
      // 8 | 7 = 15: the extra decimal pass is harmless and is counted.
      [[8, 7], 4],
      [[99, 98], 4],
      // MSD stops when buckets contain one element; LSD visits every digit.
      [[99, 28], algorithm === "radix_lsd" ? 6 : 4],
      [[0, 0], 0],
    ]) {
      const { counts } = await verifyOperationPlayback(algorithm, input);
      expect(counts).toEqual({
        comparisons: 0,
        mainWrites: writes,
        auxWrites: writes,
        swaps: 0,
      });
    }
    const { counts } = await verifyOperationPlayback(
      algorithm,
      [2147483647, 0, 2147483646, 10]
    );
    expect(counts.comparisons).toBe(0);
    expect(counts.swaps).toBe(0);
    expect(counts.mainWrites).toBe(counts.auxWrites);
    // Invalid inputs are rejected before auxiliary storage or operations.
    expect(pregen_sort_with_result(algorithm, [-1, 2]).events).toEqual([
      { type: "Done" },
    ]);
  });
}

test("cycle: each comparison is recorded once and saved-value exchanges count both writes", async () => {
  const { counts } = await verifyOperationPlayback("cycle", [3, 1, 2]);
  expect(counts).toEqual({
    comparisons: 10,
    mainWrites: 3,
    auxWrites: 5,
    swaps: 3,
  });
  for (const input of [
    [2, 1, 2, 1, 0],
    [1, 1, 1],
    [3, 2, 1, 0, 3],
  ]) {
    const result = await verifyOperationPlayback("cycle", input);
    expect(result.counts.mainWrites).toBe(result.counts.swaps);
    expect(result.counts.auxWrites).toBe(
      result.counts.swaps + input.length - 1
    );
  }
});

test("bitonic: arbitrary lengths use only main comparisons and swaps, with exact replay", async () => {
  for (const input of [
    [],
    [42],
    [2, 1],
    [3, 1, 2],
    [5, 4, 3, 2, 1],
    [2147483647, -2147483648, 0, 2147483647, -1, 42, -2147483648],
    ...[8, 9, 15, 16, 17].map((n) =>
      Array.from({ length: n }, (_, i) => n - i)
    ),
  ]) {
    const { counts, events } = await verifyOperationPlayback("bitonic", input);
    expect(
      events.every((event) => ["Compare", "Swap", "Done"].includes(event.type))
    ).toBe(true);
    expect(counts.auxWrites).toBe(0);
    expect(counts.mainWrites).toBe(counts.swaps * 2);
    if (input.length > 1 && (input.length & (input.length - 1)) === 0) {
      const levels = Math.log2(input.length);
      expect(counts.comparisons).toBe(
        (input.length * levels * (levels + 1)) / 4
      );
    }
  }
});
