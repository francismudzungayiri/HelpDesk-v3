/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';
import { DEFAULT_WORK_STATUS, normalizeWorkStatus } from '../utils/profileStatus';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));
  const [workStatus, setWorkStatus] = useState(DEFAULT_WORK_STATUS);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let active = true;

    api.get('/auth/me')
      .then(res => {
        if (active) {
          setUser(res.data);
          setWorkStatus(normalizeWorkStatus(res.data?.work_status));
        }
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
    setWorkStatus(normalizeWorkStatus(userData?.work_status));
  };

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    setSession(res.data.token, res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setWorkStatus(DEFAULT_WORK_STATUS);
  };

  const updateWorkStatus = async (nextStatus) => {
    const normalizedStatus = normalizeWorkStatus(nextStatus);
    const res = await api.patch('/auth/me/work-status', { work_status: normalizedStatus });
    const persistedStatus = normalizeWorkStatus(res.data?.work_status || normalizedStatus);
    setWorkStatus(persistedStatus);
    setUser((currentUser) => (currentUser ? { ...currentUser, work_status: persistedStatus } : currentUser));
    return persistedStatus;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setSession, workStatus, updateWorkStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
