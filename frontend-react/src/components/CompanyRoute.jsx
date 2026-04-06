import { Navigate } from "react-router-dom";
import { isAuthed, isCompany } from "../store/authStore";

export default function CompanyRoute({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  if (!isCompany()) return <Navigate to="/events" replace />;
  return children;
}
