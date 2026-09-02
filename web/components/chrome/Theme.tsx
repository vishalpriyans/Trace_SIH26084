"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Sun, Moon } from "@phosphor-icons/react/ssr";

const KEY = "trace-theme";
type Theme = "dark" | "light";

/**
 * The ground is genuinely external state: it lives on the document element and
 * in localStorage, not in React. Modelling it as component state and syncing
 * it in an effect is what produces the cascading render the compiler warns
 * about, so it is read through an external store subscription instead and
 * written by a plain module level function.
 */
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** The server always renders the dark ground, which is the default on every
 *  surface, so the markup is stable and hydration has nothing to reconcile. */
function getServerSnapshot(): Theme {
  return "dark";
}

function apply(next: Theme, persist: boolean) {
  document.documentElement.dataset.theme = next;
  if (persist) {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* Private browsing and blocked storage both land here. The choice still
         applies for this page; it just will not survive a reload. */
    }
  }
  listeners.forEach((l) => l());
}

function stored(): Theme | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Two grounds, one system, and the default comes from the physical scene
 * rather than from taste.
 *
 * Dark is the default everywhere, the field surface included, so the product
 * reads as one product. The light ground is the sun switch: a phone at a work
 * front in direct sunlight is legible at maximum luminance, and a dark screen
 * there is not. A stored choice beats the default.
 */
export function ThemeSwitch({
  preferred = "dark",
  size = "sm",
}: {
  preferred?: Theme;
  /** The field surface takes "lg". This is the control that makes the screen
   *  readable outdoors, so at 28px it was the one target a gloved thumb most
   *  needed to hit and least could. */
  size?: "sm" | "lg";
}) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const s = stored() ?? preferred;
    if (s !== document.documentElement.dataset.theme) apply(s, false);
  }, [preferred]);

  return (
    <div
      role="group"
      aria-label="Screen ground"
      className={`flex shrink-0 items-center rounded-[var(--radius-pill)] border border-line bg-sunken ${
        size === "lg" ? "gap-1 p-1" : "gap-0.5 p-0.5"
      }`}
    >
      {(
        [
          { key: "light" as const, Icon: Sun, label: "Sunlight, the light ground" },
          { key: "dark" as const, Icon: Moon, label: "Low light, the dark ground" },
        ]
      ).map(({ key, Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => apply(key, true)}
          aria-pressed={theme === key}
          title={label}
          className={`flex items-center justify-center rounded-[var(--radius-pill)] transition-colors duration-150 ${
            size === "lg" ? "size-14" : "size-7"
          } ${theme === key ? "bg-accent text-accent-ink" : "text-ink-mid hover:text-ink"}`}
        >
          <Icon
            size={size === "lg" ? 26 : 15}
            weight={theme === key ? "fill" : "regular"}
            aria-hidden
          />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
