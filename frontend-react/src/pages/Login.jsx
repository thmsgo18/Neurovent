import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import "../styles/Login.css";
import { loginParticipantApi, loginCompanyApi } from "../api/auth";
import { decodeJWT } from "../api/client";
import { setToken, setRefreshToken, setRole, setUsername, setDisplayName, setCompanyName, setUserId } from "../store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("researcher"); // "researcher" | "lab"
  const [form, setForm] = useState({ credential: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isLab = mode === "lab";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = isLab
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
      navigate("/dashboard");
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
          <div aria-hidden="true" />
        </div>
      </div>

      <div className="login-shell">
      <div className="login-mode-selector">
        <span
          className={`login-mode-slider${isLab ? " login-mode-slider--lab" : ""}`}
          aria-hidden="true"
        />
        {[
          { key: "researcher", label: "Participant" },
          { key: "lab", label: "Organization" },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setError(""); }}
            className="login-mode-btn"
            style={{
              color: mode === m.key ? (m.key === "lab" ? "#fff" : "#000") : "var(--text-muted)",
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
          border: `1px solid ${isLab ? "var(--secondary)" : "var(--border-strong)"}`,
          boxShadow: isLab
            ? "0 0 40px rgba(168,85,247,0.08)"
            : "0 0 40px rgba(0,0,0,0.4)",
        }}
      >
        <h2 className="login-title" style={{ textAlign: "center", marginBottom: "10px" }}>
          {isLab ? "Company Console" : "Welcome Back"}
        </h2>
        <p className="login-subtitle" style={{ textAlign: "center", marginBottom: "36px" }}>
          {isLab
            ? "Manage your events, registrations and verification workflow."
            : "Sign in to manage your event registrations and discover new opportunities."}
        </p>

        {error && (
          <div className="login-error">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">{isLab ? "Company Identifier" : "Email Address"}</label>
            <input
              type="text"
              className="input"
              style={{ height: "54px" }}
              placeholder={isLab ? "your-lab-identifier" : "researcher@institution.edu"}
              value={form.credential}
              onChange={(e) => setForm({ ...form, credential: e.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <div className="login-password-row">
              <label className="form-label" style={{ marginBottom: 0 }}>{isLab ? "Security Key" : "Password"}</label>
              {!isLab && (
                <Link
                  to="/forgot-password"
                  className="login-forgot-link"
                >
                  Forgot password?
                </Link>
              )}
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
              background: isLab ? "var(--secondary)" : "var(--accent)",
              color: isLab ? "#fff" : "#000",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "var(--transition)",
            }}
            disabled={loading}
          >
            {loading
              ? "Connecting..."
              : isLab
              ? "Access Lab Dashboard"
              : "Sign In to Dashboard"}
          </button>
        </form>

        <p className="login-footer">
          {isLab ? "Not a lab?" : "No account yet?"}{" "}
          <Link
            to="/register"
          >
            {isLab ? "Researcher signup" : "Register now"}
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
