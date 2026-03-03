import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Zap, Eye, EyeOff, Lock, User, Mail, Building, AlertCircle, CheckCircle } from "lucide-react";
import "../styles/Login.css";
import { registerApi } from "../api/auth";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "", email: "", password: "", confirm: "", institution: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.username || !form.email || !form.password || !form.confirm) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    // Mock: simule une création de compte
    await registerApi(form.username, form.email, form.password, form.institution);
    setLoading(false);
    setSuccess(true);
    setTimeout(() => navigate("/login"), 2000);
  };

  if (success) {
    return (
      <div className="login-page">
        <div className="login-bg-blob-1" />
        <div className="login-bg-blob-2" />
        <div className="login-wrapper">
          <div className="login-card" style={{ textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, background: "rgba(34,197,94,0.15)",
              borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 16px"
            }}>
              <CheckCircle size={32} color="#22c55e" />
            </div>
            <h2 style={{ color: "white", fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>
              Account Created!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>
              Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-bg-blob-1" />
      <div className="login-bg-blob-2" />

      <div className="login-wrapper">
        <div className="login-card">

          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">
              <Zap size={26} color="white" />
            </div>
            <h1>Create Account</h1>
            <p>Join Neurovent — Event Management Platform</p>
          </div>

          {/* Erreur */}
          {error && (
            <div className="alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="login-label">Username *</label>
              <div className="login-input-wrapper">
                <User size={16} className="login-input-icon" />
                <input
                  className="login-input"
                  type="text"
                  value={form.username}
                  onChange={e => set("username", e.target.value)}
                  placeholder="Choose a username"
                />
              </div>
            </div>

            <div className="form-field">
              <label className="login-label">Email *</label>
              <div className="login-input-wrapper">
                <Mail size={16} className="login-input-icon" />
                <input
                  className="login-input"
                  type="email"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="form-field">
              <label className="login-label">Institution</label>
              <div className="login-input-wrapper">
                <Building size={16} className="login-input-icon" />
                <input
                  className="login-input"
                  type="text"
                  value={form.institution}
                  onChange={e => set("institution", e.target.value)}
                  placeholder="University / Organization"
                />
              </div>
            </div>

            <div className="form-field">
              <label className="login-label">Password *</label>
              <div className="login-input-wrapper">
                <Lock size={16} className="login-input-icon" />
                <input
                  className={`login-input login-input-password`}
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(s => !s)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-field">
              <label className="login-label">Confirm Password *</label>
              <div className="login-input-wrapper">
                <Lock size={16} className="login-input-icon" />
                <input
                  className={`login-input login-input-password`}
                  type={showConfirm ? "text" : "password"}
                  value={form.confirm}
                  onChange={e => set("confirm", e.target.value)}
                  placeholder="Repeat your password"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowConfirm(s => !s)}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Creating account...
                </>
              ) : "Create Account"}
            </button>
          </form>

          {/* Lien login */}
          <div className="login-demo" style={{ textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
              Already have an account?{" "}
              <Link
                to="/login"
                style={{ color: "#a5b4fc", textDecoration: "none", fontWeight: 600 }}
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}