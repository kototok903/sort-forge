import { describe, expect, test } from "bun:test";
import { AnimationController } from "@/controller/AnimationController";
import {
  adjustSpeed,
  sliderPositionToSpeed,
  speedToEventsPerSecond,
  speedToSliderPosition,
} from "@/lib/playback-speed";

describe("logarithmic playback speed", () => {
  test("each third of the slider covers one decade of event rates", () => {
    for (const [position, rate] of [
      [0, 6],
      [20, 60],
      [40, 600],
      [60, 6000],
    ]) {
      const speed = sliderPositionToSpeed(position);
      expect(speedToEventsPerSecond(speed)).toBe(rate);
      expect(speedToSliderPosition(speed)).toBeCloseTo(position);
    }
  });

  test("shortcuts traverse the slider scale and stop at the endpoints", () => {
    let speed = 0.1;
    for (let i = 0; i < 60; i++) speed = adjustSpeed(speed, 1);
    expect(speed).toBe(100);
    expect(adjustSpeed(speed, 1)).toBe(100);
    for (let i = 0; i < 60; i++) speed = adjustSpeed(speed, -1);
    expect(speed).toBe(0.1);
    expect(adjustSpeed(speed, -1)).toBe(0.1);
    expect(adjustSpeed(adjustSpeed(1, 1), -1)).toBeCloseTo(1);
  });

  test("controller accepts the expanded range and clamps outside it", () => {
    const controller = new AnimationController();
    controller.setSpeed(100);
    expect(speedToEventsPerSecond(controller.getState().speed)).toBe(6000);
    controller.setSpeed(200);
    expect(controller.getState().speed).toBe(100);
    controller.setSpeed(0);
    expect(controller.getState().speed).toBe(0.1);
  });
});
