import type {
  PlaybackState,
  PlaybackDirection,
} from "@/controller/AnimationController";
import { SPEED_MAX, SPEED_MIN, SPEED_STEP } from "@/config";
import { getPlatformSymbols } from "@/utils";
import {
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  StepBackIcon,
  StepForwardIcon,
} from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { Field, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";

interface ControlsProps {
  playbackState: PlaybackState;
  direction: PlaybackDirection;
  currentStep: number;
  totalSteps: number;
  speed: number;
  canSeek: boolean;
  onPlayForward: () => void;
  onPlayBackward: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSeek: (step: number) => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

/**
 * Footer playback controls.
 */
export function Controls({
  playbackState,
  direction,
  currentStep,
  totalSteps,
  speed,
  canSeek,
  onPlayForward,
  onPlayBackward,
  onPause,
  onStepForward,
  onStepBackward,
  onSeek,
  onSpeedChange,
  onReset,
}: ControlsProps) {
  const isPlaying = playbackState === "playing";
  const isPlayingForward = isPlaying && direction === "forward";
  const isPlayingBackward = isPlaying && direction === "backward";
  const canPlayForward = canSeek
    ? currentStep < totalSteps
    : playbackState !== "done";
  const canPlayBackward = currentStep > 0;
  const canStepForward = canSeek
    ? currentStep < totalSteps
    : playbackState !== "done";
  const canStepBackward = currentStep > 0;

  return (
    <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 border-t bg-card px-3 py-2 sm:min-h-12">
      <div
        role="group"
        aria-label="Playback controls"
        className="flex items-center gap-1"
      >
        <ActionButton
          label="Reset"
          shortcut="R"
          variant="ghost"
          size="icon-sm"
          motion="instant"
          onClick={onReset}
        >
          <RotateCcwIcon data-icon="inline-start" />
        </ActionButton>
        <ActionButton
          label="Step backward"
          shortcut="←"
          variant="ghost"
          size="icon-sm"
          motion="instant"
          disabled={!canStepBackward}
          onClick={onStepBackward}
        >
          <StepBackIcon data-icon="inline-start" />
        </ActionButton>
        <ActionButton
          label={isPlayingBackward ? "Pause" : "Play backward"}
          shortcut={`${getPlatformSymbols().shift}+Space`}
          variant={isPlayingBackward ? "default" : "ghost"}
          size="icon-sm"
          motion="instant"
          disabled={!canPlayBackward && !isPlayingBackward}
          onClick={isPlayingBackward ? onPause : onPlayBackward}
        >
          {isPlayingBackward ? (
            <PauseIcon data-icon="inline-start" />
          ) : (
            <PlayIcon data-icon="inline-start" className="rotate-180" />
          )}
        </ActionButton>
        <ActionButton
          label={isPlayingForward ? "Pause" : "Play forward"}
          shortcut="Space"
          variant={isPlayingForward ? "default" : "ghost"}
          size="icon-sm"
          motion="instant"
          disabled={!canPlayForward && !isPlayingForward}
          onClick={isPlayingForward ? onPause : onPlayForward}
        >
          {isPlayingForward ? (
            <PauseIcon data-icon="inline-start" />
          ) : (
            <PlayIcon data-icon="inline-start" />
          )}
        </ActionButton>
        <ActionButton
          label="Step forward"
          shortcut="→"
          variant="ghost"
          size="icon-sm"
          motion="instant"
          disabled={!canStepForward}
          onClick={onStepForward}
        >
          <StepForwardIcon data-icon="inline-start" />
        </ActionButton>
      </div>

      {canSeek && (
        <div className="order-last flex w-full min-w-0 items-center gap-3 sm:order-0 sm:w-auto sm:flex-1">
          <Slider
            value={currentStep}
            min={0}
            max={Math.max(1, totalSteps)}
            step={1}
            disabled={totalSteps === 0}
            onValueChange={(value) => onSeek(value as number)}
            aria-label="Timeline"
            getAriaValueText={(_, value) => `Step ${value} of ${totalSteps}`}
            className="min-w-16 flex-1"
          />
          <output
            className="min-w-[12ch] text-right font-mono text-sm text-muted-foreground"
            aria-label="Playback step"
          >
            <span className="text-foreground">{currentStep}</span> /{" "}
            {totalSteps}
          </output>
        </div>
      )}

      <Field orientation="horizontal" className="ml-auto w-auto gap-2">
        <FieldLabel id="speed-label">Speed</FieldLabel>
        <div className="w-20 shrink-0 sm:w-30">
          <Slider
            value={speed}
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={SPEED_STEP}
            onValueChange={(value) => onSpeedChange(value as number)}
            aria-labelledby="speed-label"
            getAriaValueText={(_, value) => `${value.toFixed(1)} times speed`}
          />
        </div>
        <output
          className="min-w-[5ch] text-right font-mono text-sm"
          aria-label="Playback speed"
        >
          {speed.toFixed(1)}x
        </output>
      </Field>
    </footer>
  );
}
