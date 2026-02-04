import type { SortEvent } from "@/types/events";
import type { SoundConfig, EnvelopeParams } from "@/sound/types";
import { DEFAULT_SOUND_CONFIG } from "@/sound/types";

// Frequency range for value-to-pitch mapping
const FREQ_MIN = 200;
const FREQ_MAX = 1200;

// Event-specific envelope configurations
// TODO: Play around with these
const EVENT_ENVELOPES: Record<string, EnvelopeParams> = {
  Compare: { attack: 0.005, decay: 0.05, sustain: 0, release: 0.01 },
  Swap: { attack: 0.01, decay: 0.08, sustain: 0, release: 0.02 },
  Overwrite: { attack: 0.02, decay: 0.06, sustain: 0, release: 0.02 },
};

/**
 * Audio engine for sorting visualization sounds.
 * Uses Web Audio API to generate tones based on array values.
 */
export class SoundEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private config: SoundConfig = { ...DEFAULT_SOUND_CONFIG };
  private minValue = 0;
  private maxValue = 100;

  /**
   * Initialize the audio context. Must be called after user interaction.
   */
  init(): void {
    if (this.audioCtx) return;

    this.audioCtx = new AudioContext();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = this.config.volume;
    this.masterGain.connect(this.audioCtx.destination);
  }

  /**
   * Resume audio context if suspended (required after user gesture).
   */
  resume(): void {
    if (this.audioCtx?.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  /**
   * Set the value range for frequency mapping.
   */
  setValueRange(min: number, max: number): void {
    this.minValue = min;
    this.maxValue = max;
  }

  /**
   * Update sound configuration.
   */
  setConfig(config: Partial<SoundConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.masterGain) {
      this.masterGain.gain.value = this.config.volume;
    }
  }

  /**
   * Get current configuration.
   */
  getConfig(): SoundConfig {
    return { ...this.config };
  }

  /**
   * Play sound for a sort event.
   */
  playEvent(event: SortEvent, array: number[]): void {
    if (this.config.waveform === "none" || !this.audioCtx || !this.masterGain)
      return;

    const envelope = EVENT_ENVELOPES[event.type];
    if (!envelope) return;

    // Usually element at index j is the one that's changing
    switch (event.type) {
      case "Compare":
        this.playTone(array[event.j], envelope);
        break;
      case "Swap":
        this.playTone(array[event.j], envelope);
        break;
      case "Overwrite":
        this.playTone(event.new_val, envelope);
        break;
    }
  }

  /**
   * Play a single tone for a value.
   */
  private playTone(value: number, envelope: EnvelopeParams): void {
    if (!this.audioCtx || !this.masterGain || this.config.waveform === "none")
      return;

    const frequency = this.valueToFrequency(value);
    const now = this.audioCtx.currentTime;

    // Create oscillator
    const osc = this.audioCtx.createOscillator();
    osc.type = this.config.waveform;
    osc.frequency.value = frequency;

    // Create gain for envelope
    const gain = this.audioCtx.createGain();
    this.applyEnvelope(gain, envelope, now);

    // Connect and play
    osc.connect(gain);
    gain.connect(this.masterGain);

    const duration = envelope.attack + envelope.decay + envelope.release + 0.01;
    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Apply ADSR envelope to a gain node.
   */
  private applyEnvelope(
    gain: GainNode,
    env: EnvelopeParams,
    startTime: number
  ): void {
    const { attack, decay, sustain, release } = env;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(1, startTime + attack);
    gain.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
    gain.gain.linearRampToValueAtTime(0, startTime + attack + decay + release);
  }

  /**
   * Map a value to a frequency in the configured range.
   */
  private valueToFrequency(value: number): number {
    const normalized =
      (value - this.minValue) / (this.maxValue - this.minValue || 1);
    return FREQ_MIN + normalized * (FREQ_MAX - FREQ_MIN);
  }
}
