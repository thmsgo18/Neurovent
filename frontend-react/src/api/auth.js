import { apiFetch } from "./client";

export const USE_MOCK = true; // ← mettre false quand backend Thomas est prêt

// ---- MOCK DATA ----
const MOCK_USER = {
  access: "fake-access-token-123",
  refresh: "fake-refresh-token-456",
  role: "admin",
};

// Connexion
export const loginApi = async (username, password) => {
  if (USE_MOCK) {
    // Simule un délai réseau
    await new Promise((r) => setTimeout(r, 500));
    if (username === "admin" && password === "admin123") return MOCK_USER;
    throw new Error("Identifiants incorrects");
  }
  return apiFetch("/api/token/", { method: "POST", body: { username, password } });
};