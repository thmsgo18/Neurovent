// Clé utilisée pour stocker le token dans le navigateur
const KEY = "token";

// Récupérer le token
export const getToken = () => localStorage.getItem(KEY);

// Sauvegarder le token après login
export const setToken = (token) => localStorage.setItem(KEY, token);

// Supprimer le token lors du logout
export const clearToken = () => localStorage.removeItem(KEY);

// Vérifier si l'utilisateur est connecté
export const isAuthed = () => Boolean(getToken());

// Récupérer le rôle de l'utilisateur (admin ou viewer)
export const getRole = () => localStorage.getItem("role");

// Sauvegarder le rôle après login
export const setRole = (role) => localStorage.setItem("role", role);

// Vérifier si l'utilisateur est admin
export const isAdmin = () => getRole() === "admin";