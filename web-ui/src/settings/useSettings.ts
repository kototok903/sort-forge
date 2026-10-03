import { useState, useCallback, useEffect, useMemo } from "react";
import {
  validateSettings,
  type Settings,
  type ValidationContext,
} from "@/settings/types";

const STORAGE_KEY = "sortforge:settings";
const SAVE_DEBOUNCE_MS = 300;

/**
 * Load raw settings from localStorage.
 */
function loadFromStorage(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Invalid JSON or storage error - will use defaults
  }
  return null;
}

/**
 * Save settings to localStorage.
 */
function saveToStorage(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or disabled - silently fail
  }
}

/**
 * Hook for managing persisted application settings.
 *
 * Settings are loaded from localStorage on mount, validated against
 * available algorithms, and automatically persisted on changes.
 */
export function useSettings(ctx: ValidationContext) {
  const [rawSettings, setRawSettings] = useState<Settings>(() => {
    const raw = loadFromStorage();
    return validateSettings(raw, ctx);
  });

  // Re-validate when context changes (algorithms loaded)
  const settings = useMemo(
    () => validateSettings(rawSettings, ctx),
    [rawSettings, ctx]
  );

  const setSettings = useCallback(
    (update: Partial<Settings>) => {
      setRawSettings((prev) =>
        validateSettings({ ...validateSettings(prev, ctx), ...update }, ctx)
      );
    },
    [ctx]
  );

  // Persist sanitized settings, including limits loaded from Wasm.
  useEffect(() => {
    const timeout = setTimeout(() => saveToStorage(settings), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [settings]);

  return { settings, setSettings };
}
