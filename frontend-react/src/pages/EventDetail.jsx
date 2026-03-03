import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Calendar, MapPin, Users,
  Clock, Plus, X, UserMinus
} from "lucide-react";
import { getEvent } from "../api/events";
import {
  getParticipants,
  getEventRegistrations,
  registerToEvent,
  unregisterFromEvent
} from "../api/participants";
import { isAdmin } from "../store/authStore";
import "../styles/EventDetail.css";

function RegisterModal({ eventId, registered, allParticipants, onClose, onRegister }) {
  const available = allParticipants.filter(
    p => !registered.find(r => r.participant === p.id || r.participant_detail?.id === p.id)
  );
  const [selected, setSelected] = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await onRegister(Number(selected));
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
          <span className="modal-title">Register Participant</span>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="form-field">
          <label className="form-label">Select Participant</label>
          <select
            className="register-select"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            <option value="">— Choose a participant —</option>
            {available.map(p => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name} — {p.institution}
              </option>
            ))}
          </select>
          {available.length === 0 && (
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 8 }}>
              All participants are already registered.
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!selected || loading}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const admin      = isAdmin();

  const [event, setEvent]               = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [evt, regs, parts] = await Promise.all([
        getEvent(id),
        getEventRegistrations(id),
        getParticipants(),
      ]);
      setEvent(evt);
      setRegistrations(regs);
      setAllParticipants(parts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(participantId) {
    const reg = await registerToEvent(participantId, Number(id));
    setRegistrations(prev => [...prev, reg]);
  }

  async function handleUnregister(regId) {
    await unregisterFromEvent(regId);
    setRegistrations(prev => prev.filter(r => r.id !== regId));
  }

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  const getInitials = (p) => {
    if (!p) return "?";
    return `${p.first_name?.charAt(0) || ""}${p.last_name?.charAt(0) || ""}`.toUpperCase();
  };

  const getParticipantName = (reg) => {
    if (reg.participant_detail) {
      return `${reg.participant_detail.first_name} ${reg.participant_detail.last_name}`;
    }
    const p = allParticipants.find(p => p.id === reg.participant);
    return p ? `${p.first_name} ${p.last_name}` : `Participant #${reg.participant}`;
  };

  const getParticipantDetail = (reg) => {
    if (reg.participant_detail) return reg.participant_detail;
    return allParticipants.find(p => p.id === reg.participant) || null;
  };

  if (loading) return (
    <div className="loading-container">
      <div className="spinner" /> Loading event...
    </div>
  );

  if (!event) return (
    <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
      Event not found.
      <button className="back-btn" onClick={() => navigate("/events")}
        style={{ display: "block", margin: "16px auto" }}>
        ← Back to Events
      </button>
    </div>
  );

  const pct = event.max_participants
    ? Math.round((registrations.length / event.max_participants) * 100)
    : 0;

  return (
    <div>
      {/* Back */}
      <button className="back-btn" onClick={() => navigate("/events")}>
        <ArrowLeft size={16} /> Back to Events
      </button>

      {/* Header card */}
      <div className="event-detail-header">
        <div className="event-detail-top">
          <div className="event-detail-badges">
            <span style={{
              fontSize: "0.75rem", fontWeight: 600,
              padding: "2px 8px", borderRadius: 6,
              background: "#eff6ff", color: "#6366f1"
            }}>
              {event.category || "General"}
            </span>
            <span className={`badge badge-${event.status}`}>
              {event.status}
            </span>
          </div>
          {admin && (
            <div className="event-detail-actions">
              <button
                className="btn btn-secondary"
                onClick={() => navigate("/events")}
              >
                Edit
              </button>
              <button className="btn btn-danger">
                Delete
              </button>
            </div>
          )}
        </div>

        <h1 className="event-detail-title">{event.title}</h1>
        <p className="event-detail-desc">{event.description}</p>

        <div className="event-detail-meta-grid">
          <div className="event-detail-meta-item">
            <span className="meta-item-label">Start Date</span>
            <span className="meta-item-value">
              <Calendar size={14} />
              {formatDate(event.date)}
            </span>
          </div>
          <div className="event-detail-meta-item">
            <span className="meta-item-label">End Date</span>
            <span className="meta-item-value">
              <Clock size={14} />
              {formatDate(event.end_date)}
            </span>
          </div>
          <div className="event-detail-meta-item">
            <span className="meta-item-label">Location</span>
            <span className="meta-item-value">
              <MapPin size={14} />
              {event.location || "—"}
            </span>
          </div>
          <div className="event-detail-meta-item">
            <span className="meta-item-label">Capacity</span>
            <span className="meta-item-value">
              <Users size={14} />
              {event.max_participants || "Unlimited"}
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="event-progress-card">
        <div className="progress-stats">
          <div className="progress-stat">
            <div className="progress-stat-value">{registrations.length}</div>
            <div className="progress-stat-label">Registered</div>
          </div>
          <div className="progress-stat">
            <div className="progress-stat-value">
              {event.max_participants
                ? event.max_participants - registrations.length
                : "∞"}
            </div>
            <div className="progress-stat-label">Available spots</div>
          </div>
          <div className="progress-stat">
            <div className="progress-stat-value">{event.max_participants || "∞"}</div>
            <div className="progress-stat-label">Total capacity</div>
          </div>
          <div className="progress-stat">
            <div className="progress-stat-value">{pct}%</div>
            <div className="progress-stat-label">Occupancy</div>
          </div>
        </div>
        <div className="progress-bar-lg">
          <div className="progress-fill-lg" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <p className="progress-label">{pct}% capacity filled</p>
      </div>

      {/* Registered participants */}
      <div className="participants-section">
        <div className="section-header">
          <span className="section-title">
            Registered Participants ({registrations.length})
          </span>
          {admin && (
            <button
              className="btn btn-primary"
              style={{ fontSize: "0.8rem", padding: "7px 14px" }}
              onClick={() => setShowModal(true)}
            >
              <Plus size={14} /> Register Participant
            </button>
          )}
        </div>

        {registrations.length === 0 ? (
          <div className="empty-state">
            <p>No participants registered yet</p>
            <p>Click "Register Participant" to add someone</p>
          </div>
        ) : (
          <table className="detail-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Organization</th>
                <th>Status</th>
                {admin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {registrations.map(reg => {
                const detail = getParticipantDetail(reg);
                return (
                  <tr key={reg.id}>
                    <td>
                      <div className="participant-name-cell">
                        <div className="participant-avatar">
                          {getInitials(detail)}
                        </div>
                        <span>{getParticipantName(reg)}</span>
                      </div>
                    </td>
                    <td style={{ color: "#64748b" }}>
                      {detail?.email || "—"}
                    </td>
                    <td style={{ color: "#64748b" }}>
                      {detail?.institution || "—"}
                    </td>
                    <td>
                      <span className="badge badge-confirmed">confirmed</span>
                    </td>
                    {admin && (
                      <td>
                        <button
                          className="btn btn-danger"
                          style={{ fontSize: "0.8rem", padding: "5px 12px" }}
                          onClick={() => handleUnregister(reg.id)}
                        >
                          <UserMinus size={13} /> Unregister
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <RegisterModal
          eventId={Number(id)}
          registered={registrations}
          allParticipants={allParticipants}
          onClose={() => setShowModal(false)}
          onRegister={handleRegister}
        />
      )}
    </div>
  );
}