import { apiFetch } from "./client";
import { getToken, getUsername } from "../store/authStore";

export const USE_MOCK = false;

function deriveEventStatus(rawStatus, dateStart, dateEnd) {
  if (rawStatus === "CANCELLED") return "cancelled";
  if (rawStatus === "DRAFT") return "draft";

  const now = Date.now();
  const startTimestamp = dateStart ? new Date(dateStart).getTime() : null;
  const endTimestamp = dateEnd ? new Date(dateEnd).getTime() : startTimestamp;

  if (!startTimestamp || Number.isNaN(startTimestamp)) return rawStatus?.toLowerCase() || "unknown";
  if (now < startTimestamp) return "upcoming";
  if (!endTimestamp || Number.isNaN(endTimestamp) || now <= endTimestamp) return "live";
  return "past";
}

function getEventStatusLabel(status) {
  if (status === "upcoming") return "Upcoming";
  if (status === "live") return "Live";
  if (status === "past") return "Ended";
  if (status === "cancelled") return "Cancelled";
  if (status === "draft") return "Draft";
  return status || "Unknown";
}

function getEventStatusBadge(status, format, registrationOpen) {
  if (status === "live" && registrationOpen && (format === "ONLINE" || format === "HYBRID")) {
    return { label: "Join Live", className: "is-live-online" };
  }

  return {
    label: getEventStatusLabel(status),
    className:
      status === "live"
        ? "is-live"
        : status === "past"
          ? "is-past"
          : status === "cancelled"
            ? "is-cancelled"
            : status === "draft"
              ? "is-draft"
              : "is-upcoming",
  };
}

// ---- MOCK DATA ----
// Les champs des mock utilisent les noms du backend Django
const MOCK_EVENTS = [
  {
    id: 1,
    title: "Workshop on Federated Learning & Privacy",
    description:
      "This intensive workshop covers advanced differential privacy techniques, secure aggregation protocols, and practical cross-silo architecture implementations for researchers.",
    status: "PUBLISHED",
    date_start: "2026-04-14T09:00:00Z",
    date_end: "2026-04-14T18:00:00Z",
    address_city: "Paris",
    address_country: "France",
    address_full: "INRIA Paris Lab, Bâtiment A, 2 rue Simone Iff, 75012 Paris",
    address_visibility: "FULL",
    organizer: "INRIA Paris",
    capacity: 50,
    registered_count: 32,
    format: "ONSITE",
    tags: [{ id: 1, name: "Privacy" }, { id: 2, name: "Federated Learning" }, { id: 3, name: "Differential Privacy" }],
    registration_mode: "VALIDATION",
    owner: "admin",
    // champs UI dérivés (calculés côté frontend à partir des données backend)
    category: "FL",
  },
  {
    id: 2,
    title: "Multi-Agent Systems Practice",
    description:
      "A live online session on distributed multi-agent systems, coordination protocols, and emergent behavior in complex environments.",
    status: "PUBLISHED",
    date_start: "2026-03-15T14:00:00Z",
    date_end: "2026-03-15T17:00:00Z",
    address_city: null,
    address_country: null,
    address_full: null,
    online_platform: "Zoom",
    online_link: "https://zoom.us/...",
    online_visibility: "PARTIAL",
    organizer: "LIP6",
    capacity: 100,
    registered_count: 87,
    format: "ONLINE",
    tags: [{ id: 4, name: "Multi-Agent" }, { id: 5, name: "Distributed Systems" }, { id: 6, name: "AI" }],
    registration_mode: "AUTO",
    owner: "admin",
    category: "MAS",
  },
  {
    id: 3,
    title: "International Conference on ML Security",
    description:
      "Top-tier conference on adversarial machine learning, model robustness, and trustworthy AI systems.",
    status: "PUBLISHED",
    date_start: "2026-05-20T10:00:00Z",
    date_end: "2026-05-20T18:00:00Z",
    address_city: "Lyon",
    address_country: "France",
    address_full: "Université Claude Bernard Lyon 1, Salle des Conférences, 43 bd du 11 Novembre",
    address_visibility: "FULL",
    organizer: "Université Claude Bernard",
    capacity: 200,
    registered_count: 145,
    format: "ONSITE",
    tags: [{ id: 7, name: "Security" }, { id: 8, name: "ML" }, { id: 9, name: "Robustness" }],
    registration_mode: "AUTO",
    owner: "ucbl",
    category: "Security",
  },
];

// Normalise un event backend → shape utilisée dans les composants.
// Le backend retourne 3 shapes différentes selon l'endpoint :
//   - list (GET /api/events/) : champs plats address_city, online_platform...
//   - detail (GET /api/events/:id/) : objets imbriqués visible_address, visible_online
//   - create/update response : champs plats bruts (même chose que list)
export function normalizeEvent(e) {
  const capacity = e.capacity || 0;
  const unlimitedCapacity = e.unlimited_capacity ?? false;
  // Si registered_count n'est pas renvoyé, on le déduit seulement pour les événements limités.
  const spotsRemaining = unlimitedCapacity ? null : (e.spots_remaining ?? 0);
  const registered = e.registered_count ?? (unlimitedCapacity ? 0 : Math.max(0, capacity - (spotsRemaining ?? 0)));

  // Résoudre l'adresse selon la shape disponible
  const va = e.visible_address; // detail endpoint
  const addressFull = va?.full || e.address_full || "";
  const addressCity = va?.city || e.address_city || "";
  const addressCountry = va?.country || e.address_country || "";

  // Résoudre les infos en ligne selon la shape disponible
  const vo = e.visible_online; // detail endpoint
  const onlinePlatform = vo?.platform || e.online_platform || "";
  const onlineLink = vo?.link || e.online_link || "";

  // Localisation affichée
  let location = null;
  if (e.format === "ONLINE") {
    location = onlinePlatform ? `${onlinePlatform} (online)` : "Online";
  } else if (e.format === "HYBRID") {
    const place = addressCity || addressFull;
    location = place ? `${place} + ${onlinePlatform || "Online"}` : (onlinePlatform || "Hybrid");
  } else {
    location = addressFull || (addressCity ? `${addressCity}, ${addressCountry}` : null);
  }

  const normalizedStatus = deriveEventStatus(e.status, e.date_start, e.date_end);
  const registrationOpen = e.registration_open ?? true;
  const statusBadge = getEventStatusBadge(normalizedStatus, e.format, registrationOpen);

  return {
    ...e,
    // Dates
    date: e.date_start ? e.date_start.split("T")[0] : null,
    time: e.date_start ? e.date_start.split("T")[1]?.substring(0, 5) : null,
    // Capacité
    max_participants: unlimitedCapacity ? null : capacity,
    registered_count: registered,
    spots_remaining: spotsRemaining,
    is_full: unlimitedCapacity ? false : (e.is_full ?? spotsRemaining <= 0),
    registration_open: registrationOpen,
    // Organizer
    organizer: e.company_name || e.organizer || "",
    // Localisation normalisée (gère list + detail + create)
    location,
    city: addressCity,
    country: addressCountry,
    address_full: addressFull,
    online_platform: onlinePlatform,
    online_link: onlineLink,
    // Normalisation des valeurs enum → UI
    format: e.format === "ONSITE" ? "presential" : e.format === "ONLINE" ? "online" : e.format === "HYBRID" ? "hybrid" : e.format?.toLowerCase(),
    validation: e.registration_mode === "VALIDATION" ? "manual" : "auto",
    allow_registration_during_event: e.allow_registration_during_event ?? false,
    unlimited_capacity: unlimitedCapacity,
    status: normalizedStatus,
    status_label: getEventStatusLabel(normalizedStatus),
    status_badge_label: statusBadge.label,
    status_badge_class: statusBadge.className,
    tags: (e.tags || []).map((t) => (typeof t === "object" ? t.name : t)),
    tag_ids: (e.tags || []).filter((t) => typeof t === "object").map((t) => t.id),
  };
}

export const getEvents = async (filters = {}) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    let events = MOCK_EVENTS.map(normalizeEvent);
    if (filters.status) events = events.filter((e) => e.status === filters.status);
    if (filters.format) events = events.filter((e) => e.format === filters.format);
    if (filters.category) events = events.filter((e) => e.category === filters.category);
    return { results: events, count: events.length, next: null, previous: null };
  }
  const FORMAT_MAP = { presential: "ONSITE", online: "ONLINE", hybrid: "HYBRID" };
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.format) params.set("format", FORMAT_MAP[filters.format] || filters.format.toUpperCase());
  if (filters.page && filters.page > 1) params.set("page", filters.page);
  if (filters.ordering) params.set("ordering", filters.ordering);
  if (filters.city) params.set("city", filters.city);
  if (filters.country) params.set("country", filters.country);
  if (filters.organization) params.set("organization", filters.organization);
  if (filters.upcomingOnly) params.set("upcoming_only", "true");
  // tags peut être un tableau d'IDs
  const tags = Array.isArray(filters.tags) ? filters.tags : filters.tags ? [filters.tags] : [];
  tags.forEach((t) => params.append("tags", t));
  const qs = params.toString();
  const data = await apiFetch(`/api/events/${qs ? "?" + qs : ""}`, { auth: false });
  return {
    results: (data.results || data).map(normalizeEvent),
    count: data.count ?? (data.results || data).length,
    next: data.next || null,
    previous: data.previous || null,
  };
};

export const getEvent = async (id) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    const event = MOCK_EVENTS.find((e) => e.id === parseInt(id));
    if (!event) throw new Error("Événement non trouvé");
    return normalizeEvent(event);
  }
  const data = await apiFetch(`/api/events/${id}/`, { auth: false });
  return normalizeEvent(data);
};

export const createEvent = async (data) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    const newEvent = { id: MOCK_EVENTS.length + 1, registered_count: 0, status: "PUBLISHED", ...data };
    MOCK_EVENTS.push(newEvent);
    return normalizeEvent(newEvent);
  }
  return apiFetch("/api/events/create/", { method: "POST", body: data });
};

export const updateEvent = async (id, data) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    const index = MOCK_EVENTS.findIndex((e) => e.id === parseInt(id));
    if (index === -1) throw new Error("Événement non trouvé");
    MOCK_EVENTS[index] = { ...MOCK_EVENTS[index], ...data };
    return normalizeEvent(MOCK_EVENTS[index]);
  }
  return apiFetch(`/api/events/${id}/update/`, { method: "PATCH", body: data });
};

export const deleteEvent = async (id) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    const index = MOCK_EVENTS.findIndex((e) => e.id === parseInt(id));
    if (index !== -1) MOCK_EVENTS.splice(index, 1);
    return { success: true };
  }
  return apiFetch(`/api/events/${id}/delete/`, { method: "DELETE" });
};

// Événements recommandés pour le participant connecté (selon ses tags)
export const getRecommendedEvents = async () => {
  if (USE_MOCK) return [];
  const data = await apiFetch("/api/events/recommended/");
  return (data.results || data).map(normalizeEvent);
};

// Stats d'un event (company owner / admin)
export const getEventStats = async (id) => {
  if (USE_MOCK) return { confirmed: 0, pending: 0, waitlist: 0, cancelled: 0, total: 0, capacity: 50 };
  return apiFetch(`/api/events/${id}/stats/`);
};

// Événements de la company connectée (tous statuts)
export const getMyEventsApi = async () => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    const username = getUsername();
    return MOCK_EVENTS.filter((e) => e.owner === username).map(normalizeEvent);
  }
  const data = await apiFetch("/api/events/my-events/");
  return (data.results || data).map(normalizeEvent);
};

export const getCompanyDashboardStats = async () => {
  if (USE_MOCK) {
    return {
      total_views: 0,
      total_registrations: 0,
      pending_requests: 0,
      confirmed_participants: 0,
      waitlist_count: 0,
      average_fill_rate: 0,
      upcoming_events: 0,
      past_events: 0,
      cancellation_rate: 0,
    };
  }
  return apiFetch("/api/events/dashboard-stats/");
};

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

async function downloadProtectedCsv(path, fallbackFilename) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error("Unable to download stats right now.");
  }

  const blob = await res.blob();
  const href = window.URL.createObjectURL(blob);
  const contentDisposition = res.headers.get("content-disposition") || "";
  const matchedFilename = contentDisposition.match(/filename="?([^"]+)"?/i)?.[1];
  const filename = matchedFilename || fallbackFilename;

  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(href);
}

export const downloadCompanySummaryStats = () =>
  downloadProtectedCsv("/api/events/dashboard-stats/export-summary/", "dashboard_summary.csv");

export const downloadCompanyPerformanceStats = () =>
  downloadProtectedCsv("/api/events/dashboard-stats/export-performance/", "events_performance.csv");
