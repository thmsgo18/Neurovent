import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { interpolate, translations } from "../i18n/translations";

const STORAGE_THEME_KEY = "neurovent-theme";
const STORAGE_LOCALE_KEY = "neurovent-locale";

const PreferencesContext = createContext(null);

const getSystemTheme = () => {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)");

  if (prefersDark.matches) return "dark";
  if (prefersLight.matches) return "light";
  return "light";
};

const getStoredThemePreference = () => {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return null;
};

const getStoredLocale = () => {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_LOCALE_KEY);
  if (stored === "fr" || stored === "en") return stored;
  const browserLanguage = (window.navigator.language || "en").toLowerCase();
  return browserLanguage.startsWith("fr") ? "fr" : "en";
};

export function PreferencesProvider({ children }) {
  const [themePreference, setThemePreference] = useState(getStoredThemePreference);
  const [systemTheme, setSystemTheme] = useState(
    typeof window === "undefined" ? "dark" : getSystemTheme()
  );
  const [locale, setLocaleState] = useState(getStoredLocale);
  const hasMountedThemeRef = useRef(false);
  const themeSwitchTimeoutRef = useRef(null);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const nextTheme = media.matches ? "dark" : "light";
      setSystemTheme(nextTheme);
      setThemePreference(null);
      window.localStorage.removeItem(STORAGE_THEME_KEY);
    };
    onChange();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    if (typeof media.addListener === "function") {
      media.addListener(onChange);
      return () => media.removeListener(onChange);
    }

    return undefined;
  }, []);

  const theme = themePreference || systemTheme;

  useEffect(() => {
    const root = document.documentElement;

    if (!hasMountedThemeRef.current) {
      root.dataset.theme = theme;
      hasMountedThemeRef.current = true;
      return undefined;
    }

    root.dataset.themeSwitching = "true";

    const frame = window.requestAnimationFrame(() => {
      root.dataset.theme = theme;
    });

    if (themeSwitchTimeoutRef.current) {
      window.clearTimeout(themeSwitchTimeoutRef.current);
    }

    themeSwitchTimeoutRef.current = window.setTimeout(() => {
      delete root.dataset.themeSwitching;
      themeSwitchTimeoutRef.current = null;
    }, 560);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [theme]);

  useEffect(() => () => {
    if (themeSwitchTimeoutRef.current) {
      window.clearTimeout(themeSwitchTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setThemeMode = (value) => {
    if (value !== "light" && value !== "dark") return;
    setThemePreference(value);
    window.localStorage.setItem(STORAGE_THEME_KEY, value);
  };

  const setLocale = (value) => {
    setLocaleState(value);
    window.localStorage.setItem(STORAGE_LOCALE_KEY, value);
  };

  const t = useCallback((key, params) => {
    const table = translations[locale] || {};
    const translated = table[key] || key;
    return interpolate(translated, params);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      theme,
      themeMode: theme,
      themePreference,
      setThemeMode,
      t,
    }),
    [locale, theme, themePreference, t]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return value;
}
