import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Admin.css";
import { deleteAdminUser, getAdminUserProfile } from "../api/admin";
import { ParticipantProfileOverviewContent } from "./ProfileOverview";
import { apiFetch } from "../api/client";
import { usePreferences } from "../context/PreferencesContext";

export default function AdminParticipantProfile() {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const { id } = useParams();
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminUserProfile(id)
      .then(setParticipant)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-shell">
          <div className="admin-empty">{t("Loading participant profile...")}</div>
        </div>
      </div>
    );
  }

  if (!participant || participant.role !== "PARTICIPANT") {
    return (
      <div className="admin-page">
        <div className="admin-shell">
          <button type="button" className="admin-back-btn" onClick={() => navigate("/admin/participants")}>
            {t("Back to Participants")}
          </button>
          <div className="admin-empty admin-empty--spaced">
            {t("This participant profile could not be loaded.")}
          </div>
        </div>
      </div>
    );
  }

  const toggleSuspension = async () => {
    const nextAction = participant.is_active ? "suspend" : "activate";
    const confirmMessage = participant.is_active
      ? t("Suspend this participant account?")
      : t("Reactivate this participant account?");
    if (!window.confirm(confirmMessage)) return;
    try {
      await apiFetch(`/api/auth/admin/users/${participant.id}/${nextAction}/`, { method: "PATCH" });
      setParticipant((prev) => ({ ...prev, is_active: !prev.is_active }));
    } catch (error) {
      alert(error.message || t("Unable to update this participant status."));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("Delete this participant account? This action cannot be undone."))) return;
    try {
      await deleteAdminUser(participant.id);
      navigate("/admin/participants");
    } catch (error) {
      alert(error.message || t("Unable to delete this participant."));
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-stack admin-stack--tight">
          <div className="admin-header admin-header--detail">
            <button type="button" className="admin-back-btn admin-back-btn--animated" onClick={() => navigate("/admin/participants")}>
              <span className="admin-back-btn__arrow" aria-hidden="true">←</span>
              {t("Back to Participants")}
            </button>
            <div className="admin-actions">
              <button type="button" className="admin-secondary-btn" onClick={toggleSuspension}>
                {participant.is_active ? t("Suspend Participant") : t("Reactivate Participant")}
              </button>
              <button type="button" className="admin-danger-btn" onClick={handleDelete}>
                {t("Delete Participant")}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="admin-shell admin-shell--profile">
        <ParticipantProfileOverviewContent
          participant={participant}
          registrations={[]}
          showEditButton={false}
          showBadges={false}
          subtitle={participant.email || t("Participant profile")}
          wrapInShell={false}
        />
      </div>
    </div>
  );
}
