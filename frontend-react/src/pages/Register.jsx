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

function formatSiret(value) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  const parts = [];

  if (digits.slice(0, 3)) parts.push(digits.slice(0, 3));
  if (digits.slice(3, 6)) parts.push(digits.slice(3, 6));
  if (digits.slice(6, 9)) parts.push(digits.slice(6, 9));
  if (digits.slice(9, 14)) parts.push(digits.slice(9, 14));

  return parts.join(" ");
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
    siret: "",
    legalRepresentative: "",
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
  const siretDigits = form.siret.replace(/\D/g, "");
  const identifierHelp =
    "Letters, numbers and hyphens only. This identifier will be used for company login.";
  const isCompanyTab = activeTab === "organization";
  const sideHighlights = isCompanyTab
    ? [
        "Enter your SIRET and legal representative details.",
        "Automatic verification runs right after account creation.",
        "Use your company identifier to sign in later.",
      ]
    : [
        "Create your attendee profile in a few fields.",
        "Track registrations and confirmations from one dashboard.",
        "Discover events in AI, ML and neuroscience.",
      ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (activeTab === "organization" && siretDigits.length !== 14) {
      setError("Le SIRET doit contenir exactement 14 chiffres.");
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
          identifier: form.identifier.trim(),
          companyName: form.orgName.trim(),
          recoveryEmail: form.recoveryEmail.trim(),
          siret: siretDigits,
          legalRepresentative: form.legalRepresentative.trim(),
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
      <div className="register-success">
        <div className="register-success-card card">
          <div className="register-success-icon">
            <CheckCircle size={36} color="var(--success)" />
          </div>
          <h2 className="register-success-title">
            {activeTab === "participant" ? "Profile Created!" : "Company Account Created!"}
          </h2>
          <p className="register-success-copy">
            {activeTab === "participant"
              ? "Redirecting to login..."
              : "We have started the company verification checks. Redirecting to login..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-left">
        <Link to="/" className="register-brand">
          <span className="register-brand-text">
            Neuro<span style={{ color: "var(--accent)" }}>vent</span>
          </span>
        </Link>

        <div className="register-left-copy">
          <h1 className="register-left-title">
            {isCompanyTab ? (
              <>
                Empower your
                <br />
                organization.
              </>
            ) : (
              <>
                Start your
                <br />
                scientific
                <br />
                journey.
              </>
            )}
          </h1>
          <p className="register-left-desc">
            {isCompanyTab
              ? "Create your company account and submit the legal details needed for verification."
              : "Connect with top labs and researchers worldwide."}
          </p>
        </div>

        <div className="register-left-features">
          {sideHighlights.map((item) => (
            <div key={item} className="register-left-feature">
              <span className="register-left-feature-dot" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="register-right">
        <div className="register-form-wrap">
          <div className="register-tab-switcher">
            {[
              { key: "participant", label: "Participant" },
              { key: "organization", label: "Company" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setError("");
                }}
                className={`register-tab-button${activeTab === tab.key ? " register-tab-button--active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="register-error">
              <AlertCircle size={18} className="register-error-icon" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {activeTab === "participant" ? (
              <>
                <div className="register-form-row">
                  <div className="form-field">
                    <label className="form-label">
                      First Name <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
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
                    placeholder="e.g. Neuralink, DeepMind"
                    value={form.company}
                    onChange={(e) => set("company", e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="register-note">
                  Your company account is checked using the declared SIRET and the legal representative name.
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Organization Name <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
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
                    placeholder="contact@organization.com"
                    value={form.recoveryEmail}
                    onChange={(e) => set("recoveryEmail", e.target.value)}
                    required
                  />
                </div>

                <div className="register-form-row">
                  <div className="form-field">
                    <label className="form-label">
                      Identifier <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. neurocog-lab-paris"
                      value={form.identifier}
                      onChange={(e) => set("identifier", e.target.value)}
                      minLength={3}
                      maxLength={50}
                      pattern="^[A-Za-z0-9-]+$"
                      title="Use only letters, numbers, and hyphens."
                      autoCapitalize="off"
                      autoCorrect="off"
                      required
                    />
                    <p className="register-help">{identifierHelp}</p>
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      SIRET <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      inputMode="numeric"
                      placeholder="123 456 789 00012"
                      value={form.siret}
                      onChange={(e) => set("siret", formatSiret(e.target.value))}
                      required
                    />
                    <p className={`register-help${siretDigits.length === 14 || form.siret.length === 0 ? "" : " register-help--error"}`}>
                      {siretDigits.length === 0
                        ? "14 digits required for automatic company verification."
                        : `${siretDigits.length}/14 digits entered`}
                    </p>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Legal Representative <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Marie Dupont"
                    value={form.legalRepresentative}
                    onChange={(e) => set("legalRepresentative", e.target.value)}
                    required
                  />
                  <p className="register-help">
                    Enter the name of the person who legally represents the company.
                  </p>
                </div>
              </>
            )}

            {/* Password */}
            <div className="form-field">
              <label className="form-label">
                Password <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <div className="register-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input"
                  style={{ paddingRight: "48px" }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="register-password-toggle"
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
              <div className="register-password-wrap">
                <input
                  type={showConfirm ? "text" : "password"}
                  className="input"
                  style={{
                    paddingRight: "48px",
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
                  className="register-password-toggle"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {form.confirmPassword !== "" && (
                <p className={`register-match${passwordsMatch ? " register-match--ok" : " register-match--error"}`}>
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary register-submit"
              disabled={loading || passwordsMismatch || !passwordValid}
            >
              {loading
                ? "Processing..."
                : activeTab === "participant"
                ? "Create Profile"
                : "Register Company"}
            </button>
          </form>

          <div className="register-footer">
            <p>
              Already have an account?{" "}
              <Link to="/login">Log In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
