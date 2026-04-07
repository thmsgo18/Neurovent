import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getRole, getCompanyName, isAuthed } from "../store/authStore";
import { getEvent } from "../api/events";
import { usePreferences } from "../context/PreferencesContext";
import "../styles/AppTopLinks.css";

export default function AppTopLinks({ className = "" }) {
  const authed = isAuthed();
  const { t } = usePreferences();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [isMoving, setIsMoving] = useState(false);
  const [ownsCurrentEvent, setOwnsCurrentEvent] = useState(false);
  const prevActiveIndex = useRef(-1);
  const role = getRole();
  const isAdmin = role === "ADMIN";
  const isOrg = role === "COMPANY";
  const companyName = getCompanyName();
  const eventDetailId = location.pathname.match(/^\/events\/(\d+)$/)?.[1] ?? null;
  const participantDetailId = location.pathname.match(/^\/participant\/(\d+)$/)?.[1] ?? null;
  const eventMyEventsContext = Boolean(eventDetailId && searchParams.get("context") === "my-events");
  const isMyEventsContextRoute =
    location.pathname === "/events/create" ||
    /^\/events\/\d+\/edit$/.test(location.pathname) ||
    eventMyEventsContext ||
    Boolean(participantDetailId && searchParams.get("context") === "my-events");

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
    ? isAdmin
      ? [
          { to: "/admin/participants", label: t("Participants"), match: () => location.pathname.startsWith("/admin/participants") },
          { to: "/admin/companies", label: t("Organizations"), match: () => location.pathname.startsWith("/admin/companies") || location.pathname.startsWith("/company/") },
          { to: "/admin/events", label: t("Events"), match: () => location.pathname.startsWith("/admin/events") || /^\/events\/\d+$/.test(location.pathname) },
          { to: "/admin/statistics", label: t("Statistics"), match: () => location.pathname.startsWith("/admin/statistics") },
        ]
      : isOrg
      ? [
          {
            to: "/events",
            label: t("Search"),
            match: () =>
              location.pathname.startsWith("/events") &&
              !isMyEventsContextRoute &&
              !(eventDetailId && ownsCurrentEvent),
          },
          {
            to: "/my-events",
            label: t("My Events"),
            match: () =>
              location.pathname.startsWith("/my-events") ||
              isMyEventsContextRoute ||
              Boolean(eventDetailId && ownsCurrentEvent),
          },
          { to: "/dashboard", label: t("Dashboard"), match: () => location.pathname.startsWith("/dashboard") },
        ]
      : [
          { to: "/events", label: t("Search"), match: () => location.pathname.startsWith("/events") },
          { to: "/dashboard", label: t("Dashboard"), match: () => location.pathname.startsWith("/dashboard") },
        ]
    : [{ to: "/events", label: t("Search"), match: () => location.pathname.startsWith("/events") }];
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
      className={`app-top-links app-top-links--count-${links.length}${activeIndex >= 0 ? ` app-top-links--index-${activeIndex}` : " app-top-links--no-active"}${isMoving ? " app-top-links--moving" : ""}${isAdmin ? " app-top-links--admin" : ""} ${className}`.trim()}
      aria-label={t("Primary")}
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
