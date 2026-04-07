import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MapPin, Lock, Download, Check, X, Users, Trash2 } from "lucide-react";
import "../styles/EventDetail.css";
import { getEvent, deleteEvent, getEventStats } from "../api/events";
import { deleteAdminEvent, getAdminEvent } from "../api/admin";
import { registerToEvent, cancelRegistration, getMyRegistrations, getEventRegistrations, updateRegistrationStatus, exportEventRegistrations, removeEventRegistration } from "../api/registrations";
import { getRole, isAuthed, isCompany, getCompanyName } from "../store/authStore";
import { usePreferences } from "../context/PreferencesContext";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

const resolveMediaUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${API_BASE}${value}`;
  return `${API_BASE}/${value}`;
};

const translateEventStatus = (value, t) => {
  const normalized = (value || "").toString().trim().toUpperCase();

  if (normalized === "PUBLISHED") return t("Published");
  if (normalized === "DRAFT") return t("Draft");
  if (normalized === "CANCELLED") return t("Cancelled");
  if (normalized === "UPCOMING") return t("Upcoming");
  if (normalized === "LIVE") return t("Live");
  if (normalized === "PAST") return t("Past");
  if (normalized === "CONFIRMED") return t("Confirmed");
  if (normalized === "PENDING") return t("Pending");
  if (normalized === "WAITLIST") return t("Waitlist");
  if (normalized === "REJECTED") return t("Rejected");
  return value || t("Unknown");
};

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale } = usePreferences();
  const role = getRole();
  const isAdmin = role === "ADMIN";
  const authed = isAuthed();
  const [isWideViewport, setIsWideViewport] = useState(() => window.innerWidth > 1100);
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
  const [adminDeleteConfirm, setAdminDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadEvent = isAdmin ? getAdminEvent : getEvent;
    loadEvent(id)
      .then(setEvent)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, isAdmin]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsWideViewport(window.innerWidth > 1100);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
          spots_remaining: prev.unlimited_capacity ? null : Math.max(0, (prev.spots_remaining ?? prev.max_participants ?? 0) - 1),
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
        setRegisterError(err.message || t("Registration failed. Please try again."));
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
        spots_remaining: prev.unlimited_capacity ? null : (prev.spots_remaining ?? 0) + 1,
      } : prev);
    } catch (err) {
      setRegisterError(err.message || t("Failed to cancel registration."));
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
    const confirmed = window.confirm(t("Remove this participant from the event? They will receive an email notification."));
    if (!confirmed) return;

    setRemovingRegistrationId(regId);
    try {
      await removeEventRegistration(regId);
      loadRegistrations();
    } catch (err) {
      alert(err.message || t("Failed to remove this registration."));
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

  const handleAdminDeleteEvent = async () => {
    if (!adminDeleteConfirm) {
      setAdminDeleteConfirm(true);
      return;
    }
    try {
      await deleteAdminEvent(id);
      navigate("/admin/events");
    } catch (err) {
      alert(err.message || t("Unable to delete this event."));
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
  const shouldUseOwnerFixedLayout = isEventOwner && isWideViewport;
  const fromResults = location.state?.fromResults;
  const fromDashboard = location.state?.fromDashboard;
  const backTarget = isAdmin
    ? "/admin/events"
    : isEventOwner
      ? "/my-events"
      : (fromDashboard || fromResults || "/events");
  const backLabel = isAdmin
    ? t("Back to admin events")
    : isEventOwner
      ? t("Back to My Events")
      : fromDashboard
        ? t("Back to Dashboard")
        : fromResults
        ? t("Back to results")
        : t("Back to discovery");

  useEffect(() => {
    if (!shouldUseOwnerFixedLayout) return undefined;

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
  }, [shouldUseOwnerFixedLayout]);

  const registrationBannerClass =
    registrationStatus === "WAITLIST"
      ? "event-detail-status-banner event-detail-status-banner--waitlist"
      : registrationStatus === "PENDING"
      ? "event-detail-status-banner event-detail-status-banner--pending"
      : "event-detail-status-banner event-detail-status-banner--confirmed";

  const formatRemainingTime = (targetDate, type) => {
    if (!targetDate) return null;

    const targetTimestamp = new Date(targetDate).getTime();
    const diff = targetTimestamp - nowTimestamp;

    if (Number.isNaN(targetTimestamp)) return null;
    if (diff <= 0) {
      return type === "event" ? t("Event started") : t("Registration closed");
    }

    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return type === "event"
        ? t("Starts in {{count}} day{{suffix}}", { count: days, suffix: days > 1 ? "s" : "" })
        : t("Registration closes in {{count}} day{{suffix}}", { count: days, suffix: days > 1 ? "s" : "" });
    }
    if (hours > 0) {
      return type === "event"
        ? t("Starts in {{count}} hour{{suffix}}", { count: hours, suffix: hours > 1 ? "s" : "" })
        : t("Registration closes in {{count}} hour{{suffix}}", { count: hours, suffix: hours > 1 ? "s" : "" });
    }
    return type === "event"
      ? t("Starts in {{count}} min", { count: Math.max(1, minutes) })
      : t("Registration closes in {{count}} min", { count: Math.max(1, minutes) });
  };

  if (loading) {
    return (
      <div className="event-detail-center">
        <p className="mono event-detail-loading-copy">{`// ${t("Loading...").toLowerCase()}`}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-detail-center">
        <p className="text-muted">{t("Event not found.")}</p>
      </div>
    );
  }

  // Le backend retourne company_name dans les events (pas d'ID numérique company exposé).
  // On compare le company_name de l'event avec celui stocké au login.
  const spotsLeft = event.unlimited_capacity
    ? null
    : (event.spots_remaining ?? Math.max(0, (event.max_participants || 50) - (event.registered_count || 0)));
  const isFull = event.unlimited_capacity ? false : (event.is_full ?? spotsLeft <= 0);
  const registrationOpen = event.registration_open !== false;
  const initials = (event.organizer || "NV").substring(0, 2).toUpperCase();
  const companyLogoUrl = resolveMediaUrl(event.company_logo_url || event.company_logo || "");
  const isPast = event.status === "past" || event.status === "cancelled";
  const eventCountdown = formatRemainingTime(event.date_start, "event");
  const registrationCountdown = event.registration_deadline
    ? formatRemainingTime(event.registration_deadline, "registration")
    : t("No registration deadline");
  const startDate = event.date_start ? new Date(event.date_start) : null;
  const endDate = event.date_end ? new Date(event.date_end) : null;
  const dateLocale = locale === "fr" ? "fr-FR" : "en-GB";
  const eventDateLabel = startDate
    ? new Intl.DateTimeFormat(dateLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(startDate)
    : null;
  const startTimeLabel = startDate
    ? new Intl.DateTimeFormat(dateLocale, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(startDate)
    : null;
  const endTimeLabel = endDate
    ? new Intl.DateTimeFormat(dateLocale, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(endDate)
    : null;

  return (
    <div className={`event-detail-page${shouldUseOwnerFixedLayout ? " event-detail-page--owner-fixed" : ""}`}>
      <main className={`event-detail-main${shouldUseOwnerFixedLayout ? " event-detail-main--owner" : ""}`}>
        <div className={`event-detail-left${shouldUseOwnerFixedLayout ? " event-detail-left--owner" : ""}`}>
          <button onClick={() => navigate(backTarget)} className="event-detail-back-btn event-detail-back-btn--inline">
            <ArrowLeft size={15} />
            {backLabel}
          </button>

          <div className="event-detail-title-row">
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt={event.company_name || event.organizer || t("Organization")}
                className="event-detail-icon event-detail-icon--image"
              />
            ) : (
              <div className="event-detail-icon event-detail-icon--fallback">
                {initials}
              </div>
            )}
            <div>
              <h1 className="event-detail-title">{event.title}</h1>
              {event.company_id ? (
                <button
                  type="button"
                  className="event-detail-organizer event-detail-organizer-btn"
                  onClick={() => navigate(isEventOwner ? "/profile" : `/company/${event.company_id}`)}
                >
                  {event.organizer || t("Unknown")}
                </button>
              ) : (
                <p className="event-detail-organizer">{event.organizer || t("Unknown")}</p>
              )}
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

          {!(isEventOwner && showRegistrations) && (
            <>
              <p className="event-detail-description">
                {event.description || t("No description available.")}
              </p>

              {event.location && (
                <div className="event-detail-location">
                  <MapPin size={16} color="var(--accent)" className="event-detail-location-icon" />
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
                    {t("Tags")}
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
            </>
          )}

          {isEventOwner && showRegistrations && (
            <div className="event-detail-owner-panel">
              <div className="event-detail-owner-header">
                <h3 className="event-detail-owner-title">
                  {t("Registrations")}
                  {stats && (
                    <span className="event-detail-owner-meta">
                      {t("{{count}} confirmed", { count: stats.registrations?.confirmed || 0 })} · {t("{{count}} pending", { count: stats.registrations?.pending || 0 })} · {stats.event?.unlimited_capacity ? t("Unlimited capacity") : t("{{count}} spots left", { count: stats.spots_remaining ?? 0 })}
                    </span>
                  )}
                </h3>
                <button
                  onClick={handleExport}
                  disabled={exportLoading}
                  className="btn btn-secondary event-detail-owner-export-btn"
                >
                  <Download size={13} />
                  {exportLoading ? t("Exporting...") : t("Export CSV")}
                </button>
              </div>
              <div className="event-detail-owner-scroll">
                {regsLoading ? (
                  <p className="event-detail-loading-copy">{t("Loading...")}</p>
                ) : registrations.length === 0 ? (
                  <p className="event-detail-panel-note-copy">{t("No registrations yet.")}</p>
                ) : (
                  <div className="event-detail-owner-list">
                    {registrations.map((reg) => {
                      const name = reg.participant_name || `#${reg.id}`;
                      const regDate = reg.created_at ? new Date(reg.created_at).toLocaleDateString(dateLocale) : null;
                      const participantProfileTarget = reg.participant_id
                        ? `/participant/${reg.participant_id}?context=my-events&from_event=${id}&registration_id=${reg.id}`
                        : null;
                      return (
                        <div
                          key={reg.id}
                          className={`event-detail-owner-item${participantProfileTarget ? " event-detail-owner-item--interactive" : ""}`}
                          onClick={() => {
                            if (participantProfileTarget) navigate(participantProfileTarget);
                          }}
                          onKeyDown={(event) => {
                            if (!participantProfileTarget) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              navigate(participantProfileTarget);
                            }
                          }}
                          role={participantProfileTarget ? "button" : undefined}
                          tabIndex={participantProfileTarget ? 0 : undefined}
                        >
                          <div className="event-detail-owner-item-info">
                            {reg.participant_id ? (
                              <button
                                type="button"
                                className="event-detail-owner-item-name event-detail-owner-item-name--button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate(participantProfileTarget);
                                }}
                              >
                                {name}
                              </button>
                            ) : (
                              <p className="event-detail-owner-item-name">{name}</p>
                            )}
                            {regDate && (
                              <p className="event-detail-owner-item-date">{t("Registered {{date}}", { date: regDate })}</p>
                            )}
                          </div>
                          <span className={`event-detail-status-pill${reg.status === "CONFIRMED" ? " event-detail-status-pill--confirmed" : reg.status === "WAITLIST" ? " event-detail-status-pill--waitlist" : reg.status === "PENDING" ? " event-detail-status-pill--pending" : ""}`}>
                            {translateEventStatus(reg.status, t)}
                          </span>
                          {reg.status === "PENDING" && (
                            <div className="event-detail-owner-actions">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleUpdateStatus(reg.id, "CONFIRMED");
                                }}
                                className="event-detail-icon-btn event-detail-icon-btn--success"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleUpdateStatus(reg.id, "REJECTED");
                                }}
                                className="event-detail-icon-btn event-detail-icon-btn--reject"
                              >
                                <X size={13} />
                              </button>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRemoveRegistration(reg.id);
                                }}
                                disabled={removingRegistrationId === reg.id}
                                className="event-detail-icon-btn event-detail-icon-btn--danger"
                                title={t("Remove registration")}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                          {reg.status !== "PENDING" && (
                            <div className="event-detail-owner-actions">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRemoveRegistration(reg.id);
                                }}
                                disabled={removingRegistrationId === reg.id}
                                className="event-detail-icon-btn event-detail-icon-btn--danger"
                                title={t("Remove registration")}
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
              {isEventOwner ? t("Management") : isCompany() ? t("Event Info") : t("Registration")}
            </h3>

            <div className="event-detail-reg-grid">
              <div className="event-detail-reg-stat">
                <p className="event-detail-reg-stat-label">{t("Status")}</p>
                <p
                  className={`event-detail-reg-stat-value ${event.status === "live" ? "event-detail-reg-stat-value--live" : event.status === "upcoming" ? "event-detail-reg-stat-value--upcoming" : event.status === "cancelled" ? "event-detail-reg-stat-value--cancelled" : "event-detail-reg-stat-value--muted"}`}
                >
                  {translateEventStatus(event.status_label || event.status, t)}
                </p>
              </div>
              <div className="event-detail-reg-stat">
                <p className="event-detail-reg-stat-label">{t("Capacity")}</p>
                <p className="event-detail-reg-stat-value event-detail-reg-stat-value--default">
                  {event.unlimited_capacity
                    ? t("{{count}} registered", { count: event.registered_count || 0 })
                    : `${event.registered_count || 0} / ${event.max_participants || 50}`}
                </p>
              </div>
            </div>

            {isEventOwner ? (
              <div className="event-detail-actions-stack">
                <button
                  className="btn btn-primary event-detail-btn-full"
                  onClick={() => navigate(`/events/${id}/edit`)}
                >
                  {t("Edit Event")}
                </button>
                <button
                  className="btn btn-secondary event-detail-management-btn"
                  onClick={handleToggleRegistrations}
                >
                  <Users size={14} />
                  {showRegistrations ? t("Hide Registrations") : t("View Registrations")}
                </button>
                <button
                  onClick={handleCancelEvent}
                  className={`event-detail-delete-btn ${cancelConfirm ? "event-detail-delete-btn--confirm" : "event-detail-delete-btn--idle"}`}
                >
                  {cancelConfirm ? t("Click again to confirm") : t("Delete Event")}
                </button>
                {cancelConfirm && (
                  <button onClick={() => setCancelConfirm(false)} className="event-detail-cancel-text">
                    {t("Cancel")}
                  </button>
                )}
              </div>
            ) : isAdmin ? (
              <div className="event-detail-actions-stack">
                <div className="event-detail-panel-note">
                  <p className="event-detail-panel-note-copy">
                    {t("Admin moderation view for this event.")}
                  </p>
                </div>
                <button
                  onClick={handleAdminDeleteEvent}
                  className={`event-detail-delete-btn event-detail-btn-full ${adminDeleteConfirm ? "event-detail-delete-btn--confirm" : "event-detail-delete-btn--idle"}`}
                >
                  {adminDeleteConfirm ? t("Click again to confirm") : t("Delete Event")}
                </button>
                {adminDeleteConfirm && (
                  <button onClick={() => setAdminDeleteConfirm(false)} className="event-detail-cancel-text">
                    {t("Cancel")}
                  </button>
                )}
              </div>
            ) : isCompany() ? (
              <div className="event-detail-panel-note">
                <p className="event-detail-panel-note-copy">
                  {t("This event is managed by another organization.")}
                </p>
              </div>
            ) : (
              <>
                {event.validation === "manual" && (
                  <div className="event-detail-manual-badge">
                    <Lock size={13} />
                    {t("Manual validation required by organizer.")}
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
                      {registrationStatus === "WAITLIST" && t("Waitlist position saved")}
                      {registrationStatus === "PENDING" && t("Pending validation")}
                      {(registrationStatus === "CONFIRMED" || !registrationStatus) && `${t("Registered")} ✓`}
                    </div>
                    <button
                      onClick={handleCancelRegistration}
                      disabled={cancelLoading}
                      className="event-detail-cancel-btn event-detail-btn-full"
                    >
                      {cancelLoading ? t("Cancelling...") : t("Cancel Registration")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleRegister}
                    className="btn btn-primary event-detail-btn-full"
                    disabled={isPast || !registrationOpen || (isFull && event.validation === "manual")}
                  >
                    {isPast
                      ? t("Event Ended")
                      : !registrationOpen
                        ? t("Registration Closed")
                        : event.status === "live" && (event.format === "online" || event.format === "hybrid")
                          ? t("Join Live")
                          : isFull && event.validation === "manual"
                            ? t("Full")
                            : isFull
                              ? t("Join Waitlist")
                              : t("Register to Event")}
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
            <h2 className="access-modal-title">{t("Access Restricted")}</h2>
            <p className="access-modal-text">
              {t("You must be logged in to register for scientific events.")}
            </p>
            <div className="event-detail-actions-stack">
              <button className="btn btn-primary event-detail-btn-full" onClick={() => navigate("/login")}>
                {t("Sign In to Account")}
              </button>
              <button className="btn btn-secondary event-detail-btn-full" onClick={() => navigate("/register")}>
                {t("Create New Identity")}
              </button>
            </div>
            <button onClick={() => setShowAccessModal(false)} className="access-modal-back-btn">
              {t("Back to event description")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
