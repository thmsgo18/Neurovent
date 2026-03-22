import { useRef } from "react";
import { Calendar } from "lucide-react";
import "../styles/DateInput.css";

/**
 * DateInput — input[type="date"] with a clickable calendar icon.
 * Clicking the icon calls showPicker() (supported in all modern browsers).
 * Props are forwarded to the underlying <input>.
 */
export default function DateInput({ className = "", style, ...props }) {
  const inputRef = useRef(null);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      el.showPicker();
    } else {
      el.focus();
    }
  };

  return (
    <div className="date-input-wrap">
      <input
        ref={inputRef}
        type="date"
        className={`input date-input-field ${className}`}
        style={style}
        {...props}
      />
      <button
        type="button"
        className="date-input-icon"
        onClick={openPicker}
        tabIndex={-1}
        aria-label="Open date picker"
      >
        <Calendar size={15} strokeWidth={2} />
      </button>
    </div>
  );
}
