import { useEffect } from "react";

/** Open popups own focus and suspend shortcuts behind them. */
export function hasOpenOverlay(): boolean {
  return !!document.querySelector(
    '[role="dialog"][data-open], [role="alertdialog"][data-open], [role="listbox"][data-open], [data-slot="select-content"][data-open]'
  );
}

export function focusPlayback(): void {
  document
    .querySelector<HTMLElement>("[data-playback-surface]")
    ?.focus({ preventScroll: true });
}

/** Base UI calls this after its popup closes, using the closing interaction. */
export function playbackFinalFocus(interaction: string) {
  if (interaction === "keyboard" || hasOpenOverlay()) return true;
  return document.querySelector<HTMLElement>("[data-playback-surface]") ?? true;
}

/** Mouse actions yield focus after completion, never during a drag or popup. */
export function usePointerFocus() {
  useEffect(() => {
    let frame = 0;
    let pointerActive = false;
    const cancel = () => cancelAnimationFrame(frame);
    const finish = () => {
      pointerActive = false;
      cancel();
      frame = requestAnimationFrame(() => {
        const active = document.activeElement;
        if (hasOpenOverlay() || !(active instanceof HTMLElement)) return;
        // Editable fields must keep focus so pointer users can type.
        if (
          active.matches('input:not([type="range"]), textarea') ||
          active.isContentEditable
        )
          return;
        focusPlayback();
      });
    };
    const start = () => {
      pointerActive = true;
      cancel();
    };
    const click = (event: MouseEvent) => {
      if (event.detail > 0) finish();
    };
    const end = () => {
      if (pointerActive) finish();
    };
    document.addEventListener("pointerdown", start, true);
    document.addEventListener("pointerup", end, true);
    document.addEventListener("pointercancel", end, true);
    document.addEventListener("click", click, true);
    // A keyboard action arriving before the next frame owns focus instead.
    document.addEventListener("keydown", cancel, true);
    return () => {
      cancel();
      document.removeEventListener("pointerdown", start, true);
      document.removeEventListener("pointerup", end, true);
      document.removeEventListener("pointercancel", end, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", cancel, true);
    };
  }, []);
}
