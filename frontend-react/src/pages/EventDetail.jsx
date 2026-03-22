import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Lock, Download, Check, X, Users } from "lucide-react";
import NavUserMenu from "../components/NavUserMenu";
import "../styles/EventDetail.css";
import { getEvent, deleteEvent, getEventStats } from "../api/events";
import { registerToEvent, cancelRegistration, getMyRegistrations, getEventRegistrations, updateRegistrationStatus, exportEventRegistrations } from "../api/registrations";
import { isAuthed, isCompany, getCompanyName } from "../store/authStore";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const authed = isAuthed();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [registerError, setRegisterError] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Company owner panel
  const [showRegistrations, setShowRegistrations] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    getEvent(id)
      .then(setEvent)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Vérifier si le participant est déjà inscrit
  useEffect(() => {
    if (!authed || isCompany()) return;
    getMyRegistrations().then((regs) => {
      const eventId = parseInt(id);
      const reg = regs.find((r) => {
        const rEventId = typeof r.event === "object" ? r.event.id : r.event;
        return rEventId === eventId;
      });
      if (reg) {
        if (reg.status !== "CANCELLED" && reg.status !== "REJECTED") {
          setRegistered(true);
          setRegistrationId(reg.id);
          setRegistrationStatus(reg.status);
        }
      }
    }).catch(console.error);
  }, [id, authed]);

  const handleRegister = async () => {
    if (!authed) { setShowAccessModal(true); return; }
    setRegisterError("");
    try {
      const reg = await registerToEvent(parseInt(id));
      setRegistered(true);
      setRegistrationId(reg.id);
      const status = reg.status || (
        event.validation === "manual" ? "PENDING" :
        isFull ? "WAITLIST" : "CONFIRMED"
      );
      setRegistrationStatus(status);
      // Mettre à jour le compteur localement
      if (reg.status === "CONFIRMED") {
        setEvent((prev) => prev ? {
          ...prev,
          registered_count: (prev.registered_count || 0) + 1,
          spots_remaining: Math.max(0, (prev.spots_remaining ?? prev.max_participants ?? 0) - 1),
        } : prev);
      }
    } catch (err) {
      if (err.message?.toLowerCase().includes("déjà inscrit")) {
        // Déjà inscrit → recharger silencieusement le statut
        getMyRegistrations().then((regs) => {
          const reg = regs.find((r) => {
            const rId = typeof r.event === "object" ? r.event.id : r.event;
            return rId === parseInt(id);
          });
          if (reg) {
            setRegistered(true);
            setRegistrationId(reg.id);
            setRegistrationStatus(reg.status);
          }
        }).catch(console.error);
      } else {
        setRegisterError(err.message || "Registration failed. Please try again.");
      }
    }
  };

  const handleCancelRegistration = async () => {
    if (!registrationId) return;
    setCancelLoading(true);
    try {
      await cancelRegistration(registrationId);
      setRegistered(false);
      setRegistrationId(null);
      setRegistrationStatus(null);
      // Mettre à jour le compteur localement
      setEvent((prev) => prev ? {
        ...prev,
        registered_count: Math.max(0, (prev.registered_count || 0) - 1),
        spots_remaining: (prev.spots_remaining ?? 0) + 1,
      } : prev);
    } catch (err) {
      setRegisterError(err.message || "Failed to cancel registration.");
    } finally {
      setCancelLoading(false);
    }
  };

  const loadRegistrations = () => {
    setRegsLoading(true);
    Promise.all([
      getEventRegistrations(id),
      getEventStats(id),
    ]).then(([regs, s]) => {
      setRegistrations(regs);
      setStats(s);
    }).catch(console.error)
      .finally(() => setRegsLoading(false));
  };

  const handleToggleRegistrations = () => {
    const next = !showRegistrations;
    setShowRegistrations(next);
    if (next && registrations.length === 0) loadRegistrations();
  };

  const handleUpdateStatus = async (regId, status) => {
    try {
      await updateRegistrationStatus(regId, status);
      setRegistrations((prev) => prev.map((r) => r.id === regId ? { ...r, status } : r));
      // Recharger les stats pour refléter le nouveau décompte
      getEventStats(id).then(setStats).catch(console.error);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancelEvent = async () => {
    if (!cancelConfirm) { setCancelConfirm(true); return; }
    try {
      await deleteEvent(id);
      navigate("/dashboard");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await exportEventRegistrations(id);
    } catch (err) {
      alert(err.message);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="mono" style={{ color: "var(--text-dim)", fontSize: "12px" }}>{"// loading..."}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Event not found.</p>
      </div>
    );
  }

  // Le backend retourne company_name dans les events (pas d'ID numérique company exposé).
  // On compare le company_name de l'event avec celui stocké au login.
  const myCompanyName = getCompanyName();
  const isEventOwner = isCompany() && myCompanyName && event.company_name === myCompanyName;
  const spotsLeft = event.spots_remaining ?? Math.max(0, (event.max_participants || 50) - (event.registered_count || 0));
  const isFull = event.is_full ?? spotsLeft <= 0;
  const registrationOpen = event.registration_open !== false;
  const initials = (event.organizer || "NV").substring(0, 2).toUpperCase();
  const isPast = event.status === "past" || event.status === "cancelled";

  const statusColor = {
    CONFIRMED: "var(--success)",
    PENDING: "#f5c400",
    WAITLIST: "var(--accent)",
    REJECTED: "var(--error)",
    CANCELLED: "var(--text-dim)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <header style={{ height: "60px", display: "flex", alignItems: "center", padding: "0 32px", borderBottom: "1px solid var(--border)", background: "var(--bg)", position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={() => navigate("/events")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", padding: 0 }}>
          <ArrowLeft size={15} />
          Back to discovery
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: "800", fontSize: "18px", color: "var(--text)" }}>
              Neuro<span style={{ color: "var(--accent)" }}>vent</span>
            </span>
          </Link>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", minWidth: "120px" }}>
          {authed ? <NavUserMenu /> : (
            <Link to="/login" className="btn btn-secondary" style={{ padding: "8px 20px", fontSize: "13px", border: "1px solid var(--border-strong)" }}>
              Log In
            </Link>
          )}
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, maxWidth: "1100px", margin: "0 auto", width: "100%", padding: "48px 32px", display: "flex", gap: "48px", alignItems: "flex-start" }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "32px", alignItems: "flex-start" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "17px", fontWeight: "800", color: "#fff", letterSpacing: "0.05em" }}>
              {initials}
            </div>
            <div>
              <h1 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: "800", lineHeight: "1.1", marginBottom: "8px" }}>
                {event.title}
              </h1>
              <p style={{ fontSize: "14px", color: "var(--accent)", fontWeight: "600" }}>
                {event.organizer || "Unknown"}
              </p>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: "1.8", marginBottom: "32px" }}>
            {event.description || "No description available."}
          </p>

          {/* Location */}
          {event.location && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", marginBottom: "28px" }}>
              <MapPin size={16} color="var(--accent)" style={{ marginTop: "2px", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "14px", color: "var(--text)", fontWeight: "600" }}>{event.location}</p>
                {event.city && (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
                    {event.city}, {event.country}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {(event.tags || []).length > 0 && (
            <div>
              <p style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-dim)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Tags
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {event.tags.map((tag) => (
                  <span key={tag} style={{ padding: "6px 14px", borderRadius: "100px", background: "var(--surface)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Inline registrations panel (company owner only) */}
          {isEventOwner && showRegistrations && (
            <div style={{ marginTop: "40px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "700" }}>
                  Registrations
                  {stats && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-dim)", fontWeight: "400", marginLeft: "12px" }}>
                      {stats.registrations?.confirmed || 0} confirmed · {stats.registrations?.pending || 0} pending · {stats.spots_remaining ?? 0} spots left
                    </span>
                  )}
                </h3>
                <button
                  onClick={handleExport}
                  disabled={exportLoading}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-high)", color: "var(--text-muted)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                >
                  <Download size={13} />
                  {exportLoading ? "Exporting..." : "Export CSV"}
                </button>
              </div>
              {regsLoading ? (
                <p style={{ fontSize: "12px", color: "var(--text-dim)" }}>Loading...</p>
              ) : registrations.length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>No registrations yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {registrations.map((reg) => {
                    const name = reg.participant_name || `#${reg.id}`;
                    const regDate = reg.created_at ? new Date(reg.created_at).toLocaleDateString() : null;
                    return (
                      <div key={reg.id} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px" }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text)" }}>{name}</p>
                          {regDate && (
                            <p style={{ fontSize: "12px", color: "var(--text-dim)" }}>Registered {regDate}</p>
                          )}
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: statusColor[reg.status] || "var(--text-muted)", fontFamily: "var(--font-mono)", padding: "3px 10px", borderRadius: "100px", border: `1px solid ${statusColor[reg.status] || "var(--border)"}`, background: "rgba(255,255,255,0.03)" }}>
                          {reg.status}
                        </span>
                        {reg.status === "PENDING" && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => handleUpdateStatus(reg.id, "CONFIRMED")}
                              style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--success)", background: "rgba(0,255,149,0.08)", color: "var(--success)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(reg.id, "REJECTED")}
                              style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--error)", background: "rgba(255,77,77,0.08)", color: "var(--error)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column — Registration / Management card */}
        <div style={{ width: "300px", flexShrink: 0 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", position: "sticky", top: "80px" }}>
            <h3 style={{ fontSize: "19px", fontWeight: "800", marginBottom: "20px" }}>
              {isEventOwner ? "Management" : isCompany() ? "Event Info" : "Registration"}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              <div style={{ background: "var(--surface-high)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px" }}>
                <p style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-dim)", marginBottom: "6px", textTransform: "uppercase" }}>Status</p>
                <p style={{ fontSize: "14px", fontWeight: "700", color: event.status === "upcoming" ? "var(--accent)" : event.status === "cancelled" ? "var(--error)" : "var(--text-dim)" }}>
                  {event.status === "upcoming" ? "Upcoming" : event.status === "cancelled" ? "Cancelled" : event.status || "Unknown"}
                </p>
              </div>
              <div style={{ background: "var(--surface-high)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px" }}>
                <p style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-dim)", marginBottom: "6px", textTransform: "uppercase" }}>Capacity</p>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "var(--text)" }}>
                  {event.registered_count || 0} / {event.max_participants || 50}
                </p>
              </div>
            </div>

            {isEventOwner ? (
              /* ---- Company owner: manage buttons ---- */
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", height: "44px", fontSize: "14px", borderRadius: "10px" }}
                  onClick={() => navigate(`/events/${id}/edit`)}
                >
                  Edit Event
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%", height: "44px", fontSize: "14px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  onClick={handleToggleRegistrations}
                >
                  <Users size={14} />
                  {showRegistrations ? "Hide Registrations" : "View Registrations"}
                </button>
                <button
                  onClick={handleCancelEvent}
                  style={{
                    width: "100%",
                    height: "44px",
                    fontSize: "14px",
                    borderRadius: "10px",
                    background: cancelConfirm ? "rgba(255,77,77,0.2)" : "rgba(255,77,77,0.08)",
                    border: "1px solid rgba(255,77,77,0.25)",
                    color: "var(--error)",
                    cursor: "pointer",
                    fontWeight: "600",
                    transition: "var(--transition)",
                  }}
                  onMouseEnter={(e) => { if (!cancelConfirm) e.currentTarget.style.background = "rgba(255,77,77,0.15)"; }}
                  onMouseLeave={(e) => { if (!cancelConfirm) e.currentTarget.style.background = "rgba(255,77,77,0.08)"; }}
                >
                  {cancelConfirm ? "Click again to confirm" : "Delete Event"}
                </button>
                {cancelConfirm && (
                  <button
                    onClick={() => setCancelConfirm(false)}
                    style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "12px", cursor: "pointer", padding: "4px 0" }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            ) : isCompany() ? (
              /* ---- Company non-owner ---- */
              <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "10px", textAlign: "center" }}>
                <p style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: "1.6" }}>
                  This event is managed by another organization.
                </p>
              </div>
            ) : (
              /* ---- Participant view ---- */
              <>
                {event.validation === "manual" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", fontSize: "12px", color: "var(--text-muted)", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <Lock size={13} />
                    Manual validation required by organizer.
                  </div>
                )}
                {registerError && (
                  <div style={{ fontSize: "12px", color: "var(--error)", background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.2)", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px", lineHeight: "1.5" }}>
                    {registerError}
                  </div>
                )}
                {registered ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{
                      width: "100%",
                      height: "48px",
                      borderRadius: "10px",
                      background: registrationStatus === "WAITLIST" ? "rgba(0,229,255,0.08)" : registrationStatus === "PENDING" ? "rgba(245,196,0,0.08)" : "rgba(0,255,149,0.1)",
                      border: `1px solid ${registrationStatus === "WAITLIST" ? "var(--accent)" : registrationStatus === "PENDING" ? "#f5c400" : "var(--success)"}`,
                      color: registrationStatus === "WAITLIST" ? "var(--accent)" : registrationStatus === "PENDING" ? "#f5c400" : "var(--success)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: "700",
                      gap: "8px",
                    }}>
                      {registrationStatus === "WAITLIST" && "Waitlist position saved"}
                      {registrationStatus === "PENDING" && "Pending validation"}
                      {(registrationStatus === "CONFIRMED" || !registrationStatus) && "Registered ✓"}
                    </div>
                    <button
                      onClick={handleCancelRegistration}
                      disabled={cancelLoading}
                      style={{
                        width: "100%",
                        height: "38px",
                        borderRadius: "10px",
                        background: "transparent",
                        border: "1px solid rgba(255,77,77,0.3)",
                        color: "var(--error)",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: cancelLoading ? "not-allowed" : "pointer",
                        opacity: cancelLoading ? 0.6 : 1,
                        transition: "var(--transition)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,77,77,0.08)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {cancelLoading ? "Cancelling..." : "Cancel Registration"}
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={handleRegister}
                    style={{ width: "100%", height: "48px", fontSize: "15px", borderRadius: "10px" }}
                    disabled={isPast || !registrationOpen || (isFull && event.validation === "manual")}
                  >
                    {isPast ? "Event Ended" : !registrationOpen ? "Registration Closed" : isFull && event.validation === "manual" ? "Full" : isFull ? "Join Waitlist" : "Register to Event"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Access Restricted Modal */}
      {showAccessModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={() => setShowAccessModal(false)}
        >
          <div
            style={{ background: "var(--surface)", border: "1px solid var(--accent)", borderRadius: "20px", padding: "48px 40px", maxWidth: "400px", width: "100%", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: "64px", height: "64px", background: "rgba(245,196,0,0.12)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <Lock size={28} color="#f5c400" />
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "12px" }}>Access Restricted</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "32px", lineHeight: "1.6" }}>
              You must be logged in to register for scientific events.
            </p>
            <button className="btn btn-primary" style={{ width: "100%", marginBottom: "12px", height: "48px", borderRadius: "10px" }} onClick={() => navigate("/login")}>
              Sign In to Account
            </button>
            <button className="btn btn-secondary" style={{ width: "100%", height: "48px", borderRadius: "10px" }} onClick={() => navigate("/register")}>
              Create New Identity
            </button>
            <button onClick={() => setShowAccessModal(false)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "12px", marginTop: "20px", cursor: "pointer" }}>
              -- Back to event description
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
