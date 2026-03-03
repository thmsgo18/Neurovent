import { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Mail, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import "../styles/Login.css";
import { forgotPasswordApi } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    // Mock: simule l'envoi d'un email
    await forgotPasswordApi(email);
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="login-page">
        <div className="login-bg-blob-1" />
        <div className="login-bg-blob-2" />
        <div className="login-wrapper">
          <div className="login-card" style={{ textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, background: "rgba(99,102,241,0.15)",
              borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 16px"
            }}>
              <Mail size={32} color="#818cf8" />
            </div>
            <h2 style={{ color: "white", fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>
              Email Sent!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", marginBottom: 24 }}>
              If an account exists for <strong style={{ color: "rgba(255,255,255,0.7)" }}>{email}</strong>,
              you will receive a password reset link shortly.
            </p>
            <Link
              to="/login"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                color: "#a5b4fc", textDecoration: "none", fontSize: "0.875rem"
              }}
            >
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
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
            <h1>Forgot Password</h1>
            <p>Enter your email to reset your password</p>
          </div>

          {/* Erreur */}
          {error && (
            <div className="alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="login-label">Email Address *</label>
              <div className="login-input-wrapper">
                <Mail size={16} className="login-input-icon" />
                <input
                  className="login-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
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
                  Sending...
                </>
              ) : "Send Reset Link"}
            </button>
          </form>

          <div className="login-demo" style={{ textAlign: "center" }}>
            <Link
              to="/login"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                color: "rgba(255,255,255,0.4)", textDecoration: "none",
                fontSize: "0.875rem", transition: "color 0.15s"
              }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        </div>

        <p className="login-footer">
          Web Programming 2026 — Dr. Alla Jammine — EventHub Project
        </p>
      </div>
    </div>
  );
}