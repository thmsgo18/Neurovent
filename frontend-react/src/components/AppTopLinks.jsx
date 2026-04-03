import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getRole, getCompanyName, isAuthed } from "../store/authStore";
import { getEvent } from "../api/events";
import "../styles/AppTopLinks.css";

export default function AppTopLinks({ className = "" }) {
  const authed = isAuthed();
  const location = useLocation();
  const [isMoving, setIsMoving] = useState(false);
  const [ownsCurrentEvent, setOwnsCurrentEvent] = useState(false);
  const prevActiveIndex = useRef(-1);
  const role = getRole();
  const isOrg = role === "COMPANY" || role === "ADMIN";
  const companyName = getCompanyName();
  const eventDetailId = location.pathname.match(/^\/events\/(\d+)$/)?.[1] ?? null;
  const isMyEventsContextRoute =
    location.pathname === "/events/create" ||
    /^\/events\/\d+\/edit$/.test(location.pathname);

  useEffect(() => {
    let isCancelled = false;

    if (!isOrg || !eventDetailId || !companyName) {
      setOwnsCurrentEvent(false);
      return undefined;
    }

    getEvent(eventDetailId)
      .then((event) => {
        if (!isCancelled) {
          setOwnsCurrentEvent(event?.company_name === companyName);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setOwnsCurrentEvent(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOrg, eventDetailId, companyName]);

  const links = authed
    ? isOrg
      ? [
          {
            to: "/events",
            label: "Events",
            match: () =>
              location.pathname.startsWith("/events") &&
              !isMyEventsContextRoute &&
              !(eventDetailId && ownsCurrentEvent),
          },
          {
            to: "/my-events",
            label: "My Events",
            match: () =>
              location.pathname.startsWith("/my-events") ||
              isMyEventsContextRoute ||
              Boolean(eventDetailId && ownsCurrentEvent),
          },
          { to: "/dashboard", label: "Dashboard", match: () => location.pathname.startsWith("/dashboard") },
        ]
      : [
          { to: "/events", label: "Events", match: () => location.pathname.startsWith("/events") },
          { to: "/dashboard", label: "Dashboard", match: () => location.pathname.startsWith("/dashboard") },
        ]
    : [{ to: "/events", label: "Events", match: () => location.pathname.startsWith("/events") }];
  const activeIndex = links.findIndex((link) => {
    if (typeof link.match === "function") return link.match();
    return location.pathname.startsWith(link.to);
  });

  useEffect(() => {
    if (prevActiveIndex.current === -1) {
      prevActiveIndex.current = activeIndex;
      return;
    }
    if (activeIndex === -1 || prevActiveIndex.current === activeIndex) return;

    setIsMoving(true);
    const timeout = window.setTimeout(() => setIsMoving(false), 520);
    prevActiveIndex.current = activeIndex;
    return () => window.clearTimeout(timeout);
  }, [activeIndex]);

  return (
    <nav
      className={`app-top-links${activeIndex >= 0 ? "" : " app-top-links--no-active"}${isMoving ? " app-top-links--moving" : ""} ${className}`.trim()}
      aria-label="Primary"
      style={{
        "--link-count": links.length,
        "--active-index": activeIndex >= 0 ? activeIndex : 0,
      }}
    >
      <span className="app-top-links__indicator" aria-hidden="true" />
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={`app-top-links__item${link.match() ? " app-top-links__item--active" : ""}`}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
