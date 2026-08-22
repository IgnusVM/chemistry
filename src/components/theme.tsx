"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "chemistry.theme";

/**
 * Runs before first paint (see ThemeScript) and again on every change, so the
 * class is set by the time anything renders and there's no flash of the wrong
 * theme. Deliberately duplicated as a string in ThemeScript rather than shared —
 * that copy has to be inlined into the document head with no bundle involved.
 */
function apply(theme: Theme) {
  const effective =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.classList.toggle("dark", effective === "dark");
}

/**
 * The theme lives in localStorage, which is an external store — so it's read via
 * useSyncExternalStore rather than mirrored into state from an effect. That's
 * both the correct React primitive here and gives cross-tab sync for free: the
 * `storage` event fires in other tabs, so changing the theme in one updates them
 * all.
 */
const THEME_EVENT = "chemistry:themechange";

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch {
    // Private mode or blocked storage — fall through to the default.
  }
  return "system";
}

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "system",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  // Follow the OS while in "system" mode. This one is a genuine subscription to
  // an outside system, which is what effects are for.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      // Private mode — the class change below still applies for this session.
    }
    apply(t);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/**
 * Inlined in <head> so the theme class lands before the browser paints.
 * Without this, a dark-mode user gets a white flash on every cold load, which is
 * genuinely unpleasant at night — the exact time this feature matters.
 */
export function ThemeScript() {
  const js = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t==="dark"||((t==="system"||!t)&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

/** Segmented light / dark / system control. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          title={label}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            theme === value
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

/** Compact icon-only cycle, for the nav bar where there's no room for three buttons. */
export function ThemeCycleButton({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const next: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={() => setTheme(next[theme])}
      aria-label={`Theme: ${theme}. Switch to ${next[theme]}.`}
      title={`Theme: ${theme}`}
      className={`rounded-md p-1.5 text-neutral-500 hover:text-neutral-900 ${className}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
