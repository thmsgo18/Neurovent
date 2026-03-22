import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, Calendar, MapPin, Plus, X } from "lucide-react";
import { getRole, getDisplayName, getCompanyName, logout } from "../store/authStore";
import { getMyEventsApi } from "../api/events";
import { getMyRegistrations, cancelRegistration } from "../api/registrations";
import "../styles/Dashboard.css";

// ---- Shared sidebar shell ----
function DashboardShell({ navItems, activeSection, onNav, bottomSlot, topTitle, topAction, children }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "180px",
          minWidth: "180px",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "16px",
        }}
      >
        <Link to="/" style={{ textDecoration: "none", marginBottom: "28px", display: "block" }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "800",
              fontSize: "16px",
              color: "var(--text)",
            }}
          >
            Neuro<span style={{ color: "var(--accent)" }}>vent</span>
          </span>
        </Link>

        <nav style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNav(item.key)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "12px",
                fontWeight: activeSection === item.key ? "700" : "500",
                cursor: "pointer",
                background:
                  activeSection === item.key ? "rgba(0,229,255,0.1)" : "transparent",
                color:
                  activeSection === item.key ? "var(--accent)" : "var(--text-dim)",
                transition: "var(--transition)",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom slot (user info or org badge) */}
        {bottomSlot}

        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            cursor: "pointer",
            fontSize: "11px",
            padding: "8px 12px",
            borderRadius: "8px",
            marginTop: "8px",
            transition: "var(--transition)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--error)";
            e.currentTarget.style.background = "rgba(255,77,77,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-dim)";
            e.currentTarget.style.background = "none";
          }}
        >
          <LogOut size={13} />
          Log out
        </button>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top nav */}
        <div
          style={{
            height: "52px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
            background: "rgba(12,12,20,0.8)",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: "700" }}>{topTitle}</h3>
          {topAction}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
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
  const initials = displayName.substring(0, 2).toUpperCase();

  const activeRegs = registrations.filter((r) => r.status !== "CANCELLED" && r.status !== "REJECTED");
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

  const bottomSlot = (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", marginTop: "auto", marginBottom: "8px" }}>
      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", color: "#000", flexShrink: 0 }}>
        {initials}
      </div>
      <div style={{ overflow: "hidden" }}>
        <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</p>
        <p style={{ fontSize: "10px", color: "var(--text-dim)" }}>Researcher</p>
      </div>
    </div>
  );

  return (
    <DashboardShell
      navItems={navItems}
      activeSection="dashboard"
      onNav={handleNav}
      bottomSlot={bottomSlot}
      topTitle="Researcher Dashboard"
      topAction={null}
    >
      {/* Welcome + stats */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "clamp(28px, 3vw, 40px)", fontWeight: "900", lineHeight: "1", marginBottom: "8px", letterSpacing: "-0.03em" }}>
          Welcome back, <span style={{ color: "var(--accent)" }}>{displayName.split(" ")[0]}</span>
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
          Explore upcoming scientific events and manage your registrations.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          {[
            { label: "Confirmed", value: confirmedCount, color: "var(--success)" },
            { label: "Pending", value: pendingCount, color: "#f5c400" },
            { label: "Waitlist", value: waitlistCount, color: "var(--accent)" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 18px", minWidth: "80px" }}>
              <p style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>{s.label}</p>
              <p style={{ fontSize: "22px", fontWeight: "800", color: s.color, lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Registrations list */}
      <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "12px" }}>
        My Registrations ({activeRegs.length})
      </h4>

      {activeRegs.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "32px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "16px" }}>No active registrations.</p>
          <button className="btn btn-primary" style={{ fontSize: "13px" }} onClick={() => navigate("/events")}>Browse Events</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {activeRegs.map((reg) => {
            const eventId = typeof reg.event === "object" ? reg.event.id : reg.event;
            const title = reg.event_title || (typeof reg.event === "object" ? reg.event.title : null) || `Event #${eventId}`;
            const date = reg.event_date ? reg.event_date.split("T")[0] : "";
            const statusColor =
              reg.status === "CONFIRMED" ? { bg: "rgba(0,255,149,0.1)", text: "var(--success)" }
              : reg.status === "WAITLIST" ? { bg: "rgba(168,85,247,0.1)", text: "var(--secondary)" }
              : { bg: "rgba(245,196,0,0.1)", text: "#f5c400" };

            return (
              <div
                key={reg.id}
                onClick={() => navigate(`/events/${eventId}`)}
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "var(--transition)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-high)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: "700", marginBottom: "4px" }}>{title}</p>
                  {date && (
                    <p style={{ fontSize: "11px", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Calendar size={11} /> {date}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, marginLeft: "12px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "700", fontFamily: "var(--font-mono)", padding: "3px 10px", borderRadius: "4px", background: statusColor.bg, color: statusColor.text }}>
                    {reg.status === "CONFIRMED" ? "Confirmed" : reg.status === "WAITLIST" ? "Waitlist" : "Pending"}
                  </span>
                  <button
                    onClick={(e) => handleCancel(e, reg.id)}
                    disabled={cancelling === reg.id}
                    title="Cancel registration"
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--text-dim)", cursor: "pointer", padding: "4px 6px", display: "flex", alignItems: "center", transition: "var(--transition)", opacity: cancelling === reg.id ? 0.5 : 1 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--error)"; e.currentTarget.style.color = "var(--error)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-dim)"; }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

// ---- ORG DASHBOARD ----
function OrgDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("events");

  const navItems = [
    { key: "events", label: "Events List" },
    { key: "profile", label: "Lab Profile" },
  ];

  const handleNav = (key) => {
    if (key === "profile") {
      navigate("/profile");
    } else {
      setActiveSection(key);
    }
  };

  const orgName = getCompanyName() || getDisplayName() || "Lab";

  const bottomSlot = (
    <div
      style={{
        background: "rgba(0,229,255,0.06)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "12px",
        marginTop: "auto",
        marginBottom: "8px",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          fontWeight: "800",
          color: "var(--accent)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {orgName}
      </p>
      <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>Lab Account</p>
    </div>
  );

  return (
    <DashboardShell
      navItems={navItems}
      activeSection={activeSection}
      onNav={handleNav}
      bottomSlot={bottomSlot}
      topTitle="Lab Console"
      topAction={
        <button
          className="btn btn-primary"
          style={{ fontSize: "11px", padding: "6px 14px", display: "flex", gap: "4px" }}
          onClick={() => navigate("/events/create")}
        >
          <Plus size={13} />
          Create New Event
        </button>
      }
    >
      {activeSection === "events" && (
        <OrgEventsView navigate={navigate} />
      )}
    </DashboardShell>
  );
}

function OrgEventsView({ navigate }) {
  const [myEvents, setMyEvents] = useState([]);

  useEffect(() => {
    getMyEventsApi().then(setMyEvents).catch(console.error);
  }, []);

  const totalCapacity = myEvents.reduce((sum, e) => sum + (e.max_participants || 0), 0);
  const totalRegistered = myEvents.reduce((sum, e) => sum + (e.registered_count || 0), 0);
  const publishedCount = myEvents.filter((e) => e.status === "upcoming" || e.status === "PUBLISHED").length;

  const stats = [
    { label: "Total Events", value: String(myEvents.length).padStart(2, "0"), color: "var(--text)" },
    { label: "Total Capacity", value: String(totalCapacity), color: "var(--text)" },
    { label: "Registered", value: String(totalRegistered), color: "var(--accent)", highlight: true },
    { label: "Published", value: String(publishedCount).padStart(2, "0"), color: "var(--success)" },
  ];

  return (
    <>
      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--surface)",
              border: `1px solid ${s.highlight ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "10px",
              padding: "14px",
            }}
          >
            <p
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-dim)",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              {s.label}
            </p>
            <p style={{ fontSize: "24px", fontWeight: "800", color: s.color, lineHeight: 1 }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick tip for pending registrations */}
      <div
        style={{
          background: "rgba(0,229,255,0.04)",
          border: "1px solid rgba(0,229,255,0.15)",
          borderRadius: "10px",
          padding: "14px 18px",
          marginBottom: "24px",
          fontSize: "12px",
          color: "var(--text-muted)",
          lineHeight: "1.6",
        }}
      >
        <span style={{ fontWeight: "700", color: "var(--accent)" }}>Manage registrations</span> — click on any event below to view and approve/reject registration requests.
      </div>

      {/* My events list */}
      <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "12px" }}>My Events</h4>
      {myEvents.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--text-dim)", padding: "16px 0" }}>
          No events yet.{" "}
          <span
            style={{ color: "var(--accent)", cursor: "pointer", fontWeight: "600" }}
            onClick={() => navigate("/events/create")}
          >
            Create your first event →
          </span>
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {myEvents.map((ev) => (
            <div
              key={ev.id}
              onClick={() => navigate(`/events/${ev.id}`)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                transition: "var(--transition)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-high)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
            >
              <div>
                <p style={{ fontSize: "13px", fontWeight: "600", marginBottom: "3px" }}>{ev.title}</p>
                <p style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                  {ev.date} — {ev.registered_count || 0}/{ev.max_participants || 0} registered
                </p>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  fontFamily: "var(--font-mono)",
                  padding: "3px 10px",
                  borderRadius: "4px",
                  background:
                    ev.status === "live"
                      ? "rgba(0,255,149,0.1)"
                      : "rgba(0,229,255,0.1)",
                  color: ev.status === "live" ? "var(--success)" : "var(--accent)",
                  textTransform: "uppercase",
                }}
              >
                {ev.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
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
