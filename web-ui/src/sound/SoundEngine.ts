import { readElement } from "@/workspace/reducer";
import type { EventDirection, WorkspaceState } from "@/workspace/types";
import type { PlaybackEvent } from "@/types/playback";
import type { SoundConfig, EnvelopeParams } from "@/sound/types";
import { AUDIO_DELAY_SECONDS, DEFAULT_SOUND_CONFIG } from "@/sound/types";

const CANCEL_FADE_SECONDS = 0.005;

interface ActiveTone {
  oscillator: OscillatorNode;
  gain: GainNode;
  startTime: number;
}

// Frequency range for value-to-pitch mapping
const FREQ_MIN = 200;
const FREQ_MAX = 1200;

// Event-specific envelope configurations
// TODO: Play around with these
const EVENT_ENVELOPES: Record<string, EnvelopeParams> = {
  Compare: { attack: 0.005, decay: 0.05, sustain: 0, release: 0.01 },
  Swap: { attack: 0.01, decay: 0.08, sustain: 0, release: 0.02 },
  Overwrite: { attack: 0.02, decay: 0.06, sustain: 0, release: 0.02 },
  Copy: { attack: 0.02, decay: 0.06, sustain: 0, release: 0.02 },
  CompleteElement: { attack: 0.005, decay: 0.05, sustain: 0, release: 0.01 },
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
  private playbackClock: { timeMs: number; audioTime: number } | null = null;
  private tones = new Set<ActiveTone>();

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
      this.cancelPlayback();
      // Audio time was frozen while suspended; re-anchor on the next event.
      void this.audioCtx.resume().then(() => {
        this.playbackClock = null;
      });
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
    if (
      config.waveform !== undefined &&
      config.waveform !== this.config.waveform
    ) {
      this.cancelPlayback();
    }
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

  /** Map animation timestamps (milliseconds) onto the audio clock (seconds). */
  beginPlayback(timeMs: number): void {
    this.cancelPlayback();
    this.playbackClock =
      this.audioCtx?.state === "running"
        ? { timeMs, audioTime: this.audioCtx.currentTime }
        : null;
  }

  /** Cancel queued notes and fade already audible notes out briefly. */
  cancelPlayback(): void {
    if (this.audioCtx) {
      const now = this.audioCtx.currentTime;
      for (const tone of this.tones) {
        if (tone.startTime >= now) {
          tone.oscillator.stop(now);
        } else {
          tone.gain.gain.cancelAndHoldAtTime(now);
          tone.gain.gain.linearRampToValueAtTime(0, now + CANCEL_FADE_SECONDS);
          tone.oscillator.stop(now + CANCEL_FADE_SECONDS);
        }
      }
    }
    this.tones.clear();
    this.playbackClock = null;
  }

  /** Capture the value now, then play it at its event deadline plus the delay. */
  scheduleEvent(
    event: PlaybackEvent,
    workspace: WorkspaceState,
    direction: EventDirection,
    eventTimeMs: number
  ): void {
    if (
      !this.audioCtx ||
      this.audioCtx.state !== "running" ||
      this.config.waveform === "none"
    )
      return;
    this.playbackClock ??= {
      timeMs: performance.now(),
      audioTime: this.audioCtx.currentTime,
    };
    const startTime =
      this.playbackClock.audioTime +
      (eventTimeMs - this.playbackClock.timeMs) / 1000 +
      AUDIO_DELAY_SECONDS;
    // A stalled frame must not turn overdue notes into a simultaneous burst.
    if (startTime < this.audioCtx.currentTime) return;
    this.playEvent(event, workspace, direction, startTime);
  }

  /**
   * Play sound before applying an event in either direction.
   */
  playEvent(
    event: PlaybackEvent,
    workspace: WorkspaceState,
    direction: EventDirection = "forward",
    startTime?: number
  ): void {
    if (this.config.waveform === "none" || !this.audioCtx || !this.masterGain)
      return;

    const envelope = EVENT_ENVELOPES[event.type];
    if (!envelope) return;

    const value = this.getEventValue(event, workspace, direction);
    if (value !== null) this.playTone(value, envelope, startTime);
  }

  /** Resolve comparisons/swaps before mutation; assignments use captured values. */
  private getEventValue(
    event: PlaybackEvent,
    workspace: WorkspaceState,
    direction: EventDirection
  ): number | null {
    switch (event.type) {
      case "CompleteElement":
        return readElement(workspace, {
          arrId: workspace.mainArrayId,
          idx: event.idx,
        });
      case "Compare":
      case "Swap":
        return readElement(workspace, event.j);
      case "Overwrite":
      case "Copy":
        return direction === "forward" ? event.new_val : event.old_val;
      default:
        return null;
    }
  }

  /**
   * Play a single tone for a value.
   */
  private playTone(
    value: number,
    envelope: EnvelopeParams,
    startTime?: number
  ): void {
    if (!this.audioCtx || !this.masterGain || this.config.waveform === "none")
      return;

    if (!Number.isFinite(value)) return;

    const frequency = this.valueToFrequency(value);
    const when = startTime ?? this.audioCtx.currentTime;

    // Create oscillator
    const osc = this.audioCtx.createOscillator();
    osc.type = this.config.waveform;
    osc.frequency.value = frequency;

    // Create gain for envelope
    const gain = this.audioCtx.createGain();
    this.applyEnvelope(gain, envelope, when);

    // Connect and play
    osc.connect(gain);
    gain.connect(this.masterGain);

    const duration = envelope.attack + envelope.decay + envelope.release + 0.01;
    const tone = { oscillator: osc, gain, startTime: when };
    this.tones.add(tone);
    osc.onended = () => {
      this.tones.delete(tone);
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(when);
    osc.stop(when + duration);
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
