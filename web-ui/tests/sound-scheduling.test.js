import { expect, spyOn, test } from "bun:test";
import { AnimationController } from "@/controller/AnimationController";
import { SoundEngine } from "@/sound/SoundEngine";
import { AUDIO_DELAY_SECONDS } from "@/sound/types";
import { createWorkspace } from "@/workspace/reducer";

const ref = (idx) => ({ arrId: 0, idx });
const compare = { type: "Compare", i: ref(0), j: ref(1) };

async function withAudioClock(check) {
  const originalAudio = globalThis.AudioContext;
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  let nowMs = 0;
  let audio;
  let callback;
  const tones = [];
  const clock = spyOn(performance, "now").mockImplementation(() => nowMs);
  const parameter = () => ({
    value: 0,
    changes: [],
    setValueAtTime(value, at) {
      this.changes.push(["set", value, at]);
    },
    linearRampToValueAtTime(value, at) {
      this.changes.push(["ramp", value, at]);
    },
    cancelAndHoldAtTime(at) {
      this.changes.push(["hold", at]);
    },
  });
  globalThis.AudioContext = class {
    currentTime = 100;
    state = "running";
    destination = {};
    constructor() {
      audio = this;
    }
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
    createGain() {
      return {
        gain: parameter(),
        connect() {},
        disconnect() {
          this.disconnected = true;
        },
      };
    }
    createOscillator() {
      const tone = {
        frequency: parameter(),
        stops: [],
        connect(gain) {
          this.gain = gain;
        },
        disconnect() {
          this.disconnected = true;
        },
        start(at) {
          this.startTime = at;
        },
        stop(at) {
          this.stops.push(at);
        },
      };
      tones.push(tone);
      return tone;
    }
  };
  globalThis.requestAnimationFrame = (next) => {
    callback = next;
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {
    callback = undefined;
  };
  const advance = (deltaMs) => {
    nowMs += deltaMs;
    if (audio?.state === "running") audio.currentTime += deltaMs / 1000;
    for (const tone of tones) {
      if (!tone.ended && tone.stops.at(-1) <= audio.currentTime) {
        tone.ended = true;
        tone.onended();
      }
    }
  };
  try {
    await check({
      tones,
      advance,
      frame(deltaMs) {
        advance(deltaMs);
        callback(nowMs);
      },
      audio: () => audio,
    });
  } finally {
    clock.mockRestore();
    globalThis.AudioContext = originalAudio;
    globalThis.requestAnimationFrame = originalRequest;
    globalThis.cancelAnimationFrame = originalCancel;
  }
}

function engineFor(events, canSeek = true) {
  let position = 0;
  return {
    name: "Audio timing fixture",
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
}

function expectTimes(tones, times) {
  expect(tones).toHaveLength(times.length);
  tones.forEach((tone, idx) =>
    expect(tone.startTime).toBeCloseTo(times[idx], 8)
  );
}

test("notes, envelopes, and stops use event timestamps plus the fixed delay", async () => {
  await withAudioClock(({ tones, advance }) => {
    const sound = new SoundEngine();
    sound.init();
    sound.beginPlayback(0);
    const workspace = createWorkspace([0, 100]);
    advance(35);
    for (const at of [10, 20, 30])
      sound.scheduleEvent(compare, workspace, "forward", at);
    expectTimes(tones, [100.06, 100.07, 100.08]);
    tones.forEach((tone) => {
      expect(tone.gain.gain.changes[0]).toEqual(["set", 0, tone.startTime]);
      expect(tone.stops[0] - tone.startTime).toBeCloseTo(0.075, 8);
    });
    expect(AUDIO_DELAY_SECONDS).toBe(0.05);
  });
});

for (const canSeek of [true, false]) {
  test(`${canSeek ? "pregen" : "live"}: frame batches capture values before mutation and retain silent-event spacing`, async () => {
    await withAudioClock(async ({ tones, frame }) => {
      const controller = new AnimationController();
      const events = [
        { type: "Swap", i: ref(0), j: ref(1) },
        { type: "EnterRange", arrId: 0, lo: 0, hi: 2 },
        compare,
        { type: "Overwrite", dest: ref(0), old_val: 20, new_val: 100 },
        { type: "ExitRange", arrId: 0, lo: 0, hi: 2 },
        { type: "Done" },
      ];
      await controller.initialize(
        engineFor(events, canSeek),
        "fixture",
        [0, 20, 100]
      );
      controller.initSound();
      controller.setSpeed(10);
      controller.play();
      frame(8);
      expectTimes(tones, [100 + 0.05 + 1 / 600, 100.055, 100 + 0.05 + 4 / 600]);
      expect(tones.map((tone) => tone.frequency.value)).toEqual([
        400, 200, 1200,
      ]);
      expect(controller.getState().workspace.arrays.get(0).values).toEqual([
        100, 0, 100,
      ]);
      controller.playBackward();
      frame(8);
      expectTimes(tones.slice(3), [
        100.058 + 1 / 600,
        100.058 + 2 / 600,
        100.058 + 4 / 600,
      ]);
      expect(tones.slice(3).map((tone) => tone.frequency.value)).toEqual([
        400, 200, 200,
      ]);
      expect(controller.getState().currentStep).toBe(0);
    });
  });
}

test("frame remainders preserve the event timeline between batches", async () => {
  await withAudioClock(async ({ tones, frame }) => {
    const controller = new AnimationController();
    await controller.initialize(
      engineFor(Array(20).fill(compare)),
      "fixture",
      [0, 100]
    );
    controller.initSound();
    controller.play();
    frame(20);
    frame(20);
    frame(20);
    expectTimes(tones, [100.05 + 1 / 60, 100.05 + 2 / 60, 100.1]);
  });
});

test("forward and backward completion use the sweep interval and final notes survive natural completion", async () => {
  await withAudioClock(async ({ tones, frame }) => {
    const controller = new AnimationController();
    await controller.initialize(
      engineFor([{ type: "Done" }]),
      "fixture",
      [0, 20, 100]
    );
    controller.initSound();
    controller.play();
    frame(20);
    frame(15);
    expectTimes(tones, [100.07 + 1 / 240, 100.07 + 2 / 240, 100.0825]);
    expect(tones.map((tone) => tone.frequency.value)).toEqual([200, 400, 1200]);
    expect(controller.getState().playbackState).toBe("done");
    expect(tones.every((tone) => tone.stops.length === 1)).toBe(true);
    controller.playBackward();
    frame(15);
    expectTimes(tones.slice(3), [
      100.085 + 1 / 240,
      100.085 + 2 / 240,
      100.0975,
    ]);
    expect(tones.slice(3).map((tone) => tone.frequency.value)).toEqual([
      1200, 400, 200,
    ]);
  });
});

test("late frames skip overdue notes while preserving visual progress and remaining note spacing", async () => {
  await withAudioClock(async ({ tones, frame }) => {
    const controller = new AnimationController();
    await controller.initialize(
      engineFor(Array(100).fill(compare)),
      "fixture",
      [0, 100]
    );
    controller.initSound();
    controller.setSpeed(10);
    controller.play();
    frame(100);
    expect(controller.getState().currentStep).toBe(60);
    expect(tones.length).toBeGreaterThan(0);
    expect(tones.length).toBeLessThan(60);
    expect(tones.every((tone) => tone.startTime >= 100.1)).toBe(true);
    for (let i = 1; i < tones.length; i++) {
      expect(tones[i].startTime - tones[i - 1].startTime).toBeCloseTo(
        1 / 600,
        8
      );
    }
  });
});

test("cancellation stops future notes, fades active ones, and ended nodes are disconnected", async () => {
  await withAudioClock(({ tones, advance, audio }) => {
    const sound = new SoundEngine();
    sound.init();
    const workspace = createWorkspace([0, 100]);
    sound.playEvent(compare, workspace);
    sound.beginPlayback(0);
    sound.scheduleEvent(compare, workspace, "forward", 20);
    advance(10);
    sound.cancelPlayback();
    expect(tones[1].stops.at(-1)).toBeCloseTo(audio().currentTime, 8);
    // The immediate note was canceled when the new playback began.
    sound.playEvent(compare, workspace);
    advance(10);
    sound.cancelPlayback();
    expect(tones[2].gain.gain.changes.slice(-2)).toEqual([
      ["hold", audio().currentTime],
      ["ramp", 0, audio().currentTime + 0.005],
    ]);
    expect(tones[2].stops.at(-1)).toBeCloseTo(audio().currentTime + 0.005, 8);
    advance(10);
    expect(
      tones.every((tone) => tone.disconnected && tone.gain.disconnected)
    ).toBe(true);
    const stops = tones.map((tone) => tone.stops.length);
    sound.cancelPlayback();
    expect(tones.map((tone) => tone.stops.length)).toEqual(stops);
  });
});

for (const action of [
  "pause",
  "stop",
  "reset",
  "seek",
  "speed",
  "backward",
  "initialize",
  "mute",
  "step",
]) {
  test(`${action} cancels pending playback audio`, async () => {
    await withAudioClock(async ({ tones, frame, audio }) => {
      const controller = new AnimationController();
      const engine = engineFor(Array(100).fill(compare));
      await controller.initialize(engine, "fixture", [0, 100]);
      controller.initSound();
      controller.setSpeed(10);
      controller.play();
      frame(10);
      const scheduled = [...tones];
      expect(scheduled.length).toBeGreaterThan(0);
      switch (action) {
        case "pause":
          controller.pause();
          break;
        case "stop":
          controller.stop();
          break;
        case "reset":
          controller.reset();
          break;
        case "seek":
          controller.seekTo(1);
          break;
        case "speed":
          controller.setSpeed(5);
          break;
        case "backward":
          controller.playBackward();
          break;
        case "initialize":
          await controller.initialize(engine, "fixture", [0, 100]);
          break;
        case "mute":
          controller.setSoundConfig({ waveform: "none" });
          break;
        case "step":
          controller.stepForward();
          break;
      }
      for (const tone of scheduled) {
        expect(tone.stops).toHaveLength(2);
        expect(tone.stops.at(-1)).toBeCloseTo(audio().currentTime, 8);
      }
      if (action === "step")
        expect(tones.at(-1).startTime).toBe(audio().currentTime);
      if (action === "speed") {
        frame(10);
        expectTimes(tones.slice(scheduled.length), [
          100.06 + 1 / 300,
          100.06 + 2 / 300,
          100.07,
        ]);
      }
      if (action === "pause") {
        controller.play();
        frame(10);
        expectTimes(
          tones.slice(scheduled.length),
          Array.from({ length: 6 }, (_, i) => 100.06 + (i + 1) / 600)
        );
      }
    });
  });
}

test("resuming a suspended audio context re-anchors its previously frozen clock", async () => {
  await withAudioClock(async ({ tones, advance, audio }) => {
    const sound = new SoundEngine();
    sound.init();
    const workspace = createWorkspace([0, 100]);
    sound.beginPlayback(0);
    audio().state = "suspended";
    advance(1000);
    sound.scheduleEvent(compare, workspace, "forward", 1000);
    expect(tones).toHaveLength(0);
    sound.resume();
    await Promise.resolve();
    sound.scheduleEvent(compare, workspace, "forward", 1000);
    expectTimes(tones, [100.05]);
  });
});

for (const backward of [false, true]) {
  test(`${backward ? "backward" : "forward"} playback resumes audio without relying on a mouse click`, async () => {
    await withAudioClock(async ({ tones, frame, audio }) => {
      const controller = new AnimationController();
      await controller.initialize(
        engineFor(Array(20).fill(compare)),
        "fixture",
        [0, 100]
      );
      controller.initSound();
      // Reinitializing a sort leaves its audio context intact, possibly suspended.
      await controller.initialize(
        engineFor(Array(20).fill(compare)),
        "fixture",
        [0, 100]
      );
      if (backward) controller.seekTo(10);
      audio().state = "suspended";
      if (backward) controller.playBackward();
      else controller.play();
      await Promise.resolve();
      expect(audio().state).toBe("running");
      frame(20);
      expect(tones).toHaveLength(1);
      expect(tones[0].startTime).toBeGreaterThan(audio().currentTime);
    });
  });
}
