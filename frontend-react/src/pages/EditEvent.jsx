import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { getEvent, updateEvent } from "../api/events";
import { getTags, getTagsSync } from "../api/tags";
import DateInput from "../components/DateInput";
import "../styles/CreateEvent.css";

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const cached = getTagsSync();
  const [availableTags, setAvailableTags] = useState(cached || []);
  const [tagInput, setTagInput] = useState("");

  const [form, setForm] = useState({
    title: "",
    format: "presential",
    date: "",
    time: "09:00",
    end_time: "18:00",
    capacity: 50,
    registration_mode: "VALIDATION",
    city: "",
    country: "",
    address_full: "",
    online_platform: "",
    online_link: "",
    registration_deadline_date: "",
    registration_deadline_time: "",
    description: "",
    tagIds: [],
  });

  useEffect(() => {
    if (!cached || cached.length === 0) {
      getTags().then(setAvailableTags).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getEvent(id)
      .then((event) => {
        const deadlineDt = event.registration_deadline || "";
        setForm({
          title: event.title || "",
          format: event.format || "presential",
          date: event.date || "",
          time: event.time || "09:00",
          end_time: event.date_end ? event.date_end.split("T")[1]?.substring(0, 5) : "18:00",
          capacity: event.max_participants || 50,
          registration_mode: event.registration_mode || "VALIDATION",
          city: event.city || "",
          country: event.country || "",
          address_full: event.address_full || "",
          online_platform: event.online_platform || "",
          online_link: event.online_link || "",
          registration_deadline_date: deadlineDt ? deadlineDt.split("T")[0] : "",
          registration_deadline_time: deadlineDt ? deadlineDt.split("T")[1]?.substring(0, 5) : "",
          description: event.description || "",
          tagIds: (event.tag_ids || []),
        });
      })
      .catch(console.error)
      .finally(() => setFetchLoading(false));
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleTag = (tagId) => {
    set("tagIds", form.tagIds.includes(tagId) ? form.tagIds.filter((t) => t !== tagId) : [...form.tagIds, tagId]);
  };

  const addTagByName = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (!trimmed) return;
    const match = availableTags.find((t) => t.name.toLowerCase() === trimmed);
    const best = match || availableTags.find((t) => t.name.toLowerCase().startsWith(trimmed));
    if (best && !form.tagIds.includes(best.id)) {
      set("tagIds", [...form.tagIds, best.id]);
    }
    setTagInput("");
  };

  const normalizeUrl = (url) => {
    if (!url || !url.trim()) return url;
    const u = url.trim();
    return /^https?:\/\//i.test(u) ? u : `https://${u}`;
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      if (!form.description.trim()) {
        setError("Description is required.");
        setLoading(false);
        return;
      }
      const formatMap = { presential: "ONSITE", online: "ONLINE", hybrid: "HYBRID" };
      const payload = {
        title: form.title,
        description: form.description,
        date_start: `${form.date}T${form.time}:00`,
        date_end: `${form.date}T${form.end_time}:00`,
        format: formatMap[form.format] || "ONSITE",
        capacity: parseInt(form.capacity) || 50,
        registration_mode: form.registration_mode,
        tag_ids: form.tagIds,
        status: "PUBLISHED",
      };
      if (form.format === "presential" || form.format === "hybrid") {
        payload.address_city = form.city;
        payload.address_country = form.country;
        payload.address_full = form.address_full;
      }
      if (form.format === "online" || form.format === "hybrid") {
        payload.online_platform = form.online_platform;
        if (form.online_link.trim()) payload.online_link = normalizeUrl(form.online_link);
      }
      if (form.registration_deadline_date) {
        const t = form.registration_deadline_time || "23:59";
        payload.registration_deadline = `${form.registration_deadline_date}T${t}:00`;
      }
      await updateEvent(id, payload);
      setSuccess(true);
    } catch (e) {
      setError(e.message || "Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="create-event-page">
        <div className="create-event-success-shell">
          <p style={{ color: "var(--text-dim)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>{"// loading..."}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="create-event-page">
        <div className="create-event-success-shell">
          <div className="create-event-success-card">
            <div style={{ fontSize: "48px", marginBottom: "24px", color: "var(--success)" }}>✓</div>
            <h2 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "12px" }}>Changes Saved!</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "15px", marginBottom: "36px", lineHeight: "1.6" }}>
              Your event has been updated successfully.
            </p>
            <div className="create-event-inline-actions">
              <button
                className="btn btn-primary"
                style={{ flex: 1, height: "48px" }}
                onClick={() => navigate(`/events/${id}`)}
              >
                View Event
              </button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, height: "48px" }}
                onClick={() => navigate("/dashboard")}
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-event-page">
      <div className="create-event-shell">
      <aside className="create-event-sidebar">
        <div className="create-event-sidebar-title">
          <p className="events-hero-eyebrow" style={{ marginBottom: "8px" }}>Organizer Flow</p>
          <h2 className="create-event-step-title" style={{ marginBottom: 0 }}>Edit Event</h2>
        </div>
        <div className="create-event-sidebar-menu">
          <p className="create-event-sidebar-item create-event-sidebar-item--active">Published Event</p>
        </div>
        <div className="create-event-sidebar-footer">
          <button className="create-event-back-btn" onClick={() => navigate(`/events/${id}`)}>
            ← Back to Event
          </button>
        </div>
      </aside>

      <div className="create-event-content">
        <div className="create-event-main">
          <h2 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "40px" }}>Edit Event</h2>

          {error && (
            <div className="create-event-alert">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
              {error}
            </div>
          )}

          {/* Title */}
          <div className="form-field">
            <label className="form-label">Event Title <span style={{ color: "var(--error)" }}>*</span></label>
            <input type="text" className="input" style={{ height: "48px" }} value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>

          {/* Tags */}
          <div className="form-field">
            <label className="form-label">Research Tags</label>
            {form.tagIds.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px", marginTop: "8px" }}>
                {availableTags.filter((t) => form.tagIds.includes(t.id)).map((tag) => (
                  <span key={tag.id} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px 4px 12px", borderRadius: "100px", background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.3)", color: "var(--accent)", fontSize: "12px", fontWeight: "600", fontFamily: "var(--font-mono)" }}>
                    {tag.name}
                    <button type="button" onClick={() => toggleTag(tag.id)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <input
                type="text"
                className="input"
                style={{ height: "40px", flex: 1 }}
                placeholder="Add a tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTagByName(); } }}
              />
              <button type="button" onClick={addTagByName} style={{ height: "40px", padding: "0 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-high)", color: "var(--text-muted)", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                Ajouter
              </button>
            </div>
            {tagInput.trim().length > 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {availableTags
                  .filter((t) => !form.tagIds.includes(t.id) && t.name.toLowerCase().includes(tagInput.trim().toLowerCase()))
                  .map((tag) => (
                    <button key={tag.id} type="button" onClick={() => { toggleTag(tag.id); setTagInput(""); }}
                      style={{ padding: "5px 14px", borderRadius: "100px", border: "1px solid var(--border)", background: "var(--surface-high)", color: "var(--text-muted)", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
                      {tag.name}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Format */}
          <div className="form-field">
            <label className="form-label">Format</label>
            <div className="create-event-grid-3">
              {[{ key: "presential", label: "In-Person", icon: "🏛" }, { key: "online", label: "Online", icon: "🌐" }, { key: "hybrid", label: "Hybrid", icon: "🔀" }].map((f) => (
                <button key={f.key} type="button" onClick={() => set("format", f.key)}
                  style={{ padding: "28px 20px", borderRadius: "12px", border: form.format === f.key ? "1px solid var(--accent)" : "1px solid var(--border)", background: form.format === f.key ? "rgba(0,229,255,0.06)" : "var(--surface-high)", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", marginBottom: "10px", color: form.format === f.key ? "var(--accent)" : "var(--text-dim)" }}>{f.icon}</div>
                  <p style={{ fontWeight: "700", fontSize: "15px", color: form.format === f.key ? "var(--accent)" : "var(--text-muted)" }}>{f.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="create-event-grid-2">
            <div className="form-field">
              <label className="form-label">Start Date</label>
              <DateInput style={{ height: "48px" }} value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Start Time</label>
              <input type="time" className="input" style={{ height: "48px" }} value={form.time} onChange={(e) => set("time", e.target.value)} />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">End Time</label>
            <input type="time" className="input" style={{ height: "48px", maxWidth: "200px" }} value={form.end_time} onChange={(e) => set("end_time", e.target.value)} />
          </div>

          {/* Location (presential / hybrid) */}
          {(form.format === "presential" || form.format === "hybrid") && (
            <>
              <div className="create-event-grid-2">
                <div className="form-field">
                  <label className="form-label">City</label>
                  <input type="text" className="input" style={{ height: "48px" }} value={form.city} onChange={(e) => set("city", e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Country</label>
                  <input type="text" className="input" style={{ height: "48px" }} value={form.country} onChange={(e) => set("country", e.target.value)} />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Full Address</label>
                <input type="text" className="input" style={{ height: "48px" }} value={form.address_full} onChange={(e) => set("address_full", e.target.value)} />
              </div>
            </>
          )}

          {/* Online info (online / hybrid) */}
          {(form.format === "online" || form.format === "hybrid") && (
            <>
              <div className="form-field">
                <label className="form-label">Platform <span style={{ color: "var(--error)" }}>*</span></label>
                <input type="text" className="input" style={{ height: "48px" }} placeholder="e.g. Zoom, Teams, Google Meet" value={form.online_platform} onChange={(e) => set("online_platform", e.target.value)} required />
              </div>
              <div className="form-field">
                <label className="form-label">Online Link</label>
                <input type="url" className="input" style={{ height: "48px" }} placeholder="https://meeting-platform.com/your-link" value={form.online_link} onChange={(e) => set("online_link", e.target.value)} />
              </div>
            </>
          )}

          {/* Capacity */}
          <div className="form-field">
            <label className="form-label">Max Participants</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" className="input" style={{ height: "48px", maxWidth: "200px" }} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
          </div>

          {/* Registration mode */}
          <div className="form-field">
            <label className="form-label">Registration Mode</label>
            <div className="create-event-grid-tight">
              {[
                { key: "VALIDATION", label: "Manual Review", desc: "You approve each registration" },
                { key: "AUTO", label: "Auto-Confirm", desc: "Registrations confirmed instantly" },
              ].map((m) => (
                <button key={m.key} type="button" onClick={() => set("registration_mode", m.key)}
                  style={{ padding: "14px", borderRadius: "10px", border: form.registration_mode === m.key ? "1px solid var(--accent)" : "1px solid var(--border)", background: form.registration_mode === m.key ? "rgba(0,229,255,0.06)" : "var(--surface-high)", color: form.registration_mode === m.key ? "var(--accent)" : "var(--text-muted)", fontSize: "13px", fontWeight: "600", cursor: "pointer", textAlign: "left" }}>
                  <p style={{ fontWeight: "700", marginBottom: "4px" }}>{m.label}</p>
                  <p style={{ fontSize: "11px", opacity: 0.7 }}>{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Registration Deadline */}
          <div className="form-field">
            <label className="form-label">Registration Deadline <span style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: "400" }}>(optional)</span></label>
            <div className="create-event-grid-2">
              <DateInput style={{ height: "48px" }} value={form.registration_deadline_date} onChange={(e) => set("registration_deadline_date", e.target.value)} />
              <input type="time" className="input" style={{ height: "48px" }} value={form.registration_deadline_time} onChange={(e) => set("registration_deadline_time", e.target.value)} />
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>If empty, registrations close at event start.</p>
          </div>

          {/* Description */}
          <div className="form-field">
            <label className="form-label">Description <span style={{ color: "var(--error)" }}>*</span></label>
            <textarea className="input" style={{ height: "120px", resize: "vertical" }} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="create-event-inline-actions" style={{ marginTop: "8px" }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, height: "48px", fontSize: "15px", borderRadius: "10px" }}
              onClick={handleSave}
              disabled={loading || !form.title || !form.description.trim() || ((form.format === "online" || form.format === "hybrid") && !form.online_platform)}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              className="btn btn-secondary"
              style={{ height: "48px", padding: "0 24px", borderRadius: "10px" }}
              onClick={() => navigate(`/events/${id}`)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
