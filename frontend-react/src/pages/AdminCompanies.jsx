import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Admin.css";
import { deleteAdminUser, getAdminCompanies, verifyAdminCompany } from "../api/admin";

function formatJoined(value) {
  if (!value) return "Unknown join date";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getVerificationTone(status) {
  if (status === "VERIFIED") return "admin-pill--success";
  if (status === "REJECTED") return "admin-pill--danger";
  if (status === "NEEDS_REVIEW") return "admin-pill--warning";
  return "admin-pill--muted";
}

export default function AdminCompanies() {
  const navigate = useNavigate();
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
      ? "Delete this organization account while it is still pending verification? This action cannot be undone."
      : "Delete this verified organization account? This action cannot be undone.";
    if (!window.confirm(confirmMessage)) return;
    try {
      await deleteAdminUser(company.id);
      setVerifiedCompanies((prev) => prev.filter((item) => item.id !== company.id));
      setPendingCompanies((prev) => prev.filter((item) => item.id !== company.id));
    } catch (error) {
      alert(error.message || "Unable to delete this organization right now.");
    }
  };

  const handleVerify = async (event, companyId, verificationStatus) => {
    event.stopPropagation();
    try {
      await verifyAdminCompany(companyId, verificationStatus);
      loadCompanies();
    } catch (error) {
      alert(error.message || "Unable to update this verification status.");
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
              <h1 className="admin-title">Organizations</h1>
              <p className="admin-copy">
                Monitor organization accounts, validate pending applications, and review every company currently active on the platform.
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
                placeholder="Search any organization field..."
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
                  View All
                </button>
              ) : null}
            </form>
          </header>

          <div className={`admin-grid${hasPending ? "" : " admin-grid--single"}`}>
            <section className="admin-section">
              <div className="admin-section-head">
                <h2 className="admin-section-title">Pending Verification</h2>
                <span className="admin-section-meta">{pendingCompanies.length} waiting review</span>
              </div>

              {pendingCompanies.length === 0 ? (
                <div className="admin-empty">No organization is currently waiting for manual review.</div>
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
                          <h3 className="admin-card-title">{company.company_name || "Organization"}</h3>
                          <p className="admin-card-subtitle">{company.recovery_email || "No recovery email"}</p>
                          <div className="admin-card-meta">
                            <span className={`admin-pill ${getVerificationTone(company.verification_status)}`}>
                              {company.verification_status}
                            </span>
                            <span className="admin-pill admin-pill--muted">SIRET {company.siret || "missing"}</span>
                            <span className="admin-pill admin-pill--muted">Joined {formatJoined(company.date_joined)}</span>
                            {(company.match_reasons || []).map((reason) => (
                              <span key={reason} className="admin-pill admin-pill--warning">Match in {reason}</span>
                            ))}
                          </div>
                          {company.review_note ? (
                            <p className="admin-card-subtitle" style={{ marginTop: "12px" }}>
                              Review reason: {company.review_note}
                            </p>
                          ) : (
                            <p className="admin-card-subtitle" style={{ marginTop: "12px" }}>
                              Review reason: automatic verification found missing or inconsistent company details.
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
                          View profile
                        </button>
                        <div className="admin-actions">
                          <button type="button" className="admin-secondary-btn" onClick={(event) => handleVerify(event, company.id, "VERIFIED")}>
                            Approve
                          </button>
                          <button
                            type="button"
                            className="admin-danger-btn"
                            onClick={(event) => handleDelete(event, company)}
                          >
                            Delete
                          </button>
                          <button type="button" className="admin-danger-btn" onClick={(event) => handleVerify(event, company.id, "REJECTED")}>
                            Reject
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
                <h2 className="admin-section-title">Verified Organizations</h2>
                <span className="admin-section-meta">{verifiedCount} organization{verifiedCount !== 1 ? "s" : ""}</span>
              </div>

              {loading ? (
                <div className="admin-empty">Loading companies...</div>
              ) : verifiedCompanies.length === 0 ? (
                <div className="admin-empty">No verified organizations match the current search.</div>
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
                          <h3 className="admin-card-title">{company.company_name || "Organization"}</h3>
                          <p className="admin-card-subtitle">{company.recovery_email || "No recovery email"}</p>
                          <div className="admin-card-meta">
                            <span className={`admin-pill ${getVerificationTone(company.verification_status)}`}>
                              {company.verification_status}
                            </span>
                            <span className={`admin-pill ${company.is_active ? "admin-pill--success" : "admin-pill--danger"}`}>
                              {company.is_active ? "Active" : "Inactive"}
                            </span>
                            <span className="admin-pill admin-pill--muted">Joined {formatJoined(company.date_joined)}</span>
                            {(company.match_reasons || []).map((reason) => (
                              <span key={reason} className="admin-pill admin-pill--warning">Match in {reason}</span>
                            ))}
                          </div>
                        </div>

                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-danger-btn"
                            onClick={(event) => handleDelete(event, company)}
                          >
                            Delete
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
