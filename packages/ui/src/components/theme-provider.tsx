"use client";

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * Local light/dark/system theming — replaces next-themes, whose ThemeProvider
 * renders an inline <script> from a client component and trips React 19.2's
 * "Encountered a script tag while rendering React component" warning on every
 * client re-render of the root layout. The pre-hydration half lives in
 * theme-script.tsx (rendered by the SERVER root layout); this half owns state.
 *
 * Same storage key next-themes used ("theme"), so stored preferences carry
 * over. The root <html> needs suppressHydrationWarning (class is stamped
 * before hydration).
 */
const STORAGE_KEY = "theme";
const QUERY = "(prefers-color-scheme: dark)";

export type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const systemTheme = (): Resolved =>
  window.matchMedia(QUERY).matches ? "dark" : "light";

const storedTheme = (): Theme => {
  if (typeof window === "undefined") return "system";
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
};

const resolve = (theme: Theme): Resolved =>
  theme === "system" ? systemTheme() : theme;

/** Stamp the resolved theme on <html> — mirrors ThemeScript's pre-hydration work. */
function apply(resolved: Resolved) {
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  el.classList.add(resolved);
  el.style.colorScheme = resolved;
}

/** Swap without animating every transition on the page (next-themes' disableTransitionOnChange). */
function withoutTransitions(fn: () => void) {
  const css = document.createElement("style");
  css.appendChild(
    document.createTextNode("*,*::before,*::after{transition:none!important}")
  );
  document.head.appendChild(css);
  fn();
  window.getComputedStyle(document.body); // flush before re-enabling
  setTimeout(() => document.head.removeChild(css), 1);
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: "system", setTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(storedTheme);
  // The subscription callbacks below need the current theme without
  // re-subscribing on every change.
  const themeRef = useRef(theme);

  const setTheme = (next: Theme) => {
    themeRef.current = next;
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // private mode — theme still applies for this page
    }
    withoutTransitions(() => apply(resolve(next)));
  };

  // Follow the OS theme (while on "system") and other tabs — external
  // subscriptions, the legitimate use of an effect. The mount-time apply()
  // restores the ThemeScript stamp that React wipes when it reconciles the
  // class-less <html> element during hydration.
  useEffect(() => {
    apply(resolve(themeRef.current));
    const mq = window.matchMedia(QUERY);
    const onSystemChange = () => {
      if (themeRef.current === "system") apply(systemTheme());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = storedTheme();
      themeRef.current = next;
      setThemeState(next);
      apply(resolve(next));
    };
    mq.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      mq.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
