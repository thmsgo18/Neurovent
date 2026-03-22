import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import NavUserMenu from "../components/NavUserMenu";
import "../styles/Events.css";
import { getEvents } from "../api/events";
import { getTags, getTagsSync } from "../api/tags";
import { registerToEvent, getMyRegistrations } from "../api/registrations";
import { isAdmin, isAuthed, isCompany } from "../store/authStore";

const PAGE_SIZE = 10;

export default function Events() {
  const navigate = useNavigate();
  const admin = isAdmin();
  const authed = isAuthed();
  const companyUser = isCompany();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState(""); // "" | "presential" | "online"
  const [selectedTagId, setSelectedTagId] = useState(null);

  // Sidebar tags from API
  const [allTags, setAllTags] = useState(getTagsSync() || []);

  const [registeredEvents, setRegisteredEvents] = useState(new Map()); // Map<eventId, status>
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [pendingEventId, setPendingEventId] = useState(null);
  const [, setHoveredCard] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load tags for sidebar
  useEffect(() => {
    if (!allTags.length) {
      getTags().then(setAllTags).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Parse la saisie pour détecter ville/pays ou texte
  const parseSearch = (query) => {
    if (!query.trim()) return {};
    // "Paris, France" ou "Paris France" ou "Paris"
    const parts = query.trim().split(/,\s*|\s+/).map((p) => p.trim()).filter(Boolean);
    // Si 1 ou 2 mots courts (≤20 chars chacun) → traiter comme localisation
    const isLocation = parts.length <= 2 && parts.every((p) => p.length <= 20 && /^[a-zA-ZÀ-ÿ\s-]+$/.test(p));
    if (isLocation) {
      return { city: parts[0], ...(parts[1] ? { country: parts[1] } : {}) };
    }
    return { search: query.trim() };
  };

  // Fetch events from backend when filters/page change
  useEffect(() => {
    const filters = { ...parseSearch(debouncedSearch) };
    if (formatFilter) filters.format = formatFilter;
    if (selectedTagId) filters.tags = selectedTagId;
    if (page > 1) filters.page = page;

    setLoading(true);
    getEvents(filters)
      .then(({ results, count }) => {
        setEvents(results);
        setTotalCount(count);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [debouncedSearch, formatFilter, selectedTagId, page]);

  // Charger les inscriptions existantes du participant
  useEffect(() => {
    if (authed && !companyUser) {
      getMyRegistrations()
        .then((regs) => {
          const map = new Map();
          regs
            .filter((r) => r.status !== "CANCELLED" && r.status !== "REJECTED")
            .forEach((r) => {
              const eid = typeof r.event === "object" ? r.event.id : r.event;
              map.set(eid, r.status);
            });
          setRegisteredEvents(map);
        })
        .catch(console.error);
    }
  }, [authed, companyUser]);

  const handleFormatFilter = (f) => {
    setFormatFilter(f === formatFilter ? "" : f);
    setSelectedTagId(null);
    setPage(1);
  };

  const handleTagFilter = (tagId) => {
    setSelectedTagId(tagId === selectedTagId ? null : tagId);
    setFormatFilter("");
    setPage(1);
  };

  const handleRegister = async (e, eventId) => {
    e.stopPropagation();
    if (!authed) {
      setPendingEventId(eventId);
      setShowAccessModal(true);
      return;
    }
    try {
      const reg = await registerToEvent(eventId);
      const ev = events.find((e) => e.id === eventId);
      const status = reg.status || (ev?.validation === "manual" ? "PENDING" : ev?.is_full ? "WAITLIST" : "CONFIRMED");
      setRegisteredEvents((prev) => new Map([...prev, [eventId, status]]));
    } catch (err) {
      if (err.message?.toLowerCase().includes("déjà inscrit") || err.message?.toLowerCase().includes("already")) {
        setRegisteredEvents((prev) => new Map([...prev, [eventId, "CONFIRMED"]]));
      }
      // Sinon l'erreur est silencieuse sur la liste (l'utilisateur peut cliquer sur l'event pour voir le détail)
    }
  };

  const formatDate = (d) => {
    if (!d) return "TBD";
    return new Date(d)
      .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      .toUpperCase();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "200px",
          minWidth: "200px",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "20px 20px", borderBottom: "1px solid var(--border)" }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: "800", fontSize: "18px", color: "var(--text)" }}>
              Neuro<span style={{ color: "var(--accent)" }}>vent</span>
            </span>
          </Link>
        </div>

        {/* Filters */}
        <nav style={{ flex: 1, padding: "20px 12px", overflowY: "auto" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)", paddingLeft: "8px", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            FORMAT
          </p>
          {[
            { key: "", label: "All Events" },
            { key: "presential", label: "In-Person" },
            { key: "online", label: "Online" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => handleFormatFilter(f.key)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "none",
                fontSize: "13px",
                fontWeight: formatFilter === f.key && !selectedTagId ? "700" : "500",
                cursor: "pointer",
                background: formatFilter === f.key && !selectedTagId ? "var(--accent)" : "transparent",
                color: formatFilter === f.key && !selectedTagId ? "#000" : "var(--text-muted)",
                marginBottom: "2px",
                transition: "var(--transition)",
              }}
            >
              {f.label}
            </button>
          ))}

          {allTags.length > 0 && (
            <>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-dim)", paddingLeft: "8px", marginTop: "16px", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                TOPICS
              </p>
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagFilter(tag.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: selectedTagId === tag.id ? "700" : "500",
                    cursor: "pointer",
                    background: selectedTagId === tag.id ? "var(--accent)" : "transparent",
                    color: selectedTagId === tag.id ? "#000" : "var(--text-muted)",
                    marginBottom: "2px",
                    transition: "var(--transition)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  #{tag.name}
                </button>
              ))}
            </>
          )}
        </nav>

        {/* Help */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "4px" }}>Need help hosting?</p>
          <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: "600", cursor: "pointer" }}>
            Contact us
          </span>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div
          style={{
            height: "64px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "0 32px",
            background: "var(--bg)",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, position: "relative", maxWidth: "360px" }}>
            <Search size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
            <input
              type="text"
              className="input"
              placeholder="Search by topic, lab, city..."
              style={{ paddingLeft: "42px", height: "40px", background: "var(--surface)", fontSize: "13px" }}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
            {admin && (
              <button
                className="btn btn-primary"
                onClick={() => navigate("/events/create")}
                style={{ padding: "8px 18px", fontSize: "13px" }}
              >
                + Create Event
              </button>
            )}
            {authed ? <NavUserMenu /> : (
              <Link to="/login" className="btn btn-secondary" style={{ padding: "8px 18px", fontSize: "13px", border: "1px solid var(--border-strong)" }}>
                Log In
              </Link>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "36px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: "800", fontFamily: "var(--font-display)" }}>
              Discovery Hub
            </h1>
            {!loading && (
              <span style={{ fontSize: "12px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                {totalCount} event{totalCount !== 1 ? "s" : ""} found
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: "80px", textAlign: "center" }}>
              <p className="mono" style={{ fontSize: "12px", color: "var(--text-dim)" }}>{"// loading..."}</p>
            </div>
          ) : events.length === 0 ? (
            <div style={{ padding: "80px", textAlign: "center", background: "var(--surface)", borderRadius: "16px", border: "1px dashed var(--border)" }}>
              <p style={{ color: "var(--text-dim)", marginBottom: "16px", fontSize: "14px" }}>No events found</p>
              <button className="btn btn-secondary" onClick={() => { setSearchInput(""); setDebouncedSearch(""); setFormatFilter(""); setSelectedTagId(null); setPage(1); }}>
                Reset filters
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {events.map((event) => {
                  const isFull = event.is_full || false;
                  const registrationOpen = event.registration_open !== false;
                  const spotsLeft = event.spots_remaining ?? Math.max(0, (event.max_participants || 50) - (event.registered_count || 0));

                  return (
                    <div
                      key={event.id}
                      onClick={() => navigate(`/events/${event.id}`)}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        padding: "18px 24px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "20px",
                        transition: "var(--transition)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent)";
                        e.currentTarget.style.background = "var(--surface-high)";
                        e.currentTarget.style.boxShadow = "0 0 0 1px rgba(0,229,255,0.15), 0 4px 20px rgba(0,229,255,0.06)";
                        setHoveredCard(event.id);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.background = "var(--surface)";
                        e.currentTarget.style.boxShadow = "none";
                        setHoveredCard(null);
                      }}
                    >
                      {/* Event info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {event.title}
                        </h3>
                        {event.organizer && (
                          <p style={{ fontSize: "13px", color: "var(--accent)", fontWeight: "600", marginBottom: "6px" }}>
                            {event.organizer}
                          </p>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "10px" }}>•</span>
                            {event.format === "online"
                              ? "Online Session"
                              : event.city
                              ? `${event.city}, ${event.country}`
                              : "TBD"}
                          </span>
                          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                            {formatDate(event.date_start)}
                          </span>
                          {(event.tags || []).slice(0, 2).map((tag) => (
                            <span key={tag} style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right: spots + button */}
                      <div style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: isFull ? "var(--error)" : "var(--accent)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                          {isFull ? "Full" : `${spotsLeft} left`}
                        </span>

                        {!companyUser && (
                          <button
                            className={registeredEvents.has(event.id) ? "" : "btn btn-primary"}
                            style={{
                              padding: "8px 20px",
                              fontSize: "13px",
                              fontWeight: "700",
                              whiteSpace: "nowrap",
                              ...(registeredEvents.has(event.id) && {
                                background: registeredEvents.get(event.id) === "PENDING"
                                  ? "rgba(245,196,0,0.12)"
                                  : registeredEvents.get(event.id) === "WAITLIST"
                                  ? "rgba(0,229,255,0.10)"
                                  : "rgba(0,255,149,0.12)",
                                border: `1px solid ${registeredEvents.get(event.id) === "PENDING" ? "#f5c400" : registeredEvents.get(event.id) === "WAITLIST" ? "var(--accent)" : "var(--success)"}`,
                                color: registeredEvents.get(event.id) === "PENDING"
                                  ? "#f5c400"
                                  : registeredEvents.get(event.id) === "WAITLIST"
                                  ? "var(--accent)"
                                  : "var(--success)",
                                borderRadius: "8px",
                                cursor: "default",
                              }),
                            }}
                            onClick={(e) => { if (!registeredEvents.has(event.id)) handleRegister(e, event.id); else e.stopPropagation(); }}
                            disabled={event.status === "past" || !registrationOpen || (isFull && event.validation === "manual")}
                          >
                            {registeredEvents.has(event.id)
                              ? registeredEvents.get(event.id) === "PENDING"
                                ? "Pending ⏳"
                                : registeredEvents.get(event.id) === "WAITLIST"
                                ? "Waitlist ✓"
                                : "Registered ✓"
                              : event.status === "past"
                              ? "Ended"
                              : !registrationOpen
                              ? "Closed"
                              : isFull && event.validation !== "auto"
                              ? "Full"
                              : isFull
                              ? "Join Waitlist"
                              : "Register"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginTop: "32px" }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: page === 1 ? "var(--text-dim)" : "var(--text)",
                      fontSize: "13px",
                      cursor: page === 1 ? "not-allowed" : "pointer",
                      transition: "var(--transition)",
                    }}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)" }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: page === totalPages ? "var(--text-dim)" : "var(--text)",
                      fontSize: "13px",
                      cursor: page === totalPages ? "not-allowed" : "pointer",
                      transition: "var(--transition)",
                    }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>

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
          {pendingEventId && (
            <button onClick={() => { setShowAccessModal(false); navigate(`/events/${pendingEventId}`); }} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "12px", marginTop: "20px", cursor: "pointer" }}>
              -- View event details instead
            </button>
          )}
        </div>
      </div>
    )}
    </>
  );
}
