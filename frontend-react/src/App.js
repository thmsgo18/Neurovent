import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { prefetchTags } from "./api/tags";
import AdminRoute from "./components/AdminRoute";
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
import CompanyProfile from "./pages/CompanyProfile";

export default function App() {
  const location = useLocation();
  const hideGlobalHeader = ["/login", "/register", "/forgot-password", "/reset-password"].includes(location.pathname);
  const fixedViewportContent =
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
              <AdminRoute>
                <MyEvents />
              </AdminRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="/events" element={<Events />} />
          <Route path="/events/results" element={<EventsResults />} />
          <Route path="/company/:id" element={<CompanyProfile />} />

          <Route
            path="/events/create"
            element={
              <AdminRoute>
                <CreateEvent />
              </AdminRoute>
            }
          />
          <Route
            path="/events/:id/edit"
            element={
              <AdminRoute>
                <EditEvent />
              </AdminRoute>
            }
          />

          <Route path="/events/:id" element={<EventDetail />} />
        </Routes>
      </main>
    </div>
  );
}
