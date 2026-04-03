import { apiFetch } from "./client";

const USE_MOCK = false;

// ---- MOCK CREDENTIALS ----
const MOCK_CREDENTIALS = [
  {
    email: "researcher@test.com",
    identifier: null,
    password: "researcher123",
    role: "PARTICIPANT",
    access: "mock_access_researcher_abc123",
    refresh: "mock_refresh_researcher",
  },
  {
    email: null,
    identifier: "admin",
    password: "admin123",
    role: "COMPANY",
    access: "mock_access_company_xyz456",
    refresh: "mock_refresh_company",
  },
];

// Login participant — email + password
export const loginParticipantApi = async (email, password) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600));
    const user = MOCK_CREDENTIALS.find(
      (u) => u.email === email && u.password === password && u.role === "PARTICIPANT"
    );
    if (!user) throw new Error("Email ou mot de passe incorrect.");
    return { access: user.access, refresh: user.refresh, role: user.role, username: email };
  }
  return apiFetch("/api/auth/login/participant/", {
    method: "POST",
    body: { email, password },
  });
};

// Login company — identifier + password
export const loginCompanyApi = async (identifier, password) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600));
    const user = MOCK_CREDENTIALS.find(
      (u) => u.identifier === identifier && u.password === password && u.role === "COMPANY"
    );
    if (!user) throw new Error("Identifiant ou mot de passe incorrect.");
    return { access: user.access, refresh: user.refresh, role: user.role, username: identifier };
  }
  return apiFetch("/api/auth/login/company/", {
    method: "POST",
    body: { identifier, password },
  });
};

// Register participant
export const registerParticipantApi = async (data) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true };
  }
  return apiFetch("/api/auth/register/participant/", {
    method: "POST",
    body: {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      password: data.password,
      password_confirm: data.passwordConfirm,
      ...(data.employerName ? { employer_name: data.employerName } : {}),
    },
  });
};

// Register company
export const registerCompanyApi = async (data) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true };
  }
  return apiFetch("/api/auth/register/company/", {
    method: "POST",
    body: {
      company_identifier: data.identifier,
      company_name: data.companyName,
      recovery_email: data.recoveryEmail,
      siret: data.siret,
      legal_representative: data.legalRepresentative,
      password: data.password,
      password_confirm: data.passwordConfirm,
    },
  });
};

// Get current user profile
export const getMeApi = async () => {
  if (USE_MOCK) {
    return { first_name: "Noureddine", last_name: "Bouziane", email: "noureddine@u-paris.fr", role: "PARTICIPANT", tags: [] };
  }
  return apiFetch("/api/auth/me/");
};

// Update current user profile
export const updateMeApi = async (data) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return { success: true };
  }
  return apiFetch("/api/auth/me/", { method: "PATCH", body: data });
};

// Change password (connecté)
export const changePasswordApi = async (oldPassword, newPassword, confirmPassword) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return { success: true };
  }
  return apiFetch("/api/auth/me/password/", {
    method: "PATCH",
    body: { current_password: oldPassword, new_password: newPassword, new_password_confirm: confirmPassword },
  });
};

// Reset password par email (public)
export const resetPasswordApi = async (email) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true };
  }
  return apiFetch("/api/auth/password-reset/", { method: "POST", body: { email } });
};

// Supprimer son compte (RGPD)
export const deleteAccountApi = async () => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true };
  }
  return apiFetch("/api/auth/me/", { method: "DELETE" });
};

// Confirmer réinitialisation mot de passe (depuis le lien email)
export const resetPasswordConfirmApi = async (uid, token, newPassword, confirmPassword) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return { success: true };
  }
  return apiFetch("/api/auth/password-reset/confirm/", {
    method: "POST",
    body: { uid, token, new_password: newPassword, new_password_confirm: confirmPassword },
  });
};

// Refresh token
export const refreshTokenApi = async (refresh) => {
  if (USE_MOCK) {
    return { access: "mock_refreshed_token" };
  }
  return apiFetch("/api/auth/token/refresh/", { method: "POST", body: { refresh } });
};
