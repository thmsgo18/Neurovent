import { useEffect } from "react";
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

export default function App() {
  const location = useLocation();
  const hideGlobalHeader = ["/login", "/register", "/forgot-password", "/reset-password"].includes(location.pathname);
  const fixedViewportContent =
    location.pathname === "/events" ||
    location.pathname === "/events/results" ||
    location.pathname === "/dashboard" ||
    location.pathname === "/my-events";

  useEffect(() => { prefetchTags(); }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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

  return (
    <div className="app-layout">
      {!hideGlobalHeader && <AppHeader />}
      <main className={`app-layout__content${fixedViewportContent ? " app-layout__content--fixed" : ""}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPasswordConfirm />} />

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
