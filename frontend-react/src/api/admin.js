import { apiFetch } from "./client";
import { normalizeEvent } from "./events";

export const getAdminUsers = async ({ role = "", isActive, search = "", page = 1 } = {}) => {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (typeof isActive === "boolean") params.set("is_active", String(isActive));
  if (search.trim()) params.set("search", search.trim());
  const qs = params.toString();
  const data = await apiFetch(`/api/auth/admin/users/${qs ? `?${qs}` : ""}`);
  return {
    results: data.results || data,
    count: data.count ?? (data.results || data).length,
  };
};

export const getAdminUserProfile = async (id) => apiFetch(`/api/auth/admin/users/${id}/`);

export const deleteAdminUser = async (id) =>
  apiFetch(`/api/auth/admin/users/${id}/delete/`, { method: "DELETE" });

export const getAdminCompanies = async ({ verificationStatus = "", isActive, search = "", page = 1 } = {}) => {
  const params = new URLSearchParams();
  if (verificationStatus) params.set("verification_status", verificationStatus);
  if (typeof isActive === "boolean") params.set("is_active", String(isActive));
  if (search.trim()) params.set("search", search.trim());
  const qs = params.toString();
  const data = await apiFetch(`/api/auth/admin/companies/${qs ? `?${qs}` : ""}`);
  return {
    results: data.results || data,
    count: data.count ?? (data.results || data).length,
  };
};

export const getPendingAdminCompanies = async ({ status = "", page = 1 } = {}) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  const data = await apiFetch(`/api/auth/admin/companies/pending/${qs ? `?${qs}` : ""}`);
  return {
    results: data.results || data,
    count: data.count ?? (data.results || data).length,
  };
};

export const verifyAdminCompany = async (id, verificationStatus, reviewNote = "") =>
  apiFetch(`/api/auth/admin/companies/${id}/verify/`, {
    method: "PATCH",
    body: {
      verification_status: verificationStatus,
      ...(reviewNote ? { review_note: reviewNote } : {}),
    },
  });

export const getAdminStats = async () => apiFetch("/api/auth/admin/stats/");

export const getAdminEvents = async ({ search = "", status = "", format = "", organization = "" } = {}) => {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  if (format) params.set("format", format);
  if (organization.trim()) params.set("organization", organization.trim());
  const qs = params.toString();
  const data = await apiFetch(`/api/events/admin/${qs ? `?${qs}` : ""}`);
  return {
    results: (data.results || data).map(normalizeEvent),
    count: data.count ?? (data.results || data).length,
  };
};

export const deleteAdminEvent = async (id) =>
  apiFetch(`/api/events/admin/${id}/delete/`, { method: "DELETE" });

export const getAdminEvent = async (id) => {
  const data = await apiFetch(`/api/events/admin/${id}/`);
  return normalizeEvent(data);
};
