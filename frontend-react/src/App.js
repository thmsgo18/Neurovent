import { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { prefetchTags } from "./api/tags";
import AdminRoute from "./components/AdminRoute";
import CompanyRoute from "./components/CompanyRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import AppHeader from "./components/AppHeader";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPasswordConfirm from "./pages/ResetPasswordConfirm";
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventsResults from "./pages/EventsResults";
import EventDetail from "./pages/EventDetail";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import Dashboard from "./pages/Dashboard";
import MyEvents from "./pages/MyEvents";
import Profile from "./pages/Profile";
import ProfileOverview from "./pages/ProfileOverview";
import ParticipantProfile from "./pages/ParticipantProfile";
import CompanyProfile from "./pages/CompanyProfile";
import AdminParticipants from "./pages/AdminParticipants";
import AdminParticipantProfile from "./pages/AdminParticipantProfile";
import AdminCompanies from "./pages/AdminCompanies";
import AdminEvents from "./pages/AdminEvents";
import AdminStatistics from "./pages/AdminStatistics";
import { usePreferences } from "./context/PreferencesContext";

function buildDocumentTitle(pathname, t) {
  const base = "Neurovent";

  if (pathname === "/") return base;
  if (pathname === "/login") return `${t("Sign In")} | ${base}`;
  if (pathname === "/register") return `${t("Register")} | ${base}`;
  if (pathname === "/forgot-password") return `${t("Forgot Password")} | ${base}`;
  if (pathname.startsWith("/reset-password")) return `${t("Reset Password")} | ${base}`;
  if (pathname === "/dashboard") return `${t("Dashboard")} | ${base}`;
  if (pathname === "/my-events") return `${t("My Events")} | ${base}`;
  if (pathname === "/profile") return `${t("My Profile")} | ${base}`;
  if (pathname === "/profile/edit") return `${t("Edit Profile")} | ${base}`;
  if (/^\/participant\/\d+$/.test(pathname)) return `${t("Participant Profile")} | ${base}`;
  if (pathname === "/events") return `${t("Search")} | ${base}`;
  if (pathname === "/events/results") return `${t("Events")} | ${base}`;
  if (/^\/events\/\d+$/.test(pathname)) return `${t("Event Detail")} | ${base}`;
  if (pathname === "/events/create") return `${t("Create Event")} | ${base}`;
  if (/^\/events\/\d+\/edit$/.test(pathname)) return `${t("Edit Event")} | ${base}`;
  if (/^\/company\/\d+$/.test(pathname)) return `${t("Organization Profile")} | ${base}`;
  if (pathname === "/admin/participants") return `${t("Admin Participants")} | ${base}`;
  if (/^\/admin\/participants\/\d+$/.test(pathname)) return `${t("Participant Profile")} | ${base}`;
  if (pathname === "/admin/companies") return `${t("Admin Organizations")} | ${base}`;
  if (pathname === "/admin/events") return `${t("Admin Events")} | ${base}`;
  if (pathname === "/admin/statistics") return `${t("Admin Statistics")} | ${base}`;

  return base;
}

export default function App() {
  const location = useLocation();
  const { t } = usePreferences();
  const mainRef = useRef(null);
  const [isDesktopFixedViewport, setIsDesktopFixedViewport] = useState(() => window.innerWidth > 1024);
  const hideGlobalHeader =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/forgot-password" ||
    location.pathname.startsWith("/reset-password");
  const fixedViewportContent = isDesktopFixedViewport && ["/dashboard", "/my-events"].includes(location.pathname);

  useEffect(() => { prefetchTags(); }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktopFixedViewport(window.innerWidth > 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (fixedViewportContent) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow || "";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [fixedViewportContent]);

  useEffect(() => {
    document.title = buildDocumentTitle(location.pathname, t);
  }, [location.pathname, t]);

  return (
    <div className="app-layout">
      {!hideGlobalHeader && <AppHeader />}
      <main ref={mainRef} className={`app-layout__content${fixedViewportContent ? " app-layout__content--fixed" : ""}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPasswordConfirm />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPasswordConfirm />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-events"
            element={
              <CompanyRoute>
                <MyEvents />
              </CompanyRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileOverview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/participant/:id"
            element={
              <ProtectedRoute>
                <ParticipantProfile />
              </ProtectedRoute>
            }
          />

          <Route path="/events" element={<Events />} />
          <Route path="/events/results" element={<EventsResults />} />
          <Route path="/company/:id" element={<CompanyProfile />} />

          <Route path="/admin" element={<Navigate to="/admin/participants" replace />} />

          <Route
            path="/admin/participants"
            element={
              <AdminRoute>
                <AdminParticipants />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/participants/:id"
            element={
              <AdminRoute>
                <AdminParticipantProfile />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/companies"
            element={
              <AdminRoute>
                <AdminCompanies />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <AdminRoute>
                <AdminEvents />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/statistics"
            element={
              <AdminRoute>
                <AdminStatistics />
              </AdminRoute>
            }
          />

          <Route
            path="/events/create"
            element={
              <CompanyRoute>
                <CreateEvent />
              </CompanyRoute>
            }
          />
          <Route
            path="/events/:id/edit"
            element={
              <CompanyRoute>
                <EditEvent />
              </CompanyRoute>
            }
          />

          <Route path="/events/:id" element={<EventDetail />} />
        </Routes>
      </main>
    </div>
  );
}
