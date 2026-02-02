import type {
  PlaybackState,
  PlaybackDirection,
} from "@/controller/AnimationController";
import { SPEED_MAX, SPEED_MIN, SPEED_STEP } from "@/config";
import { getPlatformSymbols } from "@/utils";

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
  const canPlayForward = currentStep < totalSteps;
  const canPlayBackward = currentStep > 0;
  const canStepForward = currentStep < totalSteps;
  const canStepBackward = currentStep > 0;

  return (
    <footer className="footer">
      {/* Playback buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onReset}
          className="btn btn-ghost btn-icon"
          title="Reset (R)"
          aria-label="Reset"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2v12l10-6z" transform="rotate(180 8 8)" />
            <rect x="2" y="3" width="2" height="10" />
          </svg>
        </button>

        <button
          onClick={onStepBackward}
          disabled={!canStepBackward}
          className="btn btn-ghost btn-icon"
          title="Step back (←)"
          aria-label="Step backward"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10 2v12L2 8z" />
            <rect x="12" y="3" width="2" height="10" />
          </svg>
        </button>

        {/* Play Backward button */}
        <button
          onClick={isPlayingBackward ? onPause : onPlayBackward}
          disabled={!canPlayBackward && !isPlayingBackward}
          className={`btn btn-icon ${isPlayingBackward ? "btn-active" : "btn-ghost"}`}
          title={`Play backward (${getPlatformSymbols().shift}+Space)`}
          aria-label={isPlayingBackward ? "Pause" : "Play backward"}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12 2v12L4 8z" />
          </svg>
        </button>

        {/* Play Forward button */}
        <button
          onClick={isPlayingForward ? onPause : onPlayForward}
          disabled={!canPlayForward && !isPlayingForward}
          className={`btn btn-icon ${isPlayingForward ? "btn-active" : "btn-ghost"}`}
          title="Play forward (Space)"
          aria-label={isPlayingForward ? "Pause" : "Play forward"}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2v12l8-6z" />
          </svg>
        </button>

        <button
          onClick={onStepForward}
          disabled={!canStepForward}
          className="btn btn-ghost btn-icon"
          title="Step forward (→)"
          aria-label="Step forward"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 2v12l8-6z" />
            <rect x="2" y="3" width="2" height="10" />
          </svg>
        </button>
      </div>

      {/* Timeline */}
      {canSeek && (
        <div className="flex-1 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={totalSteps}
            value={currentStep}
            onChange={(e) => onSeek(parseInt(e.target.value, 10))}
            className="slider slider-timeline flex-1"
            aria-label="Timeline"
          />
          <span className="mono text-sm text-secondary min-w-[12ch] text-right">
            <span className="text-primary">{currentStep}</span>
            <span className="text-muted"> / </span>
            <span>{totalSteps}</span>
          </span>
        </div>
      )}

      {/* Speed */}
      <div className="flex items-center gap-2">
        <span className="label">Speed</span>
        <input
          type="range"
          min={SPEED_MIN}
          max={SPEED_MAX}
          step={SPEED_STEP}
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="slider"
          style={{ width: "80px" }}
          aria-label="Speed"
        />
        <span className="mono text-sm text-primary min-w-[4ch] text-right">
          {speed.toFixed(1)}x
        </span>
      </div>
    </footer>
  );
}
