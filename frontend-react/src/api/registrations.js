import { apiFetch } from "./client";
import { getToken } from "../store/authStore";

const USE_MOCK = false;

const MOCK_REGISTRATIONS = [
  { id: 1, event: 1, status: "CONFIRMED", created_at: "2026-03-01T10:00:00Z" },
  { id: 2, event: 3, status: "PENDING",   created_at: "2026-03-10T14:30:00Z" },
];

// Participant : s'inscrire à un event
export const registerToEvent = async (eventId) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    const exists = MOCK_REGISTRATIONS.find((r) => r.event === eventId);
    if (exists) throw new Error("Vous êtes déjà inscrit à cet événement.");
    const newReg = { id: MOCK_REGISTRATIONS.length + 1, event: eventId, status: "CONFIRMED", created_at: new Date().toISOString() };
    MOCK_REGISTRATIONS.push(newReg);
    return newReg;
  }
  return apiFetch("/api/registrations/", { method: "POST", body: { event: eventId } });
};

// Participant : ses inscriptions
export const getMyRegistrations = async (filters = {}) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_REGISTRATIONS;
  }
  const params = new URLSearchParams(filters).toString();
  const data = await apiFetch(`/api/registrations/my/${params ? "?" + params : ""}`);
  return data.results ?? (Array.isArray(data) ? data : []);
};

// Participant : annuler une inscription
export const cancelRegistration = async (id) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    const reg = MOCK_REGISTRATIONS.find((r) => r.id === id);
    if (reg) reg.status = "CANCELLED";
    return reg;
  }
  return apiFetch(`/api/registrations/${id}/cancel/`, { method: "PATCH" });
};

// Company : voir les inscrits d'un event
export const getEventRegistrations = async (eventId) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_REGISTRATIONS.filter((r) => r.event === eventId);
  }
  const data = await apiFetch(`/api/registrations/event/${eventId}/`);
  return data.results ?? (Array.isArray(data) ? data : []);
};

// Company : exporter les inscrits d'un event en CSV
export const exportEventRegistrations = async (eventId) => {
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/registrations/event/${eventId}/export/`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `registrations_event_${eventId}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Company : confirmer ou rejeter une inscription
export const updateRegistrationStatus = async (id, status) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    const reg = MOCK_REGISTRATIONS.find((r) => r.id === id);
    if (reg) reg.status = status;
    return reg;
  }
  return apiFetch(`/api/registrations/${id}/status/`, { method: "PATCH", body: { status } });
};

// Company : retirer une inscription de l'event
export const removeEventRegistration = async (id) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    const reg = MOCK_REGISTRATIONS.find((r) => r.id === id);
    if (reg) reg.status = "CANCELLED";
    return null;
  }
  return apiFetch(`/api/registrations/${id}/remove/`, { method: "PATCH" });
};
