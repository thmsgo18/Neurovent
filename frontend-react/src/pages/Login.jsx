import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import "../styles/Login.css";
import { loginParticipantApi, loginCompanyApi } from "../api/auth";
import { decodeJWT } from "../api/client";
import { setToken, setRefreshToken, setRole, setUsername, setDisplayName, setCompanyName, setUserId } from "../store/authStore";
import { usePreferences } from "../context/PreferencesContext";
import AuthPageShell from "../components/AuthPageShell";

export default function Login() {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const [mode, setMode] = useState("participant");
  const [form, setForm] = useState({ credential: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isOrganization = mode === "organization";

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
    <AuthPageShell
      pageClassName="login-page"
      controlsClassName="login-top-brand__controls"
      brandClassName="login-brand"
      brandMarkClassName="login-brand-mark"
      contentClassName="login-shell"
      lockViewport={false}
    >
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
            className={`login-mode-btn login-mode-btn--${m.key}${mode === m.key ? " login-mode-btn--active" : ""}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className={`login-card${isOrganization ? " login-card--organization" : ""}`}>
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
            <AlertCircle size={16} className="icon-inline-start" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">{isOrganization ? t("Company Identifier") : t("Email Address")}</label>
            <input
              type="text"
              className="input login-input"
              placeholder={isOrganization ? t("your-organization-identifier") : t("participant@institution.edu")}
              value={form.credential}
              onChange={(e) => setForm({ ...form, credential: e.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <div className="login-password-row">
              <label className="form-label login-password-label">{t("Password")}</label>
              <Link to="/forgot-password" className="login-forgot-link">
                {t("Forgot password?")}
              </Link>
            </div>
            <div className="login-password-field">
              <input
                type={showPassword ? "text" : "password"}
                className="input login-password-input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-password-toggle"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`btn login-submit${isOrganization ? " login-submit--organization" : ""}`}
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
          <Link to="/register">
            {isOrganization ? t("Participant sign up") : t("Register now")}
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
