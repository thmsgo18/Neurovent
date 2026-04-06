import { Link } from "react-router-dom";
import { Monitor, Moon, Sun } from "lucide-react";
import AppTopLinks from "./AppTopLinks";
import NavUserMenu from "./NavUserMenu";
import { isAuthed } from "../store/authStore";
import { usePreferences } from "../context/PreferencesContext";
import "../styles/AppHeader.css";

export default function AppHeader() {
  const authed = isAuthed();
  const { locale, setLocale, themeMode, setThemeMode, t } = usePreferences();

  const themeOptions = [
    { value: "system", label: t("System"), icon: Monitor },
    { value: "light", label: t("Light"), icon: Sun },
    { value: "dark", label: t("Dark"), icon: Moon },
  ];

  const localeOptions = [
    { value: "en", label: "EN", fullLabel: t("English") },
    { value: "fr", label: "FR", fullLabel: t("French") },
  ];

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link to="/" className="app-header__brand">
          Neuro<span style={{ color: "var(--accent)" }}>vent</span>
        </Link>

        <div className="app-header__nav">
          <AppTopLinks />
        </div>

        <div className="app-header__right">
          <div className="app-header__preferences">
            <div className="app-header__control app-header__control--language" aria-label={t("Language")}>
              <div className="app-header__segmented" role="group" aria-label={t("Language")}>
                {localeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`app-header__segmented-btn${locale === option.value ? " is-active" : ""}`}
                    onClick={() => setLocale(option.value)}
                    title={option.fullLabel}
                    aria-pressed={locale === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="app-header__control" aria-label={t("Theme")}>
              <div className="app-header__segmented app-header__segmented--theme" role="group" aria-label={t("Theme")}>
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`app-header__segmented-btn app-header__segmented-btn--theme${themeMode === option.value ? " is-active" : ""}`}
                      onClick={() => setThemeMode(option.value)}
                      title={option.label}
                      aria-pressed={themeMode === option.value}
                    >
                      <Icon size={15} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {authed ? (
            <NavUserMenu />
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary app-header__auth-btn">
                {t("Sign In")}
              </Link>
              <Link to="/register" className="btn btn-primary app-header__auth-btn">
                {t("Register")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
