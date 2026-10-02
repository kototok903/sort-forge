import { expect, test } from "bun:test";
import { SoundEngine } from "@/sound/SoundEngine";
import { AnimationController } from "@/controller/AnimationController";
import { createWorkspace, applyWorkspaceEvent } from "@/workspace/reducer";

function withAudioContext(check) {
  const original = globalThis.AudioContext;
  const frequencies = [];
  const parameter = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
  });
  globalThis.AudioContext = class {
    currentTime = 0;
    state = "running";
    destination = {};
    createGain() {
      return { gain: parameter(), connect() {} };
    }
    createOscillator() {
      const frequency = parameter();
      return {
        frequency,
        connect() {},
        start() {
          frequencies.push(frequency.value);
        },
        stop() {},
      };
    }
  };
  return Promise.resolve()
    .then(() => check(frequencies))
    .finally(() => {
      if (original === undefined) delete globalThis.AudioContext;
      else globalThis.AudioContext = original;
    });
}
const ref = (arrId, idx = 0) => ({ arrId, idx });

test("sound resolves auxiliary values and keeps empty/lifecycle events silent", async () => {
  await withAudioContext((frequencies) => {
    const workspace = createWorkspace([100]);
    applyWorkspaceEvent(workspace, {
      type: "AddArray",
      arrId: 1,
      length: 2,
    });
    applyWorkspaceEvent(workspace, {
      type: "Overwrite",
      dest: ref(1),
      old_val: null,
      new_val: 20,
    });
    const sound = new SoundEngine();
    sound.setValueRange(0, 100);
    sound.init();
    sound.playEvent({ type: "Compare", i: ref(0), j: ref(1) }, workspace);
    sound.playEvent({ type: "Swap", i: ref(0), j: ref(1) }, workspace);
    sound.playEvent(
      { type: "Copy", src: ref(1), dest: ref(0), old_val: 100, new_val: 20 },
      workspace
    );
    sound.playEvent(
      { type: "Overwrite", dest: ref(0), old_val: 100, new_val: 0 },
      workspace
    );
    expect(frequencies).toEqual([400, 400, 400, 200]);
    for (const event of [
      { type: "Compare", i: ref(0), j: ref(1, 1) },
      { type: "Swap", i: ref(0), j: ref(1, 1) },
      { type: "Overwrite", dest: ref(0), old_val: 100, new_val: null },
      {
        type: "Copy",
        src: ref(1, 1),
        dest: ref(0),
        old_val: 100,
        new_val: null,
      },
      { type: "AddArray", arrId: 2, length: 0 },
      { type: "RemoveArray", arrId: 1 },
      { type: "ConsumeArray", arrId: 1 },
      { type: "EnterRange", arrId: 1, lo: 0, hi: 1 },
      { type: "ExitRange", arrId: 1, lo: 0, hi: 1 },
      { type: "Done" },
    ])
      sound.playEvent(event, workspace);
    expect(frequencies).toEqual([400, 400, 400, 200]);
    sound.setConfig({ waveform: "none" });
    sound.playEvent({ type: "Compare", i: ref(0), j: ref(1) }, workspace);
    expect(frequencies).toHaveLength(4);
  });
});

test("controller plays swap sound before changing the auxiliary value", async () => {
  await withAudioContext(async (frequencies) => {
    const events = [
      { type: "AddArray", arrId: 1, length: 1 },
      { type: "Overwrite", dest: ref(1), old_val: null, new_val: 20 },
      { type: "Swap", i: ref(0), j: ref(1) },
      { type: "Done" },
    ];
    const engine = {
      canSeek: true,
      initialize() {},
      reset() {},
      seek() {},
      getTotalEvents: () => events.length,
      getEventAt: (idx) => events[idx],
    };
    const controller = new AnimationController();
    await controller.initialize(engine, "fixture", [0, 100]);
    controller.stepForward();
    controller.stepForward();
    controller.initSound();
    controller.stepForward();
    expect(frequencies).toEqual([400]);
    expect(controller.getState().workspace.arrays.get(1).values).toEqual([0]);
    controller.stepBackward();
    expect(frequencies).toEqual([400, 200]);
    expect(controller.getState().workspace.arrays.get(1).values).toEqual([20]);
  });
});

test("completion plays in both directions while seeking and muted stepping stay silent", async () => {
  await withAudioContext(async (frequencies) => {
    const events = [{ type: "Done" }];
    const engine = {
      canSeek: true,
      initialize() {},
      reset() {},
      seek() {},
      getTotalEvents: () => events.length,
      getEventAt: (idx) => events[idx],
    };
    const controller = new AnimationController();
    await controller.initialize(engine, "fixture", [0, 20, 100]);
    controller.initSound();
    controller.stepForward();
    expect(frequencies).toEqual([]);
    for (let i = 0; i < 3; i++) controller.stepForward();
    expect(frequencies).toEqual([200, 400, 1200]);
    for (let i = 0; i < 3; i++) controller.stepBackward();
    expect(frequencies).toEqual([200, 400, 1200, 1200, 400, 200]);
    controller.seekTo(2);
    expect(frequencies).toEqual([200, 400, 1200, 1200, 400, 200]);
    controller.setSoundConfig({ waveform: "none" });
    controller.stepForward();
    controller.stepBackward();
    expect(frequencies).toEqual([200, 400, 1200, 1200, 400, 200]);
  });
});

test("reverse writes sound the restored value and restoring empty slots is silent", async () => {
  await withAudioContext((frequencies) => {
    const sound = new SoundEngine();
    sound.setValueRange(0, 100);
    sound.init();
    const workspace = createWorkspace([100]);
    for (const type of ["Overwrite", "Copy"]) {
      const event = {
        type,
        dest: ref(0),
        src: ref(0),
        old_val: 20,
        new_val: 100,
      };
      sound.playEvent(event, workspace, "backward");
      sound.playEvent({ ...event, old_val: 0 }, workspace, "backward");
      sound.playEvent({ ...event, old_val: null }, workspace, "backward");
    }
    expect(frequencies).toEqual([400, 200, 400, 200]);
    for (const event of [
      { type: "Done" },
      { type: "AddArray", arrId: 1, length: 1 },
      { type: "RemoveArray", arrId: 1 },
      { type: "ConsumeArray", arrId: 1 },
      { type: "EnterRange", arrId: 0, lo: 0, hi: 0 },
      { type: "ExitRange", arrId: 0, lo: 0, hi: 0 },
    ])
      sound.playEvent(event, workspace, "backward");
    expect(frequencies).toEqual([400, 200, 400, 200]);
  });
});

for (const canSeek of [true, false]) {
  test(`${canSeek ? "pregen" : "live"}: reverse frame batches sound the sweep and restored sort values`, async () => {
    await withAudioContext(async (frequencies) => {
      const originalRequest = globalThis.requestAnimationFrame;
      const originalCancel = globalThis.cancelAnimationFrame;
      let callback;
      globalThis.requestAnimationFrame = (next) => {
        callback = next;
        return 1;
      };
      globalThis.cancelAnimationFrame = () => {
        callback = undefined;
      };
      try {
        const events = [
          { type: "Overwrite", dest: ref(0), old_val: 0, new_val: 20 },
          {
            type: "Copy",
            src: ref(0, 2),
            dest: ref(0, 1),
            old_val: 20,
            new_val: 100,
          },
          { type: "Compare", i: ref(0), j: ref(0, 1) },
          { type: "Swap", i: ref(0), j: ref(0, 2) },
          { type: "Done" },
        ];
        let position = 0;
        const engine = {
          canSeek,
          initialize() {
            position = 0;
          },
          reset() {
            position = 0;
          },
          seek(next) {
            position = next;
          },
          getTotalEvents: () => events.length,
          getEventAt: (idx) => events[idx] ?? null,
          getNextEvents(count) {
            const batch = events.slice(position, position + count);
            position += batch.length;
            return batch;
          },
          isDone: () => position === events.length,
        };
        const controller = new AnimationController();
        await controller.initialize(engine, "fixture", [0, 20, 100]);
        for (let i = 0; i < events.length + 3; i++) controller.stepForward();
        controller.initSound();
        controller.playBackward();
        const start = performance.now();
        callback(start + 1000);
        expect(frequencies).toEqual([400, 1200, 1200]);
        expect(controller.getState().completedCount).toBe(0);
        callback(start + 2000);
        expect(frequencies).toEqual([400, 1200, 1200, 400, 1200, 400, 200]);
        expect(controller.getState().currentStep).toBe(0);
        expect(controller.getState().workspace.arrays.get(0).values).toEqual([
          0, 20, 100,
        ]);
        expect(controller.getState().playbackState).toBe("paused");
      } finally {
        globalThis.requestAnimationFrame = originalRequest;
        globalThis.cancelAnimationFrame = originalCancel;
      }
    });
  });
}
