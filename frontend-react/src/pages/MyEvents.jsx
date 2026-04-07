import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { getMyEventsApi } from "../api/events";
import { usePreferences } from "../context/PreferencesContext";
import "../styles/Dashboard.css";

export default function MyEvents() {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const [myEvents, setMyEvents] = useState([]);
  const [viewMode, setViewMode] = useState("current");
  const [isSwitchMoving, setIsSwitchMoving] = useState(false);
  const previousMode = useRef("current");

  useEffect(() => {
    getMyEventsApi().then(setMyEvents).catch(console.error);
  }, []);

  useEffect(() => {
    if (previousMode.current === viewMode) return;
    setIsSwitchMoving(true);
    const timeout = window.setTimeout(() => setIsSwitchMoving(false), 460);
    previousMode.current = viewMode;
    return () => window.clearTimeout(timeout);
  }, [viewMode]);

  const now = new Date();
  const visibleEvents = myEvents.filter((event) => {
    const endDate = event.date_end ? new Date(event.date_end) : event.date_start ? new Date(event.date_start) : null;
    const isPast = endDate ? endDate < now : false;
    return viewMode === "history" ? isPast : !isPast;
  });

  return (
    <div className="dashboard-page">
      <div className="dashboard-main dashboard-main--full">
        <div className="dashboard-content dashboard-content--fixed-shell dashboard-content--my-events-fixed">
          <div className="my-events-layout">
            <div className="my-events-static">
              <section className="dashboard-org-events-header">
                <div className="dashboard-org-events-copyblock">
                  <h1 className="dashboard-org-events-title">{t("My Events")}</h1>
                  <p className="dashboard-org-events-copy">
                    {t("Access every event you have created, review registration volume, and jump into details.")}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary dashboard-create-btn my-events-create-btn"
                  onClick={() => navigate("/events/create")}
                >
                  <Plus size={15} />
                  {t("Create New Event")}
                </button>
              </section>

              <div className="my-events-toolbar">
                <div
                  className={`my-events-view-switch${isSwitchMoving ? " my-events-view-switch--moving" : ""}${viewMode === "history" ? " my-events-view-switch--history" : ""}`}
                  role="tablist"
                  aria-label={t("Event history filter")}
                >
                  <span className="my-events-view-indicator" aria-hidden="true" />
                  <button
                    type="button"
                    className={`my-events-view-btn${viewMode === "current" ? " my-events-view-btn--active" : ""}`}
                    onClick={() => setViewMode("current")}
                  >
                    {t("Current Events")}
                  </button>
                  <button
                    type="button"
                    className={`my-events-view-btn${viewMode === "history" ? " my-events-view-btn--active" : ""}`}
                    onClick={() => setViewMode("history")}
                  >
                    {t("History")}
                  </button>
                </div>
              </div>
            </div>

            {visibleEvents.length === 0 ? (
                <div className="dashboard-empty my-events-empty">
                <p className="dashboard-empty-copy">
                  {viewMode === "history"
                    ? t("No past events yet.")
                    : t("You have not created any current events yet.")}
                </p>
                {viewMode === "current" && (
                  <button className="btn btn-primary" onClick={() => navigate("/events/create")}>
                    {t("Create your first event")}
                  </button>
                )}
              </div>
            ) : (
              <div className="dashboard-list-scroll my-events-list-scroll">
                <ul className="dashboard-list collection-list">
                  {visibleEvents.map((ev) => (
                    <li key={ev.id} className="collection-list__item">
                      <div
                        onClick={() => navigate(`/events/${ev.id}`)}
                        className="dashboard-registration-item"
                      >
                        <div className="dashboard-registration-info">
                          <p className="dashboard-registration-title">{ev.title}</p>
                          <p className="dashboard-registration-organizer">
                            {ev.organizer || t("Your organization")}
                          </p>
                          <div className="dashboard-registration-meta">
                            {ev.date && (
                              <span className="dashboard-registration-meta-item">{ev.date}</span>
                            )}
                            {ev.location && (
                              <span className="dashboard-registration-meta-item">{ev.location}</span>
                            )}
                            <span className="dashboard-registration-meta-item">
                              {ev.unlimited_capacity
                                ? t("{{count}} registered", { count: ev.registered_count || 0 })
                                : t("{{count}} / {{max}} registered", {
                                    count: ev.registered_count || 0,
                                    max: ev.max_participants || 0,
                                  })}
                            </span>
                            {(ev.tags || []).slice(0, 2).map((tag) => (
                              <span key={tag} className="dashboard-registration-tag">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="dashboard-registration-right">
                          <span
                            className={`dashboard-org-event-status dashboard-org-event-status--${ev.status || "upcoming"}`}
                          >
                            {t(ev.status_label || ev.status)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
