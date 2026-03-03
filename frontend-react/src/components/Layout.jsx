import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Calendar, Users, LogOut,
  Menu, X, ChevronRight, Bell, Shield, Eye, Zap
} from "lucide-react";
import { logout, getRole, getToken } from "../store/authStore";
import "../styles/Layout.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/participants", label: "Participants", icon: Users },
];

export default function Layout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = getRole();
  const isAdmin = role === "admin";

  // Récupère l'initiale depuis le token (mock: "admin" ou "viewer")
  const username = role === "admin" ? "Admin User" : "Viewer User";
  const email = role === "admin" ? "admin@neurovent.fr" : "viewer@neurovent.fr";
  const initial = username.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-layout">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={18} color="white" />
          </div>
          <div className="sidebar-logo-text">
            <h2>Neurovent</h2>
            <p>Management System</p>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={isActive ? "nav-icon-active" : "nav-icon"}
                  />
                  <span>{label}</span>
                  {isActive && (
                    <ChevronRight size={14} className="nav-link-arrow" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="sidebar-user">
          <div className="sidebar-user-card">
            <div className="user-avatar">{initial}</div>
            <div className="user-info">
              <p>{username}</p>
              <div className={`user-role ${isAdmin ? "admin" : "viewer"}`}>
                {isAdmin
                  ? <Shield size={10} />
                  : <Eye size={10} />
                }
                <span>{role}</span>
              </div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div className="main-wrapper">

        {/* Header */}
        <header className="top-header">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="header-spacer" />

          <div className="header-actions">
            <button className="header-btn">
              <Bell size={18} />
              <span className="header-notif-dot" />
            </button>
            <div className="header-divider" />
            <div className="header-user">
              <div className="user-avatar-lg">{initial}</div>
              <div className="header-user-info">
                <p>{username}</p>
                <p>{email}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}