import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Languages, Moon, Settings2, Sun } from "lucide-react";
import { usePreferences } from "../context/PreferencesContext";
import "../styles/AppHeader.css";
import "../styles/Auth.css";

function joinClasses(...values) {
  return values.filter(Boolean).join(" ");
}

export default function AuthPageShell({
  pageClassName = "",
  topbarClassName = "",
  topbarInnerClassName = "",
  controlsClassName = "",
  brandClassName = "",
  brandMarkClassName = "",
  contentClassName = "",
  lockViewport = true,
  children,
}) {
  const { t, locale, setLocale, themeMode, setThemeMode } = usePreferences();
  const [mobilePrefsOpen, setMobilePrefsOpen] = useState(false);
  const pageRef = useRef(null);
  const headerRef = useRef(null);
  const mobilePrefsRef = useRef(null);

  const themeOptions = [
    { value: "light", label: t("Light"), icon: Sun },
    { value: "dark", label: t("Dark"), icon: Moon },
  ];

  const localeOptions = [
    { value: "en", label: "EN", fullLabel: t("English") },
    { value: "fr", label: "FR", fullLabel: t("French") },
  ];

  useEffect(() => {
    if (!mobilePrefsOpen) return undefined;

    const handlePointerDown = (event) => {
      if (mobilePrefsRef.current && !mobilePrefsRef.current.contains(event.target)) {
        setMobilePrefsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobilePrefsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobilePrefsOpen]);

  useEffect(() => {
    if (!lockViewport) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [lockViewport]);

  useLayoutEffect(() => {
    const updateHeaderHeight = () => {
      if (!pageRef.current || !headerRef.current) return;
      pageRef.current.style.setProperty("--auth-header-height", `${headerRef.current.offsetHeight}px`);
    };

    updateHeaderHeight();

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => updateHeaderHeight())
      : null;

    if (resizeObserver && headerRef.current) {
      resizeObserver.observe(headerRef.current);
    }

    window.addEventListener("resize", updateHeaderHeight);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, []);

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
    <div ref={pageRef} className={joinClasses("auth-page-shell", pageClassName)}>
      <div ref={headerRef} className={joinClasses("auth-page-shell__topbar", topbarClassName)}>
        <div className={joinClasses("app-header__inner", "auth-page-shell__topbar-inner", topbarInnerClassName)}>
          <Link to="/" className={joinClasses("app-header__brand", "auth-page-shell__brand", brandClassName)}>
            Neuro<span className={joinClasses("auth-page-shell__brand-mark", brandMarkClassName)}>vent</span>
          </Link>
          <div aria-hidden="true" />
          <div className={joinClasses("app-header__right", "auth-page-shell__controls", controlsClassName)}>
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
                onClick={() => setMobilePrefsOpen((value) => !value)}
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
          </div>
        </div>
      </div>

      <div className={contentClassName}>{children}</div>
    </div>
  );
}
