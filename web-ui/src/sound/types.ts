/**
 * Available sound waveform options.
 * 'none' disables sound.
 */
export const SOUND_WAVEFORMS = ["none", "sine", "triangle", "square"] as const;

export type SoundWaveform = (typeof SOUND_WAVEFORMS)[number];

export const SOUND_WAVEFORM_LABELS: Record<SoundWaveform, string> = {
  none: "None",
  sine: "Sine",
  triangle: "Triangle",
  square: "Square",
};

/**
 * Sound configuration for the SoundEngine.
 */
export interface SoundConfig {
  /** Master volume (0.0 - 1.0) */
  volume: number;
  /** Waveform type ('none' to disable) */
  waveform: SoundWaveform;
}

/**
 * ADSR envelope parameters (all times in seconds).
 */
export interface EnvelopeParams {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export const DEFAULT_SOUND_CONFIG: SoundConfig = {
  volume: 0.2,
  waveform: "triangle",
};
