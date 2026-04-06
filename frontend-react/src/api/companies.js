import { apiFetch } from "./client";

export const getCompanies = async ({ search = "", organization = "" } = {}) => {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (organization.trim()) params.set("organization", organization.trim());
  const qs = params.toString();
  const data = await apiFetch(`/api/companies/${qs ? `?${qs}` : ""}`, { auth: false });
  return {
    results: data.results || data,
    count: data.count ?? (data.results || data).length,
  };
};

// Profil public d'une company + ses events publiés
export const getCompanyProfile = async (id) => {
  return apiFetch(`/api/companies/${id}/`, { auth: false });
};
