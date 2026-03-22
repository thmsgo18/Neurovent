import { Navigate } from "react-router-dom";
import { isAuthed, isAdmin } from "../store/authStore";

export default function AdminRoute({ children }) {
  // Si pas connecté → login
  if (!isAuthed()) return <Navigate to="/login" replace />;
  
  // Si connecté mais pas admin → dashboard (accès refusé)
  if (!isAdmin()) return <Navigate to="/events" replace />;
  
  return children;
}