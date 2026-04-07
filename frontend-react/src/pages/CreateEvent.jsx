import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { getMeApi } from "../api/auth";
import { createEvent } from "../api/events";
import { getTags, getTagsSync } from "../api/tags";
import { usePreferences } from "../context/PreferencesContext";
import { getCompanyName, getDisplayName } from "../store/authStore";
import DateInput from "../components/DateInput";
import "../styles/CreateEvent.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

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

const formatSchedulePreview = (startDate, startTime, endDate, endTime, locale, t) => {
  if (!startDate || !startTime) return t("TBD");
  const start = combineDateAndTime(startDate, startTime);
  const end = combineDateAndTime(endDate, endTime);
  if (!start || !end) return `${startDate} ${startTime}`;
  const localeCode = locale === "fr" ? "fr-FR" : "en-GB";

  const sameDay = formatDateForInput(start) === formatDateForInput(end);
  const startLabel = start.toLocaleDateString(localeCode, { day: "numeric", month: "short", year: "numeric" });
  const startTimeLabel = start.toLocaleTimeString(localeCode, { hour: "2-digit", minute: "2-digit" });
  const endTimeLabel = end.toLocaleTimeString(localeCode, { hour: "2-digit", minute: "2-digit" });

  if (sameDay) return `${startLabel} • ${startTimeLabel} - ${endTimeLabel}`;

  const endLabel = end.toLocaleDateString(localeCode, { day: "numeric", month: "short", year: "numeric" });
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

const resolveMediaUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${API_BASE}${value}`;
  return `${API_BASE}/${value}`;
};

export default function CreateEvent() {
  const navigate = useNavigate();
  const { t, locale } = usePreferences();
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
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const contentRef = useRef(null);
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
    let cancelled = false;

    getMeApi()
      .then((me) => {
        if (cancelled) return;
        setCompanyLogoUrl(resolveMediaUrl(me.company_logo_url || me.company_logo || ""));
      })
      .catch(() => {
        if (!cancelled) setCompanyLogoUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

    setForm((prev) => ({
      ...prev,
      registration_mode: "AUTO",
    }));
  }, [form.allow_registration_during_event, form.registration_mode]);

  useEffect(() => {
    if (!form.allow_registration_during_event || !form.online_share_later) return;

    setForm((prev) => ({
      ...prev,
      online_share_later: false,
    }));
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

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

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
    const now = new Date();
    const scheduleStart = combineDateAndTime(form.date, form.time);
    const hasPastStartDateTime =
      Boolean(form.date) &&
      Boolean(form.time) &&
      scheduleStart &&
      scheduleStart.getTime() < now.getTime();
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
      if (!form.time) nextErrors.time = true;
      if (hasPastStartDateTime) {
        nextErrors.date = true;
        nextErrors.time = true;
      }
      if (!form.end_time) nextErrors.end_time = true;
      if (hasInvalidSameDayEndTime) nextErrors.end_time = true;
      if (!form.unlimited_capacity && (!form.capacity || Number.parseInt(form.capacity, 10) <= 1)) nextErrors.capacity = true;
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
      if ((form.format === "online" || form.format === "hybrid") && !form.online_link.trim()) nextErrors.online_link = true;
    }

    setFieldErrors(nextErrors);
    setStepErrorMessage(
      hasPastStartDateTime
        ? t("The event start date and time cannot be in the past. Please choose a future time.")
        : hasEqualMultiDayDates
        ? t("The end date must be different from the start date when \"Ends on another day\" is enabled. If the event ends the same day, uncheck this option.")
        : hasEndDateBeforeStartDate
          ? t("The end date cannot be before the start date. Choose a later end date or disable the multi-day option.")
          : hasInvalidSameDayEndTime
            ? t("For a same-day event, the end time must be after the start time. If the event continues overnight, enable \"Ends on another day\".")
        : Object.keys(nextErrors).length > 0
          ? t("Some required information is missing. Please complete the highlighted fields to continue.")
          : "",
    );

    return Object.keys(nextErrors).length === 0;
  };

  const handleStepNavigation = (targetStep) => {
    if (targetStep === step) return;

    if (targetStep < step) {
      setStep(targetStep);
      return;
    }

    for (let stepToValidate = 1; stepToValidate < targetStep; stepToValidate += 1) {
      const isValid = validateStep(stepToValidate);
      if (!isValid) {
        setStep(stepToValidate);
        return;
      }
    }

    setStep(targetStep);
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

  const handlePublish = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      setStep(2);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (!form.description.trim()) {
        setError(t("Description is required."));
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
        capacity: form.unlimited_capacity ? 0 : (parseInt(form.capacity, 10) || 50),
        unlimited_capacity: form.unlimited_capacity,
        registration_mode: form.registration_mode,
        allow_registration_during_event:
          (form.format === "online" || form.format === "hybrid") && form.allow_registration_during_event,
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
        payload.online_visibility = form.online_share_later && !form.allow_registration_during_event ? "PARTIAL" : "FULL";
        if (form.online_share_later && !form.allow_registration_during_event) {
          const startDate = combineDateAndTime(form.date, form.time);
          if (startDate) {
            const revealDate = new Date(startDate.getTime() - form.online_share_offset_hours * 60 * 60 * 1000);
            payload.online_reveal_date = `${formatDateForInput(revealDate)}T${formatTimeForInput(revealDate)}:00`;
          }
        }
      }
      if (form.registration_deadline_date && !form.allow_registration_during_event) {
        const deadlineTime = form.registration_deadline_time || "23:59";
        payload.registration_deadline = `${form.registration_deadline_date}T${deadlineTime}:00`;
      }
      const result = await createEvent(payload);
      setPublished(result);
    } catch (e) {
      setError(e.message || t("Failed to publish event."));
    } finally {
      setLoading(false);
    }
  };

  const organizer = getCompanyName() || getDisplayName() || t("Organization");
  const steps = [
    { id: 1, label: t("Basic Info") },
    { id: 2, label: t("Schedule") },
    { id: 3, label: t("Preview") },
  ];
  const currentStep = steps.find((item) => item.id === step) || steps[0];
  const formatLabels = {
    presential: t("In-Person"),
    online: t("Online"),
    hybrid: t("Hybrid"),
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

  if (published) {
    return (
      <div className="create-event-page">
        <div className="create-event-success-shell">
          <div className="create-event-success-card">
          <div className="create-event-success-icon">✓</div>
          <h2 className="create-event-success-title">{t("Event Published!")}</h2>
          <p className="create-event-success-copy">
            {t("Your event is now live and visible to the research community on Neurovent.")}
          </p>
          <div className="create-event-inline-actions">
            <button
              className="btn btn-primary create-event-action-btn create-event-action-btn--grow"
              onClick={() => navigate(`/events/${published.id || ""}`)}
            >
              {t("View Event")}
            </button>
            <button
              className="btn btn-secondary create-event-action-btn create-event-action-btn--grow"
              onClick={() => navigate("/dashboard")}
            >
              {t("Back to Dashboard")}
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
      <div ref={contentRef} className="create-event-content create-event-content--single">
        <div className="create-event-main create-event-main--wide">
          <div className="create-event-topbar">
            <button
              className="create-event-back-btn"
              onClick={() => requestNavigation("/my-events")}
            >
              ← {t("Back to My Events")}
            </button>
          </div>

          <div className="create-event-hero">
            <h1 className="create-event-page-title">{t("Create New Event")}</h1>
            <p className="create-event-page-state">{currentStep.label}</p>
          </div>

          <div className="create-event-stepper">
            {steps.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`create-event-step${step === s.id ? " create-event-step--active" : ""}${step !== s.id ? " create-event-step--clickable" : ""}`}
                onClick={() => handleStepNavigation(s.id)}
              >
                <span className="create-event-step-dot">{s.id}</span>
                <span className="create-event-step-label">{s.label}</span>
              </button>
            ))}
          </div>

          {/* ---- STEP 1 ---- */}
          {step === 1 && (
            <>
              {stepErrorMessage && (
                <div className="create-event-step-warning">
                  <AlertCircle size={18} className="icon-inline-start" />
                  {stepErrorMessage}
                </div>
              )}
              <div className="form-field">
                <label className="form-label">
                  {t("Event Title")} <span className="form-required">*</span>
                </label>
                <input
                  type="text"
                  className={`input${getFieldErrorClass("title")}`}
                  placeholder={t("e.g. International Workshop on Neural Signal Processing")}
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  required
                />
              </div>

              {/* Tags */}
              <div className="form-field">
                <label className="form-label">{t("Research Tags")}</label>

                {/* Tags sélectionnés */}
                {form.tagIds.length > 0 && (
                  <div className="create-event-tags-list create-event-tags-list--spaced">
                    {availableTags.filter((t) => form.tagIds.includes(t.id)).map((tag) => (
                      <span
                        key={tag.id}
                        className="create-event-tag create-event-tag--selected"
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className="create-event-tag-remove"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {tagsLoading && (
                  <p className="create-event-inline-help create-event-inline-help--tight">{t("Loading tags...")}</p>
                )}

                {/* Input tags */}
                <div className="create-event-tags-input-row">
                  <input
                    type="text"
                    className="input create-event-input--full"
                    placeholder={availableTags.length ? t("Add a tag…") : t("No tags available")}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTagByName(); } }}
                  />
                </div>

                {/* Suggestions filtrées selon ce qui est tapé */}
                {tagInput.trim().length > 0 && (
                  <div className="create-event-suggestions create-event-suggestions--spaced">
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
                          className="create-event-suggestion-btn create-event-suggestion-btn--inline"
                        >
                          {tag.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Format */}
              <div className="form-field">
                <label className="form-label">{t("Format")}</label>
                <div className="create-event-grid-3">
                  {[
                    { key: "presential", label: t("In-Person"), icon: "🏛" },
                    { key: "online", label: t("Online"), icon: "🌐" },
                    { key: "hybrid", label: t("Hybrid"), icon: "🔀" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => set("format", f.key)}
                      className={`create-event-format-option create-event-format-option--card${form.format === f.key ? " create-event-format-option--active" : ""}`}
                    >
                      <div className={`create-event-format-option-icon${form.format === f.key ? " create-event-format-option-icon--active" : ""}`}>
                        {f.icon}
                      </div>
                      <p className={`create-event-format-option-title${form.format === f.key ? " create-event-format-option-title--active" : ""}`}>
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
                {t("Continue to Schedule")}
              </button>
            </>
          )}

          {/* ---- STEP 2 ---- */}
          {step === 2 && (
            <>
              {stepErrorMessage && (
                <div className="create-event-step-warning">
                  <AlertCircle size={18} className="icon-inline-start" />
                  {stepErrorMessage}
                </div>
              )}
              <div className="create-event-grid-2 create-event-grid-2--schedule-primary">
                <div className="form-field">
                  <label className="form-label">
                    {t("Start Date")} <span className="form-required">*</span>
                  </label>
                  <DateInput
                    className={`create-event-schedule-input${getFieldErrorClass("date")}`}
                    value={form.date}
                    min={todayInputValue}
                    onChange={(e) => set("date", e.target.value)}
                    required
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
                        if (stepErrorMessage) setStepErrorMessage("");
                      }}
                    >
                      <span className="create-event-switch-track">
                        <span className="create-event-switch-thumb" />
                      </span>
                      <span className="create-event-switch-copy">
                        <strong>{t("Ends on another day")}</strong>
                        <small>{t("Enable this only for events that continue past midnight.")}</small>
                      </span>
                    </button>
                  )}
                </div>
                <div className="form-field">
                  <label className="form-label">
                    {t("Start Time")} <span className="form-required">*</span>
                  </label>
                  <input
                    type="time"
                    className={`input create-event-schedule-input${getFieldErrorClass("time")}`}
                    value={form.time}
                    onChange={(e) => set("time", e.target.value)}
                  />
                </div>
              </div>

              {form.ends_next_day ? (
                <div className="create-event-grid-2 create-event-grid-2--schedule-secondary">
                  <div className="form-field">
                    <label className="form-label">
                      {t("End Date")} <span className="form-required">*</span>
                    </label>
                    <DateInput
                      className={`create-event-schedule-input${getFieldErrorClass("end_date")}`}
                      value={form.end_date}
                      min={form.date || undefined}
                      onChange={(e) => set("end_date", e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">
                      {t("End Time")} <span className="form-required">*</span>
                    </label>
                    <input
                      type="time"
                      className={`input create-event-schedule-input${getFieldErrorClass("end_time")}`}
                      value={form.end_time}
                      onChange={(e) => set("end_time", e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="create-event-grid-2 create-event-grid-2--schedule-summary">
                  <div className="form-field">
                    <label className="form-label">
                      {t("End Time")} <span className="form-required">*</span>
                    </label>
                    <input
                      type="time"
                      className={`input create-event-schedule-input${getFieldErrorClass("end_time")}`}
                      value={form.end_time}
                      onChange={(e) => set("end_time", e.target.value)}
                    />
                  </div>
                  <div className="form-field create-event-form-field--duration">
                    <label className="form-label">{t("Calculated Duration")}</label>
                    <div className="create-event-duration-display">
                      {computedDurationLabel}
                    </div>
                    <p className="create-event-inline-help">
                      {t("Same-day events must end before midnight.")}
                    </p>
                  </div>
                </div>
              )}

              {hasEqualMultiDayDates && (
                <div className="create-event-step-warning create-event-step-warning--sticky">
                  <AlertCircle size={18} className="icon-inline-start" />
                  {t("The end date cannot be the same as the start date when this option is enabled. If the event ends the same day, uncheck \"Ends on another day\".")}
                </div>
              )}

              {hasEndDateBeforeStartDate && (
                <div className="create-event-step-warning create-event-step-warning--sticky">
                  <AlertCircle size={18} className="icon-inline-start" />
                  {t("The end date must be after the start date for a multi-day event. If the event ends the same day, turn this option off.")}
                </div>
              )}

              {hasPastStartDateTime && (
                <div className="create-event-step-warning create-event-step-warning--sticky">
                  <AlertCircle size={18} className="icon-inline-start" />
                  {t("The start date and time cannot be in the past. Please choose a future time.")}
                </div>
              )}

              {hasInvalidSameDayEndTime && (
                <div className="create-event-step-warning create-event-step-warning--sticky">
                  <AlertCircle size={18} className="icon-inline-start" />
                  {t("For a same-day event, the end time must be after the start time. If it continues overnight, enable \"Ends on another day\".")}
                </div>
              )}

              {(form.format === "presential" || form.format === "hybrid") && (
                <>
                  <div className="create-event-grid-2">
                    <div className="form-field">
                      <label className="form-label">
                        {t("City")} <span className="form-required">*</span>
                      </label>
                      <input
                        type="text"
                        className={`input${getFieldErrorClass("city")}`}
                        placeholder={t("e.g. Paris")}
                        value={form.city}
                        onChange={(e) => set("city", e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label">
                        {t("Country")} <span className="form-required">*</span>
                      </label>
                      <input
                        type="text"
                        className={`input${getFieldErrorClass("country")}`}
                        placeholder={t("e.g. France")}
                        value={form.country}
                        onChange={(e) => set("country", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="form-label">
                      {t("Full Address")} <span className="form-required">*</span>
                    </label>
                    <input
                      type="text"
                      className={`input${getFieldErrorClass("address_full")}`}
                      placeholder={t("Full venue address including building and postal code")}
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
                        <strong>{t("Share the full address later")}</strong>
                        <small>{t("Keep the exact venue private until shortly before the event starts.")}</small>
                      </span>
                    </button>
                    <p className="create-event-inline-help">
                      {t("Useful if you want to reveal the exact venue shortly before the event by email.")}
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
                            {t("Reveal {{hours}}h before start", { hours })}
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
                    <label className="form-label">{t("Platform")}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder={t("e.g. Zoom, Teams, Google Meet")}
                      value={form.online_platform}
                      onChange={(e) => {
                        autoDetectedPlatformRef.current = "";
                        set("online_platform", e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">
                      {t("Online Link")} <span className="form-required">*</span>
                    </label>
                    <input
                      type="url"
                      className={`input${getFieldErrorClass("online_link")}`}
                      placeholder={t("https://meeting-platform.com/your-link")}
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
                        <strong>{t("Allow registration after the event starts")}</strong>
                        <small>{t("Useful for live webinars or hybrid sessions where attendees can still join after the opening.")}</small>
                      </span>
                    </button>
                    <p className="create-event-inline-help">
                      {t("If enabled, participants will still be able to join while the event is live.")}
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
                        <strong>{t("Share the meeting link later")}</strong>
                        <small>{t("Show only the platform at publication, then reveal the full access link shortly before the event.")}</small>
                      </span>
                    </button>
                    <p className="create-event-inline-help">
                      {form.allow_registration_during_event
                        ? t("Disabled because attendees must receive the full meeting link immediately when live registration is allowed.")
                        : t("Useful if you want to send the exact meeting link closer to the session start.")}
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
                            {t("Reveal {{hours}}h before start", { hours })}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="form-field create-event-form-field--capacity">
                <label className="form-label">
                  {t("Max Participants")} <span className="form-required">*</span>
                </label>
                <div className="create-event-grid-tight">
                  {[
                    { key: false, label: t("Limited"), desc: t("Set a maximum number of participants") },
                    { key: true, label: t("Unlimited"), desc: t("Allow registrations without a hard cap") },
                  ].map((option) => (
                    <button
                      key={String(option.key)}
                      type="button"
                      onClick={() => set("unlimited_capacity", option.key)}
                      className={`create-event-format-option create-event-format-option--left${form.unlimited_capacity === option.key ? " create-event-format-option--active" : ""}`}
                    >
                      <p className={`create-event-format-option-title${form.unlimited_capacity === option.key ? " create-event-format-option-title--active" : ""}`}>{option.label}</p>
                      <p className="create-event-format-option-desc">{option.desc}</p>
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
                  <p className="create-event-inline-help">{t("No registration limit will be applied to this event.")}</p>
                )}
              </div>

              <div className="form-field">
                <label className="form-label">{t("Registration Mode")}</label>
                <div className="create-event-grid-tight">
                  {[
                    { key: "VALIDATION", label: t("Manual Review"), desc: t("You approve each registration") },
                    { key: "AUTO", label: t("Auto-Confirm"), desc: t("Registrations confirmed instantly") },
                  ].map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        if (form.allow_registration_during_event && m.key === "VALIDATION") return;
                        set("registration_mode", m.key);
                      }}
                      className={`create-event-format-option create-event-format-option--left${form.registration_mode === m.key ? " create-event-format-option--active" : ""}${form.allow_registration_during_event && m.key === "VALIDATION" ? " create-event-format-option--disabled" : ""}`}
                      disabled={form.allow_registration_during_event && m.key === "VALIDATION"}
                    >
                      <p className={`create-event-format-option-title${form.registration_mode === m.key ? " create-event-format-option-title--active" : ""}`}>{m.label}</p>
                      <p className="create-event-format-option-desc">{m.desc}</p>
                    </button>
                  ))}
                </div>
                {form.allow_registration_during_event && (
                  <p className="create-event-inline-help">
                    {t("Live registration requires instant access, so the event is automatically switched to Auto-Confirm.")}
                  </p>
                )}
              </div>

              {!form.allow_registration_during_event && (
                <div className="form-field">
                  <label className="form-label">{t("Registration Deadline")} <span className="form-optional">({t("optional")})</span></label>
                  <div className="create-event-grid-2">
                    <DateInput
                      className="create-event-schedule-input"
                      value={form.registration_deadline_date}
                      onChange={(e) => set("registration_deadline_date", e.target.value)}
                    />
                    <input
                      type="time"
                      className="input create-event-schedule-input"
                      value={form.registration_deadline_time}
                      onChange={(e) => set("registration_deadline_time", e.target.value)}
                    />
                  </div>
                  <p className="create-event-inline-help create-event-inline-help--tight">
                    {t("If empty, registrations close at event start.")}
                  </p>
                </div>
              )}

              <div className="form-field">
                <label className="form-label">{t("Description")} <span className="form-required">*</span></label>
                <textarea
                  className={`input textarea--lg${getFieldErrorClass("description")}`}
                  placeholder={t("Describe the scientific scope, agenda structure, and target audience…")}
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
                {t("Generate Preview")}
              </button>
            </>
          )}

          {/* ---- STEP 3 ---- */}
          {step === 3 && (
            <>
              {stepErrorMessage && (
                <div className="create-event-step-warning">
                  <AlertCircle size={18} className="icon-inline-start" />
                  {stepErrorMessage}
                </div>
              )}
              {error && (
                <div className="create-event-alert">
                  <AlertCircle size={18} className="icon-inline-start" />
                  {error}
                </div>
              )}

              <div className="create-event-submit-row">
                <button
                  className="btn btn-primary create-event-primary-action--publish"
                  onClick={handlePublish}
                  disabled={loading}
                >
                  {loading ? t("Publishing...") : t("Publish Now")}
                </button>
              </div>

              {/* Preview card */}
              <div className="create-event-card">
                <div className="create-event-preview-header">
                  {companyLogoUrl ? (
                    <div className="create-event-preview-logo-shell">
                      <img
                        src={companyLogoUrl}
                        alt={organizer}
                        className="create-event-preview-logo"
                      />
                    </div>
                  ) : (
                    <div className="create-event-preview-logo-shell create-event-preview-logo-fallback">
                      {organizer.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="create-event-preview-heading">
                    <h3 className="create-event-preview-title">
                      {form.title || t("Event Title")}
                    </h3>
                    <p className="create-event-preview-organizer">{t("Organized by {{name}}", { name: organizer })}</p>
                  </div>
                  <span className="create-event-preview-status">
                    {t("Upcoming").toUpperCase()}
                  </span>
                </div>

                <div className="create-event-preview-grid">
                  {[
                    {
                      label: t("Schedule"),
                      value: formatSchedulePreview(
                        form.date,
                        form.time,
                        form.ends_next_day ? form.end_date : form.date,
                        form.end_time,
                        locale,
                        t,
                      ),
                    },
                    {
                      label: t("Location"),
                      value:
                        form.format === "online"
                          ? `${form.online_platform || t("Online")}${form.online_share_later ? ` • ${t("link later")}` : ""}`
                          : form.format === "hybrid"
                          ? (form.city
                              ? `${form.city}${form.address_share_later ? ` • ${t("full address later")}` : ""} + ${form.online_platform || t("Online")}${form.online_share_later ? ` • ${t("link later")}` : ""}`
                              : t("Hybrid"))
                          : form.city
                          ? `${form.city}, ${form.country}${form.address_share_later ? ` • ${t("full address later")}` : ""}`
                          : t("TBD"),
                    },
                    {
                      label: t("Registration"),
                      value: form.registration_mode === "VALIDATION" ? t("Manual") : t("Auto-Confirm"),
                    },
                  ].map((item) => (
                    <div key={item.label} className="create-event-preview-item">
                      <p className="create-event-preview-item-label">{item.label}</p>
                      <p className={`create-event-preview-item-value${item.label === t("Registration") ? " create-event-preview-item-value--accent" : ""}`}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="create-event-preview-grid create-event-preview-grid--compact">
                  <div className="create-event-preview-item">
                    <p className="create-event-preview-item-label">{t("Capacity")}</p>
                    <p className="create-event-preview-item-value">
                      {form.unlimited_capacity ? t("Unlimited") : t("{{count}} participants", { count: form.capacity })}
                    </p>
                  </div>
                  <div className="create-event-preview-item">
                    <p className="create-event-preview-item-label">{t("Format")}</p>
                    <p className="create-event-preview-item-value">
                      {formatLabels[form.format]}
                    </p>
                  </div>
                  <div className="create-event-preview-item">
                    <p className="create-event-preview-item-label">{t("Duration")}</p>
                    <p className="create-event-preview-item-value">{computedDurationLabel}</p>
                  </div>
                  {(form.format === "online" || form.format === "hybrid") && (
                    <div className="create-event-preview-item">
                      <p className="create-event-preview-item-label">{t("Live registration")}</p>
                      <p className={`create-event-preview-item-value${form.allow_registration_during_event ? " create-event-preview-item-value--active" : ""}`}>
                        {form.allow_registration_during_event ? t("Allowed while live") : t("Closes at start")}
                      </p>
                    </div>
                  )}
                </div>

                {form.description && (
                  <p className="create-event-preview-description">
                    {form.description.substring(0, 220)}
                    {form.description.length > 220 ? "..." : ""}
                  </p>
                )}

                {form.tagIds.length > 0 && (
                  <div className="create-event-preview-tags">
                    {availableTags
                      .filter((t) => form.tagIds.includes(t.id))
                      .map((tag) => (
                        <span key={tag.id} className="create-event-preview-tag">
                          #{tag.name}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      </div>

      {pendingNavigation && (
        <div className="create-event-leave-backdrop" onClick={() => setPendingNavigation(null)}>
          <div className="create-event-leave-modal" onClick={(e) => e.stopPropagation()}>
            <p className="create-event-leave-eyebrow">{t("Unsaved event")}</p>
            <h2 className="create-event-leave-title">{t("This event is not saved yet")}</h2>
            <p className="create-event-leave-copy">
              {t("If you leave this page now, your event draft will be lost.")}
            </p>
            <div className="create-event-leave-actions">
              <button className="btn btn-secondary" onClick={() => setPendingNavigation(null)}>
                {t("Stay here")}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const proceed = pendingNavigation;
                  setPendingNavigation(null);
                  proceed?.();
                }}
              >
                {t("Leave without saving")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
