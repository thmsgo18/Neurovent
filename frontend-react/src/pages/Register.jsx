import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import "../styles/Register.css";
import { registerParticipantApi, registerCompanyApi } from "../api/auth";

const PW_RULES = [
  { key: "len",     label: "At least 8 characters",         test: (p) => p.length >= 8 },
  { key: "upper",   label: "One uppercase letter (A–Z)",     test: (p) => /[A-Z]/.test(p) },
  { key: "digit",   label: "One number (0–9)",               test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "One special character (!@#…)",   test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordRules({ password }) {
  if (!password) return null;
  return (
    <div className="pw-rules">
      {PW_RULES.map(({ key, label, test }) => {
        const ok = test(password);
        return (
          <div key={key} className={`pw-rule pw-rule--${ok ? "ok" : "fail"}`}>
            <span className="pw-rule-icon">{ok ? "✓" : "·"}</span>
            {label}
          </div>
        );
      })}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("participant");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    institution: "",
    company: "",
    password: "",
    confirmPassword: "",
    // org fields
    orgName: "",
    recoveryEmail: "",
    identifier: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const passwordsMatch =
    form.confirmPassword !== "" && form.password === form.confirmPassword;
  const passwordsMismatch =
    form.confirmPassword !== "" && form.password !== form.confirmPassword;
  const passwordValid = PW_RULES.every(({ test }) => test(form.password));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (activeTab === "participant") {
        await registerParticipantApi({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          password: form.password,
          passwordConfirm: form.confirmPassword,
          employerName: form.institution || form.company,
        });
      } else {
        await registerCompanyApi({
          identifier: form.identifier,
          companyName: form.orgName,
          recoveryEmail: form.recoveryEmail,
          password: form.password,
          passwordConfirm: form.confirmPassword,
        });
      }
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: "420px",
            textAlign: "center",
            padding: "64px 40px",
            borderRadius: "24px",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              background: "rgba(0, 255, 149, 0.1)",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 28px",
              border: "1px solid var(--success)",
            }}
          >
            <CheckCircle size={36} color="var(--success)" />
          </div>
          <h2 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "12px" }}>Profile Created!</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: "1.6" }}>
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Left panel */}
      <div
        style={{
          width: "45%",
          minHeight: "100vh",
          padding: "60px 56px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          borderRight: "1px solid var(--border)",
          position: "relative",
        }}
      >
        <Link
          to="/"
          style={{
            textDecoration: "none",
            position: "absolute",
            top: "40px",
            left: "56px",
          }}
        >
          <span
            style={{ fontFamily: "var(--font-display)", fontWeight: "800", fontSize: "20px", color: "var(--text)" }}
          >
            Neuro<span style={{ color: "var(--accent)" }}>vent</span>
          </span>
        </Link>

        <div style={{ maxWidth: "360px" }}>
          {activeTab === "participant" ? (
            <>
              <h1
                style={{
                  fontSize: "clamp(32px, 4vw, 52px)",
                  fontWeight: "800",
                  lineHeight: "1.05",
                  marginBottom: "20px",
                  letterSpacing: "-0.03em",
                }}
              >
                Start your
                <br />
                scientific
                <br />
                journey.
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "16px", lineHeight: "1.6" }}>
                Connect with top labs and researchers worldwide.
              </p>
            </>
          ) : (
            <>
              <h1
                style={{
                  fontSize: "clamp(32px, 4vw, 52px)",
                  fontWeight: "800",
                  lineHeight: "1.05",
                  marginBottom: "20px",
                  letterSpacing: "-0.03em",
                }}
              >
                Empower your
                <br />
                Research Lab.
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "16px", lineHeight: "1.6" }}>
                Manage conferences, validate participants, and track global impact.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div
        style={{
          flex: 1,
          minHeight: "100vh",
          padding: "60px 56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface)",
          overflowY: "auto",
        }}
      >
        <div style={{ width: "100%", maxWidth: "480px" }}>
          {/* Tab switcher */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "4px",
              marginBottom: "36px",
            }}
          >
            {[
              { key: "participant", label: "Participant" },
              { key: "organization", label: "Organization" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setError("");
                }}
                style={{
                  padding: "13px",
                  borderRadius: "11px",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "var(--transition)",
                  background: activeTab === tab.key ? "var(--accent)" : "transparent",
                  color: activeTab === tab.key ? "#000" : "var(--text-muted)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "rgba(255, 77, 77, 0.08)",
                border: "1px solid rgba(255, 77, 77, 0.2)",
                borderRadius: "10px",
                padding: "14px",
                color: "var(--error)",
                display: "flex",
                gap: "10px",
                marginBottom: "24px",
                fontSize: "13px",
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {activeTab === "participant" ? (
              <>
                {/* First + Last name */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="form-field">
                    <label className="form-label">
                      First Name <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ height: "48px" }}
                      placeholder="Given name"
                      value={form.firstName}
                      onChange={(e) => set("firstName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">
                      Last Name <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ height: "48px" }}
                      placeholder="Family name"
                      value={form.lastName}
                      onChange={(e) => set("lastName", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Academic Email <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="input"
                    style={{ height: "48px" }}
                    placeholder="researcher@institution.edu"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Institution{" "}
                    <span style={{ color: "var(--text-dim)", fontWeight: "400" }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{ height: "48px" }}
                    placeholder="e.g. Sorbonne Université, CNRS"
                    value={form.institution}
                    onChange={(e) => set("institution", e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Company{" "}
                    <span style={{ color: "var(--text-dim)", fontWeight: "400" }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{ height: "48px" }}
                    placeholder="e.g. Neuralink, DeepMind"
                    value={form.company}
                    onChange={(e) => set("company", e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-field">
                  <label className="form-label">
                    Organization Name <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{ height: "48px" }}
                    placeholder="e.g. INRIA Paris, NeuroSpin Lab"
                    value={form.orgName}
                    onChange={(e) => set("orgName", e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Recovery Email <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="input"
                    style={{ height: "48px" }}
                    placeholder="backup@organization.edu"
                    value={form.recoveryEmail}
                    onChange={(e) => set("recoveryEmail", e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Identifier <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{ height: "48px" }}
                    placeholder="e.g. neurocog-lab-paris"
                    value={form.identifier}
                    onChange={(e) => set("identifier", e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* Password */}
            <div className="form-field">
              <label className="form-label">
                Password <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input"
                  style={{ paddingRight: "48px", height: "48px" }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
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
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <PasswordRules password={form.password} />
            </div>

            {/* Confirm password */}
            <div className="form-field">
              <label className="form-label">
                Confirm Password <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  className="input"
                  style={{
                    paddingRight: "48px",
                    height: "48px",
                    borderColor: passwordsMismatch
                      ? "var(--error)"
                      : passwordsMatch
                      ? "var(--success)"
                      : undefined,
                    boxShadow: passwordsMismatch
                      ? "0 0 0 1px var(--error)"
                      : passwordsMatch
                      ? "0 0 0 1px var(--success)"
                      : undefined,
                  }}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
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
                  }}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Live feedback */}
              {form.confirmPassword !== "" && (
                <p
                  style={{
                    fontSize: "12px",
                    marginTop: "6px",
                    color: passwordsMatch ? "var(--success)" : "var(--error)",
                    fontWeight: "600",
                  }}
                >
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                marginTop: "8px",
                height: "52px",
                borderRadius: "12px",
                fontSize: "15px",
              }}
              disabled={loading || passwordsMismatch || !passwordValid}
            >
              {loading
                ? "Processing..."
                : activeTab === "participant"
                ? "Create Profile"
                : "Register Lab"}
            </button>
          </form>

          <div
            style={{
              marginTop: "32px",
              textAlign: "center",
              borderTop: "1px solid var(--border)",
              paddingTop: "28px",
            }}
          >
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
              Already have an account?{" "}
              <Link
                to="/login"
                style={{ color: "var(--accent)", textDecoration: "none", fontWeight: "700" }}
              >
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
