import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { getEvent, updateEvent } from "../api/events";
import { getTags, getTagsSync } from "../api/tags";
import DateInput from "../components/DateInput";
import "../styles/CreateEvent.css";

const INITIAL_FORM = {
  title: "",
  format: "presential",
  date: "",
  time: "09:00",
  ends_next_day: false,
  end_date: "",
  end_time: "18:00",
  capacity: 50,
  unlimited_capacity: false,
  registration_mode: "VALIDATION",
  city: "",
  country: "",
  address_full: "",
  address_share_later: false,
  address_share_offset_hours: 24,
  online_platform: "",
  online_link: "",
  online_share_later: false,
  online_share_offset_hours: 24,
  allow_registration_during_event: false,
  registration_deadline_date: "",
  registration_deadline_time: "",
  description: "",
  tagIds: [],
};

const MIN_DURATION_MINUTES = 15;
const SAME_DAY_STEP_MINUTES = 15;
const LAST_SAME_DAY_MINUTE = (23 * 60) + 59;

const combineDateAndTime = (date, time) => {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00`);
};

const clampDuration = (minutes, startTime = "00:00") => {
  const value = Number.parseInt(minutes, 10);
  if (Number.isNaN(value)) return MIN_DURATION_MINUTES;

  const [hours = "0", mins = "0"] = startTime.split(":");
  const startMinutes = Number.parseInt(hours, 10) * 60 + Number.parseInt(mins, 10);
  const rawMaxDuration = Math.max(MIN_DURATION_MINUTES, LAST_SAME_DAY_MINUTE - startMinutes);
  const maxSameDayDuration = Math.max(
    MIN_DURATION_MINUTES,
    Math.floor(rawMaxDuration / SAME_DAY_STEP_MINUTES) * SAME_DAY_STEP_MINUTES,
  );

  return Math.min(Math.max(value, MIN_DURATION_MINUTES), maxSameDayDuration);
};

const formatTimeForInput = (dateValue) => {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return "09:00";
  const hours = String(dateValue.getHours()).padStart(2, "0");
  const minutes = String(dateValue.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatDateForInput = (dateValue) => {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return "";
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDurationLabel = (minutes, includeDays = false) => {
  const total = Math.max(0, Number.parseInt(minutes, 10) || 0);
  const days = Math.floor(total / (24 * 60));
  const hours = Math.floor((total % (24 * 60)) / 60);
  const remainingMinutes = total % 60;
  const parts = [];

  if (includeDays && days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (remainingMinutes || parts.length === 0) parts.push(`${remainingMinutes}m`);

  return parts.join(" ");
};

const getSuggestedSameDayEndTime = (startDate, startTime) => {
  const start = combineDateAndTime(startDate, startTime);
  if (!start) return "18:00";

  const safeDuration = clampDuration(60, startTime);
  const end = new Date(start.getTime() + safeDuration * 60 * 1000);
  return formatTimeForInput(end);
};

const detectPlatformFromLink = (url) => {
  if (!url || !url.trim()) return "";

  const normalizedUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;

  try {
    const hostname = new URL(normalizedUrl).hostname.toLowerCase();
    if (hostname.includes("zoom")) return "Zoom";
    if (hostname.includes("teams.microsoft")) return "Microsoft Teams";
    if (hostname.includes("meet.google")) return "Google Meet";
    if (hostname.includes("webex")) return "Webex";
    if (hostname.includes("gotomeeting")) return "GoTo Meeting";
    if (hostname.includes("jitsi")) return "Jitsi Meet";
    if (hostname.includes("discord")) return "Discord";
    if (hostname.includes("youtube")) return "YouTube Live";
    if (hostname.includes("livestorm")) return "Livestorm";
    if (hostname.includes("hopin")) return "Hopin";
  } catch {
    return "";
  }

  return "";
};

const normalizeUrl = (url) => {
  if (!url || !url.trim()) return url;
  const value = url.trim();
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const getRevealOffsetHours = (revealDate, startDate, fallback = 24) => {
  if (!revealDate || !startDate) return fallback;
  const reveal = new Date(revealDate);
  const start = new Date(startDate);
  if (Number.isNaN(reveal.getTime()) || Number.isNaN(start.getTime())) return fallback;
  const diffHours = Math.round((start.getTime() - reveal.getTime()) / (60 * 60 * 1000));
  return diffHours >= 36 ? 48 : 24;
};

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [initialFormSnapshot, setInitialFormSnapshot] = useState(null);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const cached = getTagsSync();
  const [availableTags, setAvailableTags] = useState(cached || []);
  const [tagsLoading, setTagsLoading] = useState(!cached || cached.length === 0);
  const [tagInput, setTagInput] = useState("");
  const [capacityInput, setCapacityInput] = useState(String(INITIAL_FORM.capacity));
  const [form, setForm] = useState(INITIAL_FORM);
  const autoDetectedPlatformRef = useRef("");
  const allowNavigationRef = useRef(false);

  useEffect(() => {
    if (!cached || cached.length === 0) {
      getTags()
        .then((tags) => {
          setAvailableTags(tags);
          setTagsLoading(false);
        })
        .catch(() => setTagsLoading(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getEvent(id)
      .then((event) => {
        const startDate = event.date || event.date_start?.split("T")[0] || "";
        const startTime = event.time || event.date_start?.split("T")[1]?.substring(0, 5) || "09:00";
        const endDate = event.date_end?.split("T")[0] || startDate;
        const endTime = event.date_end?.split("T")[1]?.substring(0, 5) || getSuggestedSameDayEndTime(startDate, startTime);
        const endsNextDay = Boolean(startDate && endDate && startDate !== endDate);
        const capacityValue = event.max_participants || event.capacity || 50;

        autoDetectedPlatformRef.current = event.online_platform || "";

        const nextForm = {
          title: event.title || "",
          format: event.format || "presential",
          date: startDate,
          time: startTime,
          ends_next_day: event.format === "online" ? false : endsNextDay,
          end_date: endDate,
          end_time: endTime,
          capacity: capacityValue,
          unlimited_capacity: event.unlimited_capacity ?? false,
          registration_mode:
            event.registration_mode || (event.validation === "manual" ? "VALIDATION" : "AUTO"),
          city: event.city || "",
          country: event.country || "",
          address_full: event.address_full || "",
          address_share_later: event.address_visibility === "PARTIAL",
          address_share_offset_hours: getRevealOffsetHours(event.address_reveal_date, event.date_start, 24),
          online_platform: event.online_platform || "",
          online_link: event.online_link || "",
          online_share_later: event.online_visibility === "PARTIAL",
          online_share_offset_hours: getRevealOffsetHours(event.online_reveal_date, event.date_start, 24),
          allow_registration_during_event: event.allow_registration_during_event ?? false,
          registration_deadline_date: event.registration_deadline ? event.registration_deadline.split("T")[0] : "",
          registration_deadline_time: event.registration_deadline ? event.registration_deadline.split("T")[1]?.substring(0, 5) : "",
          description: event.description || "",
          tagIds: event.tag_ids || [],
        };
        setForm(nextForm);
        setInitialFormSnapshot(JSON.stringify(nextForm));
        setCapacityInput(String(capacityValue));
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load this event.");
      })
      .finally(() => setFetchLoading(false));
  }, [id]);

  useEffect(() => {
    if (form.format !== "online" || !form.ends_next_day) return;

    setForm((prev) => ({
      ...prev,
      ends_next_day: false,
      end_date: prev.date,
      end_time: getSuggestedSameDayEndTime(prev.date, prev.time),
    }));
  }, [form.format, form.ends_next_day, form.date, form.time]);

  useEffect(() => {
    if (!form.allow_registration_during_event || form.registration_mode === "AUTO") return;
    setForm((prev) => ({ ...prev, registration_mode: "AUTO" }));
  }, [form.allow_registration_during_event, form.registration_mode]);

  useEffect(() => {
    if (!form.allow_registration_during_event || !form.online_share_later) return;
    setForm((prev) => ({ ...prev, online_share_later: false }));
  }, [form.allow_registration_during_event, form.online_share_later]);

  useEffect(() => {
    if (!form.allow_registration_during_event) return;
    if (!form.registration_deadline_date && !form.registration_deadline_time) return;
    setForm((prev) => ({
      ...prev,
      registration_deadline_date: "",
      registration_deadline_time: "",
    }));
  }, [form.allow_registration_during_event, form.registration_deadline_date, form.registration_deadline_time]);

  const hasUnsavedChanges =
    !success &&
    initialFormSnapshot !== null &&
    JSON.stringify(form) !== initialFormSnapshot;

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;

    const handleDocumentClick = (event) => {
      if (allowNavigationRef.current) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target.closest("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const targetUrl = new URL(anchor.href, window.location.origin);
      if (targetUrl.origin !== window.location.origin) return;
      if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search) return;

      event.preventDefault();
      setPendingNavigation(() => () => {
        allowNavigationRef.current = true;
        navigate(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
      });
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [hasUnsavedChanges, navigate]);

  const clearFieldError = (field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key);
    if (error) setError("");
  };

  const setCapacity = (value) => {
    const parsed = Number.parseInt(value, 10);
    const safeValue = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    setCapacityInput(String(safeValue));
    set("capacity", safeValue);
  };

  const toggleTag = (tagId) => {
    set("tagIds", form.tagIds.includes(tagId) ? form.tagIds.filter((value) => value !== tagId) : [...form.tagIds, tagId]);
  };

  const addTagByName = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (!trimmed) return;
    const match = availableTags.find((tag) => tag.name.toLowerCase() === trimmed);
    const best = match || availableTags.find((tag) => tag.name.toLowerCase().startsWith(trimmed));
    if (best && !form.tagIds.includes(best.id)) {
      set("tagIds", [...form.tagIds, best.id]);
    }
    setTagInput("");
  };

  const handleOnlineLinkChange = (rawLink) => {
    const detectedPlatform = detectPlatformFromLink(rawLink);

    setForm((prev) => {
      const shouldAutofillPlatform =
        !prev.online_platform.trim() ||
        (autoDetectedPlatformRef.current && prev.online_platform === autoDetectedPlatformRef.current);

      const nextPlatform =
        detectedPlatform && shouldAutofillPlatform
          ? detectedPlatform
          : prev.online_platform;

      autoDetectedPlatformRef.current = detectedPlatform || "";

      return {
        ...prev,
        online_link: rawLink,
        online_platform: nextPlatform,
      };
    });

    clearFieldError("online_link");
    clearFieldError("online_platform");
    if (error) setError("");
  };

  const getFieldErrorClass = (field) => (fieldErrors[field] ? " create-event-input--error" : "");

  const effectiveEndDate = form.ends_next_day ? form.end_date : form.date;
  const scheduleStart = combineDateAndTime(form.date, form.time);
  const scheduleEnd = combineDateAndTime(effectiveEndDate, form.end_time);
  const durationMinutes =
    scheduleStart && scheduleEnd
      ? Math.max(0, Math.round((scheduleEnd.getTime() - scheduleStart.getTime()) / (60 * 1000)))
      : 0;
  const computedDurationLabel = formatDurationLabel(durationMinutes, Boolean(form.ends_next_day));
  const hasEqualMultiDayDates =
    form.ends_next_day &&
    Boolean(form.date) &&
    Boolean(form.end_date) &&
    form.date === form.end_date;
  const hasEndDateBeforeStartDate =
    form.ends_next_day &&
    Boolean(form.date) &&
    Boolean(form.end_date) &&
    form.end_date < form.date;
  const hasPastStartDateTime =
    Boolean(form.date) &&
    Boolean(form.time) &&
    scheduleStart &&
    scheduleStart.getTime() < Date.now();
  const hasInvalidSameDayEndTime =
    !form.ends_next_day &&
    Boolean(form.date) &&
    Boolean(form.time) &&
    Boolean(form.end_time) &&
    scheduleStart &&
    scheduleEnd &&
    scheduleEnd <= scheduleStart;

  const validateForm = () => {
    const nextErrors = {};

    if (!form.title.trim()) nextErrors.title = true;
    if (!form.date) nextErrors.date = true;
    if (!form.time) nextErrors.time = true;
    if (!form.end_time) nextErrors.end_time = true;
    if (hasPastStartDateTime) {
      nextErrors.date = true;
      nextErrors.time = true;
    }
    if (hasInvalidSameDayEndTime) nextErrors.end_time = true;
    if (form.ends_next_day && !form.end_date) nextErrors.end_date = true;
    if (hasEqualMultiDayDates) nextErrors.end_date = true;
    if (hasEndDateBeforeStartDate) nextErrors.end_date = true;
    if (!form.unlimited_capacity && (!form.capacity || Number.parseInt(form.capacity, 10) <= 1)) nextErrors.capacity = true;
    if (!form.description.trim()) nextErrors.description = true;

    if ((form.format === "presential" || form.format === "hybrid") && !form.city.trim()) nextErrors.city = true;
    if ((form.format === "presential" || form.format === "hybrid") && !form.country.trim()) nextErrors.country = true;
    if ((form.format === "presential" || form.format === "hybrid") && !form.address_full.trim()) nextErrors.address_full = true;
    if ((form.format === "online" || form.format === "hybrid") && !form.online_link.trim()) nextErrors.online_link = true;

    setFieldErrors(nextErrors);

    if (hasPastStartDateTime) {
      setError("The event start date and time cannot be in the past. Please choose a future time.");
      return false;
    }
    if (hasEqualMultiDayDates) {
      setError("The end date must be different from the start date when “Ends on another day” is enabled. If the event ends the same day, disable this option.");
      return false;
    }
    if (hasEndDateBeforeStartDate) {
      setError("The end date cannot be before the start date. Choose a later end date or disable the multi-day option.");
      return false;
    }
    if (hasInvalidSameDayEndTime) {
      setError("For a same-day event, the end time must be after the start time. If it continues overnight, enable “Ends on another day”.");
      return false;
    }
    if (Object.keys(nextErrors).length > 0) {
      setError("Some required information is missing. Please complete the highlighted fields before saving.");
      return false;
    }

    setError("");
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const formatMap = { presential: "ONSITE", online: "ONLINE", hybrid: "HYBRID" };
      const payload = {
        title: form.title,
        description: form.description,
        date_start: `${form.date}T${form.time}:00`,
        date_end: `${effectiveEndDate}T${form.end_time}:00`,
        format: formatMap[form.format] || "ONSITE",
        capacity: form.unlimited_capacity ? 0 : (parseInt(form.capacity, 10) || 50),
        unlimited_capacity: form.unlimited_capacity,
        registration_mode: form.registration_mode,
        allow_registration_during_event:
          (form.format === "online" || form.format === "hybrid") && form.allow_registration_during_event,
        tag_ids: form.tagIds,
      };

      if (form.format === "presential" || form.format === "hybrid") {
        payload.address_city = form.city;
        payload.address_country = form.country;
        payload.address_full = form.address_full;
        payload.address_visibility = form.address_share_later ? "PARTIAL" : "FULL";
        payload.address_reveal_date = null;

        if (form.address_share_later) {
          const startDate = combineDateAndTime(form.date, form.time);
          if (startDate) {
            const revealDate = new Date(startDate.getTime() - form.address_share_offset_hours * 60 * 60 * 1000);
            payload.address_reveal_date = `${formatDateForInput(revealDate)}T${formatTimeForInput(revealDate)}:00`;
          }
        }
      } else {
        payload.address_city = "";
        payload.address_country = "";
        payload.address_full = "";
        payload.address_visibility = "FULL";
        payload.address_reveal_date = null;
      }

      if (form.format === "online" || form.format === "hybrid") {
        payload.online_platform = form.online_platform.trim();
        payload.online_link = normalizeUrl(form.online_link.trim());
        payload.online_visibility =
          form.online_share_later && !form.allow_registration_during_event ? "PARTIAL" : "FULL";
        payload.online_reveal_date = null;

        if (form.online_share_later && !form.allow_registration_during_event) {
          const startDate = combineDateAndTime(form.date, form.time);
          if (startDate) {
            const revealDate = new Date(startDate.getTime() - form.online_share_offset_hours * 60 * 60 * 1000);
            payload.online_reveal_date = `${formatDateForInput(revealDate)}T${formatTimeForInput(revealDate)}:00`;
          }
        }
      } else {
        payload.online_platform = "";
        payload.online_link = "";
        payload.online_visibility = "FULL";
        payload.online_reveal_date = null;
      }

      payload.registration_deadline = null;
      if (form.registration_deadline_date && !form.allow_registration_during_event) {
        const deadlineTime = form.registration_deadline_time || "23:59";
        payload.registration_deadline = `${form.registration_deadline_date}T${deadlineTime}:00`;
      }

      await updateEvent(id, payload);
      setInitialFormSnapshot(JSON.stringify(form));
      setSuccess(true);
    } catch (e) {
      setError(e.message || "Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  const requestNavigation = (target) => {
    if (!hasUnsavedChanges) {
      navigate(target);
      return;
    }

    setPendingNavigation(() => () => {
      allowNavigationRef.current = true;
      navigate(target);
    });
  };

  if (fetchLoading) {
    return (
      <div className="create-event-page">
        <div className="create-event-success-shell">
          <p className="create-event-loading-copy">{"// loading..."}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="create-event-page">
        <div className="create-event-success-shell">
          <div className="create-event-success-card">
            <div className="create-event-success-icon">✓</div>
            <h2 className="create-event-success-title">Changes Saved!</h2>
            <p className="create-event-success-copy">
              Your event has been updated successfully.
            </p>
            <div className="create-event-inline-actions">
              <button className="btn btn-primary create-event-action-btn create-event-action-btn--grow" onClick={() => navigate(`/events/${id}`)}>
                View Event
              </button>
              <button className="btn btn-secondary create-event-action-btn create-event-action-btn--grow" onClick={() => navigate("/my-events")}>
                My Events
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-event-page">
      <div className="create-event-content create-event-content--single edit-event-content">
        <div className="create-event-main create-event-main--wide edit-event-main">
          <div className="create-event-topbar">
            <button className="create-event-back-btn edit-event-back-btn" onClick={() => requestNavigation(`/events/${id}`)}>
              <span className="edit-event-back-btn__arrow" aria-hidden="true">←</span>
              <span>Back to Event</span>
            </button>
          </div>

          <div className="create-event-hero">
            <h1 className="create-event-page-title">Edit Event</h1>
            <p className="create-event-page-state">Update every setting from one unified page.</p>
          </div>

          {error && (
            <div className="create-event-alert">
              <AlertCircle size={16} className="icon-inline-start" />
              {error}
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSave();
            }}
          >
            <section className="create-event-card create-event-section-card">
              <div className="create-event-section-header">
                <div>
                  <h2 className="create-event-step-title">Basic Info</h2>
                  <p className="create-event-step-subtitle">
                    Update the title, topics and format of the event.
                  </p>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Event Title <span className="form-required">*</span></label>
                <input type="text" className={`input${getFieldErrorClass("title")}`} value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>

              <div className="form-field">
                <label className="form-label">Research Tags</label>
                {form.tagIds.length > 0 && (
                  <div className="create-event-tags-list create-event-tags-list--spaced">
                    {availableTags.filter((tag) => form.tagIds.includes(tag.id)).map((tag) => (
                      <span key={tag.id} className="create-event-tag">
                        {tag.name}
                        <button type="button" className="create-event-tag-remove" onClick={() => toggleTag(tag.id)}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {tagsLoading && (
                  <p className="create-event-inline-help create-event-inline-help--tight">Loading tags...</p>
                )}

                <div className="create-event-tags-input-row">
                  <input
                    type="text"
                    className="input"
                    placeholder={availableTags.length ? "Add a tag..." : "No tags available"}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTagByName();
                      }
                    }}
                  />
                  <button type="button" className="btn btn-secondary" onClick={addTagByName}>
                    Add Tag
                  </button>
                </div>

                {tagInput.trim().length > 0 && (
                  <div className="create-event-suggestions">
                    {availableTags
                      .filter((tag) => !form.tagIds.includes(tag.id) && tag.name.toLowerCase().includes(tagInput.trim().toLowerCase()))
                      .map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          className="create-event-suggestion-btn"
                          onClick={() => {
                            toggleTag(tag.id);
                            setTagInput("");
                          }}
                        >
                          {tag.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="form-field">
                <label className="form-label">Format</label>
                <div className="create-event-grid-3">
                  {[
                    { key: "presential", label: "In-Person", icon: "🏛" },
                    { key: "online", label: "Online", icon: "🌐" },
                    { key: "hybrid", label: "Hybrid", icon: "🔀" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={`create-event-format-option create-event-format-option--card${form.format === option.key ? " create-event-format-option--active" : ""}`}
                      onClick={() => set("format", option.key)}
                    >
                      <div className={`create-event-format-option-icon${form.format === option.key ? " create-event-format-option-icon--active" : ""}`}>
                        {option.icon}
                      </div>
                      <p className={`create-event-format-option-title${form.format === option.key ? " create-event-format-option-title--active" : ""}`}>
                        {option.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="create-event-card create-event-section-card">
              <div className="create-event-section-header">
                <div>
                  <h2 className="create-event-step-title">Schedule & Location</h2>
                  <p className="create-event-step-subtitle">
                    Adjust date, time and venue details for the event.
                  </p>
                </div>
              </div>

              <div className="create-event-grid-2">
                <div className="form-field">
                  <label className="form-label">Start Date <span className="form-required">*</span></label>
                  <DateInput
                    className={`create-event-schedule-input${getFieldErrorClass("date")}`}
                    value={form.date}
                    min={formatDateForInput(new Date())}
                    onChange={(e) => set("date", e.target.value)}
                  />
                  {form.format !== "online" && (
                    <button
                      type="button"
                      className={`create-event-switch${form.ends_next_day ? " create-event-switch--active" : ""}`}
                      onClick={() => {
                        const checked = !form.ends_next_day;
                        if (checked) {
                          setForm((prev) => ({
                            ...prev,
                            ends_next_day: true,
                            end_date: prev.end_date || prev.date,
                          }));
                        } else {
                          setForm((prev) => ({
                            ...prev,
                            ends_next_day: false,
                            end_date: prev.date,
                            end_time: getSuggestedSameDayEndTime(prev.date, prev.time),
                          }));
                        }
                        clearFieldError("end_date");
                        clearFieldError("end_time");
                        if (error) setError("");
                      }}
                    >
                      <span className="create-event-switch-track">
                        <span className="create-event-switch-thumb" />
                      </span>
                      <span className="create-event-switch-copy">
                        <strong>Ends on another day</strong>
                        <small>Enable this only for events that continue past midnight.</small>
                      </span>
                    </button>
                  )}
                </div>

                <div className="form-field">
                  <label className="form-label">Start Time <span className="form-required">*</span></label>
                  <input
                    type="time"
                    className={`input create-event-schedule-input${getFieldErrorClass("time")}`}
                    value={form.time}
                    onChange={(e) => set("time", e.target.value)}
                  />
                </div>
              </div>

              {form.ends_next_day ? (
                <div className="create-event-grid-2">
                  <div className="form-field">
                    <label className="form-label">End Date <span className="form-required">*</span></label>
                    <DateInput
                      className={`create-event-schedule-input${getFieldErrorClass("end_date")}`}
                      value={form.end_date}
                      min={form.date || undefined}
                      onChange={(e) => set("end_date", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">End Time <span className="form-required">*</span></label>
                    <input
                      type="time"
                      className={`input create-event-schedule-input${getFieldErrorClass("end_time")}`}
                      value={form.end_time}
                      onChange={(e) => set("end_time", e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="create-event-grid-2">
                  <div className="form-field">
                    <label className="form-label">End Time <span className="form-required">*</span></label>
                    <input
                      type="time"
                      className={`input create-event-schedule-input${getFieldErrorClass("end_time")}`}
                      value={form.end_time}
                      onChange={(e) => set("end_time", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Calculated Duration</label>
                    <div className="create-event-duration-display">{computedDurationLabel}</div>
                    <p className="create-event-inline-help">Same-day events must end before midnight.</p>
                  </div>
                </div>
              )}

              {form.ends_next_day && (
                <div className="form-field create-event-form-field--compact">
                  <label className="form-label">Calculated Duration</label>
                  <div className="create-event-duration-display">
                    {computedDurationLabel}
                  </div>
                </div>
              )}

              {hasEqualMultiDayDates && (
                <div className="create-event-step-warning create-event-step-warning--sticky">
                  <AlertCircle size={18} className="icon-inline-start" />
                  The end date cannot be the same as the start date when this option is enabled. If the event ends the same day, disable “Ends on another day”.
                </div>
              )}

              {hasEndDateBeforeStartDate && (
                <div className="create-event-step-warning create-event-step-warning--sticky">
                  <AlertCircle size={18} className="icon-inline-start" />
                  The end date must be after the start date for a multi-day event.
                </div>
              )}

              {hasPastStartDateTime && (
                <div className="create-event-step-warning create-event-step-warning--sticky">
                  <AlertCircle size={18} className="icon-inline-start" />
                  The start date and time cannot be in the past. Please choose a future time.
                </div>
              )}

              {hasInvalidSameDayEndTime && (
                <div className="create-event-step-warning create-event-step-warning--sticky">
                  <AlertCircle size={18} className="icon-inline-start" />
                  For a same-day event, the end time must be after the start time. If it continues overnight, enable “Ends on another day”.
                </div>
              )}

              {(form.format === "presential" || form.format === "hybrid") && (
                <>
                  <div className="create-event-grid-2">
                    <div className="form-field">
                      <label className="form-label">City <span className="form-required">*</span></label>
                      <input type="text" className={`input${getFieldErrorClass("city")}`} value={form.city} onChange={(e) => set("city", e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Country <span className="form-required">*</span></label>
                      <input type="text" className={`input${getFieldErrorClass("country")}`} value={form.country} onChange={(e) => set("country", e.target.value)} />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Full Address <span className="form-required">*</span></label>
                    <input type="text" className={`input${getFieldErrorClass("address_full")}`} value={form.address_full} onChange={(e) => set("address_full", e.target.value)} />
                  </div>

                  <div className="create-event-card create-event-card--soft">
                    <button
                      type="button"
                      className={`create-event-switch${form.address_share_later ? " create-event-switch--active" : ""}`}
                      onClick={() => set("address_share_later", !form.address_share_later)}
                    >
                      <span className="create-event-switch-track">
                        <span className="create-event-switch-thumb" />
                      </span>
                      <span className="create-event-switch-copy">
                        <strong>Share the full address later</strong>
                        <small>Keep the exact venue private until shortly before the event starts.</small>
                      </span>
                    </button>
                    <p className="create-event-inline-help">
                      Useful if you want to reveal the exact venue shortly before the event by email.
                    </p>
                    {form.address_share_later && (
                      <div className="create-event-inline-toggle">
                        {[24, 48].map((hours) => (
                          <button
                            key={hours}
                            type="button"
                            className={`create-event-choice-chip${form.address_share_offset_hours === hours ? " create-event-choice-chip--active" : ""}`}
                            onClick={() => set("address_share_offset_hours", hours)}
                          >
                            Reveal {hours}h before start
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {(form.format === "online" || form.format === "hybrid") && (
                <>
                  <div className="form-field">
                    <label className="form-label">Platform</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Zoom, Teams, Google Meet"
                      value={form.online_platform}
                      onChange={(e) => {
                        autoDetectedPlatformRef.current = "";
                        set("online_platform", e.target.value);
                      }}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Online Link <span className="form-required">*</span></label>
                    <input
                      type="url"
                      className={`input${getFieldErrorClass("online_link")}`}
                      placeholder="https://meeting-platform.com/your-link"
                      value={form.online_link}
                      onChange={(e) => handleOnlineLinkChange(e.target.value)}
                    />
                  </div>

                  <div className="create-event-card create-event-card--soft">
                    <button
                      type="button"
                      className={`create-event-switch${form.allow_registration_during_event ? " create-event-switch--active" : ""}`}
                      onClick={() => set("allow_registration_during_event", !form.allow_registration_during_event)}
                    >
                      <span className="create-event-switch-track">
                        <span className="create-event-switch-thumb" />
                      </span>
                      <span className="create-event-switch-copy">
                        <strong>Allow registration after the event starts</strong>
                        <small>Useful for live webinars or hybrid sessions where attendees can still join after the opening.</small>
                      </span>
                    </button>
                    <p className="create-event-inline-help">
                      If enabled, participants will still be able to join while the event is live.
                    </p>
                  </div>

                  <div className="create-event-card create-event-card--soft">
                    <button
                      type="button"
                      className={`create-event-switch${form.online_share_later ? " create-event-switch--active" : ""}${form.allow_registration_during_event ? " create-event-switch--disabled" : ""}`}
                      onClick={() => {
                        if (form.allow_registration_during_event) return;
                        set("online_share_later", !form.online_share_later);
                      }}
                      disabled={form.allow_registration_during_event}
                    >
                      <span className="create-event-switch-track">
                        <span className="create-event-switch-thumb" />
                      </span>
                      <span className="create-event-switch-copy">
                        <strong>Share the meeting link later</strong>
                        <small>Show only the platform at publication, then reveal the full access link shortly before the event.</small>
                      </span>
                    </button>
                    <p className="create-event-inline-help">
                      {form.allow_registration_during_event
                        ? "Disabled because attendees must receive the full meeting link immediately when live registration is allowed."
                        : "Useful if you want to send the exact meeting link closer to the session start."}
                    </p>
                    {form.online_share_later && (
                      <div className="create-event-inline-toggle">
                        {[24, 48].map((hours) => (
                          <button
                            key={hours}
                            type="button"
                            className={`create-event-choice-chip${form.online_share_offset_hours === hours ? " create-event-choice-chip--active" : ""}`}
                            onClick={() => set("online_share_offset_hours", hours)}
                          >
                            Reveal {hours}h before start
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="create-event-card create-event-section-card">
              <div className="create-event-section-header">
                <div>
                  <h2 className="create-event-step-title">Registration & Capacity</h2>
                  <p className="create-event-step-subtitle">
                    Control capacity, validation rules and registration deadline.
                  </p>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Capacity</label>
                <div className="create-event-grid-tight">
                  {[
                    { key: false, label: "Limited", desc: "Set a maximum number of participants" },
                    { key: true, label: "Unlimited", desc: "Allow registrations without a hard cap" },
                  ].map((option) => (
                    <button
                      key={String(option.key)}
                      type="button"
                      className={`create-event-format-option create-event-format-option--left${form.unlimited_capacity === option.key ? " create-event-format-option--active" : ""}`}
                      onClick={() => set("unlimited_capacity", option.key)}
                    >
                      <p className={`create-event-format-option-title${form.unlimited_capacity === option.key ? " create-event-format-option-title--active" : ""}`}>
                        {option.label}
                      </p>
                      <p className="create-event-format-option-desc">
                        {option.desc}
                      </p>
                    </button>
                  ))}
                </div>

                {!form.unlimited_capacity ? (
                  <div className={`create-event-counter create-event-counter--spaced${getFieldErrorClass("capacity")}`}>
                    <button type="button" className="create-event-counter-btn" onClick={() => setCapacity(Number(form.capacity) - 1)}>
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="create-event-counter-input"
                      value={capacityInput}
                      onFocus={(e) => {
                        if (e.target.value === "0" || e.target.value === "1") {
                          setCapacityInput("");
                        }
                      }}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          setCapacityInput("");
                          setForm((prev) => ({ ...prev, capacity: 0 }));
                          clearFieldError("capacity");
                          return;
                        }
                        if (!/^\d+$/.test(raw)) return;
                        const parsed = Number.parseInt(raw, 10);
                        setCapacityInput(raw);
                        set("capacity", parsed);
                      }}
                      onBlur={(e) => {
                        if (e.target.value === "") {
                          setCapacityInput("0");
                          set("capacity", 0);
                        }
                      }}
                    />
                    <button type="button" className="create-event-counter-btn" onClick={() => setCapacity(Number(form.capacity) + 1)}>
                      +
                    </button>
                  </div>
                ) : (
                  <p className="create-event-inline-help">No registration limit will be applied to this event.</p>
                )}
              </div>

              <div className="form-field">
                <label className="form-label">Registration Mode</label>
                <div className="create-event-grid-tight">
                  {[
                    { key: "VALIDATION", label: "Manual Review", desc: "You approve each registration" },
                    { key: "AUTO", label: "Auto-Confirm", desc: "Registrations confirmed instantly" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={`create-event-format-option create-event-format-option--left${form.registration_mode === option.key ? " create-event-format-option--active" : ""}${form.allow_registration_during_event && option.key === "VALIDATION" ? " create-event-format-option--disabled" : ""}`}
                      onClick={() => {
                        if (form.allow_registration_during_event && option.key === "VALIDATION") return;
                        set("registration_mode", option.key);
                      }}
                      disabled={form.allow_registration_during_event && option.key === "VALIDATION"}
                    >
                      <p className={`create-event-format-option-title${form.registration_mode === option.key ? " create-event-format-option-title--active" : ""}`}>
                        {option.label}
                      </p>
                      <p className="create-event-format-option-desc">
                        {option.desc}
                      </p>
                    </button>
                  ))}
                </div>
                {form.allow_registration_during_event && (
                  <p className="create-event-inline-help">
                    Live registration requires instant access, so the event is automatically switched to Auto-Confirm.
                  </p>
                )}
              </div>

              {!form.allow_registration_during_event && (
                <div className="form-field">
                  <label className="form-label">Registration Deadline <span className="form-optional">(optional)</span></label>
                  <div className="create-event-grid-2">
                    <DateInput className="create-event-schedule-input" value={form.registration_deadline_date} onChange={(e) => set("registration_deadline_date", e.target.value)} />
                    <input
                      type="time"
                      className="input create-event-schedule-input"
                      value={form.registration_deadline_time}
                      onChange={(e) => set("registration_deadline_time", e.target.value)}
                    />
                  </div>
                  <p className="create-event-inline-help">If empty, registrations close at event start.</p>
                </div>
              )}
            </section>

            <section className="create-event-card">
              <div className="create-event-section-header">
                <div>
                  <h2 className="create-event-step-title">Description</h2>
                  <p className="create-event-step-subtitle">
                    Keep the event summary clear, useful and up to date.
                  </p>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Description <span className="form-required">*</span></label>
                <textarea
                  className={`input textarea--lg${getFieldErrorClass("description")}`}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>

              <div className="create-event-inline-actions create-event-inline-actions--spaced">
                <button
                  type="submit"
                  className="btn btn-primary create-event-primary-action create-event-action-btn--grow"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary create-event-primary-action create-event-action-btn--secondary"
                  onClick={() => requestNavigation(`/events/${id}`)}
                >
                  Cancel
                </button>
              </div>
            </section>
          </form>
        </div>
      </div>

      {pendingNavigation && (
        <div className="create-event-leave-backdrop" onClick={() => setPendingNavigation(null)}>
          <div className="create-event-leave-modal" onClick={(e) => e.stopPropagation()}>
            <p className="create-event-leave-eyebrow">Unsaved changes</p>
            <h2 className="create-event-leave-title">This event is not saved yet</h2>
            <p className="create-event-leave-copy">
              If you leave this page now, your latest edits will be lost.
            </p>
            <div className="create-event-leave-actions">
              <button className="btn btn-secondary" onClick={() => setPendingNavigation(null)}>
                Stay here
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const proceed = pendingNavigation;
                  setPendingNavigation(null);
                  proceed?.();
                }}
              >
                Leave without saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
