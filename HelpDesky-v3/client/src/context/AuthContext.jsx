/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';
import { DEFAULT_WORK_STATUS, normalizeWorkStatus, readWorkStatus, getProfileStatusStorageKey } from '../utils/profileStatus';

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

  useEffect(() => {
    if (!user?.id) {
      setWorkStatus(DEFAULT_WORK_STATUS);
      return;
    }

    setWorkStatus(readWorkStatus(user.id));
  }, [user?.id]);

  const setSession = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setWorkStatus(readWorkStatus(userData?.id));
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

  const updateWorkStatus = (nextStatus) => {
    const normalizedStatus = normalizeWorkStatus(nextStatus);
    if (user?.id) {
      localStorage.setItem(getProfileStatusStorageKey(user.id), normalizedStatus);
    }
    setWorkStatus(normalizedStatus);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setSession, workStatus, updateWorkStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
