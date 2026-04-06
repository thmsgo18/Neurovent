import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Admin.css";
import { deleteAdminEvent, getAdminEvents } from "../api/admin";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "CANCELLED", label: "Cancelled" },
];

const FORMAT_OPTIONS = [
  { value: "", label: "All formats" },
  { value: "ONSITE", label: "In-Person" },
  { value: "ONLINE", label: "Online" },
  { value: "HYBRID", label: "Hybrid" },
];

function formatDate(value) {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminEvents() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
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
    if (!window.confirm("Delete this event? This action cannot be undone.")) return;
    try {
      await deleteAdminEvent(eventId);
      setEvents((prev) => prev.filter((item) => item.id !== eventId));
      setCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      alert(error.message || "Unable to delete this event.");
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-stack">
          <header className="admin-header">
            <div>
              <h1 className="admin-title">Events</h1>
              <p className="admin-copy">
                Inspect every published, draft, or cancelled event across the platform and remove entries when moderation requires it.
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
                placeholder="Search by event title or organization..."
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
                  View All
                </button>
              ) : null}
            </form>
          </header>

          <section className="admin-section">
            <div className="admin-section-head">
              <span className="admin-section-meta">{count} event{count !== 1 ? "s" : ""}</span>
            </div>

            <div className="my-events-toolbar">
              <div className="my-events-view-switch">
                <span className="my-events-view-indicator" aria-hidden="true" style={{ transform: `translateX(${scope === "past" ? "100%" : "0%"})` }} />
                <button
                  type="button"
                  className={`my-events-view-btn${scope === "future" ? " my-events-view-btn--active" : ""}`}
                  onClick={() => setScope("future")}
                >
                  Upcoming & Live
                </button>
                <button
                  type="button"
                  className={`my-events-view-btn${scope === "past" ? " my-events-view-btn--active" : ""}`}
                  onClick={() => setScope("past")}
                >
                  Past Events
                </button>
              </div>
            </div>

            <div className="admin-filter-bar">
              <div className="admin-filter-group">
                {STATUS_OPTIONS.map((option) => (
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
                {FORMAT_OPTIONS.map((option) => (
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
              <div className="admin-empty">Loading events...</div>
            ) : visibleEvents.length === 0 ? (
              <div className="admin-empty">No events match the current filters.</div>
            ) : (
              <div className="admin-list">
                {visibleEvents.map((event) => (
                  <div
                    key={event.id}
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
                        <p className="admin-card-subtitle">{event.company_name || event.organizer || "Unknown organization"}</p>
                        <div className="admin-card-meta">
                          <span className="admin-pill admin-pill--muted">{event.status_label}</span>
                          <span className="admin-pill admin-pill--muted">{event.format}</span>
                          <span className="admin-pill admin-pill--muted">{formatDate(event.date_start)}</span>
                          <span className="admin-pill admin-pill--muted">
                            {event.unlimited_capacity
                              ? `${event.registered_count || 0} registered`
                              : `${event.registered_count || 0}/${event.max_participants || 0} registered`}
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
                          View Detail
                        </button>
                        <button
                          type="button"
                          className="admin-danger-btn"
                          onClick={(clickEvent) => handleDelete(clickEvent, event.id)}
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
