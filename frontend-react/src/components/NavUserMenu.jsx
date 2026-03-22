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
    <div ref={ref} style={{ position: "relative" }}>
      {/* Avatar pill */}
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          padding: "5px 12px 5px 6px",
          borderRadius: "100px",
          border: `1px solid ${open ? "var(--border-strong)" : "var(--border)"}`,
          background: open ? "var(--surface)" : "transparent",
          transition: "var(--transition)",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            background: isCompany ? "var(--secondary)" : "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: "800",
            color: isCompany ? "#fff" : "#000",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", whiteSpace: "nowrap" }}>
          {label}
        </span>
        <span style={{ fontSize: "9px", color: "var(--text-dim)", marginLeft: "2px" }}>▾</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "8px",
            minWidth: "180px",
            zIndex: 200,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <button
            onClick={() => { setOpen(false); navigate("/profile"); }}
            style={menuItemStyle()}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-high)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <User size={14} color="var(--text-muted)" />
            View Profile
          </button>
          <button
            onClick={() => { setOpen(false); navigate("/dashboard"); }}
            style={menuItemStyle()}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-high)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <span style={{ width: "14px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>⊞</span>
            Dashboard
          </button>
          <div style={{ height: "1px", background: "var(--border)", margin: "6px 0" }} />
          <button
            onClick={() => { setOpen(false); handleLogout(); }}
            style={{ ...menuItemStyle(), color: "var(--error)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,77,77,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <LogOut size={14} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function menuItemStyle() {
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "10px 12px",
    background: "none",
    border: "none",
    borderRadius: "8px",
    color: "var(--text)",
    fontSize: "13px",
    cursor: "pointer",
    textAlign: "left",
    transition: "var(--transition)",
  };
}
