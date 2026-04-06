import { Navigate } from "react-router-dom";
import { isAuthed, isAdmin } from "../store/authStore";

export default function AdminRoute({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/events" replace />;
  return children;
}
