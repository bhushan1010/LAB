import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@core/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('lab_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('lab_token') || null);
  const [deviceId, setDeviceIdState] = useState(() => localStorage.getItem('lab_device_id') || 'LAN-PC-01');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('lab_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err.message);
          logout();
        }
      }
      setLoading(false);
    }
    verifySession();
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data.success) {
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('lab_token', newToken);
      localStorage.setItem('lab_user', JSON.stringify(newUser));
      return newUser;
    } else {
      throw new Error(res.data.error || 'Login failed');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lab_token');
    localStorage.removeItem('lab_user');
  };

  const setDeviceId = (id) => {
    setDeviceIdState(id);
    localStorage.setItem('lab_device_id', id);
  };

  return (
    <AuthContext.Provider value={{ user, token, deviceId, setDeviceId, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
