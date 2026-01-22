import { reactive, toRefs } from 'vue';
import { fetchProfile, loginUser, registerUser, updateProfile as apiUpdateProfile } from '../services/authApi.js';

const state = reactive({
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
});

let bootstrapPromise = null;

export function useAuthStore() {
  const setUser = (user) => {
    state.user = user;
    state.isAuthenticated = Boolean(user);
    if (user?.login) {
      localStorage.setItem('ml-login', user.login);
    } else {
      localStorage.removeItem('ml-login');
    }
  };

  const register = async (payload) => {
    state.loading = true;
    state.error = null;
    try {
      await registerUser(payload);
      const user = await loginUser(payload);
      setUser(user);
      return user;
    } catch (err) {
      state.error = err.message;
      throw err;
    } finally {
      state.loading = false;
    }
  };

  const login = async (payload) => {
    state.loading = true;
    state.error = null;
    try {
      const user = await loginUser(payload);
      setUser(user);
      return user;
    } catch (err) {
      state.error = err.message;
      throw err;
    } finally {
      state.loading = false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = async (payload) => {
    if (!state.user?.login) {
      throw new Error('No active user');
    }
    state.loading = true;
    state.error = null;
    try {
      const user = await apiUpdateProfile(state.user.login, payload);
      setUser(user);
      return user;
    } catch (err) {
      state.error = err.message;
      throw err;
    } finally {
      state.loading = false;
    }
  };

  const bootstrap = async () => {
    if (bootstrapPromise) return bootstrapPromise;
    const savedLogin = localStorage.getItem('ml-login');
    if (!savedLogin) return;
    state.loading = true;
    bootstrapPromise = (async () => {
      try {
        const user = await fetchProfile(savedLogin);
        setUser(user);
      } catch (err) {
        console.warn('Session restore failed', err.message);
        setUser(null);
      } finally {
        state.loading = false;
      }
    })();
    return bootstrapPromise;
  };

  const ensureSession = async () => {
    if (state.isAuthenticated || state.loading) return;
    await bootstrap();
  };

  return {
    ...toRefs(state),
    login,
    register,
    logout,
    updateProfile,
    bootstrap,
    ensureSession,
  };
}
