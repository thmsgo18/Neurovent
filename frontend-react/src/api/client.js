import { getToken } from "../store/authStore";

// URL du backend Django - définie dans le fichier .env
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export async function apiFetch(path, { method = "GET", body } = {}) {
  const token = getToken();

  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      // Si token présent, on l'envoie dans le header
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  // Si le serveur répond avec une erreur (400, 401, 404, 500...)
  if (!res.ok) {
    throw new Error(data?.detail || data?.error || "Request failed");
  }

  return data;
}

