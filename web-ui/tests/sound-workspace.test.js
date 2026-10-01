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
    expect(frequencies).toEqual([400]);
    expect(controller.getState().workspace.arrays.get(1).values).toEqual([20]);
  });
});

test("completion plays each main-array value and seek/rewind remain silent", async () => {
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
    controller.stepBackward();
    controller.seekTo(2);
    expect(frequencies).toEqual([200, 400, 1200]);
    controller.setSoundConfig({ waveform: "none" });
    controller.stepForward();
    expect(frequencies).toEqual([200, 400, 1200]);
  });
});
