import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/Events.css";
import { getEvents } from "../api/events";
import { getTags, getTagsSync } from "../api/tags";
import { registerToEvent, getMyRegistrations } from "../api/registrations";
import { isAuthed, isCompany } from "../store/authStore";
import { applyTopicSuggestion, getActiveTopicQuery, getTopicSuggestions, stripTopicTokensFromQuery } from "../utils/topicSearch";

const PAGE_SIZE = 10;
const FORMAT_OPTIONS = [
  { key: "", label: "All Events" },
  { key: "presential", label: "In-Person" },
  { key: "online", label: "Online" },
  { key: "hybrid", label: "Hybrid" },
];

function parseSearch(query) {
  const cleanedQuery = stripTopicTokensFromQuery(query);
  if (!cleanedQuery.trim()) return {};
  const parts = cleanedQuery
    .trim()
    .split(/,\s*|\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const isLocation =
    parts.length <= 2 &&
    parts.every((part) => part.length <= 20 && /^[a-zA-ZÀ-ÿ\s-]+$/.test(part));

  if (isLocation) {
    return { city: parts[0], ...(parts[1] ? { country: parts[1] } : {}) };
  }

  return { search: cleanedQuery.trim() };
}

function formatDate(value) {
  if (!value) return "TBD";
  return new Date(value)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

export default function EventsResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const authed = isAuthed();
  const companyUser = isCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const lastSyncedSearchRef = useRef("");

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [allTags, setAllTags] = useState(getTagsSync() || []);
  const [registeredEvents, setRegisteredEvents] = useState(new Map());
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [pendingEventId, setPendingEventId] = useState(null);

  useEffect(() => {
    const currentSearch = location.search.startsWith("?") ? location.search.slice(1) : location.search;
    if (currentSearch === lastSyncedSearchRef.current) return;

    const q = searchParams.get("q") || "";
    const format = searchParams.get("format") || "";
    const tagParam = searchParams.get("tag");
    const parsedTagValue = tagParam ? Number(tagParam) : null;
    const parsedTagId = Number.isFinite(parsedTagValue) ? parsedTagValue : null;
    const pageParam = Number(searchParams.get("page") || "1");
    const nextPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

    setSearchInput((prev) => (prev === q ? prev : q));
    setDebouncedSearch((prev) => (prev === q ? prev : q));
    setFormatFilter((prev) => (prev === format ? prev : format));
    setSelectedTagId((prev) => (prev === parsedTagId ? prev : parsedTagId));
    setPage((prev) => (prev === nextPage ? prev : nextPage));
    lastSyncedSearchRef.current = currentSearch;
  }, [location.search, searchParams]);

  useEffect(() => {
    if (!allTags.length) {
      getTags().then(setAllTags).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (formatFilter) params.set("format", formatFilter);
    if (selectedTagId) params.set("tag", String(selectedTagId));
    if (page > 1) params.set("page", String(page));
    const next = params.toString();
    const current = location.search.startsWith("?") ? location.search.slice(1) : location.search;
    if (next !== current) {
      lastSyncedSearchRef.current = next;
      setSearchParams(params, { replace: true });
    }
  }, [debouncedSearch, formatFilter, page, selectedTagId, setSearchParams, location.search]);

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

  useEffect(() => {
    if (authed && !companyUser) {
      getMyRegistrations()
        .then((regs) => {
          const map = new Map();
          regs
            .filter((reg) => reg.status !== "CANCELLED" && reg.status !== "REJECTED")
            .forEach((reg) => {
              const eventId = typeof reg.event === "object" ? reg.event.id : reg.event;
              map.set(eventId, reg.status);
            });
          setRegisteredEvents(map);
        })
        .catch(console.error);
    }
  }, [authed, companyUser]);

  const selectedTag = allTags.find((tag) => tag.id === selectedTagId) || null;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const activeFilterItems = useMemo(
    () =>
      [
        selectedTag ? { key: "tag", label: `#${selectedTag.name}` } : null,
      ].filter(Boolean),
    [selectedTag],
  );

  const activeFormatIndex = Math.max(
    0,
    FORMAT_OPTIONS.findIndex((option) => option.key === formatFilter),
  );
  const activeTopicQuery = getActiveTopicQuery(searchInput);
  const topicSuggestions = useMemo(
    () => getTopicSuggestions(allTags, searchInput),
    [allTags, searchInput],
  );

  const handleFormatSwitch = (value) => {
    setFormatFilter(value);
    setPage(1);
  };

  const handleTopicSuggestionSelect = (tag) => {
    setSelectedTagId(tag.id);
    setSearchInput((prev) => applyTopicSuggestion(prev));
    setPage(1);
  };

  const resetResultsFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setFormatFilter("");
    setSelectedTagId(null);
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
      const event = events.find((item) => item.id === eventId);
      const status =
        reg.status ||
        (event?.validation === "manual"
          ? "PENDING"
          : event?.is_full
            ? "WAITLIST"
            : "CONFIRMED");
      setRegisteredEvents((prev) => new Map([...prev, [eventId, status]]));
    } catch (err) {
      if (err.message?.toLowerCase().includes("déjà inscrit") || err.message?.toLowerCase().includes("already")) {
        setRegisteredEvents((prev) => new Map([...prev, [eventId, "CONFIRMED"]]));
      }
    }
  };

  const getRegistrationStatus = (eventId) => registeredEvents.get(eventId);

  const getRegistrationClassName = (eventId) => {
    const status = getRegistrationStatus(eventId);
    if (!status) return "btn btn-primary event-register-btn";
    if (status === "PENDING") {
      return "event-register-btn event-register-btn--status event-register-btn--pending";
    }
    if (status === "WAITLIST") {
      return "event-register-btn event-register-btn--status event-register-btn--waitlist";
    }
    return "event-register-btn event-register-btn--status";
  };

  const getRegistrationLabel = (event, isFull, registrationOpen) => {
    const status = getRegistrationStatus(event.id);
    if (status === "PENDING") return "Pending";
    if (status === "WAITLIST") return "Waitlist";
    if (status) return "Registered";
    if (event.status === "past") return "Ended";
    if (!registrationOpen) return "Closed";
    if (isFull && event.validation !== "auto") return "Full";
    if (isFull) return "Join Waitlist";
    return "Register";
  };

  const getEventStatusClass = (status) => {
    if (status === "live") return "is-live";
    if (status === "past") return "is-past";
    if (status === "cancelled") return "is-cancelled";
    if (status === "draft") return "is-draft";
    return "is-upcoming";
  };

  return (
    <>
      <div className="events-page events-page--results events-page--results-simple">
        <div className="events-main events-main--results">
          <div className="events-content events-content--results-fixed">
            <div className="events-results-static">
              <section className="events-results-toolbar">
                <div className="events-results-search-row events-search-with-suggestions">
                  <div className="events-results-search-shell">
                    <span className="events-search-icon-shell" aria-hidden="true">
                      <Search size={18} className="events-hero-search-icon" />
                    </span>
                    <input
                      type="text"
                      className="input events-results-search-input"
                      placeholder="Search by keyword, organization, location..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </div>

                  <div
                    className="events-format-switch"
                    style={{ "--format-index": activeFormatIndex, "--format-count": FORMAT_OPTIONS.length }}
                  >
                    <span className="events-format-switch__slider" aria-hidden="true" />
                    {FORMAT_OPTIONS.map((option) => (
                      <button
                        key={option.key || "all-events"}
                        type="button"
                        className={`events-format-switch__option${formatFilter === option.key ? " events-format-switch__option--active" : ""}`}
                        onClick={() => handleFormatSwitch(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {activeTopicQuery !== null && topicSuggestions.length > 0 && (
                    <div className="events-topic-suggestions events-topic-suggestions--results">
                      <p className="events-topic-suggestions-label">Suggested topics</p>
                      <div className="events-topic-suggestions-list">
                        {topicSuggestions.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            className="events-topic-suggestion"
                            onClick={() => handleTopicSuggestionSelect(tag)}
                          >
                            #{tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="events-active-filters">
                  {activeFilterItems.length > 0 && (
                    <span className="events-active-filters-label">Selected topics</span>
                  )}
                  {activeFilterItems.map((item) => (
                    <span key={item.key} className="events-active-filter-pill">
                      {item.label}
                    </span>
                  ))}
                </div>
              </section>

              <div className="events-header">
                <div>
                  <h2 className="events-heading">Matching Events</h2>
                  {!loading && (
                    <span className="events-count">
                      {totalCount} event{totalCount !== 1 ? "s" : ""} found
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="events-results-list-scroll">
              {loading ? (
                <div className="events-loading">
                  <p className="mono text-xs text-dim">{"// loading..."}</p>
                </div>
              ) : events.length === 0 ? (
                <div className="events-empty">
                  <p className="events-empty-title">No events found</p>
                  <p className="events-empty-sub">Try adjusting your search or clearing the active filters.</p>
                  <button className="btn btn-secondary" onClick={resetResultsFilters}>
                    Reset filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="events-list">
                    {events.map((event) => {
                    const isFull = event.is_full || false;
                    const registrationOpen = event.registration_open !== false;
                    const spotsLeft =
                      event.spots_remaining ??
                      Math.max(0, (event.max_participants || 50) - (event.registered_count || 0));

                    return (
                      <div
                        key={event.id}
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="event-card"
                      >
                        <div className="event-card-info">
                          <h3 className="event-card-title">{event.title}</h3>
                          {event.organizer && (
                            <p className="event-card-organizer">{event.organizer}</p>
                          )}
                          <div className="event-card-meta">
                            <span className="event-card-meta-item">
                              <span className="event-card-tag">•</span>
                              {event.format === "online"
                                ? "Online Session"
                                : event.city
                                  ? `${event.city}, ${event.country}`
                                  : "TBD"}
                            </span>
                            <span className="event-card-meta-item">{formatDate(event.date_start)}</span>
                            {(event.tags || []).slice(0, 2).map((tag) => (
                              <span key={tag} className="event-card-tag">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="event-card-right">
                          <span className={`event-card-status ${getEventStatusClass(event.status)}`}>
                            {event.status_label || event.status}
                          </span>
                          <span className={`event-card-spots ${isFull ? "event-card-spots--full" : "event-card-spots--open"}`}>
                            {isFull ? "Full" : `${spotsLeft} left`}
                          </span>

                          {!companyUser && (
                            <button
                              className={getRegistrationClassName(event.id)}
                              onClick={(e) => {
                                if (!registeredEvents.has(event.id)) handleRegister(e, event.id);
                                else e.stopPropagation();
                              }}
                              disabled={event.status === "past" || !registrationOpen || (isFull && event.validation === "manual")}
                            >
                              {getRegistrationLabel(event, isFull, registrationOpen)}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="events-pagination">
                      <button
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1}
                        className="events-pagination-btn"
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>
                      <span className="events-pagination-count">
                        {page} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page === totalPages}
                        className="events-pagination-btn"
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
      </div>

      {showAccessModal && (
        <div className="events-modal-backdrop" onClick={() => setShowAccessModal(false)}>
          <div className="events-modal" onClick={(e) => e.stopPropagation()}>
            <div className="events-modal-icon">
              <Lock size={28} color="#f5c400" />
            </div>
            <h2 className="events-modal-title">Access Restricted</h2>
            <p className="events-modal-copy">
              You must be logged in to register for scientific events.
            </p>
            <div className="events-modal-actions">
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => navigate("/login")}>
                Sign In to Account
              </button>
              <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => navigate("/register")}>
                Create New Identity
              </button>
            </div>
            {pendingEventId && (
              <button
                className="events-modal-link"
                onClick={() => {
                  setShowAccessModal(false);
                  navigate(`/events/${pendingEventId}`);
                }}
              >
                Continue browsing this event
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
