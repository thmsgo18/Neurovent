import { Link } from "react-router-dom";
import AppTopLinks from "./AppTopLinks";
import NavUserMenu from "./NavUserMenu";
import { isAuthed } from "../store/authStore";
import "../styles/AppHeader.css";

export default function AppHeader() {
  const authed = isAuthed();

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link to="/" className="app-header__brand">
          Neuro<span style={{ color: "var(--accent)" }}>vent</span>
        </Link>

        <div className="app-header__nav">
          <AppTopLinks />
        </div>

        <div className="app-header__right">
          {authed ? (
            <NavUserMenu />
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary app-header__auth-btn">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary app-header__auth-btn">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
