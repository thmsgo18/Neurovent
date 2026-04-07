import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Languages, LogIn, Moon, Settings2, Sun, UserPlus } from "lucide-react";
import AppTopLinks from "./AppTopLinks";
import NavUserMenu from "./NavUserMenu";
import { getRole, isAuthed } from "../store/authStore";
import { usePreferences } from "../context/PreferencesContext";
import "../styles/AppHeader.css";

export default function AppHeader() {
  const authed = isAuthed();
  const role = getRole();
  const isAdmin = role === "ADMIN";
  const isGuest = !authed;
  const [mobilePrefsOpen, setMobilePrefsOpen] = useState(false);
  const [mobileAuthOpen, setMobileAuthOpen] = useState(false);
  const mobilePrefsRef = useRef(null);
  const mobileAuthRef = useRef(null);
  const headerRef = useRef(null);
  const { locale, setLocale, themeMode, setThemeMode, t } = usePreferences();

  // Met à jour --header-height sur :root dès que la hauteur du header change
  // (orientation, taille de police, affichage de la barre d'adresse iOS, etc.)
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        "--header-height",
        `${el.getBoundingClientRect().height}px`
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Synchronise theme-color avec le thème pour que la barre de statut iOS
  // ait la même couleur que le header (améliore l'apparence dans la safe area)
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", themeMode === "light" ? "#eef4fb" : "#0d1522");
  }, [themeMode]);

  const themeOptions = [
    { value: "light", label: t("Light"), icon: Sun },
    { value: "dark", label: t("Dark"), icon: Moon },
  ];

  const localeOptions = [
    { value: "en", label: "EN", fullLabel: t("English") },
    { value: "fr", label: "FR", fullLabel: t("French") },
  ];

  useEffect(() => {
    if (!mobilePrefsOpen && !mobileAuthOpen) return undefined;

    const handlePointerDown = (event) => {
      if (mobilePrefsRef.current && !mobilePrefsRef.current.contains(event.target)) {
        setMobilePrefsOpen(false);
      }
      if (mobileAuthRef.current && !mobileAuthRef.current.contains(event.target)) {
        setMobileAuthOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobilePrefsOpen(false);
        setMobileAuthOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobilePrefsOpen, mobileAuthOpen]);

  const renderLanguageControls = ({ mobile = false } = {}) => (
    <div className="app-header__control app-header__control--language" aria-label={t("Language")}>
      <div className="app-header__segmented" role="group" aria-label={t("Language")}>
        {localeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`app-header__segmented-btn${locale === option.value ? " is-active" : ""}`}
            onClick={() => {
              setLocale(option.value);
              if (mobile) setMobilePrefsOpen(false);
            }}
            title={option.fullLabel}
            aria-pressed={locale === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderThemeControls = ({ mobile = false } = {}) => (
    <div className="app-header__control" aria-label={t("Theme")}>
      <div className="app-header__segmented app-header__segmented--theme" role="group" aria-label={t("Theme")}>
        {themeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              className={`app-header__segmented-btn app-header__segmented-btn--theme${themeMode === option.value ? " is-active" : ""}`}
              onClick={() => {
                setThemeMode(option.value);
                if (mobile) setMobilePrefsOpen(false);
              }}
              title={option.label}
              aria-pressed={themeMode === option.value}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <header ref={headerRef} className={`app-header${isAdmin ? " app-header--admin" : ""}${isGuest ? " app-header--guest" : ""}`}>
      <div className="app-header__inner">
        <Link to="/" className="app-header__brand">
          Neuro<span className="app-header__brand-mark">vent</span>
        </Link>

        <div className="app-header__nav">
          <AppTopLinks />
        </div>

        <div className="app-header__right">
          <div className="app-header__preferences">
            {renderLanguageControls()}
            {renderThemeControls()}
          </div>

          <div ref={mobilePrefsRef} className="app-header__mobile-prefs">
            <button
              type="button"
              className={`app-header__mobile-prefs-toggle${mobilePrefsOpen ? " is-open" : ""}`}
              aria-label={t("Display preferences")}
              aria-haspopup="menu"
              aria-expanded={mobilePrefsOpen}
              onClick={() => {
                setMobileAuthOpen(false);
                setMobilePrefsOpen((value) => !value);
              }}
            >
              <Settings2 size={16} />
            </button>

            {mobilePrefsOpen ? (
              <div className="app-header__mobile-prefs-panel" role="menu" aria-label={t("Display preferences")}>
                <div className="app-header__mobile-prefs-section">
                  <p className="app-header__mobile-prefs-title">
                    <Languages size={14} />
                    {t("Language")}
                  </p>
                  {renderLanguageControls({ mobile: true })}
                </div>

                <div className="app-header__mobile-prefs-section">
                  <p className="app-header__mobile-prefs-title">
                    <Settings2 size={14} />
                    {t("Theme")}
                  </p>
                  {renderThemeControls({ mobile: true })}
                </div>
              </div>
            ) : null}
          </div>

          {authed ? (
            <NavUserMenu />
          ) : (
            <>
              <div ref={mobileAuthRef} className="app-header__mobile-auth">
                <button
                  type="button"
                  className={`app-header__mobile-auth-toggle${mobileAuthOpen ? " is-open" : ""}`}
                  aria-label={t("Account access")}
                  aria-haspopup="menu"
                  aria-expanded={mobileAuthOpen}
                  onClick={() => {
                    setMobilePrefsOpen(false);
                    setMobileAuthOpen((value) => !value);
                  }}
                >
                  <LogIn size={16} />
                </button>

                {mobileAuthOpen ? (
                  <div className="app-header__mobile-auth-panel" role="menu" aria-label={t("Account access")}>
                    <Link
                      to="/login"
                      className="app-header__mobile-auth-link app-header__mobile-auth-link--secondary"
                      onClick={() => setMobileAuthOpen(false)}
                    >
                      <LogIn size={15} />
                      {t("Sign In")}
                    </Link>
                    <Link
                      to="/register"
                      className="app-header__mobile-auth-link app-header__mobile-auth-link--primary"
                      onClick={() => setMobileAuthOpen(false)}
                    >
                      <UserPlus size={15} />
                      {t("Register")}
                    </Link>
                  </div>
                ) : null}
              </div>

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
