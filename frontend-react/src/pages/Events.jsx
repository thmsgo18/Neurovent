import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Filter, Calendar, MapPin, Users, X } from "lucide-react";
import { getEvents, createEvent, updateEvent, deleteEvent } from "../api/events";
import { isAdmin } from "../store/authStore";
import "../styles/Events.css";

const STATUS_TABS = [
  { key: "all",       label: "All" },
  { key: "upcoming",  label: "Upcoming" },
  { key: "ongoing",   label: "Ongoing" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const CATEGORIES = ["Technology", "AI/ML", "Design", "Cloud", "Security", "Data", "ML", "Other"];

function getCatClass(cat) {
  if (!cat) return "cat-default";
  const c = cat.toLowerCase();
  if (c.includes("tech"))     return "cat-technology";
  if (c.includes("ai") || c.includes("ml")) return "cat-aiml";
  if (c.includes("design"))   return "cat-design";
  if (c.includes("cloud"))    return "cat-cloud";
  if (c.includes("security")) return "cat-security";
  if (c.includes("data"))     return "cat-data";
  return "cat-default";
}

function EventModal({ event, onClose, onSave }) {
  const [form, setForm] = useState(event || {
    title: "", description: "", category: "Technology",
    status: "upcoming", date: "", end_date: "",
    location: "", max_participants: ""
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title || !form.date) return;
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {event ? "Edit Event" : "Create Event"}
          </span>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="form-field">
          <label className="form-label">Title *</label>
          <input className="form-input" value={form.title}
            onChange={e => set("title", e.target.value)} placeholder="Event title" />
        </div>

        <div className="form-field">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" value={form.description}
            onChange={e => set("description", e.target.value)}
            placeholder="Event description..." rows={3} />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category}
              onChange={e => set("category", e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status}
              onChange={e => set("status", e.target.value)}>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label">Start Date *</label>
            <input className="form-input" type="date" value={form.date}
              onChange={e => set("date", e.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-label">End Date</label>
            <input className="form-input" type="date" value={form.end_date}
              onChange={e => set("end_date", e.target.value)} />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Location</label>
          <input className="form-input" value={form.location}
            onChange={e => set("location", e.target.value)}
            placeholder="City, Country — Venue" />
        </div>

        <div className="form-field">
          <label className="form-label">Max Participants</label>
          <input className="form-input" type="number" value={form.max_participants}
            onChange={e => set("max_participants", e.target.value)}
            placeholder="300" />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : event ? "Save Changes" : "Create Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const admin = isAdmin();

  const [events, setEvents]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal]       = useState(null); // null | "create" | event object
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return events.filter(e => {
      const matchSearch = !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.location || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.category || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [events, search, statusFilter]);

  const tabCounts = useMemo(() => {
    const counts = { all: events.length };
    STATUS_TABS.slice(1).forEach(t => {
      counts[t.key] = events.filter(e => e.status === t.key).length;
    });
    return counts;
  }, [events]);

  async function handleSave(form) {
    if (modal === "create") {
      const created = await createEvent(form);
      setEvents(prev => [...prev, created]);
    } else {
      const updated = await updateEvent(modal.id, form);
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await deleteEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  }

  const formatDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  if (loading) return (
    <div className="loading-container">
      <div className="spinner" /> Loading events...
    </div>
  );

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>Events</h1>
        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: 4 }}>
          {events.length} total events · {filtered.length} shown
        </p>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-bar">
          <Search size={16} className="search-bar-icon" />
          <input
            className="search-input"
            placeholder="Search events by title, location, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="toolbar-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {STATUS_TABS.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <button className="toolbar-btn secondary">
          <Filter size={16} /> Filters
        </button>
        {admin && (
          <button className="toolbar-btn primary" onClick={() => setModal("create")}>
            <Plus size={16} /> New Event
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            className={`filter-tab ${statusFilter === t.key ? "active" : ""}`}
            onClick={() => setStatusFilter(t.key)}
          >
            {t.label} ({tabCounts[t.key] || 0})
          </button>
        ))}
      </div>

      {/* Events grid */}
      <div className="events-grid">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>No events found</p>
            <p>Try adjusting your filters</p>
          </div>
        ) : filtered.map(event => (
          <div
            key={event.id}
            className="event-card"
            onClick={() => navigate(`/events/${event.id}`)}
          >
            <div className="event-card-header">
              <span className={`event-category ${getCatClass(event.category)}`}>
                {event.category || "General"}
              </span>
              <span className={`badge badge-${event.status}`}>
                {event.status}
              </span>
            </div>

            <h3>{event.title}</h3>
            <p className="event-card-desc">{event.description}</p>

            <div className="event-meta">
              <div className="event-meta-item">
                <Calendar size={13} />
                <span>
                  {formatDate(event.date)}
                  {event.end_date ? ` → ${formatDate(event.end_date)}` : ""}
                </span>
              </div>
              {event.location && (
                <div className="event-meta-item">
                  <MapPin size={13} />
                  <span>{event.location}</span>
                </div>
              )}
              <div className="event-meta-item">
                <Users size={13} />
                <span>
                  {event.registered_count || 0}/{event.max_participants || "∞"} registered
                </span>
              </div>
            </div>

            <div className="event-progress">
              <div className="event-progress-info">
                <span>
                  <Users size={12} style={{ display: "inline", marginRight: 4 }} />
                  {event.registered_count || 0}/{event.max_participants || "∞"} registered
                </span>
                <span>
                  {event.max_participants
                    ? Math.round(((event.registered_count || 0) / event.max_participants) * 100)
                    : 0}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: event.max_participants
                      ? `${Math.min(((event.registered_count || 0) / event.max_participants) * 100, 100)}%`
                      : "0%"
                  }}
                />
              </div>
            </div>

            {/* Admin actions */}
            {admin && (
              <div
                style={{ display: "flex", gap: 8, marginTop: 14 }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: "0.8rem", padding: "6px 12px" }}
                  onClick={() => setModal(event)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger"
                  style={{ flex: 1, fontSize: "0.8rem", padding: "6px 12px" }}
                  disabled={deleting === event.id}
                  onClick={() => handleDelete(event.id)}
                >
                  {deleting === event.id ? "..." : "Delete"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <EventModal
          event={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}