import {
  BASE_EVENTS_PER_SECOND,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_SLIDER_STEPS,
} from "@/config";

/** Map the playback multiplier onto an evenly spaced logarithmic slider. */
export function speedToSliderPosition(speed: number): number {
  const clamped = Math.max(SPEED_MIN, Math.min(SPEED_MAX, speed));
  return (
    (Math.log(clamped / SPEED_MIN) / Math.log(SPEED_MAX / SPEED_MIN)) *
    SPEED_SLIDER_STEPS
  );
}

export function sliderPositionToSpeed(position: number): number {
  const clamped = Math.max(0, Math.min(SPEED_SLIDER_STEPS, position));
  return SPEED_MIN * (SPEED_MAX / SPEED_MIN) ** (clamped / SPEED_SLIDER_STEPS);
}

export function adjustSpeed(speed: number, direction: 1 | -1): number {
  return sliderPositionToSpeed(
    Math.round(speedToSliderPosition(speed)) + direction
  );
}

export function speedToEventsPerSecond(speed: number): number {
  return Math.round(BASE_EVENTS_PER_SECOND * speed);
}
