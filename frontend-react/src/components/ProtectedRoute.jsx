import { Navigate } from "react-router-dom";
import { isAuthed } from "../store/authStore";

export default function ProtectedRoute({ children }) {
  // Si pas connecté → redirige vers login
  if (!isAuthed()) return <Navigate to="/login" replace />;
  
  return children;
}