import { useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { resetPasswordConfirmApi } from "../api/auth";
import { usePreferences } from "../context/PreferencesContext";
import "../styles/Auth.css";

export default function ResetPasswordConfirm() {
  const { t } = usePreferences();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = params.uid || searchParams.get("uid");
  const token = params.token || searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // null | "ok" | error string

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus(t("Passwords do not match."));
      return;
    }
    if (!uid || !token) {
      setStatus(t("Invalid reset link. Please request a new one."));
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await resetPasswordConfirmApi(uid, token, newPassword, confirmPassword);
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

        {status === "ok" ? (
          <div className="auth-success">
            <div className="auth-success-icon">
              <CheckCircle size={26} />
            </div>
            <p className="auth-success-title">{t("Password updated!")}</p>
            <p className="auth-success-copy">
              {t("Your password has been reset successfully.")}
            </p>
            <button className="btn btn-primary auth-submit" onClick={() => navigate("/login")}>
              {t("Sign In")}
            </button>
          </div>
        ) : (
          <>
            <h2 className="auth-title">{t("Set New Password")}</h2>
            <p className="auth-subtitle">{t("Choose a strong password for your account.")}</p>

            {status && (
              <div className="auth-feedback auth-feedback--error">
                <AlertCircle size={16} className="auth-feedback-icon" />
                {status}
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label className="form-label">{t("New Password")}</label>
                <div className="auth-password-field">
                  <input
                    type={showPw ? "text" : "password"}
                    className="input auth-input auth-password-input"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="auth-password-toggle">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">{t("Confirm Password")}</label>
                <input
                  type={showPw ? "text" : "password"}
                  className="input auth-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn auth-submit"
                disabled={loading}
              >
                {loading ? t("Updating...") : t("Update Password")}
              </button>
            </form>
          </>
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
