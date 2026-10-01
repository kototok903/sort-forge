import { describe, expect, spyOn, test } from "bun:test";
import { AnimationController } from "@/controller/AnimationController";
import { BASE_EVENTS_PER_SECOND, COMPLETION_EVENTS_PER_SECOND } from "@/config";

function fixtureEngine(canSeek) {
  const events = [
    { type: "Swap", i: { arrId: 0, idx: 0 }, j: { arrId: 0, idx: 2 } },
    { type: "Done" },
  ];
  let position = 0;
  return {
    name: "Completion fixture",
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
    getEventAt: (idx) => events[idx] ?? null,
    // Emulate a live total that grows as the stream is generated.
    getTotalEvents: () =>
      canSeek ? events.length : Math.min(events.length, position + 1),
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

describe("completion sweep", () => {
  for (const canSeek of [true, false]) {
    test(`${canSeek ? "pregen" : "live"}: completion, rewind, replay, and reset preserve sorted values`, async () => {
      const engine = fixtureEngine(canSeek);
      const controller = new AnimationController();
      let rendered;
      controller.setRenderer({
        render(state) {
          rendered = structuredClone(state);
        },
      });
      await controller.initialize(engine, "fixture", [3, 2, 1]);
      controller.stepForward();
      controller.stepForward();
      const sortedWorkspace = structuredClone(controller.getState().workspace);
      expect(sortedWorkspace.arrays.get(0).values).toEqual([1, 2, 3]);
      expect(sortedWorkspace.isSorted).toBe(true);
      expect(controller.getState().totalSteps).toBe(5);
      expect(controller.getState().playbackState).not.toBe("done");
      expect(rendered.completedCount).toBe(0);
      for (let count = 1; count <= 3; count++) {
        controller.stepForward();
        expect(rendered.completedCount).toBe(count);
        expect(rendered.highlights).toEqual([]);
        expect(controller.getState().workspace).toEqual(sortedWorkspace);
        expect(engine.getCurrentPosition()).toBe(2);
      }
      expect(controller.getState().playbackState).toBe("done");
      controller.stepForward();
      expect(controller.getState().currentStep).toBe(5);
      for (let count = 2; count >= 0; count--) {
        controller.stepBackward();
        expect(rendered.completedCount).toBe(count);
        expect(controller.getState().workspace).toEqual(sortedWorkspace);
      }
      expect(controller.getState().playbackState).toBe("paused");
      controller.stepBackward();
      expect(controller.getState().workspace.isSorted).toBe(false);
      controller.stepForward();
      for (let i = 0; i < 3; i++) controller.stepForward();
      expect(controller.getState().playbackState).toBe("done");
      controller.reset();
      expect(rendered.completedCount).toBe(0);
      expect(controller.getState().workspace.arrays.get(0).values).toEqual([
        3, 2, 1,
      ]);
      expect(controller.getState().workspace.isSorted).toBe(false);
    });
  }

  test("seeking to and within the virtual tail restores its prefix silently", async () => {
    const controller = new AnimationController();
    await controller.initialize(fixtureEngine(true), "fixture", [3, 2, 1]);
    for (const step of [5, 2, 4, 0, 3, 1, 5]) {
      controller.seekTo(step);
      const state = controller.getState();
      expect(state.completedCount).toBe(Math.max(0, step - 2));
      expect(state.workspace.isSorted).toBe(step >= 2);
      expect(state.workspace.arrays.get(0).values).toEqual(
        step === 0 ? [3, 2, 1] : [1, 2, 3]
      );
      expect(state.playbackState === "done").toBe(step === 5);
    }
  });

  test("forward and backward sweeps use the constant rate, pause, and resume independently of sort speed", async () => {
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
    const frame = (delta) => {
      now += delta;
      callback(now);
    };
    try {
      for (const speed of [0.1, 10]) {
        const controller = new AnimationController();
        const array = Array.from({ length: 128 }, (_, idx) => idx);
        await controller.initialize(fixtureEngine(true), "fixture", array);
        controller.setSpeed(speed);
        controller.play();
        frame(2000 / (BASE_EVENTS_PER_SECOND * speed) + 0.01);
        expect(controller.getState().currentStep).toBe(2);
        expect(controller.getState().completedCount).toBe(0);
        expect(controller.getState().playbackState).toBe("playing");
        frame(100.01);
        expect(controller.getState().completedCount).toBe(
          COMPLETION_EVENTS_PER_SECOND / 10
        );
        controller.pause();
        expect(callback).toBeUndefined();
        now += 1000;
        controller.play();
        frame(100.01);
        expect(controller.getState().completedCount).toBe(48);
        controller.pause();
        controller.playBackward();
        frame(100.01);
        expect(controller.getState().completedCount).toBe(24);
        frame(100.01);
        expect(controller.getState().completedCount).toBe(0);
        expect(controller.getState().currentStep).toBe(2);
        expect(controller.getState().workspace.isSorted).toBe(true);
        controller.pause();
        controller.play();
        frame(1000);
        expect(controller.getState().completedCount).toBe(128);
        expect(controller.getState().playbackState).toBe("done");
        expect(callback).toBeUndefined();
      }
    } finally {
      clock.mockRestore();
      globalThis.requestAnimationFrame = originalRequest;
      globalThis.cancelAnimationFrame = originalCancel;
    }
  });
});
