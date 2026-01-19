import type { PlaybackState } from '@/controller/AnimationController';
import { SPEED_MAX, SPEED_MIN, SPEED_STEP } from '@/config';

interface ControlsProps {
  playbackState: PlaybackState;
  currentStep: number;
  totalSteps: number;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSeek: (step: number) => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

/**
 * Playback controls component.
 */
export function Controls({
  playbackState,
  currentStep,
  totalSteps,
  speed,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onSeek,
  onSpeedChange,
  onReset,
}: ControlsProps) {
  const isPlaying = playbackState === 'playing';
  const canStepForward = currentStep < totalSteps;
  const canStepBackward = currentStep > 0;

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-800 rounded-lg">
      {/* Timeline scrubber */}
      <div className="flex items-center gap-4">
        <span className="flex items-center justify-between text-sm text-gray-400 w-26">
          <span className="flex-1 font-semibold">{currentStep}</span>
          <span>/</span>
          <span className="flex-1 text-right">{totalSteps}</span>
        </span>
        <input
          type="range"
          min={0}
          max={totalSteps}
          value={currentStep}
          onChange={(e) => onSeek(parseInt(e.target.value, 10))}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      {/* Playback buttons */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onReset}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
          title="Reset"
        >
          Reset
        </button>

        <button
          onClick={onStepBackward}
          disabled={!canStepBackward}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
          title="Step backward"
        >
          Step -
        </button>

        <button
          onClick={isPlaying ? onPause : onPlay}
          className="px-6 py-2 w-24 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <button
          onClick={onStepForward}
          disabled={!canStepForward}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
          title="Step forward"
        >
          Step +
        </button>
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-4">
        <span className="flex items-center justify-between text-sm text-gray-400 w-26">
          <span>Speed:</span>
          <span className="font-semibold">{speed.toFixed(1)}x</span>
        </span>
        <input
          type="range"
          min={SPEED_MIN}
          max={SPEED_MAX}
          step={SPEED_STEP}
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>
    </div>
  );
}
