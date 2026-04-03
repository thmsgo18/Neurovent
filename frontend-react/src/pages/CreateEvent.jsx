import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { createEvent } from "../api/events";
import { getTags, getTagsSync } from "../api/tags";
import { getCompanyName, getDisplayName } from "../store/authStore";
import DateInput from "../components/DateInput";
import "../styles/CreateEvent.css";

const STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Schedule" },
  { id: 3, label: "Preview" },
];

const INITIAL_FORM = {
  title: "",
  format: "presential",
  date: "",
  time: "09:00",
  ends_next_day: false,
  end_date: "",
  end_time: "18:00",
  duration_minutes: 540,
  capacity: 50,
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

const formatSchedulePreview = (startDate, startTime, endDate, endTime) => {
  if (!startDate || !startTime) return "TBD";
  const start = combineDateAndTime(startDate, startTime);
  const end = combineDateAndTime(endDate, endTime);
  if (!start || !end) return `${startDate} ${startTime}`;

  const sameDay = formatDateForInput(start) === formatDateForInput(end);
  const startLabel = start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const startTimeLabel = start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const endTimeLabel = end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  if (sameDay) return `${startLabel} • ${startTimeLabel} - ${endTimeLabel}`;

  const endLabel = end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${startLabel} ${startTimeLabel} → ${endLabel} ${endTimeLabel}`;
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
  const [form, setForm] = useState(INITIAL_FORM);
  const [capacityInput, setCapacityInput] = useState(String(INITIAL_FORM.capacity));
  const [fieldErrors, setFieldErrors] = useState({});
  const [stepErrorMessage, setStepErrorMessage] = useState("");
  const hasUnsavedChanges = !published && JSON.stringify(form) !== JSON.stringify(INITIAL_FORM);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const allowNavigationRef = useRef(false);
  const autoDetectedPlatformRef = useRef("");

  useEffect(() => {
    if (!cached || cached.length === 0) {
      getTags()
        .then((tags) => { setAvailableTags(tags); setTagsLoading(false); })
        .catch(() => setTagsLoading(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    clearFieldError(k);
    if (stepErrorMessage) setStepErrorMessage("");
  };

  const setCapacity = (value) => {
    const parsed = Number.parseInt(value, 10);
    const safeValue = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    setCapacityInput(String(safeValue));
    set("capacity", safeValue);
  };

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

  const handleOnlineLinkChange = (rawLink) => {
    const detectedPlatform = detectPlatformFromLink(rawLink);

    setForm((prev) => {
      const shouldAutofillPlatform =
        !prev.online_platform.trim() ||
        (autoDetectedPlatformRef.current && prev.online_platform === autoDetectedPlatformRef.current);

      const nextPlatform = detectedPlatform && shouldAutofillPlatform
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
    if (stepErrorMessage) setStepErrorMessage("");
  };

  const getFieldErrorClass = (field) => (fieldErrors[field] ? " create-event-input--error" : "");

  const validateStep = (stepId) => {
    const nextErrors = {};
    const hasEqualMultiDayDates =
      form.ends_next_day &&
      Boolean(form.date) &&
      Boolean(form.end_date) &&
      form.date === form.end_date;
    const hasPastStartDate = Boolean(form.date) && form.date < todayInputValue;
    const hasEndDateBeforeStartDate =
      form.ends_next_day &&
      Boolean(form.date) &&
      Boolean(form.end_date) &&
      form.end_date < form.date;

    if (stepId === 1) {
      if (!form.title.trim()) nextErrors.title = true;
    }

    if (stepId === 2) {
      if (!form.date) nextErrors.date = true;
      if (hasPastStartDate) nextErrors.date = true;
      if (!form.time) nextErrors.time = true;
      if (!form.end_time) nextErrors.end_time = true;
      if (hasInvalidSameDayEndTime) nextErrors.end_time = true;
      if (!form.capacity || Number.parseInt(form.capacity, 10) <= 1) nextErrors.capacity = true;
      if (!form.description.trim()) nextErrors.description = true;
      if (form.ends_next_day && !form.end_date) nextErrors.end_date = true;
      if (hasEqualMultiDayDates) nextErrors.end_date = true;
      if (hasEndDateBeforeStartDate) nextErrors.end_date = true;

      const start = combineDateAndTime(form.date, form.time);
      const end = combineDateAndTime(effectiveEndDate, form.end_time);
      if (start && end && end <= start) nextErrors.end_time = true;

      if ((form.format === "presential" || form.format === "hybrid") && !form.city.trim()) nextErrors.city = true;
      if ((form.format === "presential" || form.format === "hybrid") && !form.country.trim()) nextErrors.country = true;
      if ((form.format === "presential" || form.format === "hybrid") && !form.address_full.trim()) nextErrors.address_full = true;
      if ((form.format === "online" || form.format === "hybrid") && !form.online_platform.trim()) nextErrors.online_platform = true;
    }

    setFieldErrors(nextErrors);
    setStepErrorMessage(
      hasPastStartDate
        ? "The event start date cannot be earlier than today."
        : hasEqualMultiDayDates
        ? "The end date must be different from the start date when “ends on another day” is enabled. If the event ends the same day, uncheck this option."
        : hasEndDateBeforeStartDate
          ? "The end date cannot be before the start date. Choose a later end date or disable the multi-day option."
          : hasInvalidSameDayEndTime
            ? "For a same-day event, the end time must be after the start time. If the event continues overnight, enable “Ends on another day”."
        : Object.keys(nextErrors).length > 0
          ? "Some required information is missing. Please complete the highlighted fields to continue."
          : "",
    );

    return Object.keys(nextErrors).length === 0;
  };

  const todayInputValue = formatDateForInput(new Date());
  const effectiveEndDate = form.ends_next_day ? form.end_date : form.date;
  const scheduleStart = combineDateAndTime(form.date, form.time);
  const scheduleEnd = combineDateAndTime(effectiveEndDate, form.end_time);
  const durationMinutes =
    scheduleStart && scheduleEnd ? Math.max(0, Math.round((scheduleEnd.getTime() - scheduleStart.getTime()) / (60 * 1000))) : 0;
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
  const hasPastStartDate = Boolean(form.date) && form.date < todayInputValue;
  const hasInvalidSameDayEndTime =
    !form.ends_next_day &&
    Boolean(form.date) &&
    Boolean(form.time) &&
    Boolean(form.end_time) &&
    scheduleStart &&
    scheduleEnd &&
    scheduleEnd <= scheduleStart;

  const handlePublish = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      setStep(2);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (!form.description.trim()) {
        setError("Description is required.");
        setLoading(false);
        return;
      }
      const formatMap = { presential: "ONSITE", online: "ONLINE", hybrid: "HYBRID" };
      const effectiveEndDate = form.ends_next_day ? form.end_date : form.date;
      const payload = {
        title: form.title,
        description: form.description,
        date_start: `${form.date}T${form.time}:00`,
        date_end: `${effectiveEndDate}T${form.end_time}:00`,
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
        payload.address_visibility = form.address_share_later ? "PARTIAL" : "FULL";
        if (form.address_share_later) {
          const startDate = combineDateAndTime(form.date, form.time);
          if (startDate) {
            const revealDate = new Date(startDate.getTime() - form.address_share_offset_hours * 60 * 60 * 1000);
            payload.address_reveal_date = `${formatDateForInput(revealDate)}T${formatTimeForInput(revealDate)}:00`;
          }
        }
      }
      if (form.format === "online" || form.format === "hybrid") {
        payload.online_platform = form.online_platform;
        if (form.online_link.trim()) payload.online_link = normalizeUrl(form.online_link);
        payload.online_visibility = form.online_share_later ? "PARTIAL" : "FULL";
        if (form.online_share_later) {
          const startDate = combineDateAndTime(form.date, form.time);
          if (startDate) {
            const revealDate = new Date(startDate.getTime() - form.online_share_offset_hours * 60 * 60 * 1000);
            payload.online_reveal_date = `${formatDateForInput(revealDate)}T${formatTimeForInput(revealDate)}:00`;
          }
        }
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
  const currentStep = STEPS.find((item) => item.id === step) || STEPS[0];

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

  if (published) {
    return (
      <div className="create-event-page">
        <div className="create-event-success-shell">
          <div className="create-event-success-card">
          <div style={{ fontSize: "48px", marginBottom: "24px", color: "var(--success)" }}>✓</div>
          <h2 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "12px" }}>Event Published!</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "15px", marginBottom: "36px", lineHeight: "1.6" }}>
            Your event is now live and visible to the research community on Neurovent.
          </p>
          <div className="create-event-inline-actions">
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
      </div>
    );
  }

  return (
    <div className="create-event-page">
      <div className="create-event-shell">
      <div className="create-event-content create-event-content--single">
        <div className="create-event-main create-event-main--wide">
          <div className="create-event-topbar">
            <button
              className="create-event-back-btn"
              onClick={() => requestNavigation("/my-events")}
            >
              ← Back to My Events
            </button>
          </div>

          <div className="create-event-hero">
            <p className="events-hero-eyebrow create-event-hero-eyebrow">Organizer Flow</p>
            <h1 className="create-event-page-title">Create New Event</h1>
            <p className="create-event-page-state">{currentStep.label}</p>
          </div>

          <div className="create-event-stepper">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`create-event-step${step === s.id ? " create-event-step--active" : ""}${step > s.id ? " create-event-step--clickable" : ""}`}
                onClick={() => step > s.id && setStep(s.id)}
              >
                <span className="create-event-step-dot">{s.id}</span>
                <span className="create-event-step-label">{s.label}</span>
              </button>
            ))}
          </div>

          <div className="create-event-section-header">
            <h2 className="create-event-step-title">
              {step === 1 ? "Create New Event" : step === 2 ? "Schedule & Capacity" : "Final Review"}
            </h2>
            <span className="create-event-step-count">
              Step {step} / 3
            </span>
          </div>

          {/* ---- STEP 1 ---- */}
          {step === 1 && (
            <>
              {stepErrorMessage && (
                <div className="create-event-step-warning">
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
                  {stepErrorMessage}
                </div>
              )}
              <div className="form-field">
                <label className="form-label">
                  Event Title <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  type="text"
                  className={`input${getFieldErrorClass("title")}`}
                  style={{ height: "58px" }}
                  placeholder="e.g. International Workshop on Neural Signal Processing"
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
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px", marginTop: "10px" }}>
                    {availableTags.filter((t) => form.tagIds.includes(t.id)).map((tag) => (
                      <span
                        key={tag.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px 6px 14px",
                          borderRadius: "100px",
                          background: "rgba(0,229,255,0.12)",
                          border: "1px solid rgba(0,229,255,0.3)",
                          color: "var(--accent)",
                          fontSize: "13px",
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
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {tagsLoading && (
                  <p style={{ fontSize: "13px", color: "var(--text-dim)", margin: "0 0 10px" }}>Chargement des tags...</p>
                )}

                {/* Input + bouton Ajouter */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                  <input
                    type="text"
                    className="input"
                    style={{ height: "48px", flex: 1 }}
                    placeholder={availableTags.length ? "Add a tag…" : "No tags available"}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTagByName(); } }}
                  />
                  <button
                    type="button"
                    onClick={addTagByName}
                    style={{
                      height: "48px",
                      padding: "0 18px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      background: "var(--surface-high)",
                      color: "var(--text-muted)",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "var(--transition)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                  >
                    Add Tag
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
                            padding: "7px 15px",
                            borderRadius: "100px",
                            border: "1px solid var(--border)",
                            background: "var(--surface-high)",
                            color: "var(--text-muted)",
                            fontSize: "13px",
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
                <div className="create-event-grid-3">
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
                        padding: "34px 22px",
                        borderRadius: "14px",
                        border: form.format === f.key ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: form.format === f.key ? "rgba(0,229,255,0.06)" : "var(--surface-high)",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "var(--transition)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "28px",
                          marginBottom: "12px",
                          color: form.format === f.key ? "var(--accent)" : "var(--text-dim)",
                        }}
                      >
                        {f.icon}
                      </div>
                      <p
                        style={{
                          fontWeight: "700",
                          fontSize: "17px",
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
                className="btn btn-primary create-event-primary-action"
                onClick={() => {
                  if (validateStep(1)) setStep(2);
                }}
              >
                Continue to Schedule
              </button>
            </>
          )}

          {/* ---- STEP 2 ---- */}
          {step === 2 && (
            <>
              {stepErrorMessage && (
                <div className="create-event-step-warning">
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
                  {stepErrorMessage}
                </div>
              )}
              <div className="create-event-grid-2">
                <div className="form-field">
                  <label className="form-label">
                    Start Date <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <DateInput
                    className={`create-event-schedule-input${getFieldErrorClass("date")}`}
                    style={{ height: "62px" }}
                    value={form.date}
                    min={todayInputValue}
                    onChange={(e) => set("date", e.target.value)}
                    required
                  />
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
                      if (stepErrorMessage) setStepErrorMessage("");
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
                </div>
                <div className="form-field">
                  <label className="form-label">
                    Start Time <span style={{ color: "var(--error)" }}>*</span>
                  </label>
                  <input
                    type="time"
                    className={`input create-event-schedule-input${getFieldErrorClass("time")}`}
                    style={{ height: "62px" }}
                    value={form.time}
                    onChange={(e) => set("time", e.target.value)}
                  />
                </div>
              </div>

              {form.ends_next_day ? (
                <div className="create-event-grid-2">
                  <div className="form-field">
                    <label className="form-label">
                      End Date <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <DateInput
                      className={`create-event-schedule-input${getFieldErrorClass("end_date")}`}
                      style={{ height: "62px" }}
                      value={form.end_date}
                      min={form.date || undefined}
                      onChange={(e) => set("end_date", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">
                      End Time <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="time"
                      className={`input create-event-schedule-input${getFieldErrorClass("end_time")}`}
                      style={{ height: "62px" }}
                      value={form.end_time}
                      onChange={(e) => set("end_time", e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="create-event-grid-2">
                  <div className="form-field">
                    <label className="form-label">
                      End Time <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="time"
                      className={`input create-event-schedule-input${getFieldErrorClass("end_time")}`}
                      style={{ height: "62px" }}
                      value={form.end_time}
                      onChange={(e) => set("end_time", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Calculated Duration</label>
                    <div className="create-event-duration-display">
                      {computedDurationLabel}
                    </div>
                    <p className="create-event-inline-help">
                      Same-day events must end before midnight.
                    </p>
                  </div>
                </div>
              )}

              {hasEqualMultiDayDates && (
                <div className="create-event-step-warning create-event-step-warning--sticky">
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
                  The end date cannot be the same as the start date when this option is enabled. If the event ends the same day, uncheck “Ends on another day”.
                </div>
              )}

              {hasEndDateBeforeStartDate && (
                <div className="create-event-step-warning create-event-step-warning--sticky">
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
                  The end date must be after the start date for a multi-day event. If the event ends the same day, turn this option off.
                </div>
              )}

              {hasPastStartDate && (
                <div className="create-event-step-warning create-event-step-warning--sticky">
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
                  The start date cannot be earlier than today. Please choose today or a future date.
                </div>
              )}

              {hasInvalidSameDayEndTime && (
                <div className="create-event-step-warning create-event-step-warning--sticky">
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
                  For a same-day event, the end time must be after the start time. If it continues overnight, enable “Ends on another day”.
                </div>
              )}

              {(form.format === "presential" || form.format === "hybrid") && (
                <>
                  <div className="create-event-grid-2">
                    <div className="form-field">
                      <label className="form-label">
                        City <span style={{ color: "var(--error)" }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={`input${getFieldErrorClass("city")}`}
                        style={{ height: "58px" }}
                        placeholder="e.g. Paris"
                        value={form.city}
                        onChange={(e) => set("city", e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">
                        Country <span style={{ color: "var(--error)" }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={`input${getFieldErrorClass("country")}`}
                        style={{ height: "58px" }}
                        placeholder="e.g. France"
                        value={form.country}
                        onChange={(e) => set("country", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="form-label">
                      Full Address <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={`input${getFieldErrorClass("address_full")}`}
                      style={{ height: "58px" }}
                      placeholder="Full venue address including building and postal code"
                      value={form.address_full}
                      onChange={(e) => set("address_full", e.target.value)}
                    />
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
                    <label className="form-label">
                      Platform <span style={{ color: "var(--error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={`input${getFieldErrorClass("online_platform")}`}
                      style={{ height: "58px" }}
                      placeholder="e.g. Zoom, Teams, Google Meet"
                      value={form.online_platform}
                      onChange={(e) => {
                        autoDetectedPlatformRef.current = "";
                        set("online_platform", e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Online Link</label>
                    <input
                      type="url"
                      className="input"
                      style={{ height: "58px" }}
                      placeholder="https://meeting-platform.com/your-link"
                      value={form.online_link}
                      onChange={(e) => handleOnlineLinkChange(e.target.value)}
                    />
                  </div>
                  <div className="create-event-card create-event-card--soft">
                    <button
                      type="button"
                      className={`create-event-switch${form.online_share_later ? " create-event-switch--active" : ""}`}
                      onClick={() => set("online_share_later", !form.online_share_later)}
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
                      Useful if you want to send the exact meeting link closer to the session start.
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

              <div className="form-field">
                <label className="form-label">
                  Max Participants <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <div className={`create-event-counter${getFieldErrorClass("capacity")}`}>
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
              </div>

              <div className="form-field">
                <label className="form-label">Registration Mode</label>
                <div className="create-event-grid-tight">
                  {[
                    { key: "VALIDATION", label: "Manual Review", desc: "You approve each registration" },
                    { key: "AUTO", label: "Auto-Confirm", desc: "Registrations confirmed instantly" },
                  ].map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => set("registration_mode", m.key)}
                      style={{
                        padding: "18px",
                        borderRadius: "12px",
                        border:
                          form.registration_mode === m.key
                            ? "1px solid var(--accent)"
                            : "1px solid var(--border)",
                        background:
                          form.registration_mode === m.key ? "rgba(0,229,255,0.06)" : "var(--surface-high)",
                        color: form.registration_mode === m.key ? "var(--accent)" : "var(--text-muted)",
                        fontSize: "15px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "var(--transition)",
                        textAlign: "left",
                      }}
                    >
                      <p style={{ fontWeight: "700", marginBottom: "6px" }}>{m.label}</p>
                      <p style={{ fontSize: "13px", opacity: 0.7 }}>{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Registration Deadline <span style={{ fontSize: "13px", color: "var(--text-dim)", fontWeight: "400" }}>(optional)</span></label>
                <div className="create-event-grid-2">
                  <DateInput
                    className="create-event-schedule-input"
                    style={{ height: "62px" }}
                    value={form.registration_deadline_date}
                    onChange={(e) => set("registration_deadline_date", e.target.value)}
                  />
                  <input
                    type="time"
                    className="input create-event-schedule-input"
                    style={{ height: "62px" }}
                    value={form.registration_deadline_time}
                    onChange={(e) => set("registration_deadline_time", e.target.value)}
                  />
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-dim)", marginTop: "6px" }}>
                  If empty, registrations close at event start.
                </p>
              </div>

              <div className="form-field">
                <label className="form-label">Description <span style={{ color: "var(--error)" }}>*</span></label>
                <textarea
                  className={`input${getFieldErrorClass("description")}`}
                  style={{ height: "180px", resize: "vertical" }}
                  placeholder="Describe the scientific scope, agenda structure, and target audience…"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary create-event-primary-action"
                onClick={() => {
                  if (validateStep(2)) setStep(3);
                }}
              >
                Generate Preview
              </button>
            </>
          )}

          {/* ---- STEP 3 ---- */}
          {step === 3 && (
            <>
              {stepErrorMessage && (
                <div className="create-event-step-warning">
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
                  {stepErrorMessage}
                </div>
              )}
              {error && (
                <div className="create-event-alert">
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
                  {error}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "28px" }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: "14px 28px", fontSize: "16px" }}
                  onClick={handlePublish}
                  disabled={loading}
                >
                  {loading ? "Publishing..." : "Publish Now"}
                </button>
              </div>

              {/* Preview card */}
              <div className="create-event-card">
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "22px" }}>
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "12px",
                      background: "var(--secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "15px",
                      fontWeight: "800",
                      color: "#fff",
                    }}
                  >
                    {organizer.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "6px" }}>
                      {form.title || "Event Title"}
                    </h3>
                    <p style={{ fontSize: "14px", color: "var(--accent)" }}>Organized by {organizer}</p>
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--accent)",
                      background: "rgba(0,229,255,0.1)",
                      padding: "6px 12px",
                      borderRadius: "100px",
                    }}
                  >
                    UPCOMING
                  </span>
                </div>

                <div className="create-event-preview-grid">
                  {[
                    {
                      label: "Schedule",
                      value: formatSchedulePreview(
                        form.date,
                        form.time,
                        form.ends_next_day ? form.end_date : form.date,
                        form.end_time,
                      ),
                    },
                    {
                      label: "Location",
                      value:
                        form.format === "online"
                          ? `${form.online_platform || "Online"}${form.online_share_later ? " • link later" : ""}`
                          : form.format === "hybrid"
                          ? (form.city
                              ? `${form.city}${form.address_share_later ? " • full address later" : ""} + ${form.online_platform || "Online"}${form.online_share_later ? " • link later" : ""}`
                              : "Hybrid")
                          : form.city
                          ? `${form.city}, ${form.country}${form.address_share_later ? " • full address later" : ""}`
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
                        borderRadius: "10px",
                        padding: "16px",
                      }}
                    >
                      <p style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "6px" }}>{item.label}</p>
                      <p
                        style={{
                          fontSize: "15px",
                          fontWeight: "700",
                          color: item.label === "Registration" ? "var(--accent)" : "var(--text)",
                        }}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="create-event-preview-grid create-event-preview-grid--compact">
                  <div
                    style={{
                      background: "var(--surface-high)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "16px",
                    }}
                  >
                    <p style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "6px" }}>Capacity</p>
                    <p style={{ fontSize: "15px", fontWeight: "700" }}>{form.capacity} participants</p>
                  </div>
                  <div
                    style={{
                      background: "var(--surface-high)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "16px",
                    }}
                  >
                    <p style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "6px" }}>Format</p>
                    <p style={{ fontSize: "15px", fontWeight: "700", textTransform: "capitalize" }}>
                      {form.format}
                    </p>
                  </div>
                  <div
                    style={{
                      background: "var(--surface-high)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "16px",
                    }}
                  >
                    <p style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "6px" }}>Duration</p>
                    <p style={{ fontSize: "15px", fontWeight: "700" }}>{computedDurationLabel}</p>
                  </div>
                </div>

                {form.description && (
                  <p style={{ fontSize: "15px", color: "var(--text-muted)", lineHeight: "1.7", marginBottom: "18px" }}>
                    {form.description.substring(0, 220)}
                    {form.description.length > 220 ? "..." : ""}
                  </p>
                )}

                {form.tagIds.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {availableTags
                      .filter((t) => form.tagIds.includes(t.id))
                      .map((tag) => (
                        <span
                          key={tag.id}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "100px",
                            background: "rgba(0,229,255,0.08)",
                            border: "1px solid rgba(0,229,255,0.2)",
                            fontSize: "12px",
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
                style={{ marginTop: "18px", fontSize: "14px" }}
                onClick={() => setStep(2)}
              >
                ← Back to Schedule
              </button>
            </>
          )}
        </div>
      </div>
      </div>

      {pendingNavigation && (
        <div className="create-event-leave-backdrop" onClick={() => setPendingNavigation(null)}>
          <div className="create-event-leave-modal" onClick={(e) => e.stopPropagation()}>
            <p className="create-event-leave-eyebrow">Unsaved event</p>
            <h2 className="create-event-leave-title">This event is not saved yet</h2>
            <p className="create-event-leave-copy">
              If you leave this page now, your event draft will be lost.
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
