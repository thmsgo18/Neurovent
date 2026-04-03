import { apiFetch } from "./client";

// Profil public d'une company + ses events publiés
export const getCompanyProfile = async (id) => {
  return apiFetch(`/api/companies/${id}/`, { auth: false });
};
