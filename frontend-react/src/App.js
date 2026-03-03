import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Participants from "./pages/Participants";

export default function App() {
  return (
    <Routes>
      {/* Redirect racine vers dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      
      {/* Page publique */}
      <Route path="/login" element={<Login />} />
      
      {/* Pages protégées */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/events" element={
        <ProtectedRoute><Events /></ProtectedRoute>
      } />
      <Route path="/events/:id" element={
        <ProtectedRoute><EventDetail /></ProtectedRoute>
      } />
      <Route path="/participants" element={
        <ProtectedRoute><Participants /></ProtectedRoute>
      } />
    </Routes>
  );
}