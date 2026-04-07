import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/Events.css";
import { getEvents } from "../api/events";
import { getCompanies } from "../api/companies";
import { getTags, getTagsSync } from "../api/tags";
import { registerToEvent, getMyRegistrations } from "../api/registrations";
import { isAuthed, isCompany } from "../store/authStore";
import SearchTopicInput from "../components/SearchTopicInput";
import { usePreferences } from "../context/PreferencesContext";
import {
  applyTopicSuggestion,
  getActiveTopicQuery,
  getMatchingTopicIds,
  getTopicSuggestions,
  stripTopicTokensFromQuery,
} from "../utils/topicSearch";

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
  const normalizedQuery = cleanedQuery.trim();
  const parts = normalizedQuery
    .trim()
    .split(/,\s*|\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const hasComma = normalizedQuery.includes(",");
  const isLocation =
    hasComma &&
    parts.length <= 2 &&
    parts.every((part) => part.length <= 20 && /^[a-zA-ZÀ-ÿ\s-]+$/.test(part));

  if (isLocation) {
    return { city: parts[0], ...(parts[1] ? { country: parts[1] } : {}) };
  }

  return { search: normalizedQuery };
}

function formatDate(value) {
  if (!value) return null;
  return new Date(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSearchTerms(query) {
  return stripTopicTokensFromQuery(query)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function highlightMatches(text, terms) {
  if (!text) return text;
  if (!terms.length) return text;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = String(text).split(pattern);
  const exactPattern = new RegExp(`^(?:${terms.map(escapeRegExp).join("|")})$`, "i");

  return parts.map((part, index) => (
    exactPattern.test(part)
      ? <strong key={`${part}-${index}`} className="event-highlight">{part}</strong>
      : part
  ));
}

function buildDescriptionSnippet(description, terms) {
  const value = String(description || "").trim();
  if (!value) return null;
  if (!terms.length) return value.length > 180 ? `${value.slice(0, 180).trim()}...` : value;

  const lower = value.toLowerCase();
  const firstIndex = terms
    .map((term) => lower.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  if (firstIndex === undefined) return value.length > 180 ? `${value.slice(0, 180).trim()}...` : value;

  const start = Math.max(0, firstIndex - 40);
  const end = Math.min(value.length, firstIndex + 140);
  const snippet = value.slice(start, end).trim();
  const prefix = start > 0 ? "... " : "";
  const suffix = end < value.length ? " ..." : "";
  return `${prefix}${snippet}${suffix}`;
}

function getDeadlineSoonLabel(value, t) {
  if (!value) return null;

  const diff = new Date(value).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return null;

  const fiveDays = 5 * 24 * 60 * 60 * 1000;
  if (diff > fiveDays) return null;

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor(totalMinutes / 60);

  if (days > 0) {
    return t("Closes in {{count}} day{{suffix}}", { count: days, suffix: days > 1 ? "s" : "" });
  }
  if (hours > 0) {
    return t("Closes in {{count}} hour{{suffix}}", { count: hours, suffix: hours > 1 ? "s" : "" });
  }
  return t("Closes in {{count}} min", { count: Math.max(1, totalMinutes) });
}

function getPrimaryStatusDisplay(event, t) {
  const deadlineSoonLabel =
    event.status === "upcoming"
      ? getDeadlineSoonLabel(event.registration_deadline, t)
      : null;

  if (deadlineSoonLabel) {
    return {
      label: deadlineSoonLabel,
      className: "event-card-status--deadline",
    };
  }

  return {
    label: event.status_badge_label || event.status_label || event.status,
    className: event.status_badge_class || "is-upcoming",
  };
}

function readResultsStateFromSearch(search) {
  const currentSearch = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(currentSearch);
  const q = params.get("q") || "";
  const format = params.get("format") || "";
  const organization = params.get("organization") || "";
  const upcoming = params.get("upcoming") === "1";
  const parsedTagIds = params
    .getAll("tag")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const pageParam = Number(params.get("page") || "1");
  const nextPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  return {
    currentSearch,
    q,
    format,
    organization,
    upcoming,
    parsedTagIds,
    nextPage,
  };
}

export default function EventsResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale } = usePreferences();
  const authed = isAuthed();
  const companyUser = isCompany();
  const [, setSearchParams] = useSearchParams();
  const initialUrlStateRef = useRef(readResultsStateFromSearch(location.search));
  const initialUrlState = initialUrlStateRef.current;
  const lastSyncedSearchRef = useRef(initialUrlState.currentSearch);
  const hasHydratedFromUrlRef = useRef(true);

  const [events, setEvents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(initialUrlState.nextPage);
  const [searchInput, setSearchInput] = useState(initialUrlState.q);
  const [formatFilter, setFormatFilter] = useState(initialUrlState.format);
  const [appliedSearch, setAppliedSearch] = useState(initialUrlState.q);
  const [appliedFormatFilter, setAppliedFormatFilter] = useState(initialUrlState.format);
  const [appliedTagIds, setAppliedTagIds] = useState(initialUrlState.parsedTagIds);
  const [organizationFilter, setOrganizationFilter] = useState(initialUrlState.organization);
  const [upcomingOnly, setUpcomingOnly] = useState(initialUrlState.upcoming);
  const [allTags, setAllTags] = useState(getTagsSync() || []);
  const [registeredEvents, setRegisteredEvents] = useState(new Map());
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [pendingEventId, setPendingEventId] = useState(null);

  useEffect(() => {
    const {
      currentSearch,
      q,
      format,
      organization,
      upcoming,
      parsedTagIds,
      nextPage,
    } = readResultsStateFromSearch(location.search);

    if (currentSearch === lastSyncedSearchRef.current) return;

    setSearchInput((prev) => (prev === q ? prev : q));
    setAppliedSearch((prev) => (prev === q ? prev : q));
    setFormatFilter((prev) => (prev === format ? prev : format));
    setAppliedFormatFilter((prev) => (prev === format ? prev : format));
    setOrganizationFilter((prev) => (prev === organization ? prev : organization));
    setUpcomingOnly((prev) => (prev === upcoming ? prev : upcoming));
    setAppliedTagIds((prev) => (
      prev.length === parsedTagIds.length && prev.every((value, index) => value === parsedTagIds[index])
        ? prev
        : parsedTagIds
    ));
    setPage((prev) => (prev === nextPage ? prev : nextPage));
    lastSyncedSearchRef.current = currentSearch;
  }, [location.search]);

  useEffect(() => {
    if (!allTags.length) {
      getTags().then(setAllTags).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hasHydratedFromUrlRef.current) return;

    const params = new URLSearchParams();
    if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
    if (appliedFormatFilter) params.set("format", appliedFormatFilter);
    if (organizationFilter) params.set("organization", organizationFilter);
    if (upcomingOnly) params.set("upcoming", "1");
    appliedTagIds.forEach((tagId) => params.append("tag", String(tagId)));
    if (page > 1) params.set("page", String(page));
    const next = params.toString();
    const current = location.search.startsWith("?") ? location.search.slice(1) : location.search;
    if (next !== current) {
      lastSyncedSearchRef.current = next;
      setSearchParams(params, { replace: true });
    }
  }, [appliedSearch, appliedFormatFilter, page, appliedTagIds, organizationFilter, upcomingOnly, setSearchParams, location.search]);

  useEffect(() => {
    if (!hasHydratedFromUrlRef.current) return;

    const filters = { ...parseSearch(appliedSearch) };
    if (appliedFormatFilter) filters.format = appliedFormatFilter;
    if (appliedTagIds.length) filters.tags = appliedTagIds;
    if (organizationFilter) filters.organization = organizationFilter;
    if (upcomingOnly) filters.upcomingOnly = true;
    if (page > 1) filters.page = page;

    const companySearch = stripTopicTokensFromQuery(appliedSearch).trim();
    const shouldFetchCompanies = Boolean(companySearch || organizationFilter);

    setLoading(true);
    Promise.all([
      getEvents(filters),
      shouldFetchCompanies
        ? getCompanies({ search: companySearch, organization: organizationFilter })
        : Promise.resolve({ results: [] }),
    ])
      .then(([eventData, companyData]) => {
        setEvents(eventData.results);
        setTotalCount(eventData.count);
        setCompanies(companyData.results || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [appliedSearch, appliedFormatFilter, appliedTagIds, organizationFilter, page, upcomingOnly]);

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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const activeFormatIndex = Math.max(
    0,
    FORMAT_OPTIONS.findIndex((option) => option.key === formatFilter),
  );
  const searchTerms = useMemo(
    () => getSearchTerms(appliedSearch),
    [appliedSearch],
  );
  const activeTopicQuery = getActiveTopicQuery(searchInput);
  const topicSuggestions = useMemo(
    () => getTopicSuggestions(allTags, searchInput),
    [allTags, searchInput],
  );

  const handleFormatSwitch = (value) => {
    setFormatFilter(value);
    setAppliedFormatFilter(value);
    setPage(1);
  };

  const resultsReturnTarget = `${location.pathname}${location.search}`;

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setAppliedFormatFilter(formatFilter);
    setAppliedTagIds(getMatchingTopicIds(allTags, searchInput));
    setPage(1);
  };

  const applySearchValue = (nextQuery) => {
    setAppliedSearch(nextQuery.trim());
    setAppliedFormatFilter(formatFilter);
    setAppliedTagIds(getMatchingTopicIds(allTags, nextQuery));
    setPage(1);
  };

  const handleTopicSuggestionSelect = (tag) => {
    setSearchInput((prev) => applyTopicSuggestion(prev, tag.name));
  };

  const resetResultsFilters = () => {
    setSearchInput("");
    setFormatFilter("");
    setAppliedSearch("");
    setAppliedFormatFilter("");
    setAppliedTagIds([]);
    setOrganizationFilter("");
    setUpcomingOnly(false);
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
    if (status === "PENDING") return t("Pending");
    if (status === "WAITLIST") return t("Waitlist");
    if (status) return t("Registered");
    if (event.status === "past") return t("Ended");
    if (!registrationOpen) return t("Closed");
    if (event.status === "live" && registrationOpen && (event.format === "online" || event.format === "hybrid")) {
      return t("Join Live");
    }
    if (isFull && event.validation !== "auto") return t("Full");
    if (isFull) return t("Join Waitlist");
    return t("Register");
  };

  return (
    <>
      <div className="events-page events-page--results events-page--results-simple">
        <div className="events-main events-main--results">
          <div className="events-content events-content--results-fixed">
            <div className="events-results-static">
              <section className="events-results-toolbar">
                <form className="events-results-search-row events-search-with-suggestions" onSubmit={handleSearchSubmit}>
                  <div className="events-search-with-suggestions__main events-search-with-suggestions__main--results">
                    <div className="events-results-search-shell">
                      <span className="events-search-icon-shell" aria-hidden="true">
                        <Search size={18} className="events-hero-search-icon" />
                      </span>
                      <SearchTopicInput
                        value={searchInput}
                        onChange={setSearchInput}
                        tags={allTags}
                        inputClassName="input events-results-search-input"
                        placeholder={t("Search events, organizations, locations...")}
                        onTopicRemove={applySearchValue}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            handleSearchSubmit(event);
                          }
                        }}
                      />
                    </div>
                    {activeTopicQuery !== null && topicSuggestions.length > 0 && (
                      <div className="events-topic-suggestions events-topic-suggestions--inline events-topic-suggestions--results-inline">
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

                  <div
                    className={`events-format-switch events-format-switch--index-${activeFormatIndex}`}
                  >
                    <span className="events-format-switch__slider" aria-hidden="true" />
                    {FORMAT_OPTIONS.map((option) => (
                      <button
                        key={option.key || "all-events"}
                        type="button"
                        className={`events-format-switch__option${formatFilter === option.key ? " events-format-switch__option--active" : ""}`}
                        onClick={() => handleFormatSwitch(option.key)}
                      >
                        {t(option.label)}
                      </button>
                    ))}
                  </div>
                </form>
              </section>

              <div className="events-header">
                <div>
                  <h2 className="events-heading">{t("Search Results")}</h2>
                  {!loading && (
                    <span className="events-count">
                      {t("{{events}} event{{eventSuffix}} • {{organizations}} organization{{organizationSuffix}}", {
                        events: totalCount,
                        eventSuffix: totalCount !== 1 ? "s" : "",
                        organizations: companies.length,
                        organizationSuffix: companies.length !== 1 ? "s" : "",
                      })}
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
              ) : (
                <>
                  {companies.length > 0 && (
                    <section className="events-companies-section">
                      <div className="events-companies-list">
                        {companies.map((company) => (
                          <button
                            key={company.id}
                            type="button"
                            className="company-card"
                            onClick={() => navigate(`/company/${company.id}`)}
                          >
                            <div className="company-card-top">
                              {company.company_logo_url || company.company_logo ? (
                                <img
                                  src={company.company_logo_url || company.company_logo}
                                  alt={company.company_name}
                                  className="company-card-logo"
                                />
                              ) : (
                                <div className="company-card-logo company-card-logo--fallback">
                                  {(company.company_name || "OR").substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="company-card-copy">
                                <h3 className="company-card-title">
                                  {highlightMatches(company.company_name, searchTerms)}
                                </h3>
                                <p className="company-card-meta">
                                  {t("{{count}} public event{{suffix}}", {
                                    count: company.total_events || 0,
                                    suffix: (company.total_events || 0) !== 1 ? "s" : "",
                                  })}
                                </p>
                              </div>
                            </div>
                            <p className="company-card-description">
                              {company.company_description
                                ? highlightMatches(buildDescriptionSnippet(company.company_description, searchTerms), searchTerms)
                                : t("No organization description available yet.")}
                            </p>
                            <div className="company-card-tags">
                              {(company.tags || []).slice(0, 2).map((tag) => (
                                <span key={typeof tag === "object" ? tag.id : tag}>
                                  #{typeof tag === "object" ? tag.name : tag}
                                </span>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {events.length === 0 ? (
                    <div className="events-empty">
                      <p className="events-empty-title">{t("No events found")}</p>
                      <p className="events-empty-sub">{t("Try adjusting your search or clearing the active filters.")}</p>
                      <button className="btn btn-secondary" onClick={resetResultsFilters}>
                        {t("Reset filters")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <ul className="events-list collection-list">
                        {events.map((event) => {
                          const isFull = event.unlimited_capacity ? false : (event.is_full || false);
                          const registrationOpen = event.registration_open !== false;
                          const spotsLeft = event.unlimited_capacity
                            ? null
                            : (
                              event.spots_remaining ??
                              Math.max(0, (event.max_participants || 50) - (event.registered_count || 0))
                            );

                          return (
                            <li key={event.id} className="collection-list__item">
                              <div
                                onClick={() => navigate(`/events/${event.id}`, {
                                  state: {
                                    fromResults: resultsReturnTarget,
                                  },
                                })}
                                className="event-card"
                              >
                                <div className="event-card-info">
                                  <h3 className="event-card-title">
                                    {highlightMatches(event.title, searchTerms)}
                                  </h3>
                                  {event.organizer && (
                                    <p className="event-card-organizer">
                                      {highlightMatches(event.organizer, searchTerms)}
                                    </p>
                                  )}
                                  <p className="event-card-description">
                                    {(() => {
                                      const descriptionSnippet = buildDescriptionSnippet(event.description, searchTerms);
                                      if (!descriptionSnippet) {
                                        return t("No description available yet.");
                                      }
                                      return highlightMatches(descriptionSnippet, searchTerms);
                                    })()}
                                  </p>
                                  <div className="event-card-meta">
                                    <span className="event-card-meta-item">
                                      <span className="event-card-tag">•</span>
                                      {event.format === "online"
                                        ? t("Online Session")
                                        : event.city
                                          ? `${event.city}, ${event.country}`
                                          : t("TBD")}
                                    </span>
                                    <span className="event-card-meta-item">
                                      {formatDate(event.date_start)
                                        ? formatDate(event.date_start).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                          }).toUpperCase()
                                        : t("TBD")}
                                    </span>
                                    {(event.tags || []).slice(0, 2).map((tag) => (
                                      <span key={tag} className="event-card-tag">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="event-card-right">
                                  <span className={`event-card-status ${getPrimaryStatusDisplay(event, t).className}`}>
                                    {getPrimaryStatusDisplay(event, t).label}
                                  </span>
                                  <span className={`event-card-spots ${isFull ? "event-card-spots--full" : "event-card-spots--open"}`}>
                                    {event.unlimited_capacity ? t("Unlimited") : isFull ? t("Full") : t("{{count}} left", { count: spotsLeft })}
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
                            </li>
                          );
                        })}
                      </ul>

                      {totalPages > 1 && (
                        <div className="events-pagination">
                          <button
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={page === 1}
                            className="events-pagination-btn"
                          >
                            <ChevronLeft size={14} /> {t("Prev")}
                          </button>
                          <span className="events-pagination-count">
                            {page} / {totalPages}
                          </span>
                          <button
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={page === totalPages}
                            className="events-pagination-btn"
                          >
                            {t("Next")} <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </>
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
            <h2 className="events-modal-title">{t("Access Restricted")}</h2>
            <p className="events-modal-copy">
              {t("You must be logged in to register for scientific events.")}
            </p>
            <div className="events-modal-actions">
              <button className="btn btn-primary events-modal-btn" onClick={() => navigate("/login")}>
                {t("Sign In to Account")}
              </button>
              <button className="btn btn-secondary events-modal-btn" onClick={() => navigate("/register")}>
                {t("Create New Identity")}
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
                {t("Continue browsing this event")}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
