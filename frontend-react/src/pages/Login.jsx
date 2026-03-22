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
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      {/* Mode selector above the card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          width: "100%",
          maxWidth: "460px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "4px",
          marginBottom: "20px",
        }}
      >
        {[
          { key: "researcher", label: "Researcher" },
          { key: "lab", label: "Lab / Organization" },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setError(""); }}
            style={{
              padding: "12px",
              borderRadius: "11px",
              border: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "var(--transition)",
              background:
                mode === m.key
                  ? m.key === "lab"
                    ? "var(--secondary)"
                    : "var(--accent)"
                  : "transparent",
              color: mode === m.key ? (m.key === "lab" ? "#fff" : "#000") : "var(--text-muted)",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "var(--surface)",
          border: `1px solid ${isLab ? "var(--secondary)" : "var(--border-strong)"}`,
          borderRadius: "20px",
          padding: "48px 40px",
          boxShadow: isLab
            ? "0 0 40px rgba(168,85,247,0.08)"
            : "0 0 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "800",
                fontSize: "22px",
                color: "var(--text)",
              }}
            >
              Neuro<span style={{ color: "var(--accent)" }}>vent</span>
            </span>
          </Link>
        </div>

        <h2
          style={{
            fontSize: "26px",
            fontWeight: "800",
            textAlign: "center",
            marginBottom: "10px",
            letterSpacing: "-0.03em",
          }}
        >
          {isLab ? "Lab Console" : "Welcome Back"}
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "14px",
            marginBottom: "36px",
            lineHeight: "1.5",
          }}
        >
          {isLab
            ? "Manage your research events and community."
            : "Enter your credentials to access the researcher console."}
        </p>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              background: "rgba(255, 77, 77, 0.08)",
              border: "1px solid rgba(255, 77, 77, 0.2)",
              color: "var(--error)",
              padding: "14px",
              borderRadius: "10px",
              fontSize: "13px",
              marginBottom: "24px",
              lineHeight: "1.5",
            }}
          >
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
              style={{ height: "48px" }}
              placeholder={isLab ? "braincorp2026" : "name@university.edu"}
              value={form.credential}
              onChange={(e) => setForm({ ...form, credential: e.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label className="form-label" style={{ marginBottom: 0 }}>{isLab ? "Security Key" : "Password"}</label>
              {!isLab && (
                <Link
                  to="/forgot-password"
                  style={{ fontSize: "12px", color: "var(--text-dim)", textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="input"
                style={{ height: "48px", paddingRight: "48px" }}
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
              height: "50px",
              marginTop: "8px",
              borderRadius: "10px",
              fontSize: "15px",
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

        {/* Lab info box */}
        {isLab && (
          <div
            style={{
              marginTop: "20px",
              padding: "14px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              fontSize: "12px",
              color: "var(--text-muted)",
              lineHeight: "1.6",
            }}
          >
            Lab accounts include validation tools, event analytics and participant management.
          </div>
        )}

        <p
          style={{
            textAlign: "center",
            fontSize: "13px",
            color: "var(--text-dim)",
            marginTop: "28px",
          }}
        >
          {isLab ? "Not a lab?" : "No account yet?"}{" "}
          <Link
            to="/register"
            style={{ color: "var(--accent)", textDecoration: "none", fontWeight: "700" }}
          >
            {isLab ? "Researcher signup" : "Register now"}
          </Link>
        </p>
      </div>
    </div>
  );
}
