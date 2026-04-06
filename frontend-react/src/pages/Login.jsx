import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Monitor, Moon, Sun } from "lucide-react";
import "../styles/Login.css";
import "../styles/AppHeader.css";
import { loginParticipantApi, loginCompanyApi } from "../api/auth";
import { decodeJWT } from "../api/client";
import { setToken, setRefreshToken, setRole, setUsername, setDisplayName, setCompanyName, setUserId } from "../store/authStore";
import { usePreferences } from "../context/PreferencesContext";

export default function Login() {
  const navigate = useNavigate();
  const { t, locale, setLocale, themeMode, setThemeMode } = usePreferences();
  const [mode, setMode] = useState("participant");
  const [form, setForm] = useState({ credential: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isOrganization = mode === "organization";
  const themeOptions = [
    { value: "system", label: t("System"), icon: Monitor },
    { value: "light", label: t("Light"), icon: Sun },
    { value: "dark", label: t("Dark"), icon: Moon },
  ];

  const localeOptions = [
    { value: "en", label: "EN", fullLabel: t("English") },
    { value: "fr", label: "FR", fullLabel: t("French") },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = isOrganization
        ? await loginCompanyApi(form.credential, form.password)
        : await loginParticipantApi(form.credential, form.password);
      // Le vrai backend renvoie seulement {access, refresh} — le role et l'identifiant
      // sont dans le payload JWT. data.role / data.username existent en mode mock uniquement.
      const payload = decodeJWT(data.access);
      const role = payload?.role || data.role;
      const username = payload?.email || payload?.company_identifier || data.username;
      const displayName = payload?.first_name && payload?.last_name
        ? `${payload.first_name} ${payload.last_name}`
        : payload?.company_name || username;
      setToken(data.access);
      setRefreshToken(data.refresh);
      setRole(role);
      setUsername(username);
      setDisplayName(displayName);
      if (payload?.company_name) setCompanyName(payload.company_name);
      if (payload?.user_id) setUserId(payload.user_id);
      navigate(role === "ADMIN" ? "/admin/participants" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-top-brand">
        <div className="app-header__inner login-top-brand__inner">
          <Link to="/" className="app-header__brand login-brand">
            Neuro<span style={{ color: "var(--accent)" }}>vent</span>
          </Link>
          <div aria-hidden="true" />
          <div className="app-header__right login-top-brand__controls">
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
          </div>
        </div>
      </div>

      <div className="login-shell">
      <div className="login-mode-selector">
        <span
          className={`login-mode-slider${isOrganization ? " login-mode-slider--lab" : ""}`}
          aria-hidden="true"
        />
        {[
          { key: "participant", label: t("Participant") },
          { key: "organization", label: t("Organization") },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setError(""); }}
            className="login-mode-btn"
            style={{
              color: mode === m.key ? (m.key === "organization" ? "#fff" : "#000") : "var(--text-muted)",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

        <div
          className="login-card"
          style={{
            background: "var(--surface)",
            border: `1px solid ${isOrganization ? "var(--secondary)" : "var(--border-strong)"}`,
            boxShadow: "0 0 40px rgba(0,0,0,0.4)",
          }}
        >
        <div className="login-heading">
          <h2 className={`login-title${isOrganization ? " login-title--organization" : ""}`}>
            {isOrganization ? t("Organization Login") : t("Participant Login")}
          </h2>
          <p className="login-subtitle">
            {isOrganization
              ? t("Manage your events, registrations and verification workflow.")
              : t("Sign in to manage your event registrations and discover new opportunities.")}
          </p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">{isOrganization ? t("Company Identifier") : t("Email Address")}</label>
            <input
              type="text"
              className="input"
              style={{ height: "54px" }}
              placeholder={isOrganization ? t("your-organization-identifier") : t("participant@institution.edu")}
              value={form.credential}
              onChange={(e) => setForm({ ...form, credential: e.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <div className="login-password-row">
              <label className="form-label" style={{ marginBottom: 0 }}>{t("Password")}</label>
              <Link
                to="/forgot-password"
                className="login-forgot-link"
              >
                {t("Forgot password?")}
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="input"
                style={{ height: "54px", paddingRight: "48px" }}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn"
            style={{
              width: "100%",
              height: "54px",
              marginTop: "8px",
              borderRadius: "10px",
              fontSize: "16px",
              fontWeight: "700",
              background: isOrganization ? "var(--secondary)" : "var(--accent)",
              color: isOrganization ? "#fff" : "#000",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "var(--transition)",
            }}
            disabled={loading}
          >
            {loading
              ? t("Connecting...")
              : isOrganization
              ? t("Access Organization Dashboard")
              : t("Sign In to Dashboard")}
          </button>
        </form>

        <p className="login-footer">
          {isOrganization ? t("Not an organization?") : t("No account yet?")}{" "}
          <Link
            to="/register"
          >
            {isOrganization ? t("Participant sign up") : t("Register now")}
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
