/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let active = true;

    api.get('/auth/me')
      .then(res => {
        if (active) setUser(res.data);
      })
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const setSession = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    setSession(res.data.token, res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
