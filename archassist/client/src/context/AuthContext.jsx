import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api('/auth/me').then((r) => setUser(r.user)).catch(logout).finally(() => setLoading(false));
  }, [logout]);

  useEffect(() => {
    window.addEventListener('archassist:unauthorized', logout);
    return () => window.removeEventListener('archassist:unauthorized', logout);
  }, [logout]);

  const authenticate = async (path, body) => {
    const r = await api(path, { method: 'POST', body });
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  };

  const value = {
    user,
    loading,
    login: (email, password, role) => authenticate('/auth/login', { email, password, role }),
    register: (name, email, password) => authenticate('/auth/register', { name, email, password }),
    logout,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
