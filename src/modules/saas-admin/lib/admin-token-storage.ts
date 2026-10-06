/**
 * Platform admin token — must NOT share tenant access_token keys.
 */

const ADMIN_TOKEN_KEY = "admin_access_token";
const ADMIN_USER_KEY = "admin_user_json";

function canUseDom(): boolean {
  return typeof window !== "undefined";
}

export type AdminUserSnapshot = {
  admin_user_id?: string;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

export const adminTokenStorage = {
  getToken(): string | null {
    if (!canUseDom()) return null;
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  },

  setToken(token: string | null): void {
    if (!canUseDom()) return;
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  getUser(): AdminUserSnapshot | null {
    if (!canUseDom()) return null;
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminUserSnapshot;
    } catch {
      return null;
    }
  },

  setUser(user: AdminUserSnapshot | null): void {
    if (!canUseDom()) return;
    if (user) localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(ADMIN_USER_KEY);
  },

  clear(): void {
    if (!canUseDom()) return;
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  },

  isLoggedIn(): boolean {
    return Boolean(this.getToken());
  },
};
