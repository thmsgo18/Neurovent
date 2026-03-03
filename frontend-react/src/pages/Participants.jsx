import { useState, useEffect, useMemo } from "react";
import { Search, Plus, X, Mail, Building } from "lucide-react";
import {
  getParticipants, createParticipant,
  updateParticipant, deleteParticipant
} from "../api/participants";
import { isAdmin } from "../store/authStore";
import "../styles/Participants.css";

function ParticipantModal({ participant, onClose, onSave }) {
  const [form, setForm] = useState(participant || {
    first_name: "", last_name: "", email: "", institution: "", phone: ""
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.email) return;
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
            {participant ? "Edit Participant" : "Add Participant"}
          </span>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label">First Name *</label>
            <input className="form-input" value={form.first_name}
              onChange={e => set("first_name", e.target.value)} placeholder="Alice" />
          </div>
          <div className="form-field">
            <label className="form-label">Last Name *</label>
            <input className="form-input" value={form.last_name}
              onChange={e => set("last_name", e.target.value)} placeholder="Martin" />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Email *</label>
          <input className="form-input" type="email" value={form.email}
            onChange={e => set("email", e.target.value)}
            placeholder="alice@example.com" />
        </div>

        <div className="form-field">
          <label className="form-label">Institution / Organization</label>
          <input className="form-input" value={form.institution}
            onChange={e => set("institution", e.target.value)}
            placeholder="Université Paris-Saclay" />
        </div>

        <div className="form-field">
          <label className="form-label">Phone</label>
          <input className="form-input" value={form.phone}
            onChange={e => set("phone", e.target.value)}
            placeholder="+33 6 00 00 00 00" />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : participant ? "Save Changes" : "Add Participant"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Participants() {
  const admin = isAdmin();

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [modal, setModal]               = useState(null);
  const [deleting, setDeleting]         = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getParticipants();
      setParticipants(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search) return participants;
    const s = search.toLowerCase();
    return participants.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(s) ||
      p.email.toLowerCase().includes(s) ||
      (p.institution || "").toLowerCase().includes(s)
    );
  }, [participants, search]);

  async function handleSave(form) {
    if (modal === "create") {
      const created = await createParticipant(form);
      setParticipants(prev => [...prev, created]);
    } else {
      const updated = await updateParticipant(modal.id, form);
      setParticipants(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await deleteParticipant(id);
      setParticipants(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  }

  const getInitials = (p) =>
    `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase();

  if (loading) return (
    <div className="loading-container">
      <div className="spinner" /> Loading participants...
    </div>
  );

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a" }}>
          Participants
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: 4 }}>
          {participants.length} registered participants · {filtered.length} shown
        </p>
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 20 }}>
        <div className="search-bar">
          <Search size={16} className="search-bar-icon" />
          <input
            className="search-input"
            placeholder="Search by name, email, or organization..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {admin && (
          <button className="toolbar-btn primary" onClick={() => setModal("create")}>
            <Plus size={16} /> Add Participant
          </button>
        )}
      </div>

      {/* Table */}
      <div className="participants-table-card">
        <table className="participants-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Organization</th>
              <th>Events</th>
              {admin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={admin ? 5 : 4} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  No participants found
                </td>
              </tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div className="participant-name-cell">
                    <div className="participant-avatar">{getInitials(p)}</div>
                    <span>{p.first_name} {p.last_name}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b" }}>
                    <Mail size={13} />
                    {p.email}
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b" }}>
                    <Building size={13} />
                    {p.institution || "—"}
                  </div>
                </td>
                <td>
                  <span className="events-count-badge">
                    {p.registration_count || 0}
                  </span>
                </td>
                {admin && (
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: "0.8rem", padding: "5px 12px" }}
                        onClick={() => setModal(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: "0.8rem", padding: "5px 12px" }}
                        disabled={deleting === p.id}
                        onClick={() => handleDelete(p.id)}
                      >
                        {deleting === p.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <ParticipantModal
          participant={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}