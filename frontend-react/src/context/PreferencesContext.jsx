import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { interpolate, translations } from "../i18n/translations";

const STORAGE_THEME_KEY = "neurovent-theme";
const STORAGE_LOCALE_KEY = "neurovent-locale";

const PreferencesContext = createContext(null);

const getSystemTheme = () =>
  window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";

const getStoredTheme = () => {
  if (typeof window === "undefined") return "system";
  return window.localStorage.getItem(STORAGE_THEME_KEY) || "system";
};

const getStoredLocale = () => {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_LOCALE_KEY);
  if (stored === "fr" || stored === "en") return stored;
  const browserLanguage = (window.navigator.language || "en").toLowerCase();
  return browserLanguage.startsWith("fr") ? "fr" : "en";
};

export function PreferencesProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState(
    typeof window === "undefined" ? "dark" : getSystemTheme()
  );
  const [locale, setLocaleState] = useState(getStoredLocale);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setSystemTheme(media.matches ? "light" : "dark");
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const theme = themeMode === "system" ? systemTheme : themeMode;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setThemeMode = (value) => {
    setThemeModeState(value);
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
      themeMode,
      setThemeMode,
      t,
    }),
    [locale, theme, themeMode, t]
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
