import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCompanyProfile } from "../api/companies";
import { normalizeEvent } from "../api/events";
import { OrganizationProfileOverviewContent } from "./ProfileOverview";
import { deleteAdminUser, getAdminEvents, getAdminUserProfile } from "../api/admin";
import { getRole } from "../store/authStore";
import "../styles/Admin.css";
import { usePreferences } from "../context/PreferencesContext";

export default function CompanyProfile() {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = getRole() === "ADMIN";

  useEffect(() => {
    const load = async () => {
      try {
        if (isAdmin) {
          const adminCompany = await getAdminUserProfile(id);
          setCompany(adminCompany);
          if (adminCompany.company_name) {
            const adminEvents = await getAdminEvents({ organization: adminCompany.company_name });
            setEvents(adminEvents.results || []);
          } else {
            setEvents([]);
          }
        } else {
          const publicCompany = await getCompanyProfile(id);
          setCompany(publicCompany);
          setEvents((publicCompany.events || []).map(normalizeEvent));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isAdmin]);

  if (loading) return null;
  if (!company) return null;

  const handleDelete = async () => {
    const isPendingCompany = company.verification_status !== "VERIFIED";
    const confirmMessage = isPendingCompany
      ? t("Delete this organization account while it is still pending verification? This action cannot be undone.")
      : t("Delete this verified organization account? This action cannot be undone.");
    if (!window.confirm(confirmMessage)) return;
    try {
      await deleteAdminUser(company.id);
      navigate("/admin/companies");
    } catch (error) {
      alert(error.message || t("Unable to delete this organization."));
    }
  };

  return (
    <div className="admin-page">
      {isAdmin ? (
        <div className="admin-shell">
          <div className="admin-stack admin-stack--tight">
            <div className="admin-header admin-header--detail">
              <button type="button" className="admin-back-btn admin-back-btn--animated" onClick={() => navigate("/admin/companies")}>
                <span className="admin-back-btn__arrow" aria-hidden="true">←</span>
                {t("Back to Organizations")}
              </button>
              <div className="admin-actions">
                <button type="button" className="admin-danger-btn" onClick={handleDelete}>
                  {t("Delete Organization")}
                </button>
              </div>
            </div>
            {company.verification_status !== "VERIFIED" ? (
              <div className="admin-empty admin-empty--review">
                {t("Review reason: {{reason}}", {
                  reason: company.review_note || t("This organization is waiting for manual validation because some company details are missing or inconsistent."),
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={isAdmin ? "admin-shell admin-shell--profile" : undefined}>
        <OrganizationProfileOverviewContent
          company={company}
          events={events}
          showEditButton={false}
          showBadges={!isAdmin}
          subtitle={isAdmin ? (company.recovery_email || t("Organization profile")) : t("Public organization profile")}
          wrapInShell={!isAdmin}
          onOpenEvents={isAdmin ? ((companyName, mode) => {
            const params = new URLSearchParams();
            params.set("organization", companyName);
            if (mode === "upcoming") {
              params.set("scope", "future");
            }
            navigate(`/admin/events?${params.toString()}`);
          }) : undefined}
        />
      </div>
    </div>
  );
}
