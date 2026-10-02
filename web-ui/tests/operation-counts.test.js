import { describe, expect, spyOn, test } from "bun:test";
import { AnimationController } from "@/controller/AnimationController";
import { BASE_EVENTS_PER_SECOND } from "@/config";
import {
  applyOperationCounts,
  emptyOperationCounts,
} from "@/types/operation-counts";

const ref = (arrId, idx = 0) => ({ arrId, idx });
const main = (idx = 0) => ref(0, idx);
const totals = (comparisons, mainWrites, auxWrites, swaps) => ({
  comparisons,
  mainWrites,
  auxWrites,
  swaps,
});

// Includes equal-value writes, a self-swap, buffers and saved-value storage.
const steps = [
  [{ type: "AddArray", arrId: 1, length: 2 }, totals(0, 0, 0, 0)],
  [{ type: "AddArray", arrId: 2, length: 1 }, totals(0, 0, 0, 0)],
  [
    { type: "Copy", src: main(), dest: ref(1), old_val: null, new_val: 3 },
    totals(0, 0, 1, 0),
  ],
  [
    { type: "Copy", src: main(1), dest: ref(1, 1), old_val: null, new_val: 1 },
    totals(0, 0, 2, 0),
  ],
  [
    { type: "Copy", src: main(2), dest: ref(2), old_val: null, new_val: 2 },
    totals(0, 0, 3, 0),
  ],
  [{ type: "Compare", i: main(), j: ref(1) }, totals(1, 0, 3, 0)],
  [{ type: "Swap", i: main(), j: main(1) }, totals(1, 2, 3, 1)],
  [{ type: "Swap", i: main(2), j: ref(1) }, totals(1, 3, 4, 2)],
  [{ type: "Swap", i: ref(1, 1), j: ref(2) }, totals(1, 3, 6, 3)],
  [{ type: "Swap", i: main(), j: main() }, totals(1, 5, 6, 4)],
  [
    { type: "Copy", src: main(), dest: main(), old_val: 1, new_val: 1 },
    totals(1, 6, 6, 4),
  ],
  [
    { type: "Overwrite", dest: ref(1), old_val: 2, new_val: 2 },
    totals(1, 6, 7, 4),
  ],
  [
    { type: "Overwrite", dest: main(2), old_val: 3, new_val: 3 },
    totals(1, 7, 7, 4),
  ],
  [{ type: "EnterRange", arrId: 0, lo: 0, hi: 2 }, totals(1, 7, 7, 4)],
  [{ type: "ExitRange", arrId: 0, lo: 0, hi: 2 }, totals(1, 7, 7, 4)],
  [{ type: "ConsumeArray", arrId: 1 }, totals(1, 7, 7, 4)],
  [{ type: "RemoveArray", arrId: 1 }, totals(1, 7, 7, 4)],
  [{ type: "RemoveArray", arrId: 2 }, totals(1, 7, 7, 4)],
  [{ type: "Done" }, totals(1, 7, 7, 4)],
];
const events = steps.map(([event]) => event);
const finalCounts = totals(1, 7, 7, 4);

function fixtureEngine(canSeek) {
  let position = 0;
  return {
    name: "Operation count fixture",
    canSeek,
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
    getTotalEvents: () => (canSeek ? events.length : position),
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

function expectedAt(step) {
  return step === 0
    ? emptyOperationCounts()
    : steps[Math.min(step, steps.length) - 1][1];
}

describe("operation counts", () => {
  test("counts recorded operations and subtracts original events on undo", () => {
    const counts = emptyOperationCounts();
    for (const [event, expected] of steps) {
      applyOperationCounts(counts, event);
      expect(counts).toEqual(expected);
    }
    applyOperationCounts(counts, { type: "CompleteElement", idx: 0 });
    expect(counts).toEqual(finalCounts);
    for (let i = steps.length - 1; i >= 0; i--) {
      applyOperationCounts(counts, steps[i][0], "backward");
      expect(counts).toEqual(expectedAt(i));
    }
  });

  for (const canSeek of [true, false]) {
    test(`${canSeek ? "pregen" : "live"}: step, completion, rewind, replay, reset, and initialize`, async () => {
      const controller = new AnimationController();
      const engine = fixtureEngine(canSeek);
      await controller.initialize(engine, "fixture", [3, 1, 2]);
      const initialSnapshot = controller.getState();
      for (let i = 1; i <= events.length + 3; i++) {
        controller.stepForward();
        expect(controller.getState().operationCounts).toEqual(expectedAt(i));
      }
      expect(initialSnapshot.operationCounts).toEqual(emptyOperationCounts());
      controller.stepForward();
      expect(controller.getState().operationCounts).toEqual(finalCounts);
      for (let i = events.length + 2; i >= 0; i--) {
        controller.stepBackward();
        expect(controller.getState().operationCounts).toEqual(expectedAt(i));
      }
      controller.stepBackward();
      expect(controller.getState().operationCounts).toEqual(
        emptyOperationCounts()
      );
      for (let i = 0; i < events.length; i++) controller.stepForward();
      expect(controller.getState().operationCounts).toEqual(finalCounts);
      controller.reset();
      expect(controller.getState().operationCounts).toEqual(
        emptyOperationCounts()
      );
      for (let i = 0; i < 3; i++) controller.stepForward();
      await controller.initialize(engine, "fixture", [3, 1, 2]);
      expect(controller.getState().operationCounts).toEqual(
        emptyOperationCounts()
      );
    });
  }

  test("seeking rebuilds counts through auxiliary lifetimes and completion", async () => {
    const controller = new AnimationController();
    await controller.initialize(fixtureEngine(true), "fixture", [3, 1, 2]);
    for (const step of [22, 8, 0, 12, 19, 3, 21, 10, 0]) {
      controller.seekTo(step);
      expect(controller.getState().operationCounts).toEqual(expectedAt(step));
    }
  });

  test("animated batches count every event with frame-level notifications", async () => {
    const originalRequest = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;
    let callback;
    let now = 0;
    const clock = spyOn(performance, "now").mockImplementation(() => now);
    globalThis.requestAnimationFrame = (next) => {
      callback = next;
      return 1;
    };
    globalThis.cancelAnimationFrame = () => {
      callback = undefined;
    };
    try {
      for (const canSeek of [true, false]) {
        const controller = new AnimationController();
        await controller.initialize(
          fixtureEngine(canSeek),
          "fixture",
          [3, 1, 2]
        );
        let notifications = 0;
        controller.subscribe(() => {
          notifications++;
        });
        controller.play();
        const before = notifications;
        now += (events.length * 1000) / BASE_EVENTS_PER_SECOND + 0.01;
        callback(now);
        expect(controller.getState().operationCounts).toEqual(finalCounts);
        expect(notifications).toBe(before + 1);
        controller.pause();
        controller.playBackward();
        now += (events.length * 1000) / BASE_EVENTS_PER_SECOND + 0.01;
        callback(now);
        expect(controller.getState().currentStep).toBe(0);
        expect(controller.getState().operationCounts).toEqual(
          emptyOperationCounts()
        );
      }
    } finally {
      clock.mockRestore();
      globalThis.requestAnimationFrame = originalRequest;
      globalThis.cancelAnimationFrame = originalCancel;
    }
  });
});
