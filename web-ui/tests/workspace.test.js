import { describe, expect, test } from "bun:test";
import {
  applyWorkspaceEvent,
  createWorkspace,
  getArray,
  readElement,
} from "@/workspace/reducer";
import { AnimationController } from "@/controller/AnimationController";

const ref = (arrId, idx) => ({ arrId, idx });
const main = (idx) => ref(0, idx);

const events = [
  { type: "AddArray", arrId: 1, length: 2 },
  { type: "AddArray", arrId: 2, length: 1 },
  { type: "Overwrite", dest: ref(2, 0), old_val: null, new_val: 0 },
  { type: "EnterRange", arrId: 0, lo: 0, hi: 2 },
  { type: "EnterRange", arrId: 1, lo: 0, hi: 1 },
  { type: "Copy", src: main(0), dest: ref(1, 0), old_val: null, new_val: 3 },
  { type: "Copy", src: main(1), dest: ref(1, 1), old_val: null, new_val: 2 },
  { type: "EnterRange", arrId: 1, lo: 1, hi: 1 },
  { type: "Compare", i: ref(1, 0), j: main(2) },
  { type: "Swap", i: main(2), j: ref(2, 0) },
  { type: "Copy", src: ref(1, 1), dest: main(0), old_val: 3, new_val: 2 },
  { type: "Copy", src: ref(1, 1), dest: main(0), old_val: 2, new_val: 2 },
  { type: "Overwrite", dest: ref(1, 0), old_val: 3, new_val: null },
  { type: "RemoveArray", arrId: 1 },
  { type: "RemoveArray", arrId: 2 },
  { type: "ExitRange", arrId: 0, lo: 0, hi: 2 },
  { type: "Done" },
];

// Historical entries differ after rewind and seek; current storage must agree.
function visibleState(workspace) {
  return {
    isSorted: workspace.isSorted,
    arrays: [...workspace.arrays.values()]
      .filter((array) => array.visible)
      .sort((a, b) => a.id - b.id)
      .map((array) => structuredClone(array)),
  };
}

function fixtureEngine(events, canSeek = true) {
  let position = 0;
  return {
    name: "Workspace fixture",
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

function collectStates() {
  const workspace = createWorkspace([3, 2, 1]);
  const states = [visibleState(workspace)];
  for (const event of events) {
    applyWorkspaceEvent(workspace, event);
    states.push(visibleState(workspace));
  }
  return states;
}

describe("directional workspace reducer", () => {
  test("replay, full rewind, and redo restore values, membership, and independent ranges", () => {
    const workspace = createWorkspace([3, 2, 1]);
    const initialValues = [...workspace.arrays.get(0).values];
    const expected = collectStates();
    for (const event of events) applyWorkspaceEvent(workspace, event);
    expect(workspace.arrays.get(1).values).toEqual([null, 2]);
    expect(workspace.arrays.get(1).rangeStack).toEqual([
      { lo: 0, hi: 1 },
      { lo: 1, hi: 1 },
    ]);
    expect(workspace.arrays.get(1).visible).toBe(false);
    expect(() => getArray(workspace, 1)).toThrow("not visible");
    for (let i = events.length - 1; i >= 0; i--) {
      applyWorkspaceEvent(workspace, events[i], "backward");
      expect(visibleState(workspace)).toEqual(expected[i]);
    }
    expect(workspace.arrays.has(1)).toBe(false);
    expect(workspace.arrays.has(2)).toBe(false);
    expect(workspace.arrays.get(0).values).toEqual(initialValues);
    for (let i = 0; i < events.length; i++) {
      applyWorkspaceEvent(workspace, events[i]);
      expect(visibleState(workspace)).toEqual(expected[i + 1]);
    }
  });

  test("copy preserves its source, allows equal values, and restores an empty destination", () => {
    const workspace = createWorkspace([0]);
    const addition = { type: "AddArray", arrId: 1, length: 1 };
    applyWorkspaceEvent(workspace, addition);
    const copy = {
      type: "Copy",
      src: main(0),
      dest: ref(1, 0),
      old_val: null,
      new_val: 0,
    };
    applyWorkspaceEvent(workspace, copy);
    expect(readElement(workspace, main(0))).toBe(0);
    expect(readElement(workspace, ref(1, 0))).toBe(0);
    const equal = { ...copy, old_val: 0 };
    applyWorkspaceEvent(workspace, equal);
    applyWorkspaceEvent(workspace, equal, "backward");
    applyWorkspaceEvent(workspace, copy, "backward");
    expect(readElement(workspace, ref(1, 0))).toBeNull();
    applyWorkspaceEvent(workspace, addition, "backward");
    expect(workspace.arrays.has(1)).toBe(false);
    // Redo recreates empty storage; subsequent writes initialize it.
    applyWorkspaceEvent(workspace, addition);
    expect(readElement(workspace, ref(1, 0))).toBeNull();
    expect(addition).toEqual({ type: "AddArray", arrId: 1, length: 1 });
  });

  test("cross-array swaps support empty values and are self-inverse", () => {
    const workspace = createWorkspace([0]);
    applyWorkspaceEvent(workspace, {
      type: "AddArray",
      arrId: 1,
      length: 1,
    });
    const swap = { type: "Swap", i: main(0), j: ref(1, 0) };
    applyWorkspaceEvent(workspace, swap);
    expect(readElement(workspace, main(0))).toBeNull();
    expect(readElement(workspace, ref(1, 0))).toBe(0);
    applyWorkspaceEvent(workspace, swap, "backward");
    expect(readElement(workspace, main(0))).toBe(0);
    expect(readElement(workspace, ref(1, 0))).toBeNull();
  });

  test("invalid accesses and mismatched history fail before mutating state", () => {
    const workspace = createWorkspace([3, 2, 1]);
    applyWorkspaceEvent(workspace, { type: "AddArray", arrId: 1, length: 1 });
    applyWorkspaceEvent(workspace, { type: "RemoveArray", arrId: 1 });
    for (const event of [
      { type: "Swap", i: main(0), j: ref(1, 0) },
      { type: "Copy", src: ref(1, 0), dest: main(0), old_val: 3, new_val: 3 },
      { type: "Copy", src: main(0), dest: ref(1, 0), old_val: 3, new_val: 3 },
      { type: "Overwrite", dest: ref(1, 0), old_val: 3, new_val: 0 },
      { type: "Compare", i: main(0), j: ref(1, 0) },
      { type: "EnterRange", arrId: 1, lo: 0, hi: 0 },
      { type: "ExitRange", arrId: 1, lo: 0, hi: 0 },
      { type: "Swap", i: main(0), j: main(3) },
      { type: "Overwrite", dest: main(-1), old_val: 3, new_val: 1 },
      { type: "Overwrite", dest: main(0), old_val: 99, new_val: 1 },
      { type: "Copy", src: main(1), dest: main(0), old_val: 3, new_val: 99 },
      { type: "Overwrite", dest: main(0), old_val: 3, new_val: NaN },
      { type: "ExitRange", arrId: 0, lo: 0, hi: 2 },
      { type: "EnterRange", arrId: 0, lo: 1, hi: 3 },
      { type: "AddArray", arrId: 1, length: 1 },
      { type: "AddArray", arrId: 0, length: 1 },
      { type: "AddArray", arrId: -1, length: 1 },
      { type: "AddArray", arrId: 2, length: -1 },
      { type: "AddArray", arrId: 2, length: 1.5 },
      { type: "AddArray", arrId: 2, length: NaN },
      { type: "RemoveArray", arrId: 0 },
      { type: "RemoveArray", arrId: 9 },
      { type: "RemoveArray", arrId: 1 },
    ]) {
      const before = structuredClone(workspace);
      expect(() => applyWorkspaceEvent(workspace, event)).toThrow();
      expect(workspace).toEqual(before);
    }
  });

  test("range exits must match the top of the correct array's stack", () => {
    const workspace = createWorkspace([1, 2, 3]);
    applyWorkspaceEvent(workspace, {
      type: "EnterRange",
      arrId: 0,
      lo: 0,
      hi: 2,
    });
    applyWorkspaceEvent(workspace, {
      type: "EnterRange",
      arrId: 0,
      lo: 1,
      hi: 2,
    });
    const before = structuredClone(workspace);
    expect(() =>
      applyWorkspaceEvent(workspace, {
        type: "ExitRange",
        arrId: 0,
        lo: 0,
        hi: 2,
      })
    ).toThrow("Unbalanced");
    expect(workspace).toEqual(before);
  });
});

describe("workspace controller integration", () => {
  test("stepping, every seek position, and backward stepping produce the same visible workspace", async () => {
    const controller = new AnimationController();
    let rendered;
    controller.setRenderer({
      render(state) {
        rendered = structuredClone(state);
      },
    });
    await controller.initialize(fixtureEngine(events), "fixture", [3, 2, 1]);
    const expected = collectStates();
    const highlights = [[]];
    for (let i = 0; i < events.length; i++) {
      controller.stepForward();
      expect(visibleState(controller.getState().workspace)).toEqual(
        expected[i + 1]
      );
      highlights.push(rendered.highlights);
    }
    expect(highlights[6]).toEqual([
      { kind: "writing", elements: [main(0), ref(1, 0)] },
    ]);
    for (let i = events.length - 1; i >= 0; i--) {
      controller.stepBackward();
      expect(visibleState(controller.getState().workspace)).toEqual(
        expected[i]
      );
      expect(rendered.highlights).toEqual(highlights[i]);
    }
    for (let i = 0; i <= events.length; i++) {
      controller.seekTo(i);
      expect(visibleState(controller.getState().workspace)).toEqual(
        expected[i]
      );
      expect(rendered.highlights).toEqual(highlights[i]);
    }
    controller.reset();
    expect(controller.getState().workspace.arrays.size).toBe(1);
    expect(visibleState(controller.getState().workspace)).toEqual(expected[0]);
    controller.seekTo(1);
    expect(controller.getState().workspace.arrays.size).toBe(2);
    expect(readElement(controller.getState().workspace, ref(1, 0))).toBeNull();
  });

  test("Live-style streaming and local rewind support array lifetimes", async () => {
    const controller = new AnimationController();
    await controller.initialize(
      fixtureEngine(events, false),
      "fixture",
      [3, 2, 1]
    );
    const expected = collectStates();
    for (let i = 0; i < events.length; i++) {
      controller.stepForward();
      expect(visibleState(controller.getState().workspace)).toEqual(
        expected[i + 1]
      );
    }
    controller.stepBackward();
    controller.stepBackward();
    controller.stepBackward();
    expect(getArray(controller.getState().workspace, 2).values).toEqual([1]);
    controller.stepForward();
    expect(controller.getState().workspace.arrays.get(2).visible).toBe(false);
    controller.reset();
    expect(controller.getState().workspace.arrays.size).toBe(1);
  });

  test("frame batches use the same reducer for playback and backward playback", async () => {
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
      const controller = new AnimationController();
      let rendered;
      controller.setRenderer({
        render(state) {
          rendered = structuredClone(state);
        },
      });
      await controller.initialize(fixtureEngine(events), "fixture", [3, 2, 1]);
      controller.play();
      callback(performance.now() + 1000);
      expect(controller.getState().currentStep).toBe(events.length);
      expect(visibleState(controller.getState().workspace)).toEqual(
        collectStates().at(-1)
      );
      expect(rendered.highlights).toEqual([]);
      controller.playBackward();
      callback(performance.now() + 1000);
      expect(controller.getState().currentStep).toBe(0);
      expect(visibleState(controller.getState().workspace)).toEqual(
        collectStates()[0]
      );
    } finally {
      globalThis.requestAnimationFrame = originalRequest;
      globalThis.cancelAnimationFrame = originalCancel;
    }
  });
});
