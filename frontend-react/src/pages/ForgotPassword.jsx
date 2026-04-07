import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle } from "lucide-react";
import { resetPasswordApi } from "../api/auth";
import { usePreferences } from "../context/PreferencesContext";
import "../styles/Auth.css";

export default function ForgotPassword() {
  const { t } = usePreferences();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // null | "ok" | error string

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await resetPasswordApi(email);
      setStatus("ok");
    } catch (err) {
      setStatus(err.message || t("Something went wrong."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand-wrap">
          <Link to="/" className="auth-brand">
            Neuro<span className="auth-brand-mark">vent</span>
          </Link>
        </div>

        <h2 className="auth-title">{t("Reset Password")}</h2>
        <p className="auth-subtitle">{t("Enter your email and we will send you a password reset link.")}</p>

        {status === "ok" ? (
          <div className="auth-success">
            <div className="auth-success-icon">
              <CheckCircle size={26} />
            </div>
            <p className="auth-success-title">{t("Check your inbox")}</p>
            <p className="auth-success-copy">{t("If an account exists for")}</p>
            <p className="auth-success-email">{email}</p>
            <p className="auth-success-copy">{t("a reset link has been sent.")}</p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {status && (
              <div className="auth-feedback auth-feedback--error">
                <AlertCircle size={16} className="auth-feedback-icon" />
                {status}
              </div>
            )}
            <div className="form-field">
              <label className="form-label">{t("Email Address")}</label>
              <input
                type="email"
                className="input auth-input"
                placeholder={t("participant@institution.edu")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn auth-submit"
              disabled={loading}
            >
              {loading ? t("Sending...") : t("Send Reset Link")}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link to="/login" className="auth-footer-link">
            ← {t("Back to Login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
