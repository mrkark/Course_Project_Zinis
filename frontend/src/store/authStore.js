import { create } from 'zustand';
import api from '../services/api';

const TOKEN_KEY = 'malware_session_token';
const USER_KEY = 'malware_session_user';

const useAuthStore = create((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  loading: false,
  error: '',
  login: async (email, password) => {
    set({ loading: true, error: '' });
    try {
      const result = await api.post('/auth/login', { email, password });
      const { token, user } = result;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ token, user, loading: false });
      return user;
    } catch (e) {
      set({ loading: false, error: e.error || e.message || 'Не удалось войти' });
      throw e;
    }
  },
  register: async (email, password) => {
    set({ loading: true, error: '' });
    try {
      const result = await api.post('/auth/register', { email, password });
      const { token, user } = result;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ token, user, loading: false });
      return user;
    } catch (e) {
      set({ loading: false, error: e.error || e.message || 'Не удалось зарегистрироваться' });
      throw e;
    }
  },
  logout: async () => {
    try { await api.post('/auth/logout'); } catch (_) {}
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },
}));

export default useAuthStore;
