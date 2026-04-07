import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Admin.css";
import { deleteAdminEvent, getAdminEvents } from "../api/admin";
import { usePreferences } from "../context/PreferencesContext";

function formatDate(value, locale, t) {
  if (!value) return t("Unknown date");
  return new Date(value).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function translateEventStatus(value, t) {
  const normalized = (value || "").toString().trim().toUpperCase();

  if (normalized === "PUBLISHED") return t("Published");
  if (normalized === "DRAFT") return t("Draft");
  if (normalized === "CANCELLED") return t("Cancelled");
  if (normalized === "UPCOMING") return t("Upcoming");
  if (normalized === "LIVE") return t("Live");
  if (normalized === "PAST") return t("Past");
  return value || t("Unknown");
}

function translateEventFormat(value, t) {
  const normalized = (value || "").toString().trim().toUpperCase();

  if (normalized === "ONSITE" || normalized === "IN-PERSON" || normalized === "IN_PERSON") return t("In-Person");
  if (normalized === "ONLINE") return t("Online");
  if (normalized === "HYBRID") return t("Hybrid");
  return value || t("Unknown");
}

export default function AdminEvents() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale } = usePreferences();
  const initialParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const statusOptions = useMemo(() => ([
    { value: "", label: t("All statuses") },
    { value: "PUBLISHED", label: t("Published") },
    { value: "DRAFT", label: t("Draft") },
    { value: "CANCELLED", label: t("Cancelled") },
  ]), [t]);
  const formatOptions = useMemo(() => ([
    { value: "", label: t("All formats") },
    { value: "ONSITE", label: t("In-Person") },
    { value: "ONLINE", label: t("Online") },
    { value: "HYBRID", label: t("Hybrid") },
  ]), [t]);
  const [events, setEvents] = useState([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState(initialParams.get("organization") || "");
  const [submittedSearch, setSubmittedSearch] = useState(initialParams.get("organization") || "");
  const [status, setStatus] = useState(initialParams.get("status") || "");
  const [format, setFormat] = useState(initialParams.get("format") || "");
  const [scope, setScope] = useState(initialParams.get("scope") === "past" ? "past" : "future");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get("organization") || "");
    setSubmittedSearch(params.get("organization") || "");
    setStatus(params.get("status") || "");
    setFormat(params.get("format") || "");
    setScope(params.get("scope") === "past" ? "past" : "future");
  }, [location.search]);

  useEffect(() => {
    setLoading(true);
    getAdminEvents({ search: submittedSearch, status, format, organization: submittedSearch })
      .then((data) => {
        setEvents(data.results || []);
        setCount(data.count || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [submittedSearch, status, format]);

  const visibleEvents = useMemo(
    () => events.filter((event) => {
      if (scope === "past") return event.status === "past" || event.status === "cancelled";
      return event.status !== "past";
    }),
    [events, scope],
  );

  const handleDelete = async (event, eventId) => {
    event.stopPropagation();
    if (!window.confirm(t("Delete this event? This action cannot be undone."))) return;
    try {
      await deleteAdminEvent(eventId);
      setEvents((prev) => prev.filter((item) => item.id !== eventId));
      setCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      alert(error.message || t("Unable to delete this event."));
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-stack">
          <header className="admin-header">
            <div>
              <h1 className="admin-title">{t("Events")}</h1>
              <p className="admin-copy">
                {t("Inspect every published, draft, or cancelled event across the platform and remove entries when moderation requires it.")}
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
                className="input admin-search admin-search--wide"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Search by event title or organization...")}
              />
              {submittedSearch ? (
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={() => {
                    setSearch("");
                    setSubmittedSearch("");
                    navigate("/admin/events", { replace: true });
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
                {t("{{count}} event{{suffix}}", { count, suffix: count !== 1 ? "s" : "" })}
              </span>
            </div>

            <div className="my-events-toolbar">
              <div className={`my-events-view-switch${scope === "past" ? " my-events-view-switch--history" : ""}`}>
                <span className="my-events-view-indicator" aria-hidden="true" />
                <button
                  type="button"
                  className={`my-events-view-btn${scope === "future" ? " my-events-view-btn--active" : ""}`}
                  onClick={() => setScope("future")}
                >
                  {t("Upcoming & Live")}
                </button>
                <button
                  type="button"
                  className={`my-events-view-btn${scope === "past" ? " my-events-view-btn--active" : ""}`}
                  onClick={() => setScope("past")}
                >
                  {t("Past Events")}
                </button>
              </div>
            </div>

            <div className="admin-filter-bar">
              <div className="admin-filter-group">
                {statusOptions.map((option) => (
                  <button
                    key={option.value || "all-statuses"}
                    type="button"
                    className={`admin-filter-chip${status === option.value ? " admin-filter-chip--active" : ""}`}
                    onClick={() => setStatus(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="admin-filter-group">
                {formatOptions.map((option) => (
                  <button
                    key={option.value || "all-formats"}
                    type="button"
                    className={`admin-filter-chip${format === option.value ? " admin-filter-chip--active" : ""}`}
                    onClick={() => setFormat(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="admin-empty">{t("Loading events...")}</div>
            ) : visibleEvents.length === 0 ? (
              <div className="admin-empty">{t("No events match the current filters.")}</div>
            ) : (
              <ul className="admin-list collection-list">
                {visibleEvents.map((event) => (
                  <li key={event.id} className="collection-list__item">
                    <div
                      className="admin-card admin-card--interactive"
                      onClick={() => navigate(`/events/${event.id}`)}
                      onKeyDown={(clickEvent) => {
                        if (clickEvent.key === "Enter" || clickEvent.key === " ") {
                          clickEvent.preventDefault();
                          navigate(`/events/${event.id}`);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="admin-card-top">
                        <div className="admin-card-copy">
                          <h3 className="admin-card-title">{event.title}</h3>
                          <p className="admin-card-subtitle">{event.company_name || event.organizer || t("Unknown organization")}</p>
                          <div className="admin-card-meta">
                            <span className="admin-pill admin-pill--muted">
                              {translateEventStatus(event.status_label || event.status, t)}
                            </span>
                            <span className="admin-pill admin-pill--muted">
                              {translateEventFormat(event.format, t)}
                            </span>
                            <span className="admin-pill admin-pill--muted">
                              {formatDate(event.date_start, locale, t)}
                            </span>
                            <span className="admin-pill admin-pill--muted">
                              {event.unlimited_capacity
                                ? t("{{count}} registered", { count: event.registered_count || 0 })
                                : t("{{count}} / {{max}} registered", {
                                    count: event.registered_count || 0,
                                    max: event.max_participants || 0,
                                  })}
                            </span>
                          </div>
                        </div>

                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-secondary-btn"
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              navigate(`/events/${event.id}`);
                            }}
                          >
                            {t("View Detail")}
                          </button>
                          <button
                            type="button"
                            className="admin-danger-btn"
                            onClick={(clickEvent) => handleDelete(clickEvent, event.id)}
                          >
                            {t("Delete")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
