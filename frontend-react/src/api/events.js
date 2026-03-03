import { apiFetch } from "./client";

export const USE_MOCK = true;

// ---- MOCK DATA ----
const MOCK_EVENTS = [
  {
    id: 1,
    title: "Workshop Machine Learning",
    description: "Introduction au ML supervisé",
    date: "2026-04-15",
    status: "upcoming",
    location: "Salle A101",
  },
  {
    id: 2,
    title: "Conférence Federated Learning",
    description: "Apprentissage fédéré et confidentialité",
    date: "2026-05-20",
    status: "upcoming",
    location: "Amphithéâtre B",
  },
  {
    id: 3,
    title: "Séminaire Multi-Agent Systems",
    description: "Systèmes multi-agents distribués",
    date: "2026-03-10",
    status: "past",
    location: "Salle C203",
  },
];

// Liste tous les événements avec filtres optionnels
export const getEvents = async (filters = {}) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    let events = [...MOCK_EVENTS];
    if (filters.status) {
      events = events.filter((e) => e.status === filters.status);
    }
    if (filters.date) {
      events = events.filter((e) => e.date === filters.date);
    }
    return events;
  }
  const params = new URLSearchParams(filters).toString();
  return apiFetch(`/api/events/${params ? "?" + params : ""}`);
};

// Détail d'un événement
export const getEvent = async (id) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    const event = MOCK_EVENTS.find((e) => e.id === parseInt(id));
    if (!event) throw new Error("Événement non trouvé");
    return event;
  }
  return apiFetch(`/api/events/${id}/`);
};

// Créer un événement
export const createEvent = async (data) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    const newEvent = { id: MOCK_EVENTS.length + 1, ...data };
    MOCK_EVENTS.push(newEvent);
    return newEvent;
  }
  return apiFetch("/api/events/", { method: "POST", body: data });
};

// Modifier un événement
export const updateEvent = async (id, data) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    const index = MOCK_EVENTS.findIndex((e) => e.id === parseInt(id));
    if (index === -1) throw new Error("Événement non trouvé");
    MOCK_EVENTS[index] = { ...MOCK_EVENTS[index], ...data };
    return MOCK_EVENTS[index];
  }
  return apiFetch(`/api/events/${id}/`, { method: "PUT", body: data });
};

// Supprimer un événement
export const deleteEvent = async (id) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    const index = MOCK_EVENTS.findIndex((e) => e.id === parseInt(id));
    if (index !== -1) MOCK_EVENTS.splice(index, 1);
    return { success: true };
  }
  return apiFetch(`/api/events/${id}/`, { method: "DELETE" });
};