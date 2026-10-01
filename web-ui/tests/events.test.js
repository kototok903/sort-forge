import { describe, expect, test } from "bun:test";
import { AnimationController } from "@/controller/AnimationController";
import { inverseEvent, isMutationEvent } from "@/types/events";

const main = (idx) => ({ arrId: 0, idx });

function eventEngine(events) {
  let position = 0;
  return {
    name: "Event fixture",
    canSeek: true,
    async initialize() {
      position = 0;
    },
    getNextEvents(count) {
      const batch = events.slice(position, position + count);
      position += batch.length;
      return batch;
    },
    getAllEvents: () => events,
    getEventAt: (index) => events[index] ?? null,
    getTotalEvents: () => events.length,
    getCurrentPosition: () => position,
    seek(next) {
      position = next;
    },
    reset() {
      position = 0;
    },
    isDone: () => position === events.length,
  };
}

function captureRenderer(controller) {
  let state;
  controller.setRenderer({
    render(next) {
      state = structuredClone(next);
    },
  });
  return () => state;
}

describe("array-aware event semantics", () => {
  test("copy undo restores only the destination, including an empty slot", () => {
    const src = { arrId: 1, idx: 2 };
    const dest = main(0);
    const copy = {
      type: "Copy",
      src,
      dest,
      old_val: null,
      new_val: 0,
    };
    expect(inverseEvent(copy)).toEqual({
      type: "Overwrite",
      dest,
      old_val: 0,
      new_val: null,
    });
    expect(isMutationEvent(copy)).toBe(true);
  });

  test("range undo preserves its array and bounds", () => {
    const enter = { type: "EnterRange", arrId: 3, lo: 1, hi: 4 };
    expect(inverseEvent(enter)).toEqual({ ...enter, type: "ExitRange" });
    expect(inverseEvent(inverseEvent(enter))).toEqual(enter);
    expect(isMutationEvent(enter)).toBe(false);
  });

  test("lifecycle events require retained workspace history for undo", () => {
    for (const event of [
      { type: "AddArray", arrId: 1, values: [null, 0] },
      { type: "RemoveArray", arrId: 1 },
    ]) {
      expect(inverseEvent(event)).toBeNull();
      expect(isMutationEvent(event)).toBe(true);
    }
  });
});

describe("main-only controller migration", () => {
  test("copy preserves the source and supports step, seek, rewind, and highlights", async () => {
    const controller = new AnimationController();
    const rendered = captureRenderer(controller);
    const events = [
      { type: "EnterRange", arrId: 0, lo: 0, hi: 2 },
      {
        type: "Copy",
        src: main(0),
        dest: main(1),
        old_val: 2,
        new_val: 3,
      },
      {
        type: "Copy",
        src: main(0),
        dest: main(1),
        old_val: 3,
        new_val: 3,
      },
      { type: "Swap", i: main(0), j: main(2) },
      { type: "Overwrite", dest: main(1), old_val: 3, new_val: 2 },
      { type: "ExitRange", arrId: 0, lo: 0, hi: 2 },
      { type: "Done" },
    ];
    await controller.initialize(eventEngine(events), "fixture", [3, 2, 1]);
    controller.stepForward();
    controller.stepForward();
    expect(controller.getState().array).toEqual([3, 3, 1]);
    expect(rendered().highlights).toEqual([
      { kind: "writing", indices: [0, 1] },
    ]);
    expect(rendered().activeRange).toEqual({ lo: 0, hi: 2 });
    controller.stepBackward();
    expect(controller.getState().array).toEqual([3, 2, 1]);
    const states = [];
    controller.reset();
    states.push(rendered());
    for (const _ of events) {
      controller.stepForward();
      states.push(rendered());
    }
    expect(controller.getState().array).toEqual([1, 2, 3]);
    for (let i = events.length; i >= 0; i--) {
      controller.seekTo(i);
      expect(rendered()).toEqual(states[i]);
    }
    controller.seekTo(events.length);
    for (let i = events.length - 1; i >= 0; i--) {
      controller.stepBackward();
      expect(rendered()).toEqual(states[i]);
    }
  });

  test("unsupported auxiliary events fail instead of mutating main", async () => {
    for (const event of [
      { type: "Swap", i: main(0), j: { arrId: 1, idx: 0 } },
      {
        type: "Overwrite",
        dest: { arrId: 1, idx: 0 },
        old_val: 1,
        new_val: 2,
      },
      { type: "EnterRange", arrId: 1, lo: 0, hi: 1 },
      { type: "AddArray", arrId: 1, values: [null] },
      { type: "RemoveArray", arrId: 1 },
      { type: "Overwrite", dest: main(0), old_val: 1, new_val: null },
    ]) {
      const controller = new AnimationController();
      await controller.initialize(eventEngine([event]), "fixture", [1, 2]);
      expect(() => controller.stepForward()).toThrow("workspace support");
      expect(controller.getState().array).toEqual([1, 2]);
      expect(controller.getState().currentStep).toBe(0);
    }
  });
});
