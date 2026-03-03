import { apiFetch } from "./client";

export const USE_MOCK = true; // ← false quand backend Thomas est prêt

// ---- MOCK USERS ----
const MOCK_USERS = [
  {
    username: "admin",
    password: "admin123",
    access: "mock-token-admin",
    refresh: "mock-refresh-admin",
    role: "admin",
  },
  {
    username: "viewer",
    password: "viewer123",
    access: "mock-token-viewer",
    refresh: "mock-refresh-viewer",
    role: "viewer",
  },
];

// Connexion
export const loginApi = async (username, password) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    const user = MOCK_USERS.find(
      (u) => u.username === username && u.password === password
    );
    if (!user) throw new Error("Identifiants incorrects");
    return { access: user.access, refresh: user.refresh, role: user.role };
  }
  return apiFetch("/api/token/", { method: "POST", body: { username, password } });
};

// Register (mock)
export const registerApi = async (username, email, password, institution) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800));
    // Simule succès — Thomas branchera le vrai endpoint
    return { success: true };
  }
  return apiFetch("/api/auth/register/", {
    method: "POST",
    body: { username, email, password, institution },
  });
};

// Forgot password (mock)
export const forgotPasswordApi = async (email) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 800));
    return { success: true };
  }
  return apiFetch("/api/auth/forgot-password/", {
    method: "POST",
    body: { email },
  });
};