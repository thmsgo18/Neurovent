import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Lock, Download, Check, X, Users, Trash2 } from "lucide-react";
import "../styles/EventDetail.css";
import { getEvent, deleteEvent, getEventStats } from "../api/events";
import { registerToEvent, cancelRegistration, getMyRegistrations, getEventRegistrations, updateRegistrationStatus, exportEventRegistrations, removeEventRegistration } from "../api/registrations";
import { isAuthed, isCompany, getCompanyName } from "../store/authStore";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const authed = isAuthed();
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [registerError, setRegisterError] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Company owner panel
  const [showRegistrations, setShowRegistrations] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [removingRegistrationId, setRemovingRegistrationId] = useState(null);

  useEffect(() => {
    getEvent(id)
      .then(setEvent)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  // Vérifier si le participant est déjà inscrit
  useEffect(() => {
    if (!authed || isCompany()) return;
    getMyRegistrations().then((regs) => {
      const eventId = parseInt(id);
      const reg = regs.find((r) => {
        const rEventId = typeof r.event === "object" ? r.event.id : r.event;
        return rEventId === eventId;
      });
      if (reg) {
        if (reg.status !== "CANCELLED" && reg.status !== "REJECTED") {
          setRegistered(true);
          setRegistrationId(reg.id);
          setRegistrationStatus(reg.status);
        }
      }
    }).catch(console.error);
  }, [id, authed]);

  const handleRegister = async () => {
    if (!authed) { setShowAccessModal(true); return; }
    setRegisterError("");
    try {
      const reg = await registerToEvent(parseInt(id));
      setRegistered(true);
      setRegistrationId(reg.id);
      const status = reg.status || (
        event.validation === "manual" ? "PENDING" :
        isFull ? "WAITLIST" : "CONFIRMED"
      );
      setRegistrationStatus(status);
      // Mettre à jour le compteur localement
      if (reg.status === "CONFIRMED") {
        setEvent((prev) => prev ? {
          ...prev,
          registered_count: (prev.registered_count || 0) + 1,
          spots_remaining: Math.max(0, (prev.spots_remaining ?? prev.max_participants ?? 0) - 1),
        } : prev);
      }
    } catch (err) {
      if (err.message?.toLowerCase().includes("déjà inscrit")) {
        // Déjà inscrit → recharger silencieusement le statut
        getMyRegistrations().then((regs) => {
          const reg = regs.find((r) => {
            const rId = typeof r.event === "object" ? r.event.id : r.event;
            return rId === parseInt(id);
          });
          if (reg) {
            setRegistered(true);
            setRegistrationId(reg.id);
            setRegistrationStatus(reg.status);
          }
        }).catch(console.error);
      } else {
        setRegisterError(err.message || "Registration failed. Please try again.");
      }
    }
  };

  const handleCancelRegistration = async () => {
    if (!registrationId) return;
    setCancelLoading(true);
    try {
      await cancelRegistration(registrationId);
      setRegistered(false);
      setRegistrationId(null);
      setRegistrationStatus(null);
      // Mettre à jour le compteur localement
      setEvent((prev) => prev ? {
        ...prev,
        registered_count: Math.max(0, (prev.registered_count || 0) - 1),
        spots_remaining: (prev.spots_remaining ?? 0) + 1,
      } : prev);
    } catch (err) {
      setRegisterError(err.message || "Failed to cancel registration.");
    } finally {
      setCancelLoading(false);
    }
  };

  const loadRegistrations = () => {
    setRegsLoading(true);
    Promise.all([
      getEvent(id),
      getEventRegistrations(id),
      getEventStats(id),
    ]).then(([freshEvent, regs, s]) => {
      setEvent(freshEvent);
      setRegistrations(regs);
      setStats(s);
    }).catch(console.error)
      .finally(() => setRegsLoading(false));
  };

  const handleToggleRegistrations = () => {
    const next = !showRegistrations;
    setShowRegistrations(next);
    if (next && registrations.length === 0) loadRegistrations();
  };

  const handleUpdateStatus = async (regId, status) => {
    try {
      await updateRegistrationStatus(regId, status);
      loadRegistrations();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveRegistration = async (regId) => {
    const confirmed = window.confirm("Remove this participant from the event? They will receive an email notification.");
    if (!confirmed) return;

    setRemovingRegistrationId(regId);
    try {
      await removeEventRegistration(regId);
      loadRegistrations();
    } catch (err) {
      alert(err.message || "Failed to remove this registration.");
    } finally {
      setRemovingRegistrationId(null);
    }
  };

  const handleCancelEvent = async () => {
    if (!cancelConfirm) { setCancelConfirm(true); return; }
    try {
      await deleteEvent(id);
      navigate("/dashboard");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await exportEventRegistrations(id);
    } catch (err) {
      alert(err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const myCompanyName = getCompanyName();
  const isEventOwner = isCompany() && myCompanyName && event?.company_name === myCompanyName;

  useEffect(() => {
    if (!isEventOwner) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
    };
  }, [isEventOwner]);

  const statusColor = {
    CONFIRMED: "var(--success)",
    PENDING: "#f5c400",
    WAITLIST: "var(--accent)",
    REJECTED: "var(--error)",
    CANCELLED: "var(--text-dim)",
  };

  const registrationBannerClass =
    registrationStatus === "WAITLIST"
      ? "event-detail-status-banner event-detail-status-banner--waitlist"
      : registrationStatus === "PENDING"
      ? "event-detail-status-banner event-detail-status-banner--pending"
      : "event-detail-status-banner event-detail-status-banner--confirmed";

  const formatRemainingTime = (targetDate, prefix, endedLabel) => {
    if (!targetDate) return null;

    const targetTimestamp = new Date(targetDate).getTime();
    const diff = targetTimestamp - nowTimestamp;

    if (Number.isNaN(targetTimestamp)) return null;
    if (diff <= 0) return endedLabel;

    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${prefix} ${days} day${days > 1 ? "s" : ""}`;
    }
    if (hours > 0) {
      return `${prefix} ${hours} hour${hours > 1 ? "s" : ""}`;
    }
    return `${prefix} ${Math.max(1, minutes)} minute${minutes > 1 ? "s" : ""}`;
  };

  if (loading) {
    return (
      <div className="event-detail-center">
        <p className="mono event-detail-loading-copy">{"// loading..."}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-detail-center">
        <p style={{ color: "var(--text-muted)" }}>Event not found.</p>
      </div>
    );
  }

  // Le backend retourne company_name dans les events (pas d'ID numérique company exposé).
  // On compare le company_name de l'event avec celui stocké au login.
  const spotsLeft = event.spots_remaining ?? Math.max(0, (event.max_participants || 50) - (event.registered_count || 0));
  const isFull = event.is_full ?? spotsLeft <= 0;
  const registrationOpen = event.registration_open !== false;
  const initials = (event.organizer || "NV").substring(0, 2).toUpperCase();
  const isPast = event.status === "past" || event.status === "cancelled";
  const eventCountdown = formatRemainingTime(event.date_start, "Starts in", "Event started");
  const registrationCountdown = event.registration_deadline
    ? formatRemainingTime(event.registration_deadline, "Registration closes in", "Registration closed")
    : "No registration deadline";
  const startDate = event.date_start ? new Date(event.date_start) : null;
  const endDate = event.date_end ? new Date(event.date_end) : null;
  const eventDateLabel = startDate
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(startDate)
    : null;
  const startTimeLabel = startDate
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(startDate)
    : null;
  const endTimeLabel = endDate
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(endDate)
    : null;

  return (
    <div className={`event-detail-page${isEventOwner ? " event-detail-page--owner-fixed" : ""}`}>
      <main className={`event-detail-main${isEventOwner ? " event-detail-main--owner" : ""}`}>
        <div className={`event-detail-left${isEventOwner ? " event-detail-left--owner" : ""}`}>
          <button onClick={() => navigate(isEventOwner ? "/my-events" : "/events")} className="event-detail-back-btn event-detail-back-btn--inline">
            <ArrowLeft size={15} />
            {isEventOwner ? "Back to my events" : "Back to discovery"}
          </button>

          <div className="event-detail-title-row">
            <div className="event-detail-icon" style={{ background: "var(--secondary)" }}>
              {initials}
            </div>
            <div>
              <h1 className="event-detail-title">{event.title}</h1>
              <p className="event-detail-organizer">{event.organizer || "Unknown"}</p>
              {eventDateLabel && (
                <div className="event-detail-datetime">
                  <span className="event-detail-datetime-pill">{eventDateLabel}</span>
                  {startTimeLabel && (
                    <span className="event-detail-datetime-pill event-detail-datetime-pill--secondary">
                      {startTimeLabel}{endTimeLabel ? ` - ${endTimeLabel}` : ""}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="event-detail-description">
            {event.description || "No description available."}
          </p>

          {event.location && (
            <div className="event-detail-location">
              <MapPin size={16} color="var(--accent)" style={{ marginTop: "2px", flexShrink: 0 }} />
              <div>
                <p className="event-detail-location-name">{event.location}</p>
                {event.city && (
                  <p className="event-detail-location-meta">
                    {event.city}, {event.country}
                  </p>
                )}
              </div>
            </div>
          )}

          {(event.tags || []).length > 0 && (
            <div className="event-detail-tags-section">
              <p className="event-detail-tags-label">
                Tags
              </p>
              <div className="event-detail-tags">
                {event.tags.map((tag) => (
                  <span key={tag} className="event-detail-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isEventOwner && showRegistrations && (
            <div className="event-detail-owner-panel">
              <div className="event-detail-owner-header">
                <h3 className="event-detail-owner-title">
                  Registrations
                  {stats && (
                    <span className="event-detail-owner-meta">
                      {stats.registrations?.confirmed || 0} confirmed · {stats.registrations?.pending || 0} pending · {stats.spots_remaining ?? 0} spots left
                    </span>
                  )}
                </h3>
                <button
                  onClick={handleExport}
                  disabled={exportLoading}
                  className="btn btn-secondary event-detail-owner-export-btn"
                >
                  <Download size={13} />
                  {exportLoading ? "Exporting..." : "Export CSV"}
                </button>
              </div>
              <div className="event-detail-owner-scroll">
                {regsLoading ? (
                  <p className="event-detail-loading-copy">Loading...</p>
                ) : registrations.length === 0 ? (
                  <p className="event-detail-panel-note-copy">No registrations yet.</p>
                ) : (
                  <div className="event-detail-owner-list">
                    {registrations.map((reg) => {
                      const name = reg.participant_name || `#${reg.id}`;
                      const regDate = reg.created_at ? new Date(reg.created_at).toLocaleDateString() : null;
                      return (
                        <div key={reg.id} className="event-detail-owner-item">
                          <div className="event-detail-owner-item-info">
                            <p className="event-detail-owner-item-name">{name}</p>
                            {regDate && (
                              <p className="event-detail-owner-item-date">Registered {regDate}</p>
                            )}
                          </div>
                          <span className="event-detail-status-pill" style={{ color: statusColor[reg.status] || "var(--text-muted)", borderColor: statusColor[reg.status] || "var(--border)" }}>
                            {reg.status}
                          </span>
                          {reg.status === "PENDING" && (
                            <div className="event-detail-owner-actions">
                              <button
                                onClick={() => handleUpdateStatus(reg.id, "CONFIRMED")}
                                className="event-detail-icon-btn"
                                style={{ border: "1px solid var(--success)", background: "rgba(0,255,149,0.08)", color: "var(--success)" }}
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(reg.id, "REJECTED")}
                                className="event-detail-icon-btn"
                                style={{ border: "1px solid var(--error)", background: "rgba(255,77,77,0.08)", color: "var(--error)" }}
                              >
                                <X size={13} />
                              </button>
                              <button
                                onClick={() => handleRemoveRegistration(reg.id)}
                                disabled={removingRegistrationId === reg.id}
                                className="event-detail-icon-btn event-detail-icon-btn--danger"
                                title="Remove registration"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                          {reg.status !== "PENDING" && (
                            <div className="event-detail-owner-actions">
                              <button
                                onClick={() => handleRemoveRegistration(reg.id)}
                                disabled={removingRegistrationId === reg.id}
                                className="event-detail-icon-btn event-detail-icon-btn--danger"
                                title="Remove registration"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="event-detail-right">
          {(eventCountdown || registrationCountdown) && (
            <div className="event-detail-countdown-stack">
              {eventCountdown && (
                <div className="event-detail-countdown-pill">
                  {eventCountdown}
                </div>
              )}
              {registrationCountdown && (
                <div className="event-detail-countdown-pill event-detail-countdown-pill--secondary">
                  {registrationCountdown}
                </div>
              )}
            </div>
          )}
          <div className="event-detail-reg-card">
            <h3>
              {isEventOwner ? "Management" : isCompany() ? "Event Info" : "Registration"}
            </h3>

            <div className="event-detail-reg-grid">
              <div className="event-detail-reg-stat">
                <p className="event-detail-reg-stat-label">Status</p>
                <p
                  className="event-detail-reg-stat-value"
                  style={{
                    color:
                      event.status === "live"
                        ? "var(--success)"
                        : event.status === "upcoming"
                          ? "var(--accent)"
                          : event.status === "cancelled"
                            ? "var(--error)"
                            : "var(--text-dim)",
                  }}
                >
                  {event.status_label || event.status || "Unknown"}
                </p>
              </div>
              <div className="event-detail-reg-stat">
                <p className="event-detail-reg-stat-label">Capacity</p>
                <p className="event-detail-reg-stat-value" style={{ color: "var(--text)" }}>
                  {event.registered_count || 0} / {event.max_participants || 50}
                </p>
              </div>
            </div>

            {isEventOwner ? (
              <div className="event-detail-actions-stack">
                <button
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={() => navigate(`/events/${id}/edit`)}
                >
                  Edit Event
                </button>
                <button
                  className="btn btn-secondary event-detail-management-btn"
                  onClick={handleToggleRegistrations}
                >
                  <Users size={14} />
                  {showRegistrations ? "Hide Registrations" : "View Registrations"}
                </button>
                <button
                  onClick={handleCancelEvent}
                  className="event-detail-delete-btn"
                  style={{
                    background: cancelConfirm ? "rgba(255,77,77,0.2)" : "rgba(255,77,77,0.08)",
                    border: "1px solid rgba(255,77,77,0.25)",
                    color: "var(--error)",
                  }}
                  onMouseEnter={(e) => { if (!cancelConfirm) e.currentTarget.style.background = "rgba(255,77,77,0.15)"; }}
                  onMouseLeave={(e) => { if (!cancelConfirm) e.currentTarget.style.background = "rgba(255,77,77,0.08)"; }}
                >
                  {cancelConfirm ? "Click again to confirm" : "Delete Event"}
                </button>
                {cancelConfirm && (
                  <button onClick={() => setCancelConfirm(false)} className="event-detail-cancel-text">
                    Cancel
                  </button>
                )}
              </div>
            ) : isCompany() ? (
              <div className="event-detail-panel-note">
                <p className="event-detail-panel-note-copy">
                  This event is managed by another organization.
                </p>
              </div>
            ) : (
              <>
                {event.validation === "manual" && (
                  <div className="event-detail-manual-badge">
                    <Lock size={13} />
                    Manual validation required by organizer.
                  </div>
                )}
                {registerError && (
                  <div className="event-detail-error">
                    {registerError}
                  </div>
                )}
                {registered ? (
                  <div className="event-detail-actions-stack">
                    <div className={registrationBannerClass}>
                      {registrationStatus === "WAITLIST" && "Waitlist position saved"}
                      {registrationStatus === "PENDING" && "Pending validation"}
                      {(registrationStatus === "CONFIRMED" || !registrationStatus) && "Registered ✓"}
                    </div>
                    <button
                      onClick={handleCancelRegistration}
                      disabled={cancelLoading}
                      className="event-detail-cancel-btn"
                      style={{
                        width: "100%",
                        background: "transparent",
                        cursor: cancelLoading ? "not-allowed" : "pointer",
                        opacity: cancelLoading ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,77,77,0.08)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {cancelLoading ? "Cancelling..." : "Cancel Registration"}
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={handleRegister}
                    style={{ width: "100%" }}
                    disabled={isPast || !registrationOpen || (isFull && event.validation === "manual")}
                  >
                    {isPast ? "Event Ended" : !registrationOpen ? "Registration Closed" : isFull && event.validation === "manual" ? "Full" : isFull ? "Join Waitlist" : "Register to Event"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Access Restricted Modal */}
      {showAccessModal && (
        <div
          className="access-modal-overlay"
          onClick={() => setShowAccessModal(false)}
        >
          <div className="access-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="access-modal-icon">
              <Lock size={28} color="#f5c400" />
            </div>
            <h2 className="access-modal-title">Access Restricted</h2>
            <p className="access-modal-text">
              You must be logged in to register for scientific events.
            </p>
            <button className="btn btn-primary" style={{ width: "100%", marginBottom: "12px" }} onClick={() => navigate("/login")}>
              Sign In to Account
            </button>
            <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => navigate("/register")}>
              Create New Identity
            </button>
            <button onClick={() => setShowAccessModal(false)} className="access-modal-back-btn">
              -- Back to event description
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
