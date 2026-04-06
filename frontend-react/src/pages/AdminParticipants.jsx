import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Admin.css";
import { deleteAdminUser, getAdminUsers } from "../api/admin";
import { apiFetch } from "../api/client";
import { usePreferences } from "../context/PreferencesContext";

function formatJoined(value, locale, t) {
  if (!value) return t("Unknown join date");
  return new Date(value).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminParticipants() {
  const navigate = useNavigate();
  const { t, locale } = usePreferences();
  const [participants, setParticipants] = useState([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAdminUsers({ role: "PARTICIPANT", search: submittedSearch })
      .then((data) => {
        setParticipants(data.results || []);
        setCount(data.count || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [submittedSearch]);

  const handleDelete = async (event, userId) => {
    event.stopPropagation();
    if (!window.confirm(t("Delete this participant account? This action cannot be undone."))) return;
    try {
      await deleteAdminUser(userId);
      setParticipants((prev) => prev.filter((item) => item.id !== userId));
      setCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      alert(error.message || t("Unable to delete this participant right now."));
    }
  };

  const handleToggleSuspension = async (event, participant) => {
    event.stopPropagation();
    const nextAction = participant.is_active ? "suspend" : "activate";
    const confirmMessage = participant.is_active
      ? t("Suspend this participant account?")
      : t("Reactivate this participant account?");
    if (!window.confirm(confirmMessage)) return;
    try {
      await apiFetch(`/api/auth/admin/users/${participant.id}/${nextAction}/`, { method: "PATCH" });
      setParticipants((prev) => prev.map((item) => (
        item.id === participant.id ? { ...item, is_active: !item.is_active } : item
      )));
    } catch (error) {
      alert(error.message || t("Unable to update this participant status."));
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-stack">
          <header className="admin-header">
            <div>
              <h1 className="admin-title">{t("Participants")}</h1>
              <p className="admin-copy">
                {t("Review participant accounts, open their profile pages, and remove accounts when moderation is needed.")}
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
                placeholder={t("Search any participant field...")}
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

          <section className="admin-section">
            <div className="admin-section-head">
              <span className="admin-section-meta">
                {t("{{count}} participant{{suffix}}", { count, suffix: count !== 1 ? "s" : "" })}
              </span>
            </div>

            {loading ? (
              <div className="admin-empty">{t("Loading participants...")}</div>
            ) : participants.length === 0 ? (
              <div className="admin-empty">{t("No participants match the current search.")}</div>
            ) : (
              <div className="admin-list">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="admin-card admin-card--interactive"
                    onClick={() => navigate(`/admin/participants/${participant.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/admin/participants/${participant.id}`);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="admin-card-top">
                      <div className="admin-card-copy">
                        <h3 className="admin-card-title">{participant.name || t("Participant")}</h3>
                        <p className="admin-card-subtitle">{participant.email || t("No email available")}</p>
                        <div className="admin-card-meta">
                          <span className={`admin-pill ${participant.is_active ? "admin-pill--success" : "admin-pill--danger"}`}>
                            {participant.is_active ? t("Active") : t("Inactive")}
                          </span>
                          <span className="admin-pill admin-pill--muted">
                            {t("Joined {{date}}", { date: formatJoined(participant.date_joined, locale, t) })}
                          </span>
                          {(participant.match_reasons || []).map((reason) => (
                            <span key={reason} className="admin-pill admin-pill--warning">
                              {t("Match in {{reason}}", { reason })}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-secondary-btn"
                          onClick={(event) => handleToggleSuspension(event, participant)}
                        >
                          {participant.is_active ? t("Suspend") : t("Reactivate")}
                        </button>
                        <button
                          type="button"
                          className="admin-danger-btn"
                          onClick={(event) => handleDelete(event, participant.id)}
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
  );
}
