import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { createEvent } from "../api/events";
import { getTags, getTagsSync } from "../api/tags";
import { getCompanyName, getDisplayName } from "../store/authStore";
import "../styles/CreateEvent.css";

const STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Schedule" },
  { id: 3, label: "Preview" },
];

export default function CreateEvent() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [published, setPublished] = useState(null); // {id}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cached = getTagsSync();
  const [availableTags, setAvailableTags] = useState(cached || []);
  const [tagsLoading, setTagsLoading] = useState(!cached || cached.length === 0);
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
      getTags()
        .then((tags) => { setAvailableTags(tags); setTagsLoading(false); })
        .catch(() => setTagsLoading(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleTag = (id) => {
    set("tagIds", form.tagIds.includes(id) ? form.tagIds.filter((t) => t !== id) : [...form.tagIds, id]);
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

  const handlePublish = async () => {
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
      const result = await createEvent(payload);
      setPublished(result);
    } catch (e) {
      setError(e.message || "Failed to publish event.");
    } finally {
      setLoading(false);
    }
  };

  const organizer = getCompanyName() || getDisplayName() || "Lab";

  if (published) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--success)",
            borderRadius: "24px",
            padding: "56px 48px",
            maxWidth: "480px",
            width: "100%",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "24px", color: "var(--success)" }}>✓</div>
          <h2 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "12px" }}>Event Published!</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "15px", marginBottom: "36px", lineHeight: "1.6" }}>
            Your event is now live and visible to the research community on Neurovent.
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, height: "48px" }}
              onClick={() => navigate(`/events/${published.id || ""}`)}
            >
              View Event
            </button>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, height: "48px" }}
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Left sidebar — steps */}
      <aside
        style={{
          width: "200px",
          minWidth: "200px",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          padding: "32px 20px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Link to="/" style={{ textDecoration: "none", marginBottom: "48px", display: "block" }}>
          <span
            style={{ fontFamily: "var(--font-display)", fontWeight: "800", fontSize: "18px", color: "var(--text)" }}
          >
            Neuro<span style={{ color: "var(--accent)" }}>vent</span>
          </span>
        </Link>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {STEPS.map((s) => (
            <div
              key={s.id}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: step === s.id ? "700" : "500",
                color: step === s.id ? "var(--accent)" : step > s.id ? "var(--text)" : "var(--text-dim)",
                background: step === s.id ? "rgba(0,229,255,0.08)" : "transparent",
                borderLeft: step === s.id ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: step > s.id ? "pointer" : "default",
              }}
              onClick={() => step > s.id && setStep(s.id)}
            >
              {s.id}. {s.label}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", paddingTop: "24px" }}>
          <button
            style={{
              background: "none",
              border: "none",
              color: "var(--text-dim)",
              fontSize: "12px",
              cursor: "pointer",
              padding: "8px 14px",
              borderRadius: "8px",
              transition: "var(--transition)",
            }}
            onClick={() => navigate("/dashboard")}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, padding: "48px 56px", overflowY: "auto" }}>
        <div style={{ maxWidth: "600px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "40px",
            }}
          >
            <h2 style={{ fontSize: "22px", fontWeight: "800" }}>
              {step === 1 ? "Create New Event" : step === 2 ? "Schedule & Capacity" : "Final Review"}
            </h2>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-dim)" }}>
              Step {step} / 3
            </span>
          </div>

          {/* ---- STEP 1 ---- */}
          {step === 1 && (
            <>
              <div className="form-field">
                <label className="form-label">
                  Event Title <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ height: "48px" }}
                  placeholder="Workshop on Federated Learning & Privacy"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  required
                />
              </div>

              {/* Tags */}
              <div className="form-field">
                <label className="form-label">Research Tags</label>

                {/* Tags sélectionnés */}
                {form.tagIds.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px", marginTop: "8px" }}>
                    {availableTags.filter((t) => form.tagIds.includes(t.id)).map((tag) => (
                      <span
                        key={tag.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "4px 10px 4px 12px",
                          borderRadius: "100px",
                          background: "rgba(0,229,255,0.12)",
                          border: "1px solid rgba(0,229,255,0.3)",
                          color: "var(--accent)",
                          fontSize: "12px",
                          fontWeight: "600",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {tagsLoading && (
                  <p style={{ fontSize: "11px", color: "var(--text-dim)", margin: "0 0 8px" }}>Chargement des tags...</p>
                )}

                {/* Input + bouton Ajouter */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                  <input
                    type="text"
                    className="input"
                    style={{ height: "40px", flex: 1 }}
                    placeholder={availableTags.length ? "Ajouter un tag..." : "Tags non disponibles"}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTagByName(); } }}
                  />
                  <button
                    type="button"
                    onClick={addTagByName}
                    style={{
                      height: "40px",
                      padding: "0 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--surface-high)",
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "var(--transition)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                  >
                    Ajouter
                  </button>
                </div>

                {/* Suggestions filtrées selon ce qui est tapé */}
                {tagInput.trim().length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {availableTags
                      .filter((t) =>
                        !form.tagIds.includes(t.id) &&
                        t.name.toLowerCase().includes(tagInput.trim().toLowerCase())
                      )
                      .map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => { toggleTag(tag.id); setTagInput(""); }}
                          style={{
                            padding: "5px 14px",
                            borderRadius: "100px",
                            border: "1px solid var(--border)",
                            background: "var(--surface-high)",
                            color: "var(--text-muted)",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontFamily: "var(--font-mono)",
                            transition: "var(--transition)",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "rgba(0,229,255,0.06)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "var(--surface-high)"; }}
                        >
                          {tag.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Format */}
              <div className="form-field">
                <label className="form-label">Format</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  {[
                    { key: "presential", label: "In-Person", icon: "🏛" },
                    { key: "online", label: "Online", icon: "🌐" },
                    { key: "hybrid", label: "Hybrid", icon: "🔀" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => set("format", f.key)}
                      style={{
                        padding: "28px 20px",
                        borderRadius: "12px",
                        border: form.format === f.key ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: form.format === f.key ? "rgba(0,229,255,0.06)" : "var(--surface-high)",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "var(--transition)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "24px",
                          marginBottom: "10px",
                          color: form.format === f.key ? "var(--accent)" : "var(--text-dim)",
                        }}
                      >
                        {f.icon}
                      </div>
                      <p
                        style={{
                          fontWeight: "700",
                          fontSize: "15px",
                          color: form.format === f.key ? "var(--accent)" : "var(--text-muted)",
                        }}
                      >
                        {f.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: "100%", height: "48px", fontSize: "15px", borderRadius: "10px", marginTop: "16px" }}
                onClick={() => setStep(2)}
                disabled={!form.title}
              >
                Continue to Schedule ...
              </button>
            </>
          )}

          {/* ---- STEP 2 ---- */}
          {step === 2 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-field">
                  <label className="form-label">
                    Start Date <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="input"
                    style={{ height: "48px" }}
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Start Time</label>
                  <input
                    type="time"
                    className="input"
                    style={{ height: "48px" }}
                    value={form.time}
                    onChange={(e) => set("time", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  className="input"
                  style={{ height: "48px", maxWidth: "200px" }}
                  value={form.end_time}
                  onChange={(e) => set("end_time", e.target.value)}
                />
                <p style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                  Same day as start date.
                </p>
              </div>

              {(form.format === "presential" || form.format === "hybrid") && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div className="form-field">
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="input"
                        style={{ height: "48px" }}
                        placeholder="Paris"
                        value={form.city}
                        onChange={(e) => set("city", e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        className="input"
                        style={{ height: "48px" }}
                        placeholder="France"
                        value={form.country}
                        onChange={(e) => set("country", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Full Address</label>
                    <input
                      type="text"
                      className="input"
                      style={{ height: "48px" }}
                      placeholder="INRIA Paris Lab, 2 rue Simone Iff, 75012 Paris"
                      value={form.address_full}
                      onChange={(e) => set("address_full", e.target.value)}
                    />
                  </div>
                </>
              )}

              {(form.format === "online" || form.format === "hybrid") && (
                <>
                  <div className="form-field">
                    <label className="form-label">
                      Platform <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ height: "48px" }}
                      placeholder="Zoom, YouTube Live, Teams..."
                      value={form.online_platform}
                      onChange={(e) => set("online_platform", e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Online Link</label>
                    <input
                      type="url"
                      className="input"
                      style={{ height: "48px" }}
                      placeholder="https://zoom.us/j/..."
                      value={form.online_link}
                      onChange={(e) => set("online_link", e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="form-field">
                <label className="form-label">Max Participants</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="input"
                  style={{ height: "48px", maxWidth: "200px" }}
                  value={form.capacity}
                  onChange={(e) => set("capacity", e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">Registration Mode</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {[
                    { key: "VALIDATION", label: "Manual Review", desc: "You approve each registration" },
                    { key: "AUTO", label: "Auto-Confirm", desc: "Registrations confirmed instantly" },
                  ].map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => set("registration_mode", m.key)}
                      style={{
                        padding: "14px",
                        borderRadius: "10px",
                        border:
                          form.registration_mode === m.key
                            ? "1px solid var(--accent)"
                            : "1px solid var(--border)",
                        background:
                          form.registration_mode === m.key ? "rgba(0,229,255,0.06)" : "var(--surface-high)",
                        color: form.registration_mode === m.key ? "var(--accent)" : "var(--text-muted)",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "var(--transition)",
                        textAlign: "left",
                      }}
                    >
                      <p style={{ fontWeight: "700", marginBottom: "4px" }}>{m.label}</p>
                      <p style={{ fontSize: "11px", opacity: 0.7 }}>{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Registration Deadline <span style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: "400" }}>(optional)</span></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <input
                    type="date"
                    className="input"
                    style={{ height: "48px" }}
                    value={form.registration_deadline_date}
                    onChange={(e) => set("registration_deadline_date", e.target.value)}
                  />
                  <input
                    type="time"
                    className="input"
                    style={{ height: "48px" }}
                    value={form.registration_deadline_time}
                    onChange={(e) => set("registration_deadline_time", e.target.value)}
                  />
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                  If empty, registrations close at event start.
                </p>
              </div>

              <div className="form-field">
                <label className="form-label">Description <span style={{ color: "var(--error)" }}>*</span></label>
                <textarea
                  className="input"
                  style={{ height: "120px", resize: "vertical" }}
                  placeholder="Describe the event, its goals, agenda, and who should attend..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: "100%", height: "48px", fontSize: "15px", borderRadius: "10px", marginTop: "8px" }}
                onClick={() => setStep(3)}
                disabled={!form.date || !form.description.trim() || ((form.format === "online" || form.format === "hybrid") && !form.online_platform)}
              >
                Generate Preview ...
              </button>
            </>
          )}

          {/* ---- STEP 3 ---- */}
          {step === 3 && (
            <>
              {error && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    background: "rgba(255, 77, 77, 0.08)",
                    border: "1px solid rgba(255, 77, 77, 0.2)",
                    color: "var(--error)",
                    padding: "14px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    marginBottom: "20px",
                    lineHeight: "1.5",
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
                  {error}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: "10px 24px", fontSize: "14px" }}
                  onClick={handlePublish}
                  disabled={loading}
                >
                  {loading ? "Publishing..." : "Publish Now"}
                </button>
              </div>

              {/* Preview card */}
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "16px",
                  padding: "28px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      background: "var(--secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: "800",
                      color: "#fff",
                    }}
                  >
                    {organizer.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "4px" }}>
                      {form.title || "Event Title"}
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--accent)" }}>Organized by {organizer}</p>
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--accent)",
                      background: "rgba(0,229,255,0.1)",
                      padding: "4px 10px",
                      borderRadius: "100px",
                    }}
                  >
                    UPCOMING
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                  {[
                    { label: "Date", value: form.date ? `${form.date} ${form.time}` : "TBD" },
                    {
                      label: "Location",
                      value:
                        form.format === "online"
                          ? (form.online_platform || "Online")
                          : form.format === "hybrid"
                          ? (form.city ? `${form.city} + ${form.online_platform || "Online"}` : "Hybrid")
                          : form.city
                          ? `${form.city}, ${form.country}`
                          : "TBD",
                    },
                    {
                      label: "Registration",
                      value: form.registration_mode === "VALIDATION" ? "Manual" : "Auto-Confirm",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        background: "var(--surface-high)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        padding: "12px",
                      }}
                    >
                      <p style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px" }}>{item.label}</p>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          color: item.label === "Registration" ? "var(--accent)" : "var(--text)",
                        }}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                  <div
                    style={{
                      background: "var(--surface-high)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "12px",
                    }}
                  >
                    <p style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px" }}>Capacity</p>
                    <p style={{ fontSize: "13px", fontWeight: "700" }}>{form.capacity} participants</p>
                  </div>
                  <div
                    style={{
                      background: "var(--surface-high)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "12px",
                    }}
                  >
                    <p style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px" }}>Format</p>
                    <p style={{ fontSize: "13px", fontWeight: "700", textTransform: "capitalize" }}>
                      {form.format}
                    </p>
                  </div>
                </div>

                {form.description && (
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "16px" }}>
                    {form.description.substring(0, 160)}
                    {form.description.length > 160 ? "..." : ""}
                  </p>
                )}

                {form.tagIds.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {availableTags
                      .filter((t) => form.tagIds.includes(t.id))
                      .map((tag) => (
                        <span
                          key={tag.id}
                          style={{
                            padding: "3px 10px",
                            borderRadius: "100px",
                            background: "rgba(0,229,255,0.08)",
                            border: "1px solid rgba(0,229,255,0.2)",
                            fontSize: "11px",
                            color: "var(--accent)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          #{tag.name}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              <button
                className="btn btn-ghost"
                style={{ marginTop: "16px", fontSize: "13px" }}
                onClick={() => setStep(2)}
              >
                ← Back to Schedule
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
