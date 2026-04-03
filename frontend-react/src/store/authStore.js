const TOKEN_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const ROLE_KEY = "role";
const USERNAME_KEY = "username";
const DISPLAY_NAME_KEY = "display_name";
const COMPANY_NAME_KEY = "company_name";
const USER_ID_KEY = "user_id";

const clearSessionStorage = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(DISPLAY_NAME_KEY);
  localStorage.removeItem(COMPANY_NAME_KEY);
  localStorage.removeItem(USER_ID_KEY);
};

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp) return false;
    return payload.exp <= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
};

export const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (isTokenExpired(token)) {
    clearSessionStorage();
    return null;
  }
  return token;
};
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export const setRefreshToken = (token) => localStorage.setItem(REFRESH_KEY, token);

export const getRole = () => localStorage.getItem(ROLE_KEY);
export const setRole = (role) => localStorage.setItem(ROLE_KEY, role);

export const getUsername = () => localStorage.getItem(USERNAME_KEY);
export const setUsername = (username) => localStorage.setItem(USERNAME_KEY, username);

export const getDisplayName = () => localStorage.getItem(DISPLAY_NAME_KEY);
export const setDisplayName = (name) => localStorage.setItem(DISPLAY_NAME_KEY, name);

export const getCompanyName = () => localStorage.getItem(COMPANY_NAME_KEY);
export const setCompanyName = (name) => localStorage.setItem(COMPANY_NAME_KEY, name);

export const getUserId = () => { const v = localStorage.getItem(USER_ID_KEY); return v ? parseInt(v) : null; };
export const setUserId = (id) => localStorage.setItem(USER_ID_KEY, id);

export const isAuthed = () => Boolean(getToken());

// Rôles backend : PARTICIPANT, COMPANY, ADMIN
export const isCompany = () => getRole() === "COMPANY";
export const isAdmin = () => getRole() === "COMPANY" || getRole() === "ADMIN";
export const isParticipant = () => getRole() === "PARTICIPANT";

export const logout = () => {
  clearSessionStorage();
};
