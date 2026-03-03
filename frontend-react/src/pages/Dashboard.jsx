import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Users, ClipboardList,
  Activity, ArrowRight
} from "lucide-react";
import { getEvents } from "../api/events";
import { getParticipants, getEventRegistrations } from "../api/participants";
import { getRole } from "../store/authStore";
import "../styles/Dashboard.css";

// Donut chart SVG pur CSS
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut-wrapper">
      <svg width="160" height="160" className="donut-svg" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="20" />
        {data.map((d, i) => {
          const dash = (d.value / total) * circumference;
          const gap = circumference - dash;
          const seg = (
            <circle
              key={i}
              cx="80" cy="80" r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth="20"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      <div className="donut-legend">
        {data.map((d, i) => (
          <div className="legend-item" key={i}>
            <div className="legend-dot-label">
              <div className="legend-dot" style={{ background: d.color }} />
              <span>{d.label}</span>
            </div>
            <span className="legend-value">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Bar chart SVG pur CSS
function BarChart({ events }) {
  const categories = ["ML", "Federated", "Multi-Agent"];
  const counts = categories.map(cat =>
    events.filter(e => e.title.toLowerCase().includes(cat.toLowerCase())).length || 1
  );
  const max = Math.max(...counts);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 0 }}>
      <div className="y-axis">
        {[max, Math.ceil(max / 2), 0].map((v, i) => (
          <span key={i} className="y-label">{v}</span>
        ))}
      </div>
      <div className="bar-chart" style={{ flex: 1 }}>
        {categories.map((cat, i) => (
          <div className="bar-item" key={i}>
            <div
              className="bar-fill"
              style={{ height: `${(counts[i] / max) * 100}%` }}
            />
            <span className="bar-label">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const role = getRole();
  const username = role === "admin" ? "Admin User" : "Viewer User";

  const [events, setEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [evts, parts] = await Promise.all([
          getEvents(),
          getParticipants(),
        ]);
        setEvents(evts);
        setParticipants(parts);

        // Charger les inscriptions du premier event
        if (evts.length > 0) {
          const regs = await getEventRegistrations(evts[0].id);
          setRegistrations(regs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        Chargement...
      </div>
    );
  }

  const upcomingEvents = events.filter(e => e.status === "upcoming");
  const ongoingEvents  = events.filter(e => e.status === "ongoing");
  const pastEvents     = events.filter(e => e.status === "past");

  const donutData = [
    { label: "Upcoming", value: upcomingEvents.length || 2, color: "#6366f1" },
    { label: "Ongoing",  value: ongoingEvents.length  || 1, color: "#22c55e" },
    { label: "Completed",value: pastEvents.length      || 1, color: "#64748b" },
    { label: "Cancelled",value: 0,                          color: "#ef4444" },
  ].filter(d => d.value > 0);

  const activeEvents = [...upcomingEvents, ...ongoingEvents].slice(0, 4);

  const recentRegs = registrations.slice(0, 5).map((r, i) => ({
    name: r.participant_detail
      ? `${r.participant_detail.first_name} ${r.participant_detail.last_name}`
      : `Participant ${i + 1}`,
    event: events.find(e => e.id === r.event)?.title || "Événement",
    initials: r.participant_detail
      ? `${r.participant_detail.first_name[0]}${r.participant_detail.last_name[0]}`
      : "P",
    status: "confirmed",
  }));

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
          Dashboard
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: 4 }}>
          Welcome back, {username} — Here's what's happening today
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Calendar size={20} />
          </div>
          <div className="stat-value">{events.length}</div>
          <div className="stat-label">Total Events</div>
          <div className="stat-change">+{upcomingEvents.length} upcoming</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <Users size={20} />
          </div>
          <div className="stat-value">{participants.length}</div>
          <div className="stat-label">Participants</div>
          <div className="stat-change">Registered</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <ClipboardList size={20} />
          </div>
          <div className="stat-value">{registrations.length}</div>
          <div className="stat-label">Registrations</div>
          <div className="stat-change">Total inscriptions</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <Activity size={20} />
          </div>
          <div className="stat-value">{activeEvents.length}</div>
          <div className="stat-label">Active Events</div>
          <div className="stat-change">{ongoingEvents.length} ongoing</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Events by Category</span>
          </div>
          <BarChart events={events} />
        </div>
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Event Status</span>
          </div>
          <DonutChart data={donutData} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="bottom-row">

        {/* Active Events */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Active & Upcoming Events</span>
            <button
              className="view-all-link"
              onClick={() => navigate("/events")}
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {events.slice(0, 4).map(event => (
            <div
              key={event.id}
              className="event-list-item"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/events/${event.id}`)}
            >
              <div className="event-list-left">
                <div className="event-list-icon">
                  <Calendar size={16} />
                </div>
                <div>
                  <div className="event-list-title">{event.title}</div>
                  <div className="event-list-meta">{event.date}</div>
                </div>
              </div>
              <div className="event-list-right">
                <span className={`badge badge-${event.status}`}>
                  {event.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Registrations */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Recent Registrations</span>
            <button
              className="view-all-link"
              onClick={() => navigate("/participants")}
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {recentRegs.length > 0 ? recentRegs.map((r, i) => (
            <div key={i} className="reg-list-item">
              <div className="reg-list-left">
                <div className="reg-avatar">{r.initials}</div>
                <div>
                  <div className="reg-name">{r.name}</div>
                  <div className="reg-event">{r.event}</div>
                </div>
              </div>
              <span className={`badge badge-${r.status}`}>{r.status}</span>
            </div>
          )) : participants.slice(0, 4).map((p, i) => (
            <div key={i} className="reg-list-item">
              <div className="reg-list-left">
                <div className="reg-avatar">
                  {p.first_name[0]}{p.last_name[0]}
                </div>
                <div>
                  <div className="reg-name">{p.first_name} {p.last_name}</div>
                  <div className="reg-event">{p.institution}</div>
                </div>
              </div>
              <span className="badge badge-confirmed">confirmed</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}