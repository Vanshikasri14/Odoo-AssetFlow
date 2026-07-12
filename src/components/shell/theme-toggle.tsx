"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Light/dark toggle.
 *
 * The source of truth is the `dark` class on <html> — not React state. That
 * class is set by a blocking script in <head> BEFORE the first paint (see
 * layout.tsx), because a theme applied by React arrives too late: the page is
 * already on screen, and a dark-mode user gets a white flash on every load.
 *
 * So React doesn't own this value; it observes it. `useSyncExternalStore` is
 * exactly the tool for that, and it handles the hydration problem for free —
 * the server has no idea what theme was chosen (it lives in localStorage), so it
 * renders the `getServerSnapshot` value, then React re-renders with the real one
 * after hydration, without a mismatch warning.
 *
 * The alternative (useState + useEffect) is what most people write, and the
 * React Compiler rejects it: setting state inside an effect triggers a cascading
 * render.
 */
const EVENT = "assetflow:themechange";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

/** The server can't know. Assume light; React corrects it after hydration. */
function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    // Remember the choice — once someone picks, we stop following the OS.
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private browsing with storage disabled: the toggle still works for this
      // session, it just won't be remembered. Not worth failing over.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
