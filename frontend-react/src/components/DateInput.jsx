import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/DateInput.css";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const selectedDate = parseDateValue(value);
  const minDate = parseDateValue(min);
  const maxDate = parseDateValue(max);
  const [viewDate, setViewDate] = useState(selectedDate || minDate || new Date());

  useEffect(() => {
    setInputValue(value || "");
    if (selectedDate) setViewDate(selectedDate);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
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
    <div className="date-input-wrap" ref={wrapperRef}>
      <input
        type="text"
        className={`input date-input-trigger ${className}`}
        style={style}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={commitTypedDate}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitTypedDate();
          }
        }}
        placeholder={placeholder || "YYYY/MM/DD or DD/MM/YYYY"}
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        aria-label="Type a date or open the date picker"
      />

      <button
        type="button"
        className="date-input-icon"
        onClick={() => !disabled && setOpen((current) => !current)}
        tabIndex={-1}
        aria-label="Open date picker"
        disabled={disabled}
      >
        <Calendar size={15} strokeWidth={2} />
      </button>

      <input type="hidden" value={value || ""} required={required} {...props} />

      {open && (
        <div className="date-input-popover" role="dialog" aria-modal="false">
          <div className="date-input-popover-header">
            <button type="button" className="date-input-nav" onClick={() => moveMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <div className="date-input-popover-title">
              {viewDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </div>
            <button type="button" className="date-input-nav" onClick={() => moveMonth(1)} aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="date-input-grid date-input-grid--weekdays">
            {WEEK_DAYS.map((day) => (
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
        </div>
      )}
    </div>
  );
}
