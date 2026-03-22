import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { resetPasswordConfirmApi } from "../api/auth";

export default function ResetPasswordConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // null | "ok" | error string

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }
    if (!uid || !token) {
      setStatus("Invalid reset link. Please request a new one.");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await resetPasswordConfirmApi(uid, token, newPassword, confirmPassword);
      setStatus("ok");
    } catch (err) {
      setStatus(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: "440px", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "20px", padding: "48px 40px", boxShadow: "0 0 40px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: "800", fontSize: "22px", color: "var(--text)" }}>
              Neuro<span style={{ color: "var(--accent)" }}>vent</span>
            </span>
          </Link>
        </div>

        {status === "ok" ? (
          <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(0,255,149,0.1)", border: "1px solid rgba(0,255,149,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "var(--success)" }}>
              <CheckCircle size={26} />
            </div>
            <p style={{ fontSize: "16px", fontWeight: "700", color: "var(--text)", marginBottom: "10px" }}>Password updated!</p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "24px" }}>
              Your password has been reset successfully.
            </p>
            <button className="btn btn-primary" style={{ width: "100%", height: "48px", borderRadius: "10px" }} onClick={() => navigate("/login")}>
              Sign In
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: "24px", fontWeight: "800", textAlign: "center", marginBottom: "10px", letterSpacing: "-0.03em" }}>
              Set New Password
            </h2>
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "14px", marginBottom: "32px", lineHeight: "1.5" }}>
              Choose a strong password for your account.
            </p>

            {status && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", background: "rgba(255, 77, 77, 0.08)", border: "1px solid rgba(255, 77, 77, 0.2)", color: "var(--error)", padding: "14px", borderRadius: "10px", fontSize: "13px", marginBottom: "20px", lineHeight: "1.5" }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
                {status}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label className="form-label">New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    className="input"
                    style={{ height: "48px", paddingRight: "48px" }}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 0, display: "flex" }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Confirm Password</label>
                <input
                  type={showPw ? "text" : "password"}
                  className="input"
                  style={{ height: "48px" }}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn"
                style={{ width: "100%", height: "50px", marginTop: "8px", borderRadius: "10px", fontSize: "15px", fontWeight: "700", background: "var(--accent)", color: "#000", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-dim)", marginTop: "28px" }}>
          <Link to="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: "700" }}>
            ← Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
