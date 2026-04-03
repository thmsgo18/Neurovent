import { getToken } from "../store/authStore";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

/**
 * Décode le payload d'un JWT sans vérification de signature.
 * Le vrai backend inclut : role, email/company_identifier, first_name, last_name.
 * Retourne null si le token n'est pas un JWT valide (ex: token mock).
 */
export function decodeJWT(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const token = getToken();

  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // data.detail → erreur auth JWT / permissions
    if (data?.detail) throw new Error(data.detail);
    // data.error → format company login error
    if (data?.error) throw new Error(data.error);
    // Tableau DRF : ["message"]
    if (Array.isArray(data)) {
      if (data.length) throw new Error(data.join(" — "));
    }
    // Erreurs de validation DRF : { field: ["msg"], non_field_errors: ["msg"] }
    if (data && typeof data === "object") {
      const messages = Object.entries(data)
        .flatMap(([field, errs]) => {
          const list = Array.isArray(errs) ? errs : [errs];
          return field === "non_field_errors"
            ? list
            : list.map((e) => `${field} : ${e}`);
        });
      if (messages.length) throw new Error(messages.join(" — "));
    }
    if (res.status >= 500) throw new Error("Server error. Please try again later.");
    throw new Error("Une erreur est survenue");
  }

  return data;
}
