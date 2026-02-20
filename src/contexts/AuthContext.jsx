import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { fetchProfile, loginUser, registerUser, updateProfile as apiUpdateProfile } from '../services/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bootstrapPromiseRef = useRef(null);

  const applyUser = useCallback((nextUser) => {
    setUser(nextUser);
    setIsAuthenticated(Boolean(nextUser));
    if (nextUser?.login) {
      localStorage.setItem('ml-login', nextUser.login);
    } else {
      localStorage.removeItem('ml-login');
    }
  }, []);

  const register = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);
      try {
        await registerUser(payload);
        const nextUser = await loginUser(payload);
        applyUser(nextUser);
        return nextUser;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [applyUser],
  );

  const login = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);
      try {
        const nextUser = await loginUser(payload);
        applyUser(nextUser);
        return nextUser;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [applyUser],
  );

  const logout = useCallback(() => {
    applyUser(null);
  }, [applyUser]);

  const updateProfile = useCallback(
    async (payload) => {
      if (!user?.login) {
        throw new Error('Нет активного пользователя');
      }
      setLoading(true);
      setError(null);
      try {
        const nextUser = await apiUpdateProfile(user.login, payload);
        applyUser(nextUser);
        return nextUser;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [applyUser, user],
  );

  const bootstrap = useCallback(async () => {
    if (bootstrapPromiseRef.current) return bootstrapPromiseRef.current;
    const savedLogin = localStorage.getItem('ml-login');
    if (!savedLogin) return;
    setLoading(true);
    bootstrapPromiseRef.current = (async () => {
      try {
        const nextUser = await fetchProfile(savedLogin);
        applyUser(nextUser);
      } catch {
        applyUser(null);
      } finally {
        setLoading(false);
      }
    })();
    return bootstrapPromiseRef.current;
  }, [applyUser]);

  const ensureSession = useCallback(async () => {
    if (isAuthenticated || loading) return;
    await bootstrap();
  }, [bootstrap, isAuthenticated, loading]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      loading,
      error,
      login,
      register,
      logout,
      updateProfile,
      bootstrap,
      ensureSession,
    }),
    [bootstrap, ensureSession, error, isAuthenticated, loading, login, logout, register, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return ctx;
}
