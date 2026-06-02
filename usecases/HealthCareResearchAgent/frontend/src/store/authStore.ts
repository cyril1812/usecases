import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userRole: string | null;
  userName: string | null;
  isAuthenticated: boolean;
  setLogin: (token: string, role: string, name: string) => void;
  setLogout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Load initial state from localStorage if available
  const cachedToken = localStorage.getItem('auth_token');
  const cachedRole = localStorage.getItem('auth_role');
  const cachedName = localStorage.getItem('auth_name');

  return {
    token: cachedToken,
    userRole: cachedRole,
    userName: cachedName,
    isAuthenticated: !!cachedToken,
    setLogin: (token, role, name) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_role', role);
      localStorage.setItem('auth_name', name);
      set({ token, userRole: role, userName: name, isAuthenticated: true });
    },
    setLogout: () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_role');
      localStorage.removeItem('auth_name');
      set({ token: null, userRole: null, userName: null, isAuthenticated: false });
    },
  };
});
