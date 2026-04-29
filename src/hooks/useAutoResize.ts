import { useCallback } from "react";

/**
 * Returns an `onInput` handler that auto-resizes a textarea
 * to fit its content, capped at `maxHeight` pixels.
 */
export function useAutoResize(maxHeight = 120) {
  return useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      const target = e.currentTarget;
      target.style.height = "auto";
      target.style.height = `${Math.min(target.scrollHeight, maxHeight)}px`;
    },
    [maxHeight]
  );
}
