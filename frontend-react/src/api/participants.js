import { apiFetch } from "./client";

export const USE_MOCK = true;

// ---- MOCK DATA ----
const MOCK_PARTICIPANTS = [
  {
    id: 1,
    first_name: "Alice",
    last_name: "Martin",
    email: "alice.martin@univ.fr",
    institution: "Université Paris Cité",
  },
  {
    id: 2,
    first_name: "Bob",
    last_name: "Dupont",
    email: "bob.dupont@univ.fr",
    institution: "Sorbonne Université",
  },
  {
    id: 3,
    first_name: "Clara",
    last_name: "Bernard",
    email: "clara.bernard@univ.fr",
    institution: "CentraleSupélec",
  },
];

const MOCK_REGISTRATIONS = [
  { id: 1, participant: 1, event: 1 },
  { id: 2, participant: 2, event: 1 },
];

// Liste tous les participants
export const getParticipants = async () => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return [...MOCK_PARTICIPANTS];
  }
  return apiFetch("/api/participants/");
};

// Créer un participant
export const createParticipant = async (data) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    const newParticipant = { id: MOCK_PARTICIPANTS.length + 1, ...data };
    MOCK_PARTICIPANTS.push(newParticipant);
    return newParticipant;
  }
  return apiFetch("/api/participants/", { method: "POST", body: data });
};

// Modifier un participant
export const updateParticipant = async (id, data) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    const index = MOCK_PARTICIPANTS.findIndex((p) => p.id === parseInt(id));
    if (index === -1) throw new Error("Participant non trouvé");
    MOCK_PARTICIPANTS[index] = { ...MOCK_PARTICIPANTS[index], ...data };
    return MOCK_PARTICIPANTS[index];
  }
  return apiFetch(`/api/participants/${id}/`, { method: "PUT", body: data });
};

// Supprimer un participant
export const deleteParticipant = async (id) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    const index = MOCK_PARTICIPANTS.findIndex((p) => p.id === parseInt(id));
    if (index !== -1) MOCK_PARTICIPANTS.splice(index, 1);
    return { success: true };
  }
  return apiFetch(`/api/participants/${id}/`, { method: "DELETE" });
};

// Inscrire un participant à un événement
export const registerToEvent = async (participantId, eventId) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    // Vérifier si déjà inscrit
    const exists = MOCK_REGISTRATIONS.find(
      (r) => r.participant === participantId && r.event === eventId
    );
    if (exists) throw new Error("Participant déjà inscrit à cet événement");
    const newReg = {
      id: MOCK_REGISTRATIONS.length + 1,
      participant: participantId,
      event: eventId,
    };
    MOCK_REGISTRATIONS.push(newReg);
    return newReg;
  }
  return apiFetch("/api/registrations/", {
    method: "POST",
    body: { participant: participantId, event: eventId },
  });
};

// Supprimer une inscription
export const unregisterFromEvent = async (registrationId) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    const index = MOCK_REGISTRATIONS.findIndex((r) => r.id === registrationId);
    if (index !== -1) MOCK_REGISTRATIONS.splice(index, 1);
    return { success: true };
  }
  return apiFetch(`/api/registrations/${registrationId}/`, { method: "DELETE" });
};

// Récupérer les inscriptions d'un événement
export const getEventRegistrations = async (eventId) => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    const regs = MOCK_REGISTRATIONS.filter((r) => r.event === parseInt(eventId));
    return regs.map((r) => ({
      ...r,
      participant_detail: MOCK_PARTICIPANTS.find((p) => p.id === r.participant),
    }));
  }
  return apiFetch(`/api/registrations/?event=${eventId}`);
};