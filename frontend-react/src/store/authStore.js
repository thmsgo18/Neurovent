const TOKEN_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const ROLE_KEY = "role";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export const setRefreshToken = (token) => localStorage.setItem(REFRESH_KEY, token);

export const getRole = () => localStorage.getItem(ROLE_KEY);
export const setRole = (role) => localStorage.setItem(ROLE_KEY, role);

export const isAuthed = () => Boolean(getToken());
export const isAdmin = () => getRole() === "admin";

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ROLE_KEY);
};