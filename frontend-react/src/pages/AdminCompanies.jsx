import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Admin.css";
import { deleteAdminUser, getAdminCompanies, verifyAdminCompany } from "../api/admin";
import { usePreferences } from "../context/PreferencesContext";

function formatJoined(value, locale, t) {
  if (!value) return t("Unknown join date");
  return new Date(value).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getVerificationTone(status) {
  if (status === "VERIFIED") return "admin-pill--success";
  if (status === "REJECTED") return "admin-pill--danger";
  if (status === "NEEDS_REVIEW") return "admin-pill--warning";
  return "admin-pill--muted";
}

function getVerificationLabel(status, t) {
  if (status === "VERIFIED") return t("Verified");
  if (status === "REJECTED") return t("Rejected");
  if (status === "NEEDS_REVIEW") return t("Needs Review");
  if (status === "PENDING") return t("Pending");
  return status || t("Unknown");
}

export default function AdminCompanies() {
  const navigate = useNavigate();
  const { t, locale } = usePreferences();
  const [verifiedCompanies, setVerifiedCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingCompanies, setPendingCompanies] = useState([]);

  const loadCompanies = useCallback(async () => {
    const [pending, needsReview, verified] = await Promise.all([
      getAdminCompanies({ verificationStatus: "PENDING", search: submittedSearch }),
      getAdminCompanies({ verificationStatus: "NEEDS_REVIEW", search: submittedSearch }),
      getAdminCompanies({ verificationStatus: "VERIFIED", search: submittedSearch }),
    ]);
    setPendingCompanies([...(pending.results || []), ...(needsReview.results || [])]);
    setVerifiedCompanies(verified.results || []);
  }, [submittedSearch]);

  useEffect(() => {
    setLoading(true);
    loadCompanies()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [loadCompanies]);

  const handleDelete = async (event, company) => {
    event.stopPropagation();
    const isPendingCompany = company.verification_status !== "VERIFIED";
    const confirmMessage = isPendingCompany
      ? t("Delete this organization account while it is still pending verification? This action cannot be undone.")
      : t("Delete this verified organization account? This action cannot be undone.");
    if (!window.confirm(confirmMessage)) return;
    try {
      await deleteAdminUser(company.id);
      setVerifiedCompanies((prev) => prev.filter((item) => item.id !== company.id));
      setPendingCompanies((prev) => prev.filter((item) => item.id !== company.id));
    } catch (error) {
      alert(error.message || t("Unable to delete this organization right now."));
    }
  };

  const handleVerify = async (event, companyId, verificationStatus) => {
    event.stopPropagation();
    try {
      await verifyAdminCompany(companyId, verificationStatus);
      loadCompanies();
    } catch (error) {
      alert(error.message || t("Unable to update this verification status."));
    }
  };

  const hasPending = pendingCompanies.length > 0;
  const verifiedCount = verifiedCompanies.length;

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-stack">
          <header className="admin-header">
            <div>
              <h1 className="admin-title">{t("Organizations")}</h1>
              <p className="admin-copy">
                {t("Monitor organization accounts, validate pending applications, and review every company currently active on the platform.")}
              </p>
            </div>

            <form
              className="admin-toolbar"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmittedSearch(search.trim());
              }}
            >
              <input
                className="input admin-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Search any organization field...")}
              />
              {submittedSearch ? (
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={() => {
                    setSearch("");
                    setSubmittedSearch("");
                  }}
                >
                  {t("View All")}
                </button>
              ) : null}
            </form>
          </header>

          <div className={`admin-grid${hasPending ? "" : " admin-grid--single"}`}>
            <section className="admin-section">
              <div className="admin-section-head">
                <h2 className="admin-section-title">{t("Pending Verification")}</h2>
                <span className="admin-section-meta">
                  {t("{{count}} waiting review", { count: pendingCompanies.length })}
                </span>
              </div>

              {pendingCompanies.length === 0 ? (
                <div className="admin-empty">{t("No organization is currently waiting for manual review.")}</div>
              ) : (
                <div className="admin-list">
                  {pendingCompanies.map((company) => (
                    <div
                      key={company.id}
                      className="admin-card admin-card--interactive"
                      onClick={() => navigate(`/company/${company.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/company/${company.id}`);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="admin-card-top">
                        <div className="admin-card-copy">
                          <h3 className="admin-card-title">{company.company_name || t("Organization")}</h3>
                          <p className="admin-card-subtitle">{company.recovery_email || t("No recovery email")}</p>
                          <div className="admin-card-meta">
                            <span className={`admin-pill ${getVerificationTone(company.verification_status)}`}>
                              {getVerificationLabel(company.verification_status, t)}
                            </span>
                            <span className="admin-pill admin-pill--muted">
                              {t("SIRET {{value}}", { value: company.siret || t("missing") })}
                            </span>
                            <span className="admin-pill admin-pill--muted">
                              {t("Joined {{date}}", { date: formatJoined(company.date_joined, locale, t) })}
                            </span>
                            {(company.match_reasons || []).map((reason) => (
                              <span key={reason} className="admin-pill admin-pill--warning">
                                {t("Match in {{reason}}", { reason })}
                              </span>
                            ))}
                          </div>
                          {company.review_note ? (
                            <p className="admin-card-subtitle admin-card-subtitle--spaced">
                              {t("Review reason: {{reason}}", { reason: company.review_note })}
                            </p>
                          ) : (
                            <p className="admin-card-subtitle admin-card-subtitle--spaced">
                              {t("Review reason: automatic verification found missing or inconsistent company details.")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="admin-card-footer">
                        <button
                          type="button"
                          className="admin-secondary-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/company/${company.id}`);
                          }}
                        >
                          {t("View profile")}
                        </button>
                        <div className="admin-actions">
                          <button type="button" className="admin-secondary-btn" onClick={(event) => handleVerify(event, company.id, "VERIFIED")}>
                            {t("Approve")}
                          </button>
                          <button
                            type="button"
                            className="admin-danger-btn"
                            onClick={(event) => handleDelete(event, company)}
                          >
                            {t("Delete")}
                          </button>
                          <button type="button" className="admin-danger-btn" onClick={(event) => handleVerify(event, company.id, "REJECTED")}>
                            {t("Reject")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-section">
              <div className="admin-section-head">
                <h2 className="admin-section-title">{t("Verified Organizations")}</h2>
                <span className="admin-section-meta">
                  {t("{{count}} organization{{suffix}}", { count: verifiedCount, suffix: verifiedCount !== 1 ? "s" : "" })}
                </span>
              </div>

              {loading ? (
                <div className="admin-empty">{t("Loading companies...")}</div>
              ) : verifiedCompanies.length === 0 ? (
                <div className="admin-empty">{t("No verified organizations match the current search.")}</div>
              ) : (
                <div className="admin-list">
                  {verifiedCompanies.map((company) => (
                    <div
                      key={company.id}
                      className="admin-card admin-card--interactive"
                      onClick={() => navigate(`/company/${company.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/company/${company.id}`);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="admin-card-top">
                        <div className="admin-card-copy">
                          <h3 className="admin-card-title">{company.company_name || t("Organization")}</h3>
                          <p className="admin-card-subtitle">{company.recovery_email || t("No recovery email")}</p>
                          <div className="admin-card-meta">
                            <span className={`admin-pill ${getVerificationTone(company.verification_status)}`}>
                              {getVerificationLabel(company.verification_status, t)}
                            </span>
                            <span className={`admin-pill ${company.is_active ? "admin-pill--success" : "admin-pill--danger"}`}>
                              {company.is_active ? t("Active") : t("Inactive")}
                            </span>
                            <span className="admin-pill admin-pill--muted">
                              {t("Joined {{date}}", { date: formatJoined(company.date_joined, locale, t) })}
                            </span>
                            {(company.match_reasons || []).map((reason) => (
                              <span key={reason} className="admin-pill admin-pill--warning">
                                {t("Match in {{reason}}", { reason })}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="admin-actions">
                          <button
                          type="button"
                          className="admin-danger-btn"
                          onClick={(event) => handleDelete(event, company)}
                        >
                          {t("Delete")}
                        </button>
                      </div>
                    </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
