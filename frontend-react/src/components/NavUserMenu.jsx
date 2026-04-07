import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { getRole, getDisplayName, getCompanyName, logout } from "../store/authStore";
import { getMeApi } from "../api/auth";
import { usePreferences } from "../context/PreferencesContext";
import "../styles/NavUserMenu.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

const resolveMediaUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${API_BASE}${value}`;
  return `${API_BASE}/${value}`;
};

export default function NavUserMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = usePreferences();
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const ref = useRef(null);
  const role = getRole();
  const isAdmin = role === "ADMIN";
  const isCompany = role === "COMPANY";
  const displayName = getDisplayName();
  const companyName = getCompanyName();
  const label = isAdmin
    ? (displayName || t("Admin"))
    : isCompany
      ? (companyName || displayName || t("Organization Account"))
      : (displayName || t("Participant"));
  const initials = label ? label.substring(0, 2).toUpperCase() : (isCompany ? "OA" : isAdmin ? "AD" : "PT");
  const isProfileRoute = !isAdmin && (location.pathname === "/profile" || location.pathname === "/profile/edit");

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

  useEffect(() => {
    let cancelled = false;

    if (!role) {
      setAvatarUrl("");
      return undefined;
    }

    getMeApi()
      .then((me) => {
        if (cancelled) return;
        const nextAvatar = isCompany
          ? resolveMediaUrl(me.company_logo_url || me.company_logo || "")
          : resolveMediaUrl(me.participant_avatar_url || "");
        setAvatarUrl(nextAvatar);
      })
      .catch(() => {
        if (!cancelled) setAvatarUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [role, isCompany]);

  return (
    <div ref={ref} className="nav-user-menu">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`nav-user-pill${open ? " open" : ""}${isProfileRoute ? " is-active" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="nav-user-avatar-shell">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={label}
              className={`nav-user-avatar nav-user-avatar--image ${isCompany ? "nav-user-avatar--logo" : "nav-user-avatar--photo"}`}
            />
          ) : (
            <div
              className={`nav-user-avatar ${isCompany ? "nav-user-avatar--fallback-company" : "nav-user-avatar--fallback-user"}`}
            >
              {initials}
            </div>
          )}
        </div>
        <span className="nav-user-label">{label}</span>
      </button>

      {open && (
        <div className="nav-user-dropdown" role="menu">
          {!isAdmin ? (
            <>
              <button
                onClick={() => { setOpen(false); navigate("/profile"); }}
                className="nav-user-dropdown-item"
                role="menuitem"
              >
                <User size={14} color="var(--text-muted)" />
                {t("View Profile")}
              </button>
              <div className="nav-user-dropdown-divider" />
            </>
          ) : null}
          <button
            onClick={() => { setOpen(false); handleLogout(); }}
            className="nav-user-dropdown-item danger"
            role="menuitem"
          >
            <LogOut size={14} />
            {t("Log out")}
          </button>
        </div>
      )}
    </div>
  );
}
