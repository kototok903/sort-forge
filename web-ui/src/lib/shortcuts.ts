import { hasOpenOverlay } from "@/hooks/use-pointer-focus";

const SLIDER_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

/** Let focused widgets use their native keys before handling app commands. */
export function shouldHandlePlaybackShortcut(event: KeyboardEvent): boolean {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    hasOpenOverlay()
  )
    return false;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (
    target.closest(
      'textarea, input:not([type="range"]), [contenteditable=""], [contenteditable="true"], select, [role="combobox"], [role="listbox"], [role="menu"], [role="radiogroup"], [data-slot="toggle-group"]'
    )
  )
    return false;
  if (
    target.closest(
      '[role="slider"], input[type="range"], [data-slot="slider"]'
    ) &&
    SLIDER_KEYS.has(event.code)
  )
    return false;
  if (
    (event.code === "Space" || event.code === "Enter") &&
    target.closest(
      'button, a[href], [role="button"], [role="checkbox"], [role="switch"]'
    )
  )
    return false;
  // Holding Space should not repeatedly toggle play/pause or generate arrays.
  if (event.repeat && ["Space", "KeyG", "KeyR"].includes(event.code))
    return false;
  return true;
}
