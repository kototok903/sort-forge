import { useState, useCallback, useEffect, useRef } from "react";
import {
  validateSettings,
  type Settings,
  type ValidationContext,
} from "./types";

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
  const [settings, setSettingsState] = useState<Settings>(() => {
    const raw = loadFromStorage();
    return validateSettings(raw, ctx);
  });

  // Re-validate when context changes (algorithms loaded)
  const prevCtxRef = useRef(ctx);
  useEffect(() => {
    const prevCtx = prevCtxRef.current;
    const algorithmsChanged =
      prevCtx.pregenAlgorithms !== ctx.pregenAlgorithms ||
      prevCtx.liveAlgorithms !== ctx.liveAlgorithms;

    if (algorithmsChanged) {
      prevCtxRef.current = ctx;
      setSettingsState((prev) => validateSettings(prev, ctx));
    }
  }, [ctx]);

  // Debounced save to localStorage
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSettings = useCallback((update: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...update };

      // Debounce save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveToStorage(next);
      }, SAVE_DEBOUNCE_MS);

      return next;
    });
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return { settings, setSettings };
}
