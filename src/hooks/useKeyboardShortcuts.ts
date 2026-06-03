"use client";

import { useEffect } from "react";

interface Options {
  enabled?: boolean;
  handlers: Record<string, (e: KeyboardEvent) => void>;
}

/**
 * Map of chord -> handler. Chord format:
 *   "j"          — single key
 *   "cmd+k"      — modifier + key
 *   "g i"        — sequence (within 800ms)
 */
export function useKeyboardShortcuts({ enabled = true, handlers }: Options) {
  useEffect(() => {
    if (!enabled) return;
    let lastKey = "";
    let lastTime = 0;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === "input" ||
        tag === "textarea" ||
        target?.isContentEditable;
      if (isEditable) return;

      const mod = e.metaKey || e.ctrlKey;
      const chord = mod ? `cmd+${e.key.toLowerCase()}` : e.key.toLowerCase();

      // Sequences: g x
      if (lastKey === "g" && Date.now() - lastTime < 800 && /^[a-z]$/.test(chord) && !mod) {
        const fn = handlers[`g ${chord}`];
        if (fn) {
          e.preventDefault();
          fn(e);
          lastKey = "";
          return;
        }
      }

      const fn = handlers[chord];
      if (fn) {
        e.preventDefault();
        fn(e);
      }

      lastKey = chord;
      lastTime = Date.now();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, handlers]);
}
