import type { ValueMode, ArrayOrder, EngineType } from "@/config";
import {
  getPregenArraySizeMax,
  type PregenAlgorithmMetadata,
} from "@/lib/algorithm-limits";
import {
  PREGEN_ARRAY_SIZE_MIN,
  PREGEN_ARRAY_SIZE_MAX,
  PREGEN_ARRAY_SIZE_DEFAULT,
  LIVE_ARRAY_SIZE_MIN,
  LIVE_ARRAY_SIZE_MAX,
  LIVE_ARRAY_SIZE_DEFAULT,
  ENGINE_DEFAULT,
  VALUE_MODE_DEFAULT,
  ARRAY_ORDER_DEFAULT,
  VALUE_MODE_OPTIONS,
  ARRAY_ORDER_OPTIONS,
} from "@/config";
import { DEFAULT_THEME_ID, isValidThemeId } from "@/themes/themes";
import type { ThemeId } from "@/themes/types";
import {
  SOUND_WAVEFORMS,
  type SoundWaveform,
  DEFAULT_SOUND_CONFIG,
} from "@/sound/types";

/**
 * Persisted application settings.
 * Algorithm and array size are stored per-engine so switching engines preserves choices.
 */
export interface Settings {
  engineType: EngineType;
  pregenAlgorithm: string;
  liveAlgorithm: string;
  pregenArraySize: number;
  liveArraySize: number;
  valueMode: ValueMode;
  arrayOrder: ArrayOrder;
  themeId: ThemeId;
  sidebarOpen: boolean;
  soundWaveform: SoundWaveform;
  soundVolume: number;
  soundMuted: boolean;
}

/**
 * Context for validating settings - provides available algorithms.
 */
export interface ValidationContext {
  pregenAlgorithms: string[];
  liveAlgorithms: string[];
  pregenAlgorithmMetadata?: PregenAlgorithmMetadata[];
}

/**
 * Default settings used when no valid stored settings exist.
 */
export const DEFAULT_SETTINGS: Settings = {
  engineType: ENGINE_DEFAULT,
  pregenAlgorithm: "",
  liveAlgorithm: "",
  pregenArraySize: PREGEN_ARRAY_SIZE_DEFAULT,
  liveArraySize: LIVE_ARRAY_SIZE_DEFAULT,
  valueMode: VALUE_MODE_DEFAULT,
  arrayOrder: ARRAY_ORDER_DEFAULT,
  themeId: DEFAULT_THEME_ID,
  sidebarOpen: true,
  soundWaveform: DEFAULT_SOUND_CONFIG.waveform,
  soundVolume: DEFAULT_SOUND_CONFIG.volume,
  soundMuted: false,
};

/**
 * Validates and sanitizes settings, using defaults for invalid fields.
 */
export function validateSettings(
  raw: unknown,
  ctx: ValidationContext
): Settings {
  const settings = { ...DEFAULT_SETTINGS };

  if (typeof raw !== "object" || raw === null) {
    return applyAlgorithmDefaults(settings, ctx);
  }

  const obj = raw as Record<string, unknown>;

  // Engine type
  if (obj.engineType === "pregen" || obj.engineType === "live") {
    settings.engineType = obj.engineType;
  }

  // Pregen algorithm - validate against available list (skip validation if not loaded yet)
  if (typeof obj.pregenAlgorithm === "string") {
    if (
      ctx.pregenAlgorithms.length === 0 ||
      ctx.pregenAlgorithms.includes(obj.pregenAlgorithm)
    ) {
      settings.pregenAlgorithm = obj.pregenAlgorithm;
    }
  }

  // Live algorithm - validate against available list (skip validation if not loaded yet)
  if (typeof obj.liveAlgorithm === "string") {
    if (
      ctx.liveAlgorithms.length === 0 ||
      ctx.liveAlgorithms.includes(obj.liveAlgorithm)
    ) {
      settings.liveAlgorithm = obj.liveAlgorithm;
    }
  }

  // Pregen array size - clamp to valid range
  if (typeof obj.pregenArraySize === "number" && !isNaN(obj.pregenArraySize)) {
    settings.pregenArraySize = clamp(
      Math.round(obj.pregenArraySize),
      PREGEN_ARRAY_SIZE_MIN,
      PREGEN_ARRAY_SIZE_MAX
    );
  }

  // Live array size - clamp to valid range
  if (typeof obj.liveArraySize === "number" && !isNaN(obj.liveArraySize)) {
    settings.liveArraySize = clamp(
      Math.round(obj.liveArraySize),
      LIVE_ARRAY_SIZE_MIN,
      LIVE_ARRAY_SIZE_MAX
    );
  }

  // Array generation settings. Legacy distribution settings are ignored.
  if (VALUE_MODE_OPTIONS.some(({ value }) => value === obj.valueMode)) {
    settings.valueMode = obj.valueMode as ValueMode;
  }
  if (ARRAY_ORDER_OPTIONS.some(({ value }) => value === obj.arrayOrder)) {
    settings.arrayOrder = obj.arrayOrder as ArrayOrder;
  }

  // Theme ID - validate against available themes
  if (typeof obj.themeId === "string" && isValidThemeId(obj.themeId)) {
    settings.themeId = obj.themeId;
  }

  // Sidebar open
  if (typeof obj.sidebarOpen === "boolean") {
    settings.sidebarOpen = obj.sidebarOpen;
  }

  // Sound waveform - validate against allowed values
  if (
    typeof obj.soundWaveform === "string" &&
    SOUND_WAVEFORMS.includes(obj.soundWaveform as SoundWaveform)
  ) {
    settings.soundWaveform = obj.soundWaveform as SoundWaveform;
  }

  if (typeof obj.soundMuted === "boolean") {
    settings.soundMuted = obj.soundMuted;
  }

  // Sound volume - clamp to valid range
  if (typeof obj.soundVolume === "number" && !isNaN(obj.soundVolume)) {
    settings.soundVolume = Math.max(0, Math.min(1, obj.soundVolume));
  }

  return applyAlgorithmDefaults(settings, ctx);
}

/**
 * Ensures algorithm fields have valid defaults if empty.
 */
function applyAlgorithmDefaults(
  settings: Settings,
  ctx: ValidationContext
): Settings {
  if (!settings.pregenAlgorithm && ctx.pregenAlgorithms.length > 0) {
    settings.pregenAlgorithm = ctx.pregenAlgorithms[0];
  }
  if (!settings.liveAlgorithm && ctx.liveAlgorithms.length > 0) {
    settings.liveAlgorithm = ctx.liveAlgorithms[0];
  }
  settings.pregenArraySize = clamp(
    settings.pregenArraySize,
    PREGEN_ARRAY_SIZE_MIN,
    getPregenArraySizeMax(settings.pregenAlgorithm, ctx.pregenAlgorithmMetadata)
  );
  return settings;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
