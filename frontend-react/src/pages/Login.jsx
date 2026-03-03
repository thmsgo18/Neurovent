import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Zap, Eye, EyeOff, Lock, User, AlertCircle } from "lucide-react";
import { loginApi } from "../api/auth";
import { setToken, setRefreshToken, setRole } from "../store/authStore";
import "../styles/Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const data = await loginApi(form.username, form.password);
      setToken(data.access);
      setRefreshToken(data.refresh);
      setRole(data.role);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (username, password) => {
    setForm({ username, password });
    setError("");
  };

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
            <h1>Neurovent</h1>
            <p>Event & Participant Management System</p>
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
              <label className="login-label">Username</label>
              <div className="login-input-wrapper">
                <User size={16} className="login-input-icon" />
                <input
                  className="login-input"
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label className="login-label">Password</label>
              <div className="login-input-wrapper">
                <Lock size={16} className="login-input-icon" />
                <input
                  className="login-input login-input-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password"
                  required
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

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Signing in...
                </>
              ) : "Sign In"}
            </button>
          </form>

          {/* Footer links */}
          <div className="login-links">
            <Link to="/forgot-password" className="login-link-btn">
              Mot de passe oublié ?
            </Link>
            <Link to="/register" className="login-link-btn login-link-btn-register">
              Créer un compte →
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}