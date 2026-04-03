import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { getRole, getDisplayName, getCompanyName, logout } from "../store/authStore";
import "../styles/NavUserMenu.css";

export default function NavUserMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const role = getRole();
  const isCompany = role === "COMPANY" || role === "ADMIN";
  const displayName = getDisplayName();
  const companyName = getCompanyName();
  const label = isCompany ? (companyName || displayName || "Lab Account") : (displayName || "Researcher");
  const initials = label ? label.substring(0, 2).toUpperCase() : (isCompany ? "LA" : "RH");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="nav-user-menu">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`nav-user-pill${open ? " open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div
          className="nav-user-avatar"
          style={{
            background: isCompany ? "var(--secondary)" : "var(--accent)",
            color: isCompany ? "#fff" : "#000",
          }}
        >
          {initials}
        </div>
        <span className="nav-user-label">{label}</span>
        <span className="nav-user-chevron">▾</span>
      </button>

      {open && (
        <div className="nav-user-dropdown" role="menu">
          <button
            onClick={() => { setOpen(false); navigate("/profile"); }}
            className="nav-user-dropdown-item"
            role="menuitem"
          >
            <User size={14} color="var(--text-muted)" />
            View Profile
          </button>
          <div className="nav-user-dropdown-divider" />
          <button
            onClick={() => { setOpen(false); handleLogout(); }}
            className="nav-user-dropdown-item danger"
            role="menuitem"
          >
            <LogOut size={14} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
