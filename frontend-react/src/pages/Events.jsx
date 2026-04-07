import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, Sparkles, TrendingUp } from "lucide-react";
import "../styles/Events.css";
import { getEvents } from "../api/events";
import { getTags, getTagsSync } from "../api/tags";
import SearchTopicInput from "../components/SearchTopicInput";
import { usePreferences } from "../context/PreferencesContext";
import {
  applyTopicSuggestion,
  getActiveTopicQuery,
  getMatchingTopicIds,
  getMatchingTopics,
  getTopicSuggestions,
  toggleTopicSuggestion,
} from "../utils/topicSearch";

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

function buildResultsSearch({ query, format, tagIds = [] }) {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("q", query.trim());
  if (format) params.set("format", format);
  tagIds.forEach((tagId) => params.append("tag", String(tagId)));
  const queryString = params.toString();
  return `/events/results${queryString ? `?${queryString}` : ""}`;
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
      className: "events-spotlight-card-status--deadline",
    };
  }

  return {
    label: event.status_badge_label || event.status_label || event.status,
    className: event.status_badge_class || "is-upcoming",
  };
}

function getSpotlightBadge(event, index, sortedEvents) {
  const topRegisteredCount = sortedEvents[0]?.registered_count || 0;
  const confirmedRegistrations = event.registered_count || 0;
  const limitedSpotsRemaining = event.unlimited_capacity ? null : (event.spots_remaining ?? 999);
  const maxParticipants = event.max_participants || 0;
  const fillRate = !event.unlimited_capacity && maxParticipants > 0
    ? confirmedRegistrations / maxParticipants
    : 0;

  if (index === 0 && topRegisteredCount > 0 && confirmedRegistrations === topRegisteredCount) {
    return "Most registered";
  }
  if (!event.unlimited_capacity && fillRate >= 0.85 && limitedSpotsRemaining <= 5) {
    return "Almost full";
  }
  if (event.validation === "manual") {
    return "Manual review";
  }
  if (event.format === "online") {
    return "Online event";
  }
  if (event.unlimited_capacity) {
    return "Unlimited capacity";
  }
  return null;
}

function SpotlightEventCard({ event, index, sortedEvents, t, locale, onOpen }) {
  const descRef = useRef(null);
  const [descLines, setDescLines] = useState(3);
  const primaryStatus = getPrimaryStatusDisplay(event, t);
  const spotlightBadge = getSpotlightBadge(event, index, sortedEvents);

  useEffect(() => {
    if (!event.description || typeof window === "undefined") return undefined;
    const element = descRef.current;
    if (!element) return undefined;

    const updateDescLines = () => {
      const styles = window.getComputedStyle(element);
      const fontSize = Number.parseFloat(styles.fontSize) || 14;
      const lineHeight = Number.parseFloat(styles.lineHeight) || fontSize * 1.7;
      const availableHeight = element.clientHeight;
      const nextLines = Math.max(0, Math.floor((availableHeight + 1) / lineHeight));
      setDescLines((current) => (current === nextLines ? current : nextLines));
    };

    updateDescLines();

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(updateDescLines);
    });

    resizeObserver.observe(element);
    if (element.parentElement) resizeObserver.observe(element.parentElement);

    return () => resizeObserver.disconnect();
  }, [event.description]);

  return (
    <li className="card-grid-list__item">
      <button
        type="button"
        className="events-spotlight-card"
        onClick={onOpen}
      >
        <div className="events-spotlight-card-statuses">
          <span className={`events-spotlight-card-status ${primaryStatus.className}`}>
            {primaryStatus.label}
          </span>
        </div>
        {spotlightBadge ? (
          <span className="events-spotlight-card-badge">
            <TrendingUp size={13} />
            {t(spotlightBadge)}
          </span>
        ) : null}
        <h3>{event.title}</h3>
        <div className="events-spotlight-card-meta">
          <span className="events-spotlight-card-meta-item events-spotlight-card-meta-item--organizer">
            {event.organizer || t("Organizer")}
          </span>
          <span className="events-spotlight-card-meta-item events-spotlight-card-meta-item--date">
            {event.date_start
              ? new Date(event.date_start).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()
              : t("TBD")}
          </span>
        </div>
        {event.description ? (
          <p
            ref={descRef}
            className={`events-spotlight-card-desc${descLines <= 0 ? " events-spotlight-card-desc--hidden" : ""}`}
            style={{
              WebkitLineClamp: Math.max(1, descLines),
              "--events-spotlight-desc-lines": Math.max(1, descLines),
            }}
          >
            {event.description}
          </p>
        ) : null}
        <div className="events-spotlight-tags">
          <span className="events-spotlight-tag events-spotlight-tag--location">
            {event.format === "online" ? t("Online") : event.city || t("TBD")}
          </span>
          <span className="events-spotlight-tag events-spotlight-tag--registered">
            {t("{{count}} registered", { count: event.registered_count || 0 })}
          </span>
          <span className="events-spotlight-tag events-spotlight-tag--deadline events-spotlight-tags-deadline">
            {event.registration_deadline
              ? t("Closes {{date}}", {
                  date: new Date(event.registration_deadline).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric" }).toUpperCase(),
                })
              : t("Open until start")}
          </span>
          {(event.tags || []).slice(0, 1).map((tag) => (
            <span key={tag} className="events-spotlight-tag events-spotlight-tag--topic">#{tag}</span>
          ))}
        </div>
      </button>
    </li>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const { t, locale } = usePreferences();
  const [events, setEvents] = useState([]);
  const [allTags, setAllTags] = useState(getTagsSync() || []);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [typedSuggestion, setTypedSuggestion] = useState("");
  const [typedSuggestionIndex, setTypedSuggestionIndex] = useState(0);
  const [isDeletingSuggestion, setIsDeletingSuggestion] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [isSpotlightTransitioning, setIsSpotlightTransitioning] = useState(false);

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
    let swapTimeout;
    let settleTimeout;
    const interval = setInterval(() => {
      setIsSpotlightTransitioning(true);
      swapTimeout = window.setTimeout(() => {
        setSpotlightIndex((prev) => (prev + 1) % popularEvents.length);
      }, 180);
      settleTimeout = window.setTimeout(() => {
        setIsSpotlightTransitioning(false);
      }, 460);
    }, 6200);
    return () => {
      clearInterval(interval);
      window.clearTimeout(swapTimeout);
      window.clearTimeout(settleTimeout);
    };
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
  const selectedTopics = useMemo(
    () => getMatchingTopics(allTags, searchInput),
    [allTags, searchInput],
  );
  const selectedTopicIds = useMemo(
    () => selectedTopics.map((tag) => tag.id),
    [selectedTopics],
  );
  const topicSuggestions = useMemo(
    () => getTopicSuggestions(allTags, searchInput),
    [allTags, searchInput],
  );

  const submitSearch = (overrides = {}) => {
    const nextQuery = overrides.query ?? searchInput;
    const nextFormat = overrides.format ?? formatFilter;
    const nextTagIds = overrides.tagIds ?? getMatchingTopicIds(allTags, nextQuery);
    navigate(buildResultsSearch({ query: nextQuery, format: nextFormat, tagIds: nextTagIds }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitSearch();
  };

  const handleQuickTag = (tagName) => {
    const nextQuery = toggleTopicSuggestion(searchInput, tagName);
    setSearchInput(nextQuery);
  };

  const handleTopicSuggestionSelect = (tag) => {
    setSearchInput((prev) => applyTopicSuggestion(prev, tag.name));
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
            <span className="events-discovery-toplink-label">{t("Browse all events")}</span>
            <span className="events-discovery-toplink-arrow" aria-hidden="true">
              <span className="events-discovery-toplink-arrow-line" />
              <span className="events-discovery-toplink-arrow-head" />
            </span>
          </button>
        </div>

        <section className="events-discovery events-discovery--search">
          <div className="events-discovery-shell">
            <h1 className="events-hero-title">
              {t("Search events,")}
              <br />
              {t("organizations, and ideas.")}
            </h1>
            <p className="events-hero-copy">
              {t("Start with an event title, an organization name, a city, a topic, or a format. We will take you straight to the full results view.")}
            </p>

            <form className="events-discovery-search-row events-search-with-suggestions" onSubmit={handleSubmit}>
              <div className="events-search-with-suggestions__main">
                <div className="events-hero-search-shell">
                  <span className="events-search-icon-shell" aria-hidden="true">
                    <Search size={24} className="events-hero-search-icon" />
                  </span>
                  <SearchTopicInput
                    value={searchInput}
                    onChange={setSearchInput}
                    tags={allTags}
                    inputClassName="input events-hero-search-input"
                    placeholder={typedSuggestion ? `${locale === "fr" ? "Ex." : "Ex."} ${t(typedSuggestion)}` : t("Search events, organizations, locations...")}
                  />
                  <div className="events-search-format-wrap">
                    <label className="events-search-format-label" htmlFor="events-discovery-format">
                      {t("Format")}
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
                            {t(option.label)}
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
                  <div className="events-topic-suggestions events-topic-suggestions--inline">
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
            </form>

            <div className={`events-quick-filters${activeTopicQuery !== null ? " events-quick-filters--hidden" : ""}`}>
              <span className="events-quick-filters-label">
                <Sparkles size={14} />
                {t("Popular topics")}
              </span>
              {visibleQuickTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`events-quick-filter${selectedTopicIds.includes(tag.id) ? " events-quick-filter--active" : ""}`}
                  onClick={() => handleQuickTag(tag.name)}
                >
                  #{tag.name}
                </button>
              ))}
            </div>

          </div>
        </section>

        <section className="events-spotlight events-spotlight--search">
          <div className="events-spotlight-header">
            <div>
              <h2 className="events-heading">{t("Popular picks from the community")}</h2>
            </div>
            {!loading && (
              <span className="events-count">
                {t("Rotating selection based on real registration and event data")}
              </span>
            )}
          </div>

          {loading ? (
            <div className="events-loading">
              <p className="mono text-xs text-dim">{"// loading..."}</p>
            </div>
          ) : spotlightEvents.length > 0 ? (
            <ul className={`events-spotlight-cards card-grid-list${isSpotlightTransitioning ? " events-spotlight-cards--transitioning" : ""}`}>
              {spotlightEvents.map((event, index) => (
                <SpotlightEventCard
                  key={`${event.id}-${index}`}
                  event={event}
                  index={index}
                  sortedEvents={popularEvents}
                  t={t}
                  locale={locale}
                  onOpen={() => navigate(`/events/${event.id}`)}
                />
              ))}
            </ul>
          ) : (
            <div className="events-empty">
              <p className="events-empty-title">{t("No events available yet")}</p>
              <p className="events-empty-sub">{t("As soon as events are published, this search page will surface popular picks here.")}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
