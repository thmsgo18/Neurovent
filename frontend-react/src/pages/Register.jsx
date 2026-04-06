import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Eye, EyeOff, Languages, Moon, Settings2, Sun } from "lucide-react";
import "../styles/Register.css";
import "../styles/AppHeader.css";
import { registerParticipantApi, registerCompanyApi } from "../api/auth";
import { usePreferences } from "../context/PreferencesContext";

const PW_RULES = [
  { key: "len",     label: "At least 8 characters",         test: (p) => p.length >= 8 },
  { key: "upper",   label: "One uppercase letter (A–Z)",     test: (p) => /[A-Z]/.test(p) },
  { key: "digit",   label: "One number (0–9)",               test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "One special character (!@#…)",   test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordRules({ password, t }) {
  if (!password) return null;
  return (
    <div className="pw-rules">
      {PW_RULES.map(({ key, label, test }) => {
        const ok = test(password);
        return (
          <div key={key} className={`pw-rule pw-rule--${ok ? "ok" : "fail"}`}>
            <span className="pw-rule-icon">{ok ? "✓" : "·"}</span>
            {t(label)}
          </div>
        );
      })}
    </div>
  );
}

function formatSiret(value) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  const parts = [];

  if (digits.slice(0, 3)) parts.push(digits.slice(0, 3));
  if (digits.slice(3, 6)) parts.push(digits.slice(3, 6));
  if (digits.slice(6, 9)) parts.push(digits.slice(6, 9));
  if (digits.slice(9, 14)) parts.push(digits.slice(9, 14));

  return parts.join(" ");
}

export default function Register() {
  const navigate = useNavigate();
  const { t, locale, setLocale, themeMode, setThemeMode } = usePreferences();
  const [activeTab, setActiveTab] = useState("participant");
  const [mobilePrefsOpen, setMobilePrefsOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    // org fields
    orgName: "",
    recoveryEmail: "",
    identifier: "",
    siret: "",
    legalRepresentative: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const pageRef = useRef(null);
  const headerRef = useRef(null);
  const mobilePrefsRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
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
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

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

  const passwordsMatch =
    form.confirmPassword !== "" && form.password === form.confirmPassword;
  const passwordsMismatch =
    form.confirmPassword !== "" && form.password !== form.confirmPassword;
  const passwordValid = PW_RULES.every(({ test }) => test(form.password));
  const siretDigits = form.siret.replace(/\D/g, "");
  const identifierHelp =
    t("Letters, numbers and hyphens only. This identifier will be used for organization login.");
  const isCompanyTab = activeTab === "organization";
  const sideHighlights = isCompanyTab
    ? [
        t("Enter your SIRET and legal representative details."),
        t("Automatic verification runs right after account creation."),
        t("Use your organization identifier to sign in later."),
      ]
    : [
        t("Create your attendee profile in a few fields."),
        t("Track registrations and confirmations from one dashboard."),
        t("Discover events in AI, ML and neuroscience."),
      ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError(t("Passwords do not match."));
      return;
    }
    if (activeTab === "organization" && siretDigits.length !== 14) {
      setError(t("SIRET must contain exactly 14 digits."));
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (activeTab === "participant") {
        await registerParticipantApi({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          password: form.password,
          passwordConfirm: form.confirmPassword,
        });
      } else {
        await registerCompanyApi({
          identifier: form.identifier.trim(),
          companyName: form.orgName.trim(),
          recoveryEmail: form.recoveryEmail.trim(),
          siret: siretDigits,
          legalRepresentative: form.legalRepresentative.trim(),
          password: form.password,
          passwordConfirm: form.confirmPassword,
        });
      }
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="register-success">
        <div className="register-success-card card">
          <div className="register-success-icon">
            <CheckCircle size={36} color="var(--success)" />
          </div>
          <h2 className="register-success-title">
            {activeTab === "participant" ? t("Profile Created!") : t("Organization Account Created!")}
          </h2>
          <p className="register-success-copy">
            {activeTab === "participant"
              ? t("Redirecting to login...")
              : t("We have started the organization verification checks. Redirecting to login...")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="register-page">
      <div ref={headerRef} className="register-top-brand">
        <div className="app-header__inner register-top-brand__inner">
          <Link to="/" className="app-header__brand register-brand register-brand--header">
            Neuro<span style={{ color: "var(--accent)" }}>vent</span>
          </Link>
          <div aria-hidden="true" />
          <div className="app-header__right register-top-brand__controls">
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

      <div className="register-body">
        <div className="register-left">
          <div className="register-left-copy">
            <h1 className="register-left-title">
              {isCompanyTab ? (
                <>
                  {t("Empower your")}
                  <br />
                  {t("organization.")}
                </>
              ) : (
                <>
                  {t("Start your")}
                  <br />
                  {t("scientific")}
                  <br />
                  {t("journey.")}
                </>
              )}
            </h1>
            <p className="register-left-desc">
              {isCompanyTab
                ? t("Create your organization account and submit the legal details needed for verification.")
                : t("Connect with top organizations and participants worldwide.")}
            </p>
          </div>

          <div className="register-left-features">
            {sideHighlights.map((item) => (
              <div key={item} className="register-left-feature">
                <span className="register-left-feature-dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="register-right">
          <div className="register-form-wrap">
            <div className="register-tab-switcher">
            {[
              { key: "participant", label: t("Participant") },
              { key: "organization", label: t("Organization") },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setError("");
                }}
                className={`register-tab-button${activeTab === tab.key ? " register-tab-button--active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

            {error && (
              <div className="register-error">
                <AlertCircle size={18} className="register-error-icon" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
            {activeTab === "participant" ? (
              <>
                <div className="register-form-row">
                  <div className="form-field">
                    <label className="form-label">
                      {t("First Name")} <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder={t("Given name")}
                      value={form.firstName}
                      onChange={(e) => set("firstName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">
                      {t("Last Name")} <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder={t("Family name")}
                      value={form.lastName}
                      onChange={(e) => set("lastName", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    {t("Email Address")} <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="input"
                    placeholder={t("participant@institution.edu")}
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    required
                  />
                </div>

              </>
            ) : (
              <>
                <div className="form-field">
                  <label className="form-label">
                    {t("Organization Name")} <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t("e.g. INRIA Paris, NeuroSpin Organization")}
                    value={form.orgName}
                    onChange={(e) => set("orgName", e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    {t("Recovery Email")} <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="input"
                    placeholder={t("contact@organization.com")}
                    value={form.recoveryEmail}
                    onChange={(e) => set("recoveryEmail", e.target.value)}
                    required
                  />
                </div>

                <div className="register-form-row">
                  <div className="form-field">
                    <label className="form-label">
                      {t("Identifier")} <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder={t("e.g. neurocog-organization-paris")}
                      value={form.identifier}
                      onChange={(e) => set("identifier", e.target.value)}
                      minLength={3}
                      maxLength={50}
                      pattern="^[A-Za-z0-9-]+$"
                      title={t("Use only letters, numbers, and hyphens.")}
                      autoCapitalize="off"
                      autoCorrect="off"
                      required
                    />
                    <p className="register-help">{identifierHelp}</p>
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      SIRET <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      inputMode="numeric"
                      placeholder="123 456 789 00012"
                      value={form.siret}
                      onChange={(e) => set("siret", formatSiret(e.target.value))}
                      required
                    />
                    <p className={`register-help${siretDigits.length === 14 || form.siret.length === 0 ? "" : " register-help--error"}`}>
                      {siretDigits.length === 0
                        ? t("14 digits required for automatic company verification.")
                        : t("{{count}}/14 digits entered", { count: siretDigits.length })}
                    </p>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    {t("Legal Representative")} <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t("e.g. Marie Dupont")}
                    value={form.legalRepresentative}
                    onChange={(e) => set("legalRepresentative", e.target.value)}
                    required
                  />
                  <p className="register-help">
                    {t("Enter the name of the person who legally represents the company.")}
                  </p>
                </div>
              </>
            )}

            {/* Password */}
            <div className="form-field">
              <label className="form-label">
                {t("Password")} <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <div className="register-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input"
                  style={{ paddingRight: "48px" }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="register-password-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <PasswordRules password={form.password} t={t} />
            </div>

            {/* Confirm password */}
            <div className="form-field">
              <label className="form-label">
                {t("Confirm Password")} <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <div className="register-password-wrap">
                <input
                  type={showConfirm ? "text" : "password"}
                  className="input"
                  style={{
                    paddingRight: "48px",
                    borderColor: passwordsMismatch
                      ? "var(--error)"
                      : passwordsMatch
                      ? "var(--success)"
                      : undefined,
                    boxShadow: passwordsMismatch
                      ? "0 0 0 1px var(--error)"
                      : passwordsMatch
                      ? "0 0 0 1px var(--success)"
                      : undefined,
                  }}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="register-password-toggle"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {form.confirmPassword !== "" && (
                <p className={`register-match${passwordsMatch ? " register-match--ok" : " register-match--error"}`}>
                  {passwordsMatch ? t("Passwords match") : t("Passwords do not match")}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary register-submit"
              disabled={loading || passwordsMismatch || !passwordValid}
            >
              {loading
                ? t("Processing...")
                : activeTab === "participant"
                ? t("Create Profile")
                : t("Register Organization")}
            </button>
          </form>

            <div className="register-footer">
              <p>
                {t("Already have an account?")}{" "}
                <Link to="/login">{t("Log In")}</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
