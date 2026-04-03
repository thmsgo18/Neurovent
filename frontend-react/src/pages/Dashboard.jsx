import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, X } from "lucide-react";
import { getRole, getDisplayName, getCompanyName } from "../store/authStore";
import {
  downloadCompanyPerformanceStats,
  downloadCompanySummaryStats,
  getCompanyDashboardStats,
} from "../api/events";
import { getMyRegistrations, cancelRegistration } from "../api/registrations";
import "../styles/Dashboard.css";

// ---- Shared shell ----
function DashboardShell({
  navItems,
  activeSection,
  onNav,
  topTitle,
  topAction,
  children,
  showTopbar = true,
  contentClassName = "",
}) {
  return (
    <div className="dashboard-page">
      <div className="dashboard-main dashboard-main--full">
        {showTopbar && (
          <div className="dashboard-topbar dashboard-topbar--full">
            <h3 className="dashboard-topbar-title">{topTitle}</h3>
            <div className="dashboard-topbar-controls">
              <div className="dashboard-topbar-nav">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => onNav(item.key)}
                    className={`dashboard-topbar-nav-btn${activeSection === item.key ? " dashboard-topbar-nav-btn--active" : ""}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {topAction ? <div className="dashboard-topbar-action">{topAction}</div> : null}
            </div>
          </div>
        )}

        <div className={`dashboard-content ${contentClassName}`.trim()}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ---- USER DASHBOARD ----
function UserDashboard() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [cancelling, setCancelling] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const formatShortDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  useEffect(() => {
    getMyRegistrations().then(setRegistrations).catch(console.error);
  }, []);

  const navItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "settings", label: "Settings" },
  ];

  const handleNav = (key) => {
    if (key === "settings") navigate("/profile");
  };

  const displayName = getDisplayName() || "Researcher";

  const activeRegs = registrations.filter((r) => r.status !== "CANCELLED" && r.status !== "REJECTED");
  const visibleRegs = activeRegs.filter((r) => statusFilter === "ALL" ? true : r.status === statusFilter);
  const confirmedCount = activeRegs.filter((r) => r.status === "CONFIRMED").length;
  const pendingCount = activeRegs.filter((r) => r.status === "PENDING").length;
  const waitlistCount = activeRegs.filter((r) => r.status === "WAITLIST").length;

  const handleCancel = async (e, regId) => {
    e.stopPropagation();
    setCancelling(regId);
    try {
      await cancelRegistration(regId);
      setRegistrations((prev) => prev.map((r) => r.id === regId ? { ...r, status: "CANCELLED" } : r));
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(null);
    }
  };

  return (
    <DashboardShell
      navItems={navItems}
      activeSection="dashboard"
      onNav={handleNav}
      topTitle="Researcher Dashboard"
      topAction={null}
      showTopbar={false}
      contentClassName="dashboard-content--fixed-shell"
    >
      <div className="dashboard-user-layout">
        <div className="dashboard-user-static">
          <div className="dashboard-welcome">
            <h1 className="dashboard-welcome-title">
              Welcome back, <span style={{ color: "var(--accent)" }}>{displayName.split(" ")[0]}</span>
            </h1>
            <p className="dashboard-welcome-copy">
              Explore upcoming scientific events and manage your registrations.
            </p>
        <div className="dashboard-inline-stats">
          {[
            { key: "CONFIRMED", label: "Confirmed", value: confirmedCount, color: "var(--success)" },
            { key: "PENDING", label: "Pending", value: pendingCount, color: "#f5c400" },
            { key: "WAITLIST", label: "Waitlist", value: waitlistCount, color: "var(--accent)" },
          ].map((s) => (
            <button
              key={s.label}
              type="button"
              className={`dashboard-inline-stat${statusFilter === s.key ? " dashboard-inline-stat--active" : ""}`}
              onClick={() => setStatusFilter((prev) => prev === s.key ? "ALL" : s.key)}
            >
              <p className="dashboard-inline-stat-label">{s.label}</p>
              <p className="dashboard-inline-stat-value" style={{ color: s.color }}>{s.value}</p>
            </button>
          ))}
          <button
            type="button"
            className={`dashboard-inline-stat dashboard-inline-stat--ghost${statusFilter === "ALL" ? " dashboard-inline-stat--active" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            <p className="dashboard-inline-stat-label">View all</p>
            <p className="dashboard-inline-stat-value">All</p>
          </button>
        </div>
      </div>

      <h4 className="dashboard-section-title">
            My Registrations ({visibleRegs.length})
          </h4>
        </div>

        {visibleRegs.length === 0 ? (
          <div className="dashboard-empty">
            <p className="dashboard-empty-copy">No registrations match this filter.</p>
            <button className="btn btn-primary" onClick={() => navigate("/events")}>Browse Events</button>
          </div>
        ) : (
          <div className="dashboard-list-scroll">
            <div className="dashboard-list">
              {visibleRegs.map((reg) => {
            const eventData = typeof reg.event === "object" ? reg.event : null;
            const eventId = eventData ? eventData.id : reg.event;
            const title = reg.event_title || eventData?.title || `Event #${eventId}`;
            const date = reg.event_date ? reg.event_date.split("T")[0] : "";
            const organizer = reg.event_organizer || eventData?.organizer || "";
            const format = eventData?.format;
            const city = eventData?.city;
            const country = eventData?.country;
            const tags = (eventData?.tags || []).slice(0, 2).map((tag) => (typeof tag === "object" ? tag.name : tag));
            const registrationDate = formatShortDate(reg.created_at);
            const statusColor =
              reg.status === "CONFIRMED" ? { bg: "rgba(0,255,149,0.1)", text: "var(--success)" }
              : reg.status === "WAITLIST" ? { bg: "rgba(168,85,247,0.1)", text: "var(--secondary)" }
              : { bg: "rgba(245,196,0,0.1)", text: "#f5c400" };

                return (
                  <div
                    key={reg.id}
                    onClick={() => navigate(`/events/${eventId}`)}
                    className="dashboard-registration-item"
                  >
                    <div className="dashboard-registration-info">
                      <h3 className="dashboard-registration-title">{title}</h3>
                      {organizer && (
                        <p className="dashboard-registration-organizer">{organizer}</p>
                      )}
                      <div className="dashboard-registration-meta">
                        {(format || city || date) && (
                          <span className="dashboard-registration-meta-item">
                            <span className="dashboard-registration-meta-bullet">•</span>
                            {format === "online"
                              ? "Online Session"
                              : city
                                ? `${city}${country ? `, ${country}` : ""}`
                                : format === "hybrid"
                                  ? "Hybrid Event"
                                  : "In-Person Event"}
                          </span>
                        )}
                        {date && (
                          <span className="dashboard-registration-meta-item">
                            <Calendar size={14} /> {date}
                          </span>
                        )}
                        {tags.map((tag) => (
                          <span key={tag} className="dashboard-registration-tag">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <div className="dashboard-registration-submeta">
                        {registrationDate && (
                          <span className="dashboard-registration-submeta-item">
                            Registered on {registrationDate}
                          </span>
                        )}
                        {reg.status === "WAITLIST" && reg.waitlist_position ? (
                          <span className="dashboard-registration-submeta-item">
                            Waitlist position #{reg.waitlist_position}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="dashboard-registration-right">
                      <span className="dashboard-status-badge" style={{ background: statusColor.bg, color: statusColor.text }}>
                        {reg.status === "CONFIRMED" ? "Confirmed" : reg.status === "WAITLIST" ? "Waitlist" : "Pending"}
                      </span>
                      <button
                        onClick={(e) => handleCancel(e, reg.id)}
                        disabled={cancelling === reg.id}
                        title="Cancel registration"
                        className="dashboard-icon-btn"
                        style={{ opacity: cancelling === reg.id ? 0.5 : 1 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

// ---- ORG DASHBOARD ----
function OrgDashboard() {
  const [dashboardStats, setDashboardStats] = useState({
    total_views: 0,
    total_registrations: 0,
    pending_requests: 0,
    confirmed_participants: 0,
    waitlist_count: 0,
    average_fill_rate: 0,
    upcoming_events: 0,
    past_events: 0,
    cancellation_rate: 0,
  });

  const orgName = getCompanyName() || getDisplayName() || "Lab";
  useEffect(() => {
    getCompanyDashboardStats().then(setDashboardStats).catch(console.error);
  }, []);

  const statCards = [
    {
      label: "Total views",
      value: dashboardStats.total_views,
      detail: "Combined views across your published event pages",
      accent: "var(--accent)",
    },
    {
      label: "Total registrations",
      value: dashboardStats.total_registrations,
      detail: "All participant registrations received so far",
      accent: "var(--success)",
    },
    {
      label: "Pending requests",
      value: dashboardStats.pending_requests,
      detail: "Registrations waiting for organization review",
      accent: "#f5c400",
    },
    {
      label: "Confirmed participants",
      value: dashboardStats.confirmed_participants,
      detail: "Participants already approved and confirmed",
      accent: "var(--success)",
    },
    {
      label: "Waitlist count",
      value: dashboardStats.waitlist_count,
      detail: "Participants currently waiting for a seat",
      accent: "var(--secondary)",
    },
    {
      label: "Average fill rate",
      value: `${dashboardStats.average_fill_rate}%`,
      detail: "Confirmed participants compared with total capacity",
      accent: "var(--secondary)",
    },
    {
      label: "Upcoming events",
      value: dashboardStats.upcoming_events,
      detail: "Published events that have not started yet",
      accent: "var(--text)",
    },
    {
      label: "Past events",
      value: dashboardStats.past_events,
      detail: "Events whose end date is already behind us",
      accent: "var(--text-secondary)",
    },
    {
      label: "Cancellation rate",
      value: `${dashboardStats.cancellation_rate}%`,
      detail: "Share of registrations cancelled after sign-up",
      accent: "var(--secondary)",
    },
  ];

  return (
    <DashboardShell
      navItems={[]}
      activeSection=""
      onNav={() => {}}
      topTitle=""
      topAction={null}
      showTopbar={false}
      contentClassName="dashboard-content--fixed-shell dashboard-content--org-fixed"
    >
      <div className="dashboard-org-layout">
        <section className="dashboard-org-hero">
          <div className="dashboard-org-hero-copyblock">
            <p className="dashboard-org-hero-eyebrow">Organization dashboard</p>
            <h1 className="dashboard-org-hero-title">{orgName}</h1>
            <p className="dashboard-org-hero-copy">
              A global view of your event activity, registrations, and overall publishing performance.
            </p>
          </div>
        </section>

        <section className="dashboard-org-stats-grid">
          {statCards.map((stat) => (
            <article key={stat.label} className="dashboard-org-stat-card">
              <p className="dashboard-org-stat-label">{stat.label}</p>
              <p className="dashboard-org-stat-value" style={{ color: stat.accent }}>
                {stat.value}
              </p>
              <p className="dashboard-org-stat-detail">{stat.detail}</p>
            </article>
          ))}
        </section>

        <section className="dashboard-org-exportbar">
          <button
            type="button"
            className="btn btn-secondary dashboard-org-export-btn"
            onClick={downloadCompanySummaryStats}
          >
            Download Summary CSV
          </button>
          <button
            type="button"
            className="btn btn-primary dashboard-org-export-btn"
            onClick={downloadCompanyPerformanceStats}
          >
            Download Performance CSV
          </button>
        </section>
      </div>
    </DashboardShell>
  );
}


// ---- MAIN EXPORT ----
export default function Dashboard() {
  const role = getRole();
  if (role === "COMPANY" || role === "ADMIN") {
    return <OrgDashboard />;
  }
  return <UserDashboard />;
}
