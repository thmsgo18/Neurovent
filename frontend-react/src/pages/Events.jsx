import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, Sparkles, TrendingUp } from "lucide-react";
import "../styles/Events.css";
import { getEvents } from "../api/events";
import { getTags, getTagsSync } from "../api/tags";
import { applyTopicSuggestion, getActiveTopicQuery, getTopicSuggestions } from "../utils/topicSearch";

const SEARCH_SUGGESTIONS = [
  "machine learning paris",
  "neuroscience workshop lyon",
  "privacy online seminar",
  "federated learning conference",
];

const FORMAT_OPTIONS = [
  { key: "", label: "All Events" },
  { key: "presential", label: "In-Person" },
  { key: "online", label: "Online" },
  { key: "hybrid", label: "Hybrid" },
];

function buildResultsSearch({ query, format, tagId }) {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("q", query.trim());
  if (format) params.set("format", format);
  if (tagId) params.set("tag", String(tagId));
  const queryString = params.toString();
  return `/events/results${queryString ? `?${queryString}` : ""}`;
}

function truncateText(value, limit) {
  if (!value) return "No description available yet.";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trim()}...`;
}

function formatDate(value) {
  if (!value) return "TBD";
  return new Date(value)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

function formatRegistrationDeadline(value) {
  if (!value) return "Open until start";
  return `Closes ${new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}`;
}

function getDeadlineSoonLabel(value) {
  if (!value) return null;

  const diff = new Date(value).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return null;

  const fiveDays = 5 * 24 * 60 * 60 * 1000;
  if (diff > fiveDays) return null;

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor(totalMinutes / 60);

  if (days > 0) return `Closes in ${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `Closes in ${hours} hour${hours > 1 ? "s" : ""}`;
  return `Closes in ${Math.max(1, totalMinutes)} min`;
}

function getSpotlightBadge(event, index) {
  if (index === 0) return "Most popular";
  if ((event.spots_remaining ?? 99) <= 8) return "Almost full";
  if (event.format === "online") return "Online favorite";
  if (event.validation === "manual") return "Curated pick";
  return "Trending now";
}

function getStatusClass(status) {
  if (status === "live") return "is-live";
  if (status === "past") return "is-past";
  if (status === "cancelled") return "is-cancelled";
  if (status === "draft") return "is-draft";
  return "is-upcoming";
}

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [allTags, setAllTags] = useState(getTagsSync() || []);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [typedSuggestion, setTypedSuggestion] = useState("");
  const [typedSuggestionIndex, setTypedSuggestionIndex] = useState(0);
  const [isDeletingSuggestion, setIsDeletingSuggestion] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  useEffect(() => {
    getEvents()
      .then(({ results }) => setEvents(results))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!allTags.length) {
      getTags().then(setAllTags).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const target = SEARCH_SUGGESTIONS[typedSuggestionIndex];
    const finishedTyping = typedSuggestion === target;
    const finishedDeleting = typedSuggestion === "";
    const delay = finishedTyping ? 1100 : isDeletingSuggestion ? 38 : 70;

    const timeout = setTimeout(() => {
      if (!isDeletingSuggestion) {
        if (!finishedTyping) {
          setTypedSuggestion(target.slice(0, typedSuggestion.length + 1));
        } else {
          setIsDeletingSuggestion(true);
        }
        return;
      }

      if (!finishedDeleting) {
        setTypedSuggestion(target.slice(0, typedSuggestion.length - 1));
        return;
      }

      setIsDeletingSuggestion(false);
      setTypedSuggestionIndex((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
    }, delay);

    return () => clearTimeout(timeout);
  }, [typedSuggestion, typedSuggestionIndex, isDeletingSuggestion]);

  const popularEvents = useMemo(
    () =>
      [...events].sort((a, b) => {
        const left = (b.registered_count || 0) - (a.registered_count || 0);
        if (left !== 0) return left;
        return new Date(a.date_start || 0) - new Date(b.date_start || 0);
      }),
    [events],
  );

  useEffect(() => {
    if (popularEvents.length <= 4) return undefined;
    const interval = setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % popularEvents.length);
    }, 3600);
    return () => clearInterval(interval);
  }, [popularEvents]);

  const spotlightEvents = useMemo(() => {
    if (popularEvents.length <= 4) return popularEvents.slice(0, 4);
    return Array.from({ length: 4 }, (_, offset) => popularEvents[(spotlightIndex + offset) % popularEvents.length]);
  }, [popularEvents, spotlightIndex]);

  const tagCounts = {};
  events.forEach((event) => {
    (event.tags || []).forEach((tagName) => {
      tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
    });
  });

  const quickTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => allTags.find((tag) => tag.name === name))
    .filter(Boolean);
  const visibleQuickTags = quickTags.length ? quickTags : allTags.slice(0, 6);
  const activeTopicQuery = getActiveTopicQuery(searchInput);
  const topicSuggestions = useMemo(
    () => getTopicSuggestions(allTags, searchInput),
    [allTags, searchInput],
  );

  const submitSearch = (overrides = {}) => {
    const nextQuery = overrides.query ?? searchInput;
    const nextFormat = overrides.format ?? formatFilter;
    const nextTagId = overrides.tagId === undefined ? selectedTagId : overrides.tagId;
    navigate(buildResultsSearch({ query: nextQuery, format: nextFormat, tagId: nextTagId }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitSearch();
  };

  const handleQuickTag = (tagId) => {
    const nextTagId = tagId === selectedTagId ? null : tagId;
    setSelectedTagId(nextTagId);
    submitSearch({ tagId: nextTagId });
  };

  const handleTopicSuggestionSelect = (tag) => {
    setSelectedTagId(tag.id);
    setSearchInput((prev) => applyTopicSuggestion(prev));
  };

  return (
    <div className="events-search-page">
      <div className="events-search-content">
        <div className="events-search-floating-action">
          <button
            type="button"
            className="events-discovery-toplink-btn"
            onClick={() => navigate("/events/results")}
          >
            <span className="events-discovery-toplink-label">Browse all events</span>
            <span className="events-discovery-toplink-arrow" aria-hidden="true">
              <span className="events-discovery-toplink-arrow-line" />
              <span className="events-discovery-toplink-arrow-head" />
            </span>
          </button>
        </div>

        <section className="events-discovery events-discovery--search">
          <div className="events-discovery-shell">
            <p className="events-hero-eyebrow">Event Search</p>
            <h1 className="events-hero-title">
              Search for the next event
              <br />
              worth attending.
            </h1>
            <p className="events-hero-copy">
              This page is your event search entry point. Start with a keyword, a city, a topic or a format, then we will take you to the full results view.
            </p>

            <form className="events-discovery-search-row events-search-with-suggestions" onSubmit={handleSubmit}>
              <div className="events-hero-search-shell">
                <span className="events-search-icon-shell" aria-hidden="true">
                  <Search size={24} className="events-hero-search-icon" />
                </span>
                <input
                  type="text"
                  className="input events-hero-search-input"
                  placeholder={typedSuggestion ? `Ex. ${typedSuggestion}` : "Search by keyword, organization, location..."}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <div className="events-search-format-wrap">
                  <label className="events-search-format-label" htmlFor="events-discovery-format">
                    Format
                  </label>
                  <div className="events-search-format-control">
                    <select
                      id="events-discovery-format"
                      className="events-search-format-select"
                      value={formatFilter}
                      onChange={(e) => setFormatFilter(e.target.value)}
                    >
                      {FORMAT_OPTIONS.map((option) => (
                        <option key={option.key || "discovery-format-all"} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="events-search-format-chevron" aria-hidden="true">
                      <ChevronDown size={16} />
                    </span>
                  </div>
                </div>
              </div>
              {activeTopicQuery !== null && topicSuggestions.length > 0 && (
                <div className="events-topic-suggestions">
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
            </form>

            {activeTopicQuery === null && (
              <div className="events-quick-filters">
                <span className="events-quick-filters-label">
                  <Sparkles size={14} />
                  Popular topics
                </span>
                {visibleQuickTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={`events-quick-filter${selectedTagId === tag.id ? " events-quick-filter--active" : ""}`}
                    onClick={() => handleQuickTag(tag.id)}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            )}

          </div>
        </section>

        <section className="events-spotlight events-spotlight--search">
          <div className="events-spotlight-header">
            <div>
              <h2 className="events-heading">Popular picks from the community</h2>
            </div>
            {!loading && (
              <span className="events-count">
                Live rotation across the most registered events this week
              </span>
            )}
          </div>

          {loading ? (
            <div className="events-loading">
              <p className="mono text-xs text-dim">{"// loading..."}</p>
            </div>
          ) : spotlightEvents.length > 0 ? (
            <div className="events-spotlight-cards">
              {spotlightEvents.map((event, index) => (
                <button
                  key={`${event.id}-${index}`}
                  type="button"
                  className="events-spotlight-card"
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  {(() => {
                    const deadlineSoonLabel =
                      event.status === "upcoming"
                        ? getDeadlineSoonLabel(event.registration_deadline)
                        : null;

                    return (
                      <div className="events-spotlight-card-statuses">
                        <span className={`events-spotlight-card-status ${getStatusClass(event.status)}`}>
                          {event.status_label || event.status}
                        </span>
                        {deadlineSoonLabel && (
                          <span className="events-spotlight-card-status events-spotlight-card-status--deadline">
                            {deadlineSoonLabel}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <span className="events-spotlight-card-badge">
                    <TrendingUp size={13} />
                    {getSpotlightBadge(event, index)}
                  </span>
                  <h3>{event.title}</h3>
                  <p className="events-spotlight-card-desc">
                    {truncateText(event.description, 118)}
                  </p>
                  <div className="events-spotlight-card-meta">
                    <span>{event.organizer || "Organizer"}</span>
                    <span>{formatDate(event.date_start)}</span>
                  </div>
                  <div className="events-spotlight-tags">
                    <span>{event.format === "online" ? "Online" : event.city || "TBD"}</span>
                    <span>{event.registered_count || 0} registered</span>
                    <span className="events-spotlight-tags-deadline">
                      {formatRegistrationDeadline(event.registration_deadline)}
                    </span>
                    {(event.tags || []).slice(0, 1).map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="events-empty">
              <p className="events-empty-title">No events available yet</p>
              <p className="events-empty-sub">As soon as events are published, this search page will surface popular picks here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
