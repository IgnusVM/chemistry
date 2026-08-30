"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "chemistry.theme";

/**
 * Runs before first paint (see ThemeScript) and again on every change, so the
 * class is set by the time anything renders and there's no flash of the wrong
 * theme. Deliberately duplicated as a string in ThemeScript rather than shared —
 * that copy has to be inlined into the document head with no bundle involved.
 */
function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
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
    if (t === "light" || t === "dark") return t;
  } catch {
    // Private mode or blocked storage — fall through to the default.
  }
  // Light is the default and there is no "follow the system" option. Following
  // the OS meant someone whose phone sits in night mode met an app in a theme
  // they never chose, on a first visit, with no obvious way to explain it.
  // Two states, both chosen on purpose.
  return "light";
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
  theme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);

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
  const js = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

/** Segmented light / dark control. */
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

/** Compact icon-only toggle, for the nav bar where there's no room for two buttons. */
export function ThemeCycleButton({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const next: Theme = theme === "light" ? "dark" : "light";
  const Icon = theme === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${theme}. Switch to ${next}.`}
      title={`Theme: ${theme}`}
      className={`rounded-md p-1.5 text-neutral-500 hover:text-neutral-900 ${className}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
