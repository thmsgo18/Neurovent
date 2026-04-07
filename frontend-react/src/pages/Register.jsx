import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import "../styles/Register.css";
import { registerParticipantApi, registerCompanyApi } from "../api/auth";
import { usePreferences } from "../context/PreferencesContext";
import AuthPageShell from "../components/AuthPageShell";

const PW_RULES = [
  { key: "len",     label: "At least 8 characters",         test: (p) => p.length >= 8 },
  { key: "upper",   label: "One uppercase letter (A–Z)",     test: (p) => /[A-Z]/.test(p) },
  { key: "digit",   label: "One number (0–9)",               test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "One special character (!@#…)",   test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordRules({ password, t }) {
  if (!password) return null;
  return (
    <div className="pw-rules">
      {PW_RULES.map(({ key, label, test }) => {
        const ok = test(password);
        return (
          <div key={key} className={`pw-rule pw-rule--${ok ? "ok" : "fail"}`}>
            <span className="pw-rule-icon">{ok ? "✓" : "·"}</span>
            {t(label)}
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
  const { t } = usePreferences();
  const [activeTab, setActiveTab] = useState("participant");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
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
    t("Letters, numbers and hyphens only. This identifier will be used for organization login.");
  const isCompanyTab = activeTab === "organization";
  const sideHighlights = isCompanyTab
    ? [
        t("Enter your SIRET and legal representative details."),
        t("Automatic verification runs right after account creation."),
        t("Use your organization identifier to sign in later."),
      ]
    : [
        t("Create your attendee profile in a few fields."),
        t("Track registrations and confirmations from one dashboard."),
        t("Discover events in AI, ML and neuroscience."),
      ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError(t("Passwords do not match."));
      return;
    }
    if (activeTab === "organization" && siretDigits.length !== 14) {
      setError(t("SIRET must contain exactly 14 digits."));
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
            {activeTab === "participant" ? t("Profile Created!") : t("Organization Account Created!")}
          </h2>
          <p className="register-success-copy">
            {activeTab === "participant"
              ? t("Redirecting to login...")
              : t("We have started the organization verification checks. Redirecting to login...")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthPageShell
      pageClassName="register-page"
      controlsClassName="register-top-brand__controls"
      brandClassName="register-brand register-brand--header"
      brandMarkClassName="register-brand-mark"
      contentClassName="register-body"
    >
        <div className="register-left">
          <div className="register-left-copy">
            <h1 className="register-left-title">
              {isCompanyTab ? (
                <>
                  {t("Empower your")}
                  <br />
                  {t("organization.")}
                </>
              ) : (
                <>
                  {t("Start your")}
                  <br />
                  {t("scientific")}
                  <br />
                  {t("journey.")}
                </>
              )}
            </h1>
            <p className="register-left-desc">
              {isCompanyTab
                ? t("Create your organization account and submit the legal details needed for verification.")
                : t("Connect with top organizations and participants worldwide.")}
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
                { key: "participant", label: t("Participant") },
                { key: "organization", label: t("Organization") },
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
                      {t("First Name")} <span className="form-required">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder={t("Given name")}
                      value={form.firstName}
                      onChange={(e) => set("firstName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">
                      {t("Last Name")} <span className="form-required">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder={t("Family name")}
                      value={form.lastName}
                      onChange={(e) => set("lastName", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    {t("Email Address")} <span className="form-required">*</span>
                  </label>
                  <input
                    type="email"
                    className="input"
                    placeholder={t("participant@institution.edu")}
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    required
                  />
                </div>

              </>
            ) : (
              <>
                <div className="form-field">
                  <label className="form-label">
                    {t("Organization Name")} <span className="form-required">*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t("e.g. INRIA Paris, NeuroSpin Organization")}
                    value={form.orgName}
                    onChange={(e) => set("orgName", e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    {t("Recovery Email")} <span className="form-required">*</span>
                  </label>
                  <input
                    type="email"
                    className="input"
                    placeholder={t("contact@organization.com")}
                    value={form.recoveryEmail}
                    onChange={(e) => set("recoveryEmail", e.target.value)}
                    required
                  />
                </div>

                <div className="register-form-row">
                  <div className="form-field">
                    <label className="form-label">
                      {t("Identifier")} <span className="form-required">*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder={t("e.g. neurocog-organization-paris")}
                      value={form.identifier}
                      onChange={(e) => set("identifier", e.target.value)}
                      minLength={3}
                      maxLength={50}
                      pattern="^[A-Za-z0-9-]+$"
                      title={t("Use only letters, numbers, and hyphens.")}
                      autoCapitalize="off"
                      autoCorrect="off"
                      required
                    />
                    <p className="register-help">{identifierHelp}</p>
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      SIRET <span className="form-required">*</span>
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
                        ? t("14 digits required for automatic company verification.")
                        : t("{{count}}/14 digits entered", { count: siretDigits.length })}
                    </p>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    {t("Legal Representative")} <span className="form-required">*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t("e.g. Marie Dupont")}
                    value={form.legalRepresentative}
                    onChange={(e) => set("legalRepresentative", e.target.value)}
                    required
                  />
                  <p className="register-help">
                    {t("Enter the name of the person who legally represents the company.")}
                  </p>
                </div>
              </>
            )}

            {/* Password */}
            <div className="form-field">
              <label className="form-label">
                {t("Password")} <span className="form-required">*</span>
              </label>
              <div className="register-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input register-password-input"
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
              <PasswordRules password={form.password} t={t} />
            </div>

            {/* Confirm password */}
            <div className="form-field">
              <label className="form-label">
                {t("Confirm Password")} <span className="form-required">*</span>
              </label>
              <div className="register-password-wrap">
                <input
                  type={showConfirm ? "text" : "password"}
                  className={`input register-password-input${passwordsMismatch ? " register-password-input--error" : ""}${passwordsMatch ? " register-password-input--match" : ""}`}
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
                  {passwordsMatch ? t("Passwords match") : t("Passwords do not match")}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary register-submit"
              disabled={loading || passwordsMismatch || !passwordValid}
            >
              {loading
                ? t("Processing...")
                : activeTab === "participant"
                ? t("Create Profile")
                : t("Register Organization")}
            </button>
          </form>

            <div className="register-footer">
              <p>
                {t("Already have an account?")}{" "}
                <Link to="/login">{t("Log In")}</Link>
              </p>
            </div>
          </div>
        </div>
    </AuthPageShell>
  );
}
