import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Admin.css";
import { deleteAdminUser, getAdminUsers } from "../api/admin";
import { apiFetch } from "../api/client";

function formatJoined(value) {
  if (!value) return "Unknown join date";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminParticipants() {
  const navigate = useNavigate();
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
    if (!window.confirm("Delete this participant account? This action cannot be undone.")) return;
    try {
      await deleteAdminUser(userId);
      setParticipants((prev) => prev.filter((item) => item.id !== userId));
      setCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      alert(error.message || "Unable to delete this participant right now.");
    }
  };

  const handleToggleSuspension = async (event, participant) => {
    event.stopPropagation();
    const nextAction = participant.is_active ? "suspend" : "activate";
    const confirmMessage = participant.is_active
      ? "Suspend this participant account?"
      : "Reactivate this participant account?";
    if (!window.confirm(confirmMessage)) return;
    try {
      await apiFetch(`/api/auth/admin/users/${participant.id}/${nextAction}/`, { method: "PATCH" });
      setParticipants((prev) => prev.map((item) => (
        item.id === participant.id ? { ...item, is_active: !item.is_active } : item
      )));
    } catch (error) {
      alert(error.message || "Unable to update this participant status.");
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-stack">
          <header className="admin-header">
            <div>
              <h1 className="admin-title">Participants</h1>
              <p className="admin-copy">
                Review participant accounts, open their profile pages, and remove accounts when moderation is needed.
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
                placeholder="Search any participant field..."
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

          <section className="admin-section">
            <div className="admin-section-head">
              <span className="admin-section-meta">{count} participant{count !== 1 ? "s" : ""}</span>
            </div>

            {loading ? (
              <div className="admin-empty">Loading participants...</div>
            ) : participants.length === 0 ? (
              <div className="admin-empty">No participants match the current search.</div>
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
                        <h3 className="admin-card-title">{participant.name || "Participant"}</h3>
                        <p className="admin-card-subtitle">{participant.email || "No email available"}</p>
                        <div className="admin-card-meta">
                          <span className={`admin-pill ${participant.is_active ? "admin-pill--success" : "admin-pill--danger"}`}>
                            {participant.is_active ? "Active" : "Inactive"}
                          </span>
                          <span className="admin-pill admin-pill--muted">Joined {formatJoined(participant.date_joined)}</span>
                          {(participant.match_reasons || []).map((reason) => (
                            <span key={reason} className="admin-pill admin-pill--warning">Match in {reason}</span>
                          ))}
                        </div>
                      </div>

                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-secondary-btn"
                          onClick={(event) => handleToggleSuspension(event, participant)}
                        >
                          {participant.is_active ? "Suspend" : "Reactivate"}
                        </button>
                        <button
                          type="button"
                          className="admin-danger-btn"
                          onClick={(event) => handleDelete(event, participant.id)}
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
  );
}
