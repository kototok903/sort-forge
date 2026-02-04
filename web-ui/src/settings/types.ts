import type { Distribution, EngineType } from "@/config";
import {
  PREGEN_ARRAY_SIZE_MIN,
  PREGEN_ARRAY_SIZE_MAX,
  PREGEN_ARRAY_SIZE_DEFAULT,
  LIVE_ARRAY_SIZE_MIN,
  LIVE_ARRAY_SIZE_MAX,
  LIVE_ARRAY_SIZE_DEFAULT,
  ENGINE_DEFAULT,
  DISTRIBUTION_DEFAULT,
} from "@/config";
import { DEFAULT_THEME_ID, isValidThemeId } from "@/themes/themes";
import type { ThemeId } from "@/themes/types";

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
  distribution: Distribution;
  themeId: ThemeId;
  sidebarOpen: boolean;
}

/**
 * Context for validating settings - provides available algorithms.
 */
export interface ValidationContext {
  pregenAlgorithms: string[];
  liveAlgorithms: string[];
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
  distribution: DISTRIBUTION_DEFAULT,
  themeId: DEFAULT_THEME_ID,
  sidebarOpen: true,
};

/**
 * Validates and sanitizes settings, using defaults for invalid fields.
 */
export function validateSettings(
  raw: unknown,
  ctx: ValidationContext
): Settings {
  console.log("validateSettings", raw, ctx);
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

  // Distribution
  if (obj.distribution === "random" || obj.distribution === "uniform") {
    settings.distribution = obj.distribution;
  }

  // Theme ID - validate against available themes
  if (typeof obj.themeId === "string" && isValidThemeId(obj.themeId)) {
    settings.themeId = obj.themeId;
  }

  // Sidebar open
  if (typeof obj.sidebarOpen === "boolean") {
    settings.sidebarOpen = obj.sidebarOpen;
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
  return settings;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
