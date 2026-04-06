import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { usePreferences } from "../context/PreferencesContext";
import "../styles/DateInput.css";

const WEEK_DAYS = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  fr: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
};

const parseDateValue = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const buildValidDate = (year, month, day) => {
  const candidate = new Date(year, month - 1, day);
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }
  return candidate;
};

const parseTypedDate = (rawValue) => {
  const value = rawValue.trim();
  if (!value) return null;

  const parts = value.split(/[/-]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 3) return null;

  if (parts[0].length === 4) {
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    return buildValidDate(year, month, day);
  }

  if (parts[2].length === 4) {
    const first = Number(parts[0]);
    const second = Number(parts[1]);
    const year = Number(parts[2]);

    if (first > 12) {
      return buildValidDate(year, second, first);
    }

    if (second > 12) {
      return buildValidDate(year, first, second);
    }

    return buildValidDate(year, second, first);
  }

  return null;
};

const formatDateValue = (dateValue) => {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return "";
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const sameDay = (left, right) => (
  left instanceof Date &&
  right instanceof Date &&
  !Number.isNaN(left.getTime()) &&
  !Number.isNaN(right.getTime()) &&
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()
);

const isBeforeDay = (candidate, reference) => {
  if (!(candidate instanceof Date) || !(reference instanceof Date)) return false;
  const candidateStart = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate()).getTime();
  const referenceStart = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate()).getTime();
  return candidateStart < referenceStart;
};

const isAfterDay = (candidate, reference) => {
  if (!(candidate instanceof Date) || !(reference instanceof Date)) return false;
  const candidateStart = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate()).getTime();
  const referenceStart = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate()).getTime();
  return candidateStart > referenceStart;
};

const buildCalendarDays = (viewDate) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const calendarStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return day;
  });
};

export default function DateInput({
  className = "",
  style,
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  placeholder = "Select a date",
  ...props
}) {
  const { locale, t } = usePreferences();
  const wrapperRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [popoverStyle, setPopoverStyle] = useState({});
  const selectedDate = parseDateValue(value);
  const minDate = parseDateValue(min);
  const maxDate = parseDateValue(max);
  const [viewDate, setViewDate] = useState(selectedDate || minDate || new Date());
  const localeCode = locale === "fr" ? "fr-FR" : "en-GB";
  const weekDays = WEEK_DAYS[locale] || WEEK_DAYS.en;

  useEffect(() => {
    setInputValue(value || "");
    if (selectedDate) setViewDate(selectedDate);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      const clickedInsideField = wrapperRef.current && wrapperRef.current.contains(event.target);
      const clickedInsidePopover = popoverRef.current && popoverRef.current.contains(event.target);

      if (!clickedInsideField && !clickedInsidePopover) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;

    const updatePopoverPosition = () => {
      if (!wrapperRef.current) return;

      const rect = wrapperRef.current.getBoundingClientRect();
      const measuredHeight = popoverRef.current?.offsetHeight || 336;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const sidePadding = 12;
      const gap = 12;
      const width = Math.min(Math.max(rect.width, 280), 340, viewportWidth - (sidePadding * 2));
      const left = Math.min(
        Math.max(sidePadding, rect.left),
        Math.max(sidePadding, viewportWidth - width - sidePadding),
      );
      const openAbove = rect.bottom + gap + measuredHeight > viewportHeight - sidePadding && rect.top - gap - measuredHeight > sidePadding;
      const top = openAbove
        ? Math.max(sidePadding, rect.top - measuredHeight - gap)
        : Math.min(viewportHeight - measuredHeight - sidePadding, rect.bottom + gap);

      setPopoverStyle({
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
      });
    };

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [open, locale, viewDate]);

  const calendarDays = useMemo(() => buildCalendarDays(viewDate), [viewDate]);

  const emitChange = (nextValue) => {
    onChange?.({
      target: {
        value: nextValue,
        name: props.name,
      },
    });
  };

  const pickDate = (day) => {
    if (disabled) return;
    if (minDate && isBeforeDay(day, minDate)) return;
    if (maxDate && isAfterDay(day, maxDate)) return;

    const nextValue = formatDateValue(day);
    setInputValue(nextValue);
    emitChange(nextValue);
    setOpen(false);
  };

  const moveMonth = (offset) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const commitTypedDate = () => {
    if (!inputValue.trim()) {
      emitChange("");
      return;
    }

    const parsed = parseTypedDate(inputValue);
    if (!parsed) {
      setInputValue(value || "");
      return;
    }

    if (minDate && isBeforeDay(parsed, minDate)) {
      setInputValue(value || "");
      return;
    }

    if (maxDate && isAfterDay(parsed, maxDate)) {
      setInputValue(value || "");
      return;
    }

    const normalizedValue = formatDateValue(parsed);
    setInputValue(normalizedValue);
    setViewDate(parsed);
    emitChange(normalizedValue);
  };

  return (
    <div className={`date-input-wrap${open ? " date-input-wrap--open" : ""}`} ref={wrapperRef}>
      <input
        type="text"
        className={`input date-input-trigger ${className}`}
        style={style}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onFocus={() => !disabled && setOpen(true)}
        onClick={() => !disabled && setOpen(true)}
        onBlur={commitTypedDate}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitTypedDate();
          }
        }}
        placeholder={placeholder ? t(placeholder) : t("YYYY/MM/DD or DD/MM/YYYY")}
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        aria-label={t("Type a date or open the date picker")}
      />

      <button
        type="button"
        className="date-input-icon"
        onClick={() => !disabled && setOpen((current) => !current)}
        tabIndex={-1}
        aria-label={t("Open date picker")}
        disabled={disabled}
      >
        <Calendar size={15} strokeWidth={2} />
      </button>

      <input type="hidden" value={value || ""} required={required} {...props} />

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={popoverRef}
          className="date-input-popover date-input-popover--portal"
          role="dialog"
          aria-modal="false"
          style={popoverStyle}
        >
          <div className="date-input-popover-header">
            <button type="button" className="date-input-nav" onClick={() => moveMonth(-1)} aria-label={t("Previous month")}>
              <ChevronLeft size={16} />
            </button>
            <div className="date-input-popover-title">
              {viewDate.toLocaleDateString(localeCode, { month: "long", year: "numeric" })}
            </div>
            <button type="button" className="date-input-nav" onClick={() => moveMonth(1)} aria-label={t("Next month")}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="date-input-grid date-input-grid--weekdays">
            {weekDays.map((day) => (
              <span key={day} className="date-input-weekday">
                {day}
              </span>
            ))}
          </div>

          <div className="date-input-grid">
            {calendarDays.map((day) => {
              const isCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isSelected = selectedDate && sameDay(day, selectedDate);
              const isToday = sameDay(day, new Date());
              const isDisabledDay =
                (minDate && isBeforeDay(day, minDate)) ||
                (maxDate && isAfterDay(day, maxDate));

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`date-input-day${isCurrentMonth ? "" : " date-input-day--outside"}${isSelected ? " date-input-day--selected" : ""}${isToday ? " date-input-day--today" : ""}`}
                  onClick={() => pickDate(day)}
                  disabled={isDisabledDay}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
