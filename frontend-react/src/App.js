import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { prefetchTags } from "./api/tags";
import AdminRoute from "./components/AdminRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPasswordConfirm from "./pages/ResetPasswordConfirm";
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import CompanyProfile from "./pages/CompanyProfile";

export default function App() {
  useEffect(() => { prefetchTags(); }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPasswordConfirm />} />

      {/* Dashboard (protégé) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Profil (protégé) */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Pages publiques */}
      <Route path="/events" element={<Events />} />
      <Route path="/company/:id" element={<CompanyProfile />} />

      {/* Lab uniquement — MUST be before /events/:id */}
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
  );
}
